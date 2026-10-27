import { defineConfig, createMarkdownRenderer } from 'vitepress'
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const docsDir = fileURLToPath(new URL('../docs', import.meta.url))

// markdown 渲染器（构建期渲染日记/笔记 HTML，与独立正文页同风格）
// 用 vitepress 官方渲染器：自带 shiki 语法高亮 + 代码块容器（语言标签/复制按钮），
// 与独立页（/Spring/xxx.html）的代码块效果完全一致；仍是 MarkdownIt 实例，图片重写逻辑不变。
// 主题固定 dark-plus（VS Code Dark+）：类型青绿 / 变量浅蓝 / 字符串橙。
// 必须与下方 markdown.theme 保持一致，否则「独立页」与「主容器内就地阅读」会用两套配色。
const CODE_THEME = 'dark-plus'
const md = await createMarkdownRenderer(docsDir, { math: true, theme: CODE_THEME })

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

// ===== 分区扫描：docs/ 下每个一级子文件夹（含 md） = 二级导航里的一项 =====
const NOTES_DIR = join(docsDir, 'notes')

// 分区目录黑名单：这些目录是站点基础设施，不是内容分区
const NON_SECTION_DIRS = new Set(['img', 'public', 'node_modules', '.vitepress'])

// ===== 分区映射表 =====
// 映射来源是 .vitepress/sections.txt（纯文本，一行一条「文件夹名 - 导航显示名」）。
// 放在配置目录下而不是 docs/ 里：它是构建配置，不是内容，也不该被当成一个分区扫出来。
// 未登记的文件夹不受影响——直接用文件夹名当导航名，排在已登记项之后。
const SECTION_MAP_FILE = join(fileURLToPath(new URL('.', import.meta.url)), 'sections.txt')

// 解析映射表 → 保留文件里的行序（行序即导航顺序）
function loadSectionMap(): Map<string, string> {
  const map = new Map<string, string>()
  let raw = ''
  try {
    raw = readFileSync(SECTION_MAP_FILE, 'utf-8')
  } catch {
    return map // 文件不存在：全部回退成文件夹名，不阻断构建
  }
  for (const line of raw.split(/\r?\n/)) {
    const text = line.trim()
    if (!text || text.startsWith('#')) continue
    // 分隔符是「空格 - 空格」；没有分隔符时整行当文件夹名，显示名同文件夹名
    const at = text.indexOf(' - ')
    const key = (at === -1 ? text : text.slice(0, at)).trim()
    const label = (at === -1 ? text : text.slice(at + 3)).trim() || key
    if (!key) continue
    if (map.has(key)) {
      console.warn(`[sections.txt] 「${key}」重复登记，以第一次为准`)
      continue
    }
    map.set(key, label)
  }
  return map
}

const sectionMap = loadSectionMap()

// 分区只存「标识 + 显示名」：正文不放在这里。
// 各分区的正文统一由 buildSectionContent() 生成 pageData.sectionContent，
// 前端只有一个 SectionPane，不为任何分区单独写界面。
type SectionEntry = {
  key: string
  text: string
}

function buildSections(): SectionEntry[] {
  const sections: SectionEntry[] = []
  for (const name of readdirSync(docsDir)) {
    if (NON_SECTION_DIRS.has(name)) continue
    if (name.startsWith('.') || name.startsWith('_')) continue
    const full = join(docsDir, name)
    if (!statSync(full).isDirectory()) continue
    // 每个一级文件夹都是一个分区，空文件夹同样保留：
    // 新建 docs/<名字>/ 后重新构建，导航里就会立刻多出一项（点进去显示「该分区暂无内容」），
    // 不需要先放 md、也不需要改配置。
    // 显示名优先取 sections.txt 里的登记值，未登记则用文件夹名本身。
    sections.push({ key: name, text: sectionMap.get(name) ?? name })
  }
  // 顺序：sections.txt 里登记过的按行的先后在前（表里不存在的目录已被忽略），
  // 未登记的排在其后，按名称排序。这样「登记 = 定名字 + 定位置」，两件事一个文件搞定。
  const registered = new Map([...sectionMap.keys()].map((k, i) => [k, i]))
  return sections.sort((a, b) => {
    const ia = registered.get(a.key)
    const ib = registered.get(b.key)
    if (ia !== undefined || ib !== undefined) {
      return (ia === undefined ? Infinity : ia) - (ib === undefined ? Infinity : ib)
    }
    return a.key.localeCompare(b.key, 'zh-CN')
  })
}

