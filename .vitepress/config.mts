import { defineConfig } from 'vitepress'
import MarkdownIt from 'markdown-it'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const docsDir = fileURLToPath(new URL('../docs', import.meta.url))

// markdown 渲染器（构建期渲染日记 HTML，与正文页同风格）
// vite 开发模式对 CJS 默认导出的互操作可能包一层 {default: fn}，这里兜底取到构造函数
const MarkdownItCtor = ((MarkdownIt as unknown as { default?: typeof MarkdownIt }).default ?? MarkdownIt) as typeof MarkdownIt
const md = new MarkdownItCtor({ html: true, linkify: true, typographer: true })

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
const EXCLUDED = new Set(['index.md', 'notes.md', 'planning.md'])

function buildSidebar(): Record<string, SidebarItem[]> {
  const folders = new Map<
    string,
    { files: { item: SidebarItem; order: number }[]; subs: Map<string, { item: SidebarItem; order: number }[]> }
  >()
  for (const file of walk(docsDir)) {
    const rel = relative(docsDir, file).replace(/\\/g, '/')
    if (EXCLUDED.has(rel)) continue
    const seg = rel.split('/')
    if (seg[0] === 'category') continue
    if (seg[0] === 'planning') continue
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

// ===== 人生规划：按年份扫描 & 渲染日记 =====
function buildPlanningYears(): { year: string; count: number; link: string }[] {
  const base = join(docsDir, 'planning', '日记')
  const arr: { year: string; count: number; link: string }[] = []
  for (const name of readdirSync(base)) {
    if (!/^\d{4}$/.test(name)) continue
    const full = join(base, name)
    if (!statSync(full).isDirectory()) continue
    const count = walk(full).length
    arr.push({ year: name, count, link: `/planning/日记/${name}.html` })
  }
  return arr.sort((a, b) => b.year.localeCompare(a.year))
}

const planningYears = buildPlanningYears()

// 某年份的日记：读取 md → markdown-it 渲染成 HTML，供年页就地显示
type YearEntry = { title: string; key: string; html: string; order: number }
function buildYearData(year: string): YearEntry[] {
  const base = join(docsDir, 'planning', '日记', year)
  const arr: YearEntry[] = []
  if (!statSync(base).isDirectory()) return arr
  for (const name of readdirSync(base)) {
    if (!name.endsWith('.md')) continue
    const full = join(base, name)
    if (statSync(full).isDirectory()) continue
    const raw = readFileSync(full, 'utf-8')
    // frontmatter order
    let order = Number.MAX_SAFE_INTEGER
    const fm = raw.match(/^---\s*\n([\s\S]*?)\n---/)
    if (fm) {
      const m = fm[1].match(/order\s*:\s*(\d+)/)
      if (m) order = parseInt(m[1], 10)
    }
    const body = raw.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '')
    arr.push({
      title: name.replace(/\.md$/, ''),
      key: name.replace(/\.md$/, ''),
      html: md.render(body),
      order
    })
  }
  arr.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'zh-CN'))
  return arr
}

// 给首页注入年份列表；给年份壳页注入该年日记（含渲染好的 HTML）
function injectPlanningData(pageData: Record<string, unknown>) {
  const file = pageData.filePath ?? ''
  if (file.endsWith('index.md')) {
    pageData.planningYears = planningYears
  }
  const m = file.match(/planning\/日记\/(\d{4})\.md$/)
  if (m) {
    pageData.yearEntries = buildYearData(m[1])
    pageData.yearTitle = `${m[1]} 年`
  }
}

// ===== 学习记录：构建期渲染全部笔记 HTML（供主容器内就地阅读，不跳页） =====
type NoteEntry = { title: string; key: string; html: string; order: number }

// 图片源路径 → assets hash 文件名映射（构建期 VitePress 把 docs 下图片打进 dist/assets）
// 同名图片（不同目录）内容相同，assets 里只有唯一 hash，按文件名映射不冲突。
function buildImgHashMap(): Map<string, string> {
  const map = new Map<string, string>()
  const assetsDir = join(docsDir, '..', '.vitepress', 'dist', 'assets')
  let files: string[] = []
  try {
    files = readdirSync(assetsDir)
  } catch {
    return map // dist 尚不存在（首次构建或 dev），返回空
  }
  for (const f of files) {
    const m = f.match(/^(.+)\.([A-Za-z0-9_-]{4,})\.(png|jpe?g|gif|svg|webp)$/)
    if (m) map.set(`${m[1]}.${m[3]}`, f)
  }
  return map
}

