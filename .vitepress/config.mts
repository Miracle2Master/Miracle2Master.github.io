import { defineConfig, createMarkdownRenderer } from 'vitepress'
import {
  readdirSync,
  readFileSync,
  statSync,
  existsSync,
  mkdirSync,
  copyFileSync
} from 'node:fs'
import { createHash } from 'node:crypto'
import { join, relative, dirname, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'
import { notePathToHash } from './shared/noteHash'

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

// 没有 frontmatter order 的笔记统一用这个值，排在所有显式 order 之后
const MAX_ORDER = Number.MAX_SAFE_INTEGER
type SectionEntryData = {
  title: string
  key: string
  html: string
  order: number
  // 分区封面：强制排第一（进来默认展示这篇），但不出现在左栏目录树里
  intro: boolean
}

// frontmatter order；没有就排到最后
function orderOf(raw: string): number {
  const fm = raw.match(/^---\s*\n([\s\S]*?)\n---/)
  if (!fm) return MAX_ORDER
  const m = fm[1].match(/order\s*:\s*(\d+)/)
  return m ? parseInt(m[1], 10) : MAX_ORDER
}

// frontmatter intro: true / false；没有按 false。
// 注意 orderOf 的正则是 \d+，不认负号——写 order: -1 会被当成「没写」而排到最后，
// 所以「排第一」统一靠 intro 表达，不要再依赖 order: 0 这种约定。
function introOf(raw: string): boolean {
  const fm = raw.match(/^---\s*\n([\s\S]*?)\n---/)
  if (!fm) return false
  return /^\s*intro\s*:\s*true\s*$/m.test(fm[1])
}

// 单个分区：遍历 docs/<section>/ 下全部 md（任意深度），构建期渲染成 HTML
// 根级散文件（如 目标与方向.md）与子文件夹里的文件同等对待，前端 FileTree 会递归成树
function buildSectionContent(sectionKey: string): SectionEntryData[] {
  const sectionDir = join(docsDir, sectionKey)
  if (!existsSync(sectionDir) || !statSync(sectionDir).isDirectory()) return []
  const slots: SectionEntryData[] = []
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
      html: rewriteInlineAnchors(rewriteImgSrcs(md.render(body), relDir, sectionDir)),
      order: orderOf(raw),
      intro: introOf(raw)
    })
  }
  // 排序：intro 永远第一（进来默认展示的就是它）；
  // 其余按 order 升序，order 相同再按 key 排序。
  slots.sort((a, b) => {
    if (a.intro !== b.intro) return a.intro ? -1 : 1
    return a.order - b.order || a.key.localeCompare(b.key, 'zh-CN', { numeric: true })
  })
  return slots
}

// 全部分区
function buildAllSectionContent(): Record<string, SectionEntryData[]> {
  const out: Record<string, SectionEntryData[]> = {}
  for (const s of sectionNav) out[s.key] = buildSectionContent(s.key)
  return out
}

// ===== 图片路径重写 =====
// 目标：笔记正文里的相对图片路径，一律重写成站点根下的稳定 URL
//       /notes-img/<内容md5>.<ext>
//
// 为什么不再读 dist/assets：
//   旧实现依赖「上一次构建产物 dist/assets」来反查 Vite 的 hash 文件名。但 markdown 的
//   transformPageData 是在 Vite 打包阶段（load 钩子）里执行的，此时 Vite 还没写完 dist/assets，
//   目录是空的 → 映射为空 → 全部退回 base64 内联。本地因为残留了上次的 dist 才「看起来正常」，
//   CI 每次全新 checkout（.gitignore 排除了 dist）必然踩坑，整个首页被撑到 88 MB。
//
// 现在的做法完全不依赖任何构建产物：
//   1) 配置加载后，自己遍历 docs/ 给每张图片算内容 MD5 → 输出文件名 <md5>.<ext>
//   2) 渲染时按「相对 docs 的完整路径」查表，命中就重写 URL
//   3) 构建结束时（buildEnd）把真正被引用到的图片复制到 dist/notes-img/
//   自己的哈希算法、自己的复制时机，任何机器、任何次数构建结果都一致。
const IMG_EXT_RE = /\.(png|jpe?g|gif|svg|webp)$/i
const IMG_OUT_DIR = 'notes-img'

type ImgEntry = { outName: string; source: string }

// 遍历 docs/ 下全部图片文件
function walkImages(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.vitepress' || name === 'dist') continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...walkImages(full))
    else if (IMG_EXT_RE.test(name)) out.push(full)
  }
  return out
}