const sectionNav = buildSections()

// ===== 统一分区内容：所有分区（笔记 / 日记 / 归档 / 未来任何新目录）一套数据结构 =====
// 前端只有一个 SectionPane，不为任何分区单独写界面。
// key 相对「分区根」：
//   notes → 'Spring/AI/xxx'
//   diary → '目标与方向'、'日记/2026/10月'
// 只有 notes/ 与 diary/ 里存在独立页竞争，但两边各自独立，key 不会互相污染。
type SectionEntryData = { title: string; key: string; html: string; order: number }

// frontmatter order；没有就排到最后
function orderOf(raw: string): number {
  const fm = raw.match(/^---\s*\n([\s\S]*?)\n---/)
  if (!fm) return Number.MAX_SAFE_INTEGER
  const m = fm[1].match(/order\s*:\s*(\d+)/)
  return m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER
}

// 单个分区：遍历 docs/<section>/ 下全部 md（任意深度），构建期渲染成 HTML
// 根级散文件（如 目标与方向.md）与子文件夹里的文件同等对待，前端 FileTree 会递归成树
function buildSectionContent(sectionKey: string, imgMap: Map<string, string>): SectionEntryData[] {
  const sectionDir = join(docsDir, sectionKey)
  if (!existsSync(sectionDir) || !statSync(sectionDir).isDirectory()) return []
  const slots: { title: string; key: string; html: string; order: number }[] = []
  for (const file of walk(sectionDir)) {
    const rel = relative(sectionDir, file).replace(/\\/g, '/')
    const raw = readFileSync(file, 'utf-8')
    const body = raw.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '')
    const key = rel.replace(/\.md$/, '')
    // 文件所在目录（相对分区根），用于解析图片相对路径
    const relDir = key.includes('/') ? key.slice(0, key.lastIndexOf('/')) + '/' : ''
    slots.push({
      title: rel.split('/').pop()!.replace(/\.md$/, ''),
      key,
      html: rewriteImgSrcs(md.render(body), relDir, imgMap, sectionDir),
      order: orderOf(raw)
    })
  }
  slots.sort(
    (a, b) => a.order - b.order || a.key.localeCompare(b.key, 'zh-CN', { numeric: true })
  )
  return slots
}

// 全部分区：图片 hash 映射只建一次（建一次要读整个 assets 目录算 MD5，别按分区重复算）
function buildAllSectionContent(): Record<string, SectionEntryData[]> {
  const imgMap = buildImgHashMap()
  const out: Record<string, SectionEntryData[]> = {}
  for (const s of sectionNav) out[s.key] = buildSectionContent(s.key, imgMap)
  return out
}

// ===== 图片路径重写 =====
// 图片源路径 → assets hash 文件名映射（构建期 VitePress 把 docs 下图片打进 dist/assets）
// 同名图片（不同目录）内容相同，assets 里只有唯一 hash，按文件名映射不冲突。
// 兼容策略：dist 尚不存在时（首次构建 / dev）返回空 Map，此时 render 时源文件在 docs 下直接存在，
// 走「文件名匹配 + 内容 MD5 兜底」两条路，都能把相对路径重写到 assets hash。
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
  // 内容兜底映射：源文件内容 MD5 → assets hash 文件名。
  // Vite 构建时对内容相同的图片只保留一个 hash（同名去重），文件名映射可能落空，
  // 这里按内容反查，保证重写不丢。
  const contentMap = new Map<string, string>()
  for (const f of files) {
    const p = join(assetsDir, f)
    if (!/\.(png|jpe?g|gif|svg|webp)$/i.test(f) || !existsSync(p)) continue
    const h = createHash('md5').update(readFileSync(p)).digest('hex')
    if (!contentMap.has(h)) contentMap.set(h, f)
  }
  map.set('__content__', '') // 占位（见 rewriteImgSrcs 内容兜底逻辑）
  map['__contentMap'] = contentMap
  return map
}

