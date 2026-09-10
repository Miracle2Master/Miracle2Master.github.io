import { defineConfig } from 'vitepress'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const docsDir = fileURLToPath(new URL('../docs', import.meta.url))

function walk(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      out.push(...walk(full))
    } else if (name.endsWith('.md')) {
      out.push(full)
    }
  }
  return out
}

function firstTitle(file: string): string {
  return basename(file, '.md')
}

function orderOf(file: string): number {
  const content = readFileSync(file, 'utf-8')
  const fm = content.match(/^---\s*\n([\s\S]*?)\n---/)
  if (!fm) return Number.MAX_SAFE_INTEGER
  const m = fm[1].match(/order\s*:\s*(\d+)/)
  return m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER
}

type SidebarItem = { text: string; link?: string; items?: SidebarItem[] }

// 导航页不参与笔记侧边栏
const EXCLUDED = new Set(['index.md', 'notes.md'])

function buildSidebar(): Record<string, SidebarItem[]> {
  const folders = new Map<
    string,
    { files: { item: SidebarItem; order: number }[]; subs: Map<string, { item: SidebarItem; order: number }[]> }
  >()
  for (const file of walk(docsDir)) {
    const rel = relative(docsDir, file).replace(/\\/g, '/')
    if (EXCLUDED.has(rel)) continue
    const seg = rel.split('/')
    const top = seg[0]
    const link = '/' + rel.replace(/\.md$/, '')
    const entry = { item: { text: firstTitle(file), link }, order: orderOf(file) }
    if (!folders.has(top)) folders.set(top, { files: [], subs: new Map() })
    const data = folders.get(top)!
    if (seg.length === 2) {
      data.files.push(entry)
    } else {
      const sub = seg[1]
      if (!data.subs.has(sub)) data.subs.set(sub, [])
      data.subs.get(sub)!.push(entry)
    }
  }

  const byOrder = (
    a: { order: number; item: SidebarItem },
    b: { order: number; item: SidebarItem }
  ) => a.order - b.order || a.item.text!.localeCompare(b.item.text!, 'zh-CN')

  const result: Record<string, SidebarItem[]> = {}
  for (const [top, data] of folders) {
    data.files.sort(byOrder)
    const items: SidebarItem[] = data.files.map((e) => e.item)
    const subNames = [...data.subs.keys()].sort((a, b) => {
      const oa = Math.min(...data.subs.get(a)!.map((e) => e.order))
      const ob = Math.min(...data.subs.get(b)!.map((e) => e.order))
      return oa - ob || a.localeCompare(b, 'zh-CN')
    })
    for (const sub of subNames) {
      const subItems = data.subs.get(sub)!.sort(byOrder).map((e) => e.item)
      items.push({ text: sub, items: subItems })
    }
    result['/' + top + '/'] = [{ text: top, items }]
  }
  return result
}

const sidebar = buildSidebar()

export default defineConfig({
  title: 'Miracle2Master 笔记',
  description: '我的学习笔记站',
  lang: 'zh-CN',
  base: '/',
  srcDir: 'docs',
  ignoreDeadLinks: true,
  themeConfig: {
    nav: [
      { text: '首页', link: '/' }
    ],
    sidebar,
    outline: {
      label: '本页目录',
      level: [2, 3]
    },
    docFooter: {
      prev: '上一篇',
      next: '下一篇'
    },
    lastUpdated: {
      text: '最后更新'
    },
    search: {
      provider: 'local'
    }
  }
})
