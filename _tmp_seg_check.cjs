// 临时脚本：核对 Redis 相关文件在 buildSidebar 中的 seg 划分
const { readdirSync, readFileSync, statSync } = require('node:fs')
const { join, relative } = require('node:path')

const docsDir = 'docs'
function walk(dir) {
  const out = []
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
const files = walk(docsDir).filter((f) => f.includes('Redis'))
for (const f of files) {
  const rel = relative(docsDir, f).replace(/\\/g, '/')
  const seg = rel.split('/')
  console.log(rel, '| seg.length =', seg.length, '| seg[1] =', JSON.stringify(seg[1]))
}