// 把渲染后的笔记 HTML 里的相对图片路径重写为 /assets/hash（对齐 VitePress 独立页机制）
// 统一 build 模式：本地调试也用 docs:build + docs:preview，无 dev 分支
// baseDir：noteRelDir 的基准目录（笔记正文相对 notes/，兜底 pane 的页面相对 docs/）
function rewriteImgSrcs(
  html: string,
  noteRelDir: string,
  imgMap: Map<string, string>,
  baseDir: string = NOTES_DIR
): string {
  const contentMap = (imgMap as unknown as Record<string, Map<string, string>>)['__contentMap'] as Map<string, string> | undefined
  return html.replace(
    /(<img[^>]*\bsrc=)(["'])([^"']+)(\2)/g,
    (all, pre: string, q: string, src: string) => {
      if (!/^(?:\.{0,2}\/|(?![a-z]+:|\/)).*\.(png|jpe?g|gif|svg|webp)$/i.test(src)) return all
      // 反斜杠路径归一：Windows 导出的 md 里是 assets\xxx.png 或 .\assets\xxx.png，
      // markdown-it 渲染后变成 assets%5Cxxx.png 或 .%5Cassets%5Cxxx.png。
      // 这里把 %5C / \ 统一还原为 /，再取最后一段文件名参与匹配。
      const normSrc = src.replace(/%5C/gi, '/').replace(/\\/g, '/')
      let srcPath = noteRelDir + normSrc.replace(/^\.\//, '')
      const name = srcPath.split('/').pop()!
      const hashed = imgMap.get(name)
      if (hashed) return `${pre}${q}/assets/${hashed}${q}`
      // 文件名映射落空（内容同名去重）→ 按源文件内容 MD5 反查
      if (contentMap) {
        const srcFull = join(baseDir, srcPath)
        if (existsSync(srcFull)) {
          const h = createHash('md5').update(readFileSync(srcFull)).digest('hex')
          const target = contentMap.get(h)
          if (target) return `${pre}${q}/assets/${target}${q}`
        }
      }
      // 最后兜底：源文件存在但从未被 Vite 打包（如独立页 base64 内联、未被任何资源引用）
      // → 直接内联 base64，避免浏览器请求相对路径 404
      const srcFull2 = join(baseDir, srcPath)
      if (existsSync(srcFull2) && !/\.(gif|svg)$/i.test(srcPath)) {
        const ext = srcPath.split('.').pop()!.toLowerCase()
        const mime = ext === 'jpg' ? 'jpeg' : ext
        const b64 = readFileSync(srcFull2).toString('base64')
        return `${pre}${q}data:image/${mime};base64,${b64}${q}`
      }
      return all // 找不到 hash，保留原样
    }
  )
}

// ===== 首页注入：全部分区内容（构建期一次渲染，运行时零解析） =====
// 只有首页需要：所有分区 pane 都挂在首页上（v-show），点导航就地切换、不跳页。
function injectSectionContent(pageData: Record<string, unknown>) {
  const file = pageData.filePath ?? ''
  if (file === 'index.md' || file === 'index.html') {
    pageData.sectionContent = buildAllSectionContent()
  }
}

export default defineConfig({
  title: '奇迹大师的学习笔记',
  description: '我的学习笔记站',
  lang: 'zh-CN',
  base: '/',
  srcDir: 'docs',
  // 强制深色：全站不提供浅色模式。
  // 该值会三件事同时生效：构建期注入 document.documentElement.classList.add('dark')、
  // 客户端 isDark 恒为 true、右上角明暗切换组件（VPNavBarAppearance）不再渲染。
  // 站点配色只维护深色一套，避免两套色值分叉。
  appearance: 'force-dark',
  // 构建时给所有页面 <html> 加默认 dark（极客风首屏即深色）
  transformHtml(code) {
    return code.replace(
      '<html lang="zh-CN" dir="ltr">',
      '<html lang="zh-CN" dir="ltr" class="dark">'
    )
  },
  // 首页注入全部分区内容（笔记 / 日记 / 归档……）；
  // 每个页面都注入分区导航（二级导航 + 动态 pane 的数据来源）
  transformPageData(pageData) {
    injectSectionContent(pageData)
    pageData.sectionNav = sectionNav
  },
  markdown: {
    math: true,
    // 与上方 createMarkdownRenderer 的 theme 保持一致（独立页代码块配色）
    theme: CODE_THEME
  },
  ignoreDeadLinks: true,
  themeConfig: {
    nav: [
      { text: '首页', link: '/' }
    ],
    // 全站禁用侧边栏：分区目录统一放在内容区（各分区共用 SectionPane 的三栏界面）。
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
