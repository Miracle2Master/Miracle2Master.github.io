<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useData } from 'vitepress'
import { sectionTab } from './section'
import NoteView from './NoteView.vue'

const { page } = useData()

// 构建期注入：全部笔记（title/key/html/order）
type NoteEntry = { title: string; key: string; html: string; order: number }
const allNotes = computed<NoteEntry[]>(() => (page.value.noteContent as NoteEntry[]) ?? [])

// 列表分组（与之前一致：按一级目录分组，每组最多 3 条）
type Entry = { title: string; key: string; order: number }
type Group = { group: string; entries: Entry[]; total: number; order: number }

const MAX_SHOW = 3

const groups = computed<Group[]>(() => {
  const map = new Map<string, Entry[]>()
  for (const n of allNotes.value) {
    const seg = n.key.split('/')
    const group = seg.length > 1 ? seg[0] : '其他'
    if (!map.has(group)) map.set(group, [])
    map.get(group)!.push({ title: n.title, key: n.key, order: n.order })
  }
  const arr = Array.from(map.entries()).map(([group, entries]) => {
    entries.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'zh-CN'))
    return {
      group,
      entries: entries.slice(0, MAX_SHOW),
      total: entries.length,
      order: Math.min(...entries.map((e) => e.order))
    }
  })
  arr.sort((a, b) => a.order - b.order || a.group.localeCompare(b.group, 'zh-CN'))
  return arr
})

// ===== 主容器内子视图状态：''=列表 / note-xxx=某笔记 / cat-xxx=某分类 =====
const currentNoteKey = ref('')
const currentCat = ref('')

// 该分类的全部笔记（展开「查看全部」）
const catNotes = computed<Entry[]>(() => {
  const seg = currentCat.value.split('/')
  return allNotes.value
    .filter((n) => n.key.startsWith(currentCat.value + '/'))
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'zh-CN'))
    .map((n) => ({ title: n.title, key: n.key, order: n.order }))
})

// 当前阅读的笔记内容（HTML）
const currentNoteHtml = computed(() => {
  const hit = allNotes.value.find((n) => n.key === currentNoteKey.value)
  return hit ? hit.html : ''
})
const currentNoteTitle = computed(() => {
  const hit = allNotes.value.find((n) => n.key === currentNoteKey.value)
  return hit ? hit.title : ''
})

// hash 解析：view#note-key 或 view#cat-group
function parseHash(): { note: string; cat: string } {
  const h = window.location.hash.replace(/^#/, '')
  if (h.startsWith('note-')) return { note: h.slice(5), cat: '' }
  if (h.startsWith('cat-')) return { note: '', cat: h.slice(4) }
  return { note: '', cat: '' }
}

// 写 hash：当前子视图 + 分区，刷新可还原（遵循 hash 记录原则）
function applyHash() {
  const parts: string[] = []
  if (currentNoteKey.value) parts.push('note-' + currentNoteKey.value)
  else if (currentCat.value) parts.push('cat-' + currentCat.value)
  const hash = parts.join('-')
  history.replaceState(null, '', hash ? '#' + hash : '/')
}

// 打开某篇笔记（就地显示，不跳页）
function openNote(key: string) {
  currentNoteKey.value = key
  currentCat.value = ''
  // 兜底：VitePress 路由对 href="#" 会临时改 hash 触发 hashchange，可能把分区翻回 home；
  // 这里直接锁定 learning 分区，确保笔记内容在主容器内显示
  sectionTab.value = 'learning'
  applyHash()
  scrollToTop()
}

// 打开分类目录（「查看全部」/ 卡片空白处）
function openCat(group: string) {
  currentCat.value = group
  currentNoteKey.value = ''
  sectionTab.value = 'learning'
  applyHash()
  scrollToTop()
}

// 返回列表
function backToList() {
  currentNoteKey.value = ''
  currentCat.value = ''
  sectionTab.value = 'learning'
  history.replaceState(null, '', '/')
  scrollToTop()
}

// 点击分类卡片空白处 → 打开该分类；点内部链接（标签）打开笔记，均不跳页
function goCategory(group: string, e: Event) {
  const target = e.target as HTMLElement
  if (target.closest('a')) return
  openCat(group)
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'auto' })
}

// 从 hash 恢复子视图
function syncFromHash() {
  const { note, cat } = parseHash()
  if (note && allNotes.value.some((n) => n.key === note)) {
    currentNoteKey.value = note
    currentCat.value = ''
  } else if (cat && groups.value.some((g) => g.group === cat)) {
    currentCat.value = cat
    currentNoteKey.value = ''
  } else {
    currentNoteKey.value = ''
    currentCat.value = ''
  }
}

