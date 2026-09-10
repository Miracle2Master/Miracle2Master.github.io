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
    const seg = rel.split('/')
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
  <section class="home-note-list">
    <div class="container">
      <h2 class="section-title">笔记目录</h2>
      <div class="group-grid">
        <div v-for="g in groups" :key="g.group" class="note-group">
          <h3>{{ g.group }}</h3>
          <ul>
            <li v-for="e in g.entries" :key="e.link">
              <a :href="e.link">{{ e.title }}</a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.home-note-list {
  margin-top: 48px;
  padding: 48px 0;
  border-top: 1px solid var(--vp-c-divider);
}

.container {
  margin: auto;
  width: 100%;
  max-width: 1152px;
  padding: 0 24px;
}

.section-title {
  font-size: 28px;
  line-height: 36px;
  font-weight: 600;
  text-align: center;
  margin-bottom: 32px;
}

.group-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 24px;
}

.note-group h3 {
  font-size: 18px;
  line-height: 24px;
  font-weight: 600;
  margin: 0 0 12px;
  color: var(--vp-c-text-1);
}

.note-group ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.note-group li {
  margin: 0.25em 0;
}

.note-group a {
  color: var(--vp-c-brand-1);
  text-decoration: none;
  font-size: 14px;
}

.note-group a:hover {
  color: var(--vp-c-brand-2);
}
</style>
