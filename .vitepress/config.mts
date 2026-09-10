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
  const content = readFileSync(file, 'utf-8')
  const m = content.match(/^#\s+(.+)$/m)
  return m ? m[1].trim() : basename(file, '.md')
}

function sortKey(name: string): number {
  const m = name.match(/^(\d+)/)
  return m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER
}

type SidebarItem = { text: string; link: string }
type SidebarGroup = { text: string; items: SidebarItem[] }

function buildSidebar(): SidebarGroup[] {
  const groups = new Map<string, SidebarItem[]>()
  for (const file of walk(docsDir)) {
    const rel = relative(docsDir, file).replace(/\\/g, '/')
    if (rel === 'index.md') continue
    const seg = rel.split('/')
    const group = seg.length > 1 ? seg[0] : '其他'
    const link = '/' + rel.replace(/\.md$/, '')
    const item: SidebarItem = { text: firstTitle(file), link }
    if (!groups.has(group)) groups.set(group, [])
    groups.get(group)!.push(item)
  }
  const result: SidebarGroup[] = []
  for (const [group, items] of groups) {
    items.sort((a, b) => a.text.localeCompare(b.text, 'zh-CN'))
    result.push({ text: group, items })
  }
  result.sort(
    (a, b) =>
      sortKey(a.text) - sortKey(b.text) || a.text.localeCompare(b.text, 'zh-CN')
  )
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
