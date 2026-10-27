// 独立文档页 → 首页三栏的改道。
//
// 为什么需要：VitePress 本地搜索按「页面路由」建索引，结果链接是
//   /notes/Spring/AI/AgentScope.html#某标题
// 点进去走标准文档页，那套页面没有左栏目录（全站 themeConfig.sidebar 为 false），
// 与首页三栏（HomeNoteList → SectionPane → NoteView）是两条完全独立的渲染路径——
// 于是「搜索跳过去，左边目录没了」。
//
// 站点唯一的主界面是首页三栏，所以这里把这些地址统一改写成
//   /#note-<分区>/<笔记 key>
// 首页的 SectionPane 本来就能按这个 hash 定位到具体某一篇，不必再造一套左栏。
//
// 两类入口分工：
//   1) 直接打开独立页（构建产物里的 /notes/x.html：书签、外链、搜索「新标签页打开」）
//      → 构建期注入的 <head> 内联脚本先换地址，见 config.mts 的 transformHtml。
//        放在那里是为了不等 JS 下载完就跳走，也不会先闪一下没有左栏的页面。
//   2) 站内已经跑起来之后（在首页选中搜索结果、点正文里的站内链接）
//      → 本文件的 installHomeNoteRedirect。
//
// 代价：会丢失「精确跳到某个标题」。首页全部分区的正文同时存在于 DOM 里
// （HomeNoteList 用 v-show 挂载所有 pane），标题 id 跨分区重复，按 id 定位会落到
// 别的分区的同名标题上，所以统一落到笔记开头。

import { noteHash } from '../shared/noteHash'

// 把站内 URL 换算成首页的 note hash；不是「分区内的笔记页」时返回 null
export function homeNoteHash(href: string, base: string): string | null {
  let url: URL
  try {
    // base 只用于解析相对链接，域名无意义
    url = new URL(href, 'http://internal.invalid/')
  } catch {
    return null
  }

  // 中文文件名在 URL 里是 percent-encoded，先还原成 md 里的真实路径。
  // 文件名含裸 %（如 100%完成.md）时解码会抛错，那就用原串：
  // 宁可拼出一个对不上的 key（落到该分区第一篇），也不能让跳转整体失效。
  let path = url.pathname
  try {
    path = decodeURIComponent(path)
  } catch {
    /* 保留原串 */
  }

  const b = base.endsWith('/') ? base : base + '/'
  if (!path.startsWith(b)) return null
  path = path.slice(b.length)

  // 只处理文档页（分区下的 .md 构建后都是 .html；本站未开启 cleanUrls）
  if (!path.endsWith('.html')) return null
  path = path.slice(0, -'.html'.length)

  const seg = path.split('/')
  // 至少「分区/笔记」两级。docs 根目录只有 index.md（→ '/'）和 404.md，
  // 一级路径不属于任何分区。这里不查分区表，是为了让 noteRoute 不依赖 pageData；
  // 构建期注入脚本那一侧会按分区表过滤（config.mts 的 transformHtml）。
  if (seg.length < 2 || !seg[0]) return null

  return noteHash(seg[0], seg.slice(1).join('/'))
}

type RoutableRouter = {
  route: { path: string }
  go: (to?: string) => Promise<void>
  onBeforeRouteChange?: (to: string) => unknown
}

// 当前是不是首页。与 CustomLayout 的 isHome 同一口径：
// normalizeHref 一般会把 /index.html 归一成 /，但两种写法都认，免得判断错位。
function isHomePath(path: string, base: string): boolean {
  return path === base || path === base + 'index.html'
}

// 挂在 onBeforeRouteChange 而不是拦链接点击：搜索框选中结果走的是 router.go()，
// 不经过 document 上的点击代理，路由钩子对两条路径都生效。
export function installHomeNoteRedirect(router: RoutableRouter, base: string): void {
  // 首次导航发生在 app.mount() 之前，此时首页组件还没挂载——
  // 只改地址没有人会响应，必须整页替换。
  let firstNav = true

  router.onBeforeRouteChange = (to: string) => {
    const isFirst = firstNav
    firstNav = false

    const hash = homeNoteHash(to, base)
    if (!hash) return

    const target = base + hash

    // 已经在首页（在首页选中搜索结果）：不能重新 router.go，那会把首页模块再加载一遍。
    // 只换地址栏 hash 再手动派发 hashchange —— HomeNoteList / SectionPane 本来就在监听它，
    // 与 VitePress 自己处理同页锚点点击的做法一致。
    if (!isFirst && isHomePath(router.route.path, base)) {
      history.replaceState(null, '', target)
      window.dispatchEvent(
        new HashChangeEvent('hashchange', {
          oldURL: window.location.href,
          newURL: new URL(target, window.location.href).href
        })
      )
      // 换笔记等于换了一篇正文，滚回开头——与点左栏打开某篇（SectionPane 的 openNote）一致。
      // 不这么做的话，首页滚到一半时搜索跳转，会停在上一篇的滚动位置上。
      window.scrollTo({ top: 0, behavior: 'auto' })
      return false
    }

    // 其余情况整页换成首页（首屏直接打开独立页、或从别的站内页过来）。
    // 不就地走前端路由：独立页是按文档结构 SSR 出来的，就地换成首页会让 Vue
    // 拿首页的结构去水合一份文档页 DOM，必然错乱。
    // 用 replace 而不是 assign，免得「没有左栏的那一页」留在历史里。
    window.location.replace(target)
    return false
  }
}
