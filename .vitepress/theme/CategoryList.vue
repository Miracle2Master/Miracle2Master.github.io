<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ name: string }>()

const modules = import.meta.glob('../../docs/**/*.md', { query: '?raw', import: 'default', eager: true })

type Entry = { title: string; link: string; order: number }

function orderOf(raw: string): number {
  const fm = raw.match(/^---\s*\n([\s\S]*?)\n---/)
  if (!fm) return Number.MAX_SAFE_INTEGER
  const m = fm[1].match(/order\s*:\s*(\d+)/)
  return m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER
}

const byOrder = (a: Entry, b: Entry) => a.order - b.order || a.title.localeCompare(b.title, 'zh-CN')

const view = computed(() => {
  const files: Entry[] = []
  const subs = new Map<string, Entry[]>()
  for (const [path, raw] of Object.entries(modules)) {
    const rel = path.replace(/^\.\.\/\.\.\/docs\//, '')
    const seg = rel.split('/')
    if (seg[0] !== props.name) continue
    const title = seg[seg.length - 1].replace(/\.md$/, '')
    const link = '/' + rel.replace(/\.md$/, '.html')
    const order = orderOf(raw as string)
    const entry: Entry = { title, link, order }
    if (seg.length === 2) {
      files.push(entry)
    } else {
      const sub = seg[1]
      if (!subs.has(sub)) subs.set(sub, [])
      subs.get(sub)!.push(entry)
    }
  }
  files.sort(byOrder)
  const subNames = [...subs.keys()].sort((a, b) => {
    const oa = Math.min(...subs.get(a)!.map((e) => e.order))
    const ob = Math.min(...subs.get(b)!.map((e) => e.order))
    return oa - ob || a.localeCompare(b, 'zh-CN')
  })
  const subGroups = subNames.map((sub) => ({ sub, entries: subs.get(sub)!.sort(byOrder) }))
  return { files, subGroups }
})
</script>

<template>
  <div class="category-list">
    <ul class="file-list">
      <li v-for="e in view.files" :key="e.link">
        <a :href="e.link">{{ e.title }}</a>
      </li>
    </ul>
    <div v-for="g in view.subGroups" :key="g.sub" class="sub-group">
      <h2>{{ g.sub }}</h2>
      <ul class="file-list">
        <li v-for="e in g.entries" :key="e.link">
          <a :href="e.link">{{ e.title }}</a>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.file-list {
  list-style: none;
  padding-left: 0;
}
.file-list li {
  margin: 0.4em 0;
}
.file-list a {
  color: var(--vp-c-brand-1);
  text-decoration: none;
}
.file-list a:hover {
  color: var(--vp-c-brand-2);
}
.sub-group {
  margin-top: 24px;
}
.sub-group h2 {
  font-size: 16px;
  margin: 0 0 8px;
}
</style>
