// 「首页三栏里某一篇笔记」的地址 hash 编解码。
//
// 格式：#note-<分区>/<笔记 key>
// 例：#note-notes/Spring/AI/AgentScope
//
// 为什么必须带分区：笔记 key 是「相对分区根」的路径，各分区会撞名
// （notes / diary / archive 三处都有 说明.md，key 都是「说明」）。
// 只带 key 时无法判断属于哪个分区，会跳到错误的内容上。
//
// 为什么每个路径段都要 encodeURIComponent：文件名可能含 # % 空格 等字符，
// 直接拼进 location.hash 会被浏览器当成语法而不是数据（# 之后的全部丢弃、
// % 被当成转义开头）。按段编码、解析时整体解码，往返无损。
//
// 放在 .vitepress/shared/ 而不是 theme/ 下：构建期的 config.mts 也要用同一套规则
// 往独立页里注跳转脚本，两边共用一份实现，避免编码方式不一致导致跳错。

// 笔记 key / 分区名 → hash（已编码）
export function noteHash(section: string, key: string): string {
  const tail = key
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/')
  return '#note-' + encodeURIComponent(section) + '/' + tail
}

// 解出 hash 的明文（去掉开头的 #）
// 非法转义序列（如手写的 #note-a%zz）会让 decodeURIComponent 抛错，
// 这时退回原串：不能因为一个畸形地址把整个同步流程打断。
export function decodeHash(hash: string): string {
  const raw = hash.replace(/^#/, '')
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

// 解析 #note-...
//   新格式 #note-<分区>/<key> → { section: 分区, key }
//   旧格式 #note-<key>        → { section: '', key }，分区由调用方按归属反查
//      （旧格式只可能来自改造前的链接，保留兼容）
// 不是笔记 hash 时返回 null
export function parseNoteHash(
  hash: string,
  sections: { key: string }[]
): { section: string; key: string } | null {
  const h = decodeHash(hash)
  if (!h.startsWith('note-')) return null
  const rest = h.slice('note-'.length)
  if (!rest) return null

  const at = rest.indexOf('/')
  // 首段命中分区名才算新格式；否则整串当旧格式的 key。
  // at === -1 时没有分隔符，一定是旧格式（分区名后面必然跟 '/'）。
  if (at !== -1) {
    const head = rest.slice(0, at)
    if (sections.some((s) => s.key === head)) {
      return { section: head, key: rest.slice(at + 1) }
    }
  }
  return { section: '', key: rest }
}

// 构建期用：md 相对路径 → hash；不是分区内的笔记则返回 null
// 'notes/Spring/AI/AgentScope.md' → '#note-notes/Spring/AI/AgentScope'
export function notePathToHash(mdPath: string): string | null {
  if (!mdPath.endsWith('.md')) return null
  const key = mdPath.slice(0, -'.md'.length)
  const seg = key.split('/')
  // 至少「分区/笔记」两级。docs 根目录只有 index.md（→ '/'）与 404.md，
  // 一级路径不属于任何分区；而 docs 下每个一级目录都会被 config.mts 扫成分区，
  // 所以「两级以上」已经等价于「属于某个分区」，不需要再查分区表。
  if (seg.length < 2 || !seg[0]) return null
  return noteHash(seg[0], seg.slice(1).join('/'))
}
