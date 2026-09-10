<script setup lang="ts">
import { computed } from 'vue'

const modules = import.meta.glob('../../../docs/**/*.md', { query: '?raw', import: 'default', eager: true })

type Entry = { title: string; link: string }

function firstTitle(raw: string): string {
  const m = raw.match(/^#\s+(.+)$/m)
  return m ? m[1].trim() : ''
}

function sortKey(name: string): number {
  const m = name.match(/^(\d+)/)
  return m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER
}

const groups = computed(() => {
  const map = new Map<string, Entry[]>()
  for (const [path, raw] of Object.entries(modules)) {
    const rel = path.replace(/^\.\.\/\.\.\/\.\.\/docs\//, '')
    if (rel === 'index.md') continue
    const seg = rel.split('/')
    const group = seg.length > 1 ? seg[0] : '其他'
    const title = firstTitle(raw as string) || seg[seg.length - 1].replace(/\.md$/, '')
    const link = '/' + rel.replace(/\.md$/, '.html')
    if (!map.has(group)) map.set(group, [])
    map.get(group)!.push({ title, link })
  }
  const arr = Array.from(map.entries()).map(([group, entries]) => {
    entries.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
    return { group, entries }
  })
  arr.sort(
    (a, b) =>
      sortKey(a.group) - sortKey(b.group) || a.group.localeCompare(b.group, 'zh-CN')
  )
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
.note-list ul {
  list-style: none;
  padding-left: 0;
}
.note-list li {
  margin: 0.25em 0;
}
</style>
