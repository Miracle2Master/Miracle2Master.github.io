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

const MAX_SHOW = 5

const groups = computed(() => {
  const map = new Map<string, Entry[]>()
  for (const [path, raw] of Object.entries(modules)) {
    const rel = path.replace(/^\.\.\/\.\.\/docs\//, '')
    if (rel === 'index.md') continue
    if (rel === 'notes.md') continue
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
    return {
      group,
      entries: entries.slice(0, MAX_SHOW),
      total: entries.length,
      link: '/category/' + group + '.html',
      order: Math.min(...entries.map((e) => e.order))
    }
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
          <div class="entry-list">
            <a v-for="e in g.entries" :key="e.link" class="entry-tag" :href="e.link">{{ e.title }}</a>
            <a v-if="g.total > MAX_SHOW" class="more-link" :href="g.link">查看全部（共 {{ g.total }} 篇）→</a>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.home-note-list {
  margin-top: 0;
  padding: 48px 0;
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
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.note-group {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  padding: 20px 24px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
}

.note-group h3 {
  flex-shrink: 0;
  min-width: 120px;
  font-size: 18px;
  line-height: 24px;
  font-weight: 600;
  margin: 0;
  color: var(--vp-c-text-1);
}

.entry-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.entry-tag {
  display: inline-block;
  padding: 4px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  background: var(--vp-c-bg);
  color: var(--vp-c-brand-1);
  text-decoration: none;
  font-size: 14px;
  line-height: 22px;
}

.entry-tag:hover {
  color: var(--vp-c-brand-2);
  border-color: var(--vp-c-brand-1);
}

.more-link {
  display: inline-block;
  font-size: 13px;
  color: var(--vp-c-brand-1);
  text-decoration: none;
}

.more-link:hover {
  color: var(--vp-c-brand-2);
}
</style>