// 把渲染后的笔记 HTML 里的相对图片路径重写为 /assets/hash（对齐 VitePress 独立页机制）
// 统一 build 模式：本地调试也用 docs:build + docs:preview，无 dev 分支
function rewriteImgSrcs(html: string, noteRelDir: string, imgMap: Map<string, string>): string {
  return html.replace(
    /(<img[^>]*\bsrc=)(["'])([^"']+)(\2)/g,
    (all, pre: string, q: string, src: string) => {
      if (!/^(?:\.{0,2}\/|(?![a-z]+:|\/)).*\.(png|jpe?g|gif|svg|webp)$/i.test(src)) return all
      // 相对路径 → 相对笔记所在目录的源文件路径
      const srcPath = noteRelDir + src.replace(/^\.\//, '')
      const name = srcPath.split('/').pop()!
      const hashed = imgMap.get(name)
      if (!hashed) return all // 找不到 hash，保留原样
      return `${pre}${q}/assets/${hashed}${q}`
    }
  )
}

function buildNoteContent(): NoteEntry[] {
  const EXCLUDED = new Set(['index.md', 'notes.md', 'planning.md'])
  const out: NoteEntry[] = []
  const imgMap = buildImgHashMap()
  for (const file of walk(docsDir)) {
    const rel = relative(docsDir, file).replace(/\\/g, '/')
    if (EXCLUDED.has(rel)) continue
    if (rel.startsWith('planning/')) continue
    const seg = rel.split('/')
    if (seg[0] === 'category') continue
    const raw = readFileSync(file, 'utf-8')
    let order = Number.MAX_SAFE_INTEGER
    const fm = raw.match(/^---\s*\n([\s\S]*?)\n---/)
    if (fm) {
      const m = fm[1].match(/order\s*:\s*(\d+)/)
      if (m) order = parseInt(m[1], 10)
    }
    const body = raw.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '')
    const key = rel.replace(/\.md$/, '')
    // 笔记所在目录（相对 docs 根），用于解析图片相对路径
    const noteDir = key.includes('/') ? key.slice(0, key.lastIndexOf('/')) + '/' : ''
    const html = rewriteImgSrcs(md.render(body), noteDir, imgMap)
    out.push({
      title: seg[seg.length - 1].replace(/\.md$/, ''),
      key,
      html,
      order
    })
  }
  out.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'zh-CN'))
  return out
}

// 首页注入：年份列表 + 全部笔记 HTML（构建期一次渲染，运行时零解析）
function injectIndexData(pageData: Record<string, unknown>) {
  const file = pageData.filePath ?? ''
  if (file.endsWith('index.md')) {
    pageData.planningYears = planningYears
    pageData.noteContent = buildNoteContent()
  }
}

export default defineConfig({
  title: '奇迹大师的学习笔记',
  description: '我的学习笔记站',
  lang: 'zh-CN',
  base: '/',
  srcDir: 'docs',
  // 构建时给所有页面 <html> 加默认 dark（极客风首屏即深色）
  transformHtml(code) {
    return code.replace(
      '<html lang="zh-CN" dir="ltr">',
      '<html lang="zh-CN" dir="ltr" class="dark">'
    )
  },
  // 首页注入年份列表；年份壳页注入该年日记；首页另注入全部笔记 HTML
  transformPageData(pageData) {
    injectIndexData(pageData)
    injectPlanningData(pageData)
  },
  markdown: {
    math: true
  },
  ignoreDeadLinks: true,
  themeConfig: {
    nav: [
      { text: '首页', link: '/' }
    ],
    // 全站禁用侧边栏：分类目录统一放在内容区（NoteList 卡片）。
    // 此前全局 sidebar 导致笔记/规划页渲染左侧栏（fixed 覆盖到导航区，盖住二级导航分隔线）。
    sidebar: false,
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
