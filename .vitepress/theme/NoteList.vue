<script setup lang="ts">
import { computed } from 'vue'

const modules = import.meta.glob('../../docs/**/*.md', { query: '?raw', import: 'default', eager: true })

type Entry = { title: string; link: string; order: number }

function orderOf(raw: string): number {
  const fm = raw.match(/^---\s*\n([\s\S]*?)\n---/)
  if (!fm) return Number.MAX_SAFE_INTEGER
  const m = fm[1].match(/order\s*:\s*(\d+)/)
  return m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER
}

const groups = computed(() => {
  const map = new Map<string, Entry[]>()
  for (const [path, raw] of Object.entries(modules)) {
    const rel = path.replace(/^\.\.\/\.\.\/docs\//, '')
    if (rel === 'index.md') continue
    if (rel === 'notes.md') continue
    if (rel === 'planning.md') continue
    if (rel.startsWith('planning/')) continue
    const seg = rel.split('/')
    if (seg[0] === 'category') continue
    const group = seg.length > 1 ? seg[0] : '其他'
    const title = seg[seg.length - 1].replace(/\.md$/, '')
    const link = '/' + rel.replace(/\.md$/, '.html')
    const order = orderOf(raw as string)
    if (!map.has(group)) map.set(group, [])
    map.get(group)!.push({ title, link, order })
  }
  const arr = Array.from(map.entries()).map(([group, entries]) => {
    entries.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'zh-CN'))
    return { group, entries, order: Math.min(...entries.map((e) => e.order)) }
  })
  arr.sort((a, b) => a.order - b.order || a.group.localeCompare(b.group, 'zh-CN'))
  return arr
})
</script>

<template>
  <div class="note-list">
    <div v-for="g in groups" :key="g.group" class="note-group">
      <h2>{{ g.group }}</h2>
      <ul>
        <li v-for="e in g.entries" :key="e.link">
          <a :href="e.link">{{ e.title }}</a>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.note-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin: 0;
}

.note-group {
  border: 1px solid rgba(34, 211, 238, 0.28);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
  padding: 20px 24px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.note-group:hover {
  border-color: rgba(34, 211, 238, 0.6);
  box-shadow: 0 0 14px rgba(34, 211, 238, 0.22);
}

.note-group h2 {
  font-size: 18px;
  line-height: 24px;
  font-weight: 600;
  margin: 0 0 12px;
  color: var(--vp-c-text-1);
}

.note-list ul {
  list-style: none;
  padding-left: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.note-list li {
  margin: 0;
}

.note-list a {
  display: inline-block;
  padding: 4px 12px;
  border: 1px solid rgba(34, 211, 238, 0.35);
  border-radius: 999px;
  background: rgba(34, 211, 238, 0.06);
  color: var(--vp-c-brand-1);
  text-decoration: none;
  font-size: 14px;
  line-height: 22px;
  transition: all 0.2s ease;
}

.note-list a:hover {
  color: #04121a;
  background: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 10px rgba(34, 211, 238, 0.5);
}
</style>
