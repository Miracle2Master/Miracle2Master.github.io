<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'

type Note = { title: string; key: string; html: string; order: number }

const props = defineProps<{ notes: Note[]; currentKey: string }>()
const emit = defineEmits<{ open: [key: string]; back: [] }>()

// 当前笔记
const current = computed(() => props.notes.find((n) => n.key === props.currentKey))
// 当前文件夹名（一级目录）
const group = computed(() => props.currentKey.split('/')[0] ?? '')
// 左侧：当前文件夹内全部文件
const fileList = computed(() => props.notes.filter((n) => n.key.startsWith(group.value + '/')))

// ===== 右侧：当前文件标题目录（扫描 v-html 渲染后的标题） =====
const contentRef = ref<HTMLElement | null>(null)
type OutlineItem = { id: string; title: string; level: number; el: HTMLElement }
const outline = ref<OutlineItem[]>([])
const activeOutline = ref('')

// markdown-it 渲染的标题无 id，扫描时补 id（-1 是 textContent 空时排除）
function scanOutline() {
  const root = contentRef.value
  outline.value = []
  if (!root) return
  const els = root.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6')
  els.forEach((h, i) => {
    const title = h.textContent?.trim() ?? ''
    if (!title) return
    if (!h.id) h.id = 'note-h-' + i
    outline.value.push({ id: h.id, title, level: Number(h.tagName.slice(1)), el: h })
  })
  activeOutline.value = ''
}

async function rescan() {
  await nextTick()
  scanOutline()
  window.scrollTo({ top: 0, behavior: 'auto' })
}

watch(() => props.currentKey, rescan)
onMounted(rescan)

// 点击标题目录 → 滚动到对应标题
function goHeading(id: string) {
  const el = outline.value.find((o) => o.id === id)?.el
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// 滚动高亮当前标题
let io: IntersectionObserver | null = null
function setupObserver() {
  io?.disconnect()
  const el = contentRef.value
  if (!el) return
  io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (en.isIntersecting) activeOutline.value = en.target.id
      }
    },
    { rootMargin: '-90px 0px -72% 0px', threshold: 0 }
  )
  outline.value.forEach((o) => io!.observe(o.el))
}

watch(outline, setupObserver, { flush: 'post' })
onMounted(() => {
  if (outline.value.length) setupObserver()
})
onUnmounted(() => io?.disconnect())
</script>

<template>
  <div class="note-view">
    <!-- 左侧：文件夹内文件目录 -->
    <aside class="note-file-nav">
      <button class="back-btn" @click="emit('back')">← 返回全部</button>
      <h2 class="file-nav-title">{{ group }}</h2>
      <ul class="file-nav-list">
        <li v-for="n in fileList" :key="n.key">
          <button
            class="file-nav-item"
            :class="{ current: n.key === currentKey }"
            @click="emit('open', n.key)"
          >{{ n.title }}</button>
        </li>
      </ul>
    </aside>

    <!-- 中间：当前笔记正文 -->
    <div class="note-body">
      <article ref="contentRef" class="vp-doc" v-html="current?.html ?? ''"></article>
    </div>

    <!-- 右侧：当前文件标题目录 -->
    <aside class="note-outline" v-if="outline.length">
      <h2 class="outline-title">本页目录</h2>
      <ul class="outline-list">
        <li
          v-for="o in outline"
          :key="o.id"
          :class="['lvl' + o.level, { active: activeOutline === o.id }]"
        >
          <button class="outline-item" @click="goHeading(o.id)">{{ o.title }}</button>
        </li>
      </ul>
    </aside>
  </div>
</template>

<style scoped>
.note-view {
  display: flex;
  gap: 28px;
  align-items: flex-start;
  /* 宽度由外层 .tab-pane-full 撑满导航栏宽度，左右栏可真正顶到两侧 */
  width: 100%;
}

/* ===== 左侧：文件目录（无方框，窄，左起点不动） ===== */
.note-file-nav {
  flex: 2;
  min-width: 0;
  position: sticky;
  top: calc(var(--vp-nav-height) + 56px);
  max-height: calc(100vh - var(--vp-nav-height) - 72px);
  overflow-y: auto;
  padding: 0;
  /* 隐藏滚动条（仍可滚，只是不显示滚动轮） */
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.note-file-nav::-webkit-scrollbar {
  display: none;
}

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

.file-nav-title {
  font-size: 16px;
  line-height: 22px;
  font-weight: 700;
  margin: 14px 0 10px;
  color: var(--vp-c-brand-1);
}

.file-nav-list {
  list-style: none;
  padding-left: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.file-nav-list li {
  margin: 0;
  padding: 0;
}

.file-nav-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 12px;
  font-size: 14px;
  font-family: inherit;
  line-height: 1.6;
  color: var(--vp-c-text-2);
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.file-nav-item:hover {
  background: rgba(34, 211, 238, 0.08);
  color: var(--vp-c-brand-1);
}

.file-nav-item.current {
  background: rgba(34, 211, 238, 0.12);
  color: var(--vp-c-brand-1);
  font-weight: 600;
  box-shadow: inset 3px 0 0 var(--vp-c-brand-1);
}

/* ===== 中间：正文 ===== */
.note-body {
  flex: 7;
  min-width: 0;
  max-width: 100%;
}

.note-body :deep(.vp-doc) {
  max-width: 100%;
}

/* ===== 右侧：标题目录（右起点不动，窄一点，隐藏滚动条） ===== */
.note-outline {
  flex: 1.5;
  min-width: 0;
  position: sticky;
  top: calc(var(--vp-nav-height) + 56px);
  max-height: calc(100vh - var(--vp-nav-height) - 72px);
  overflow-y: auto;
  border-left: 1px solid var(--vp-c-divider);
  padding-left: 16px;
  /* 隐藏滚动条（仍可滚，只是不显示滚动轮） */
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.note-outline::-webkit-scrollbar {
  display: none;
}

.outline-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  margin: 0 0 12px;
  letter-spacing: 0.5px;
}

.outline-list {
  list-style: none;
  padding-left: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.outline-list li {
  margin: 0;
  padding: 0;
  /* 文本超长时截断为省略号，避免把目录栏撑宽 */
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.outline-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 4px 8px;
  font-size: 13px;
  line-height: 1.6;
  font-family: inherit;
  color: var(--vp-c-text-2);
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

/* 让 button 内部文本也参与截断 */
.outline-item {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.outline-list li.lvl2 .outline-item { padding-left: 8px; }
.outline-list li.lvl3 .outline-item { padding-left: 20px; }
.outline-list li.lvl4 .outline-item,
.outline-list li.lvl5 .outline-item,
.outline-list li.lvl6 .outline-item { padding-left: 32px; }

.outline-item:hover {
  color: var(--vp-c-brand-1);
}

.outline-list li.active .outline-item {
  color: var(--vp-c-brand-1);
  background: rgba(34, 211, 238, 0.08);
}

/* ===== 移动端：三栏纵向堆叠 ===== */
@media (max-width: 960px) {
  .note-view {
    flex-direction: column;
  }
  .note-file-nav,
  .note-outline {
    position: static;
    max-height: none;
    width: 100%;
  }
  .note-outline {
    border-left: none;
    border-top: 1px solid var(--vp-c-divider);
    padding-left: 0;
    padding-top: 12px;
  }
}
</style>