// 离开学习记录 Tab → 清空子视图，回到列表
watch(sectionTab, (v) => {
  if (v !== 'learning') {
    currentNoteKey.value = ''
    currentCat.value = ''
  }
})

onMounted(() => {
  syncFromHash()
  window.addEventListener('hashchange', syncFromHash)
})
onUnmounted(() => {
  window.removeEventListener('hashchange', syncFromHash)
})
</script>

<template>
  <div class="learning-pane">
    <!-- 列表视图 -->
    <div v-if="!currentNoteKey && !currentCat" class="group-grid">
      <div
        v-for="g in groups"
        :key="g.group"
        class="note-group"
        role="link"
        tabindex="0"
        @click="goCategory(g.group, $event)"
        @keydown.enter="goCategory(g.group, $event)"
      >
        <h3>{{ g.group }}</h3>
        <div class="entry-list">
          <a
            v-for="e in g.entries"
            :key="e.key"
            class="entry-tag"
            href="#"
            @click.prevent="openNote(e.key)"
          >{{ e.title }}</a>
          <a
            v-if="g.total > MAX_SHOW"
            class="more-link"
            href="#"
            @click.prevent="openCat(g.group)"
          >查看全部（共 {{ g.total }} 篇）→</a>
        </div>
        <span class="cat-hint">进入该分类 →</span>
      </div>
    </div>

    <!-- 分类目录视图（主容器内） -->
    <div v-else-if="currentCat" class="cat-view">
      <button class="back-btn" @click="backToList">← 返回全部</button>
      <h2 class="cat-title">{{ currentCat }}</h2>
      <ul class="cat-list">
        <li v-for="e in catNotes" :key="e.key">
          <a href="#" @click.prevent="openNote(e.key)">{{ e.title }}</a>
        </li>
      </ul>
    </div>

    <!-- 笔记阅读视图：主容器内三栏（左文件目录 / 中正文 / 右标题目录），不跳页 -->
    <div v-else>
      <NoteView
        :notes="allNotes"
        :current-key="currentNoteKey"
        @open="openNote"
        @back="backToList"
      />
    </div>
  </div>
</template>

<style scoped>
.group-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

@media (max-width: 900px) {
  .group-grid {
    grid-template-columns: 1fr;
  }
}

.note-group {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  padding: 20px 24px;
  border: 1px solid rgba(34, 211, 238, 0.28);
  border-radius: 12px;
  background: var(--vp-c-bg);
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.note-group:hover {
  border-color: rgba(34, 211, 238, 0.6);
  box-shadow: 0 0 14px rgba(34, 211, 238, 0.22);
}

.note-group h3 {
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
  border: 1px solid rgba(34, 211, 238, 0.35);
  border-radius: 999px;
  background: rgba(34, 211, 238, 0.06);
  color: var(--vp-c-brand-1);
  text-decoration: none;
  font-size: 14px;
  line-height: 22px;
  transition: all 0.2s ease;
}

.entry-tag:hover {
  color: #04121a;
  background: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 10px rgba(34, 211, 238, 0.5);
}

.more-link {
  display: inline-block;
  font-size: 13px;
  color: var(--vp-c-brand-1);
  text-decoration: none;
  transition: color 0.2s ease;
}

.more-link:hover {
  color: var(--vp-c-brand-2);
  text-decoration: underline;
}

/* 整卡可点击提示：右下角 */
.cat-hint {
  position: absolute;
  right: 16px;
  bottom: 10px;
  font-size: 12px;
  color: var(--vp-c-brand-1);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.note-group:hover .cat-hint {
  opacity: 1;
}

/* ===== 子视图（分类目录 / 笔记阅读） ===== */
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  font-size: 13px;
  font-family: inherit;
  color: var(--vp-c-brand-1);
  background: rgba(34, 211, 238, 0.06);
  border: 1px solid rgba(34, 211, 238, 0.35);
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.back-btn:hover {
  color: #04121a;
  background: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

.cat-title,
.note-title {
  font-size: 22px;
  line-height: 28px;
  font-weight: 700;
  margin: 16px 0 16px;
  color: var(--vp-c-brand-1);
}

.cat-list {
  list-style: none;
  padding-left: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cat-list a {
  display: inline-block;
  padding: 8px 16px;
  border: 1px solid rgba(34, 211, 238, 0.35);
  border-radius: 999px;
  background: rgba(34, 211, 238, 0.06);
  color: var(--vp-c-brand-1);
  text-decoration: none;
  font-size: 14px;
  transition: all 0.2s ease;
}

.cat-list a:hover {
  color: #04121a;
  background: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

.note-view {
  max-width: 100%;
}
</style>