// 键 = 相对 docs 的路径（正斜杠），值 = { 输出文件名, 源文件绝对路径 }
// 输出名用内容 MD5：图片内容相同 → 同名 → 天然去重
function buildImgIndex(): Map<string, ImgEntry> {
  const index = new Map<string, ImgEntry>()
  for (const file of walkImages(docsDir)) {
    const relFromDocs = relative(docsDir, file).replace(/\\/g, '/')
    const ext = (file.match(IMG_EXT_RE) as RegExpMatchArray)[1].toLowerCase()
    const hash = createHash('md5').update(readFileSync(file)).digest('hex')
    index.set(relFromDocs, { outName: `${hash}.${ext}`, source: file })
  }
  return index
}

const imgIndex = buildImgIndex()

// 本次构建真正被引用到的图片：输出名 → 源文件。buildEnd 只复制这里登记过的。
const usedImages = new Map<string, string>()

// 把渲染后的笔记 HTML 里的相对图片路径重写为 /notes-img/<md5>.<ext>
// baseDir：图片相对路径的基准目录（分区根，如 docs/notes）
// 查不到（文件不存在 / 路径越界）时保留原样并告警，不再做 base64 内联——
// 内联会让 HTML 体积按图片总量膨胀，正是这次要根除的问题。
function rewriteImgSrcs(
  html: string,
  noteRelDir: string,
  baseDir: string = NOTES_DIR
): string {
  return html.replace(
    /(<img[^>]*\bsrc=)(["'])([^"']+)(\2)/g,
    (all, pre: string, q: string, src: string) => {
      if (!/^(?:\.{0,2}\/|(?![a-z]+:|\/)).*\.(png|jpe?g|gif|svg|webp)$/i.test(src)) return all
      // 反斜杠路径归一：Windows 导出的 md 里是 assets\xxx.png 或 .\assets\xxx.png，
      // markdown-it 渲染后变成 assets%5Cxxx.png 或 .%5Cassets%5Cxxx.png。
      const normSrc = src.replace(/%5C/gi, '/').replace(/\\/g, '/')
      const srcPath = noteRelDir + normSrc.replace(/^\.\//, '')
      const full = resolvePath(baseDir, srcPath)
      const entry = existsSync(full)
        ? imgIndex.get(relative(docsDir, full).replace(/\\/g, '/'))
        : undefined
      if (!entry) {
        console.warn(`[notes-img] 图片未找到，保留原路径：${src}`)
        return all
      }
      usedImages.set(entry.outName, entry.source)
      return `${pre}${q}/${IMG_OUT_DIR}/${entry.outName}${q}`
    }
  )
}

// ===== 正文标题锚点：去掉 href，交给 NoteView 就地滚动 =====
// 标题旁那个 hover 才出现的 #，html 是 <a class="header-anchor" href="#slug">。
// 首页把全部分区正文挂在同一个 DOM 里，这个 # 在这里只是「本页内滚动」，不是导航。
//
// 为什么不能在组件里拦点击：VitePress 的全局点击代理注册在 window 上，且是
// capture 阶段（client/app/router.js 的 window.addEventListener('click', …, {capture:true})）。
// capture 自上而下先到 window，组件里冒泡阶段加的 @click 永远排在它后面。它一拿到
// href="#slug" 就会 pushState 改地址并派发 hashchange；HomeNoteList 收到一个既不是
// #note-<分区>/<key> 也不是分区名的 hash，按兜底逻辑把分区翻回首页 —— 左侧目录消失。
// 在组件里 preventDefault 已经晚了一步。
//
// 所以在这里把 href 换成 data-heading：代理取不到 linkHref 就整段跳过这次点击，
// 滚动改由 NoteView 负责（按「当前这篇」的范围找标题，避开跨笔记的同名 id）。
function rewriteInlineAnchors(html: string): string {
  return html.replace(
    /<a\b([^>]*?)\s+href="(#[^"]*)"([^>]*)>/g,
    (all, before: string, href: string, after: string) => {
      const slug = href.slice(1)
      // 空锚点（href="#"）不是标题锚点；#note-… 是站内笔记地址，要留给路由处理
      if (!slug || slug.startsWith('note-')) return all
      const attrs = (before + ' ' + after).replace(/\s+/g, ' ').trim()
      // 值走属性转义：手写 {#id} 里可能出现 & " ' <
      const value = slug
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
      // tabindex 必须补：原锚点靠 href 进入 Tab 序列，去掉 href 后要显式加回来
      const head = `<a${attrs ? ' ' + attrs : ''}`
      return `${head} data-heading="${value}" tabindex="0">`
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

// ===== 独立页 → 首页三栏 =====
// hash 的格式与编码规则统一在 shared/noteHash.ts，与主题的运行时改道共用一份实现，
// 避免「构建期写的 hash」和「运行时解析的 hash」两套规则分叉。

// 顶栏导航「首页」项的显示内容：房子图标 + 文字。
// VitePress 用 v-html 渲染菜单项 text（VPNavBarMenuLink / VPNavScreenMenuLink），
// 所以这里直接写内联 SVG；stroke 取 currentColor，颜色自动跟随菜单项本身的三态。
// 两套内容同时输出，由 style.css 按断点取舍：
//   顶栏（>=768px）只显示图标，文字视觉隐藏但留在无障碍树里；
//   移动端抽屉（<768px）显示文字、不显示图标——抽屉是一列文字菜单，单独一个图标会很突兀。
const HOME_NAV_TEXT =
  '<span class="nav-home-label">首页</span>' +
  '<svg class="nav-home-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"' +
  ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  // 原生悬停提示：图标没有文字，鼠标停上去要能看出是什么
  '<title>首页</title>' +
  '<path d="M3 10.5 12 3l9 7.5" />' +
  '<path d="M5.5 9.8V20h13V9.8" />' +
  '</svg>'

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
  // 标签页图标（favicon）。
  // 优先给浏览器 SVG（任意缩放都锐利，体积 280B），不支持 SVG 的旧浏览器回落到 32×32 PNG。
  // 两条 icon 都声明了类型：浏览器按 type 和 sizes 挑一条，不会把两张图都下载。
  // apple-touch-icon 是 iOS 添加到主屏时的图标，需要 180×180 的不透明方图。
  // 三个文件都在 docs/public/ 下，构建时原样复制到站点根，故 href 直接写根路径。
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' }],
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' }]
  ],
  // 构建时给所有页面 <html> 加默认 dark（极客风首屏即深色）
  // 另外：分区笔记的独立页（/notes/x.html 这类）注入一行跳转脚本，把地址换成首页三栏。
  // 为什么在构建期做：独立页是另一套渲染路径（没有左栏目录，见 themeConfig.sidebar），
  // 而站点唯一的主界面是首页三栏。脚本放在 <head> 里 charset 之后、其它资源之前，
  // 浏览器解析到这里就换地址，既不用等 CSS/JS，也不会先闪一下「没有左栏的页面」。
  // 运行时（已经在首页里点搜索结果）的改道在 theme/noteRoute.ts，两处配合覆盖全部入口。
  transformHtml(code, _id, ctx) {
    let out = code.replace(
      '<html lang="zh-CN" dir="ltr">',
      '<html lang="zh-CN" dir="ltr" class="dark">'
    )
    const first = ctx.page.split('/')[0]
    const hash = sectionNav.some((s) => s.key === first) ? notePathToHash(ctx.page) : null
    if (hash) {
      // hash 里有中文和可能出现的引号：用 JSON.stringify 生成合法的 JS 字面量，
      // 再把 < 转义掉，防止文件名里的字符提前闭合 <script>。
      const literal = JSON.stringify(hash).replace(/</g, '\\u003c')
      const base = JSON.stringify(ctx.siteConfig.site.base)
      // 锚在 charset 之后：脚本里含中文，必须让浏览器先确定编码再解析它
      out = out.replace(
        '<meta charset="utf-8">',
        `<meta charset="utf-8">\n    <script>location.replace(${base}+${literal})</script>`
      )
    }
    return out
  },
  // 首页注入全部分区内容（笔记 / 日记 / 归档……）；
  // 每个页面都注入分区导航（二级导航 + 动态 pane 的数据来源）
  transformPageData(pageData) {
    injectSectionContent(pageData)
    pageData.sectionNav = sectionNav
  },
  // 构建收尾：把本次真正被正文引用到的图片复制到 dist/notes-img/
  // 放在 buildEnd 而不是依赖 Vite 的资源管线，是因为这里要的是「我们自己的稳定 URL」，
  // 与 Vite 的 hash 文件名、打包时机都无关。transformPageData 已经把所有命中项登记进 usedImages。
  buildEnd(siteConfig) {
    const outDir = join(siteConfig.outDir, IMG_OUT_DIR)
    mkdirSync(outDir, { recursive: true })
    for (const [outName, source] of usedImages) {
      const dest = join(outDir, outName)
      mkdirSync(dirname(dest), { recursive: true })
      copyFileSync(source, dest)
    }
    console.log(`[notes-img] 已复制 ${usedImages.size} 张图片到 dist/${IMG_OUT_DIR}/`)
  },
  markdown: {
    math: true,
    // 与上方 createMarkdownRenderer 的 theme 保持一致（独立页代码块配色）
    theme: CODE_THEME
  },
  ignoreDeadLinks: true,
  themeConfig: {
    nav: [
      // 搜索栏右侧的导航项：首页改成房子图标。
      // VitePress 用 v-html 渲染菜单项的 text（见 VPNavBarMenuLink / VPNavScreenMenuLink），
      // 所以这里直接放内联 SVG；stroke 取 currentColor，颜色自动跟随菜单项本身
      // （普通 / hover / active 三态都不用另写）。
      // 文字保留在 visually-hidden 里：图标对读屏和 SEO 没有语义，链接名不能丢。
      { text: HOME_NAV_TEXT, link: '/' }
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
