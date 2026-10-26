<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'

type Note = { title: string; key: string; html: string; order: number }

const props = defineProps<{ notes: Note[]; currentKey: string }>()
const emit = defineEmits<{ open: [key: string]; back: [] }>()

// 当前笔记
const current = computed(() => props.notes.find((n) => n.key === props.currentKey))
// 当前文件夹名（一级目录）
const group = computed(() => props.currentKey.split('/')[0] ?? '')
// 当前文件夹内全部笔记
const groupNotes = computed(() => props.notes.filter((n) => n.key.startsWith(group.value + '/')))

// ===== 左侧目录树：把当前文件夹按「子文件夹层级」组织 =====
// 结构：直接文件（顶层）+ 子文件夹（每项含该子文件夹内直接文件 + 更深一层子文件夹）
type TreeFile = { title: string; key: string }
type SubGroup = { name: string; files: TreeFile[]; subs: SubGroup[] }

// 把笔记 key 相对当前文件夹的路径拆段，组装成树
function buildTree(notes: Note[]): { rootFiles: TreeFile[]; subs: SubGroup[] } {
  const rootFiles: TreeFile[] = []
  const subs: SubGroup[] = []

  const findSub = (name: string): SubGroup | undefined => subs.find((s) => s.name === name)

  for (const n of notes) {
    const rel = n.key.slice(group.value.length + 1) // 去掉 "Spring/"
    const seg = rel.split('/')
    const file: TreeFile = { title: n.title, key: n.key }
    if (seg.length === 1) {
      // 当前文件夹直接文件
      rootFiles.push(file)
      continue
    }
    // 一级子文件夹
    let sub = findSub(seg[0])
    if (!sub) {
      sub = { name: seg[0], files: [], subs: [] }
      subs.push(sub)
    }
    if (seg.length === 2) {
      sub.files.push(file)
    } else {
      // 二级子文件夹
      let sub2 = sub.subs.find((s) => s.name === seg[1])
      if (!sub2) {
        sub2 = { name: seg[1], files: [], subs: [] }
        sub.subs.push(sub2)
      }
      if (seg.length === 3) {
        sub2.files.push(file)
      } else {
        // 更深层级：逐级下钻（通用处理）
        let cur = sub2
        for (let i = 2; i < seg.length - 1; i++) {
          let next = cur.subs.find((s) => s.name === seg[i])
          if (!next) {
            next = { name: seg[i], files: [], subs: [] }
            cur.subs.push(next)
          }
          cur = next
        }
        cur.files.push(file)
      }
    }
  }

  // 子文件夹内排序（保持文件顺序，组按文件夹名）
  const sortFiles = (files: TreeFile[]) =>
    files.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
  const sortSubs = (list: SubGroup[]) => list.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))

  sortFiles(rootFiles)
  sortSubs(subs)
  for (const s of subs) {
    sortFiles(s.files)
    sortSubs(s.subs)
    for (const s2 of s.subs) {
      sortFiles(s2.files)
      sortSubs(s2.subs)
    }
  }
  return { rootFiles, subs }
}

const tree = computed(() => buildTree(groupNotes.value))

// ===== 右侧：当前文件标题目录（扫描 v-html 渲染后的标题） =====
const contentRef = ref<HTMLElement | null>(null)
type OutlineItem = { id: string; title: string; level: number; el: HTMLElement }
const outline = ref<OutlineItem[]>([])
const activeOutline = ref('')

// markdown-it 渲染的标题无 id，扫描时补 id
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

// 正文吸顶偏移：页面滚动时标题要停的位置 = 顶部固定区下沿 + 40px 间隙。
// 直接读二级导航（.SecNav，fixed）的底边，而不是拼 --vp-nav-height：
// 桌面端它等于 顶栏(64) + 二级导航(40)，移动端二级导航贴顶等于 40，
// 两种断点都能拿到真实的吸顶线，且与样式里 sticky 的 top 口径一致（桌面两端都是 nav+80）。
function stickyTopOffset(): number {
  const secNav = document.querySelector('.SecNav')
  if (secNav) return secNav.getBoundingClientRect().bottom + 40
  const nav = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--vp-nav-height')
  )
  return (Number.isFinite(nav) ? nav : 0) + 80
}

// 点击标题目录 → 滚动到对应标题
// 滚动发生在整页（window）上，正文不再自建滚动容器：
// 目标 = 标题在文档中的绝对位置 - 吸顶偏移，标题精确停在吸顶线下方、两侧目录不动。
function goHeading(id: string) {
  const el = outline.value.find((o) => o.id === id)?.el
  if (!el) return
  const top = window.scrollY + el.getBoundingClientRect().top - stickyTopOffset()
  window.scrollTo({ top, behavior: 'smooth' })
}

// 滚动高亮当前标题：观察根仍是视口（整页滚动），
// 顶部让出吸顶区（导航 + 二级导航 + 间隙），底部保留 70% 视线区，
// 只有真正落在「吸顶线以下、视口上部」的标题才点亮。
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
    { rootMargin: `-${stickyTopOffset()}px 0px -70% 0px`, threshold: 0 }
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
    <!-- 左侧：文件夹内文件目录（按子文件夹层级展示） -->
    <aside class="note-file-nav">
      <button class="back-btn" @click="emit('back')">← 返回全部</button>
      <h2 class="file-nav-title">{{ group }}</h2>

      <!-- 当前文件夹直接文件 -->
      <ul v-if="tree.rootFiles.length" class="file-nav-list">
        <li v-for="n in tree.rootFiles" :key="n.key">
          <button
            class="file-nav-item"
            :class="{ current: n.key === currentKey }"
            @click="emit('open', n.key)"
          >{{ n.title }}</button>
        </li>
      </ul>

      <!-- 一级子文件夹 -->
      <div v-for="sub in tree.subs" :key="sub.name" class="file-nav-sub">
        <div class="file-nav-sub-title">{{ sub.name }}</div>
        <ul class="file-nav-list">
          <li v-for="n in sub.files" :key="n.key">
            <button
              class="file-nav-item"
              :class="{ current: n.key === currentKey }"
              @click="emit('open', n.key)"
            >{{ n.title }}</button>
          </li>
        </ul>

        <!-- 二级子文件夹 -->
        <div v-for="sub2 in sub.subs" :key="sub2.name" class="file-nav-sub file-nav-sub-2">
          <div class="file-nav-sub-title">{{ sub2.name }}</div>
          <ul class="file-nav-list">
            <li v-for="n in sub2.files" :key="n.key">
              <button
                class="file-nav-item"
                :class="{ current: n.key === currentKey }"
                @click="emit('open', n.key)"
              >{{ n.title }}</button>
            </li>
          </ul>
        </div>
      </div>
    </aside>

    <!-- 中间：当前笔记正文 -->
    <!-- ref 绑在正文容器上，仅用于扫描标题 / 定位目标（正文本身不自建滚动容器） -->
    <div ref="contentRef" class="note-body">
      <article class="vp-doc" v-html="current?.html ?? ''"></article>
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

/* ===== 左/右两栏的吸顶口径（整页滚动时保持不动） =====
   top 与 max-height 都按「内容初始位置」算：
   内容起点 = 顶栏(--vp-nav-height) + 二级导航 40px + 间距 40px
   因此 top = nav + 80px，滚动起点时零位移；max-height 留 16px 底部余量。 */

/* ===== 左侧：文件目录（无方框，窄，左起点不动） ===== */
.note-file-nav {
  flex: 2;
  min-width: 0;
  position: sticky;
  top: calc(var(--vp-nav-height) + 80px);
  max-height: calc(100vh - var(--vp-nav-height) - 96px);
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
  /* 纯文字按钮：去圆框、去背景，与左侧目录标题左对齐（无水平内缩） */
  padding: 6px 0;
  font-size: 13px;
  font-family: inherit;
  color: var(--note-accent);
  background: transparent;
  border: none;
  border-radius: 0;
  cursor: pointer;
  transition: color 0.2s ease;
}

.back-btn:hover {
  color: var(--note-accent-hover);
}

.file-nav-title {
  font-size: 16px;
  line-height: 22px;
  font-weight: 700;
  margin: 14px 0 10px;
  /* 文件夹标题：统一主题蓝 */
  color: var(--note-accent);
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

/* 子文件夹分组：与上一组保持距离 */
.file-nav-sub {
  margin-top: 16px;
}

/* 二级子文件夹：再缩进一层 */
.file-nav-sub-2 {
  margin-top: 8px;
  padding-left: 12px;
  border-left: 1px solid var(--vp-c-divider);
}

/* 子文件夹标题：突出显示 */
.file-nav-sub-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--note-accent);
  letter-spacing: 0.5px;
  padding: 2px 12px 6px;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 子文件夹标题前的层级小箭头 */
.file-nav-sub-title::before {
  content: '▸';
  font-size: 11px;
  color: var(--note-accent);
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
  background: var(--note-active-bg);
  color: var(--note-accent);
}

.file-nav-item.current {
  background: var(--note-active-bg);
  color: var(--note-accent);
  font-weight: 600;
  /* 选中项左侧竖条：与选中字色一致 */
  box-shadow: inset 3px 0 0 var(--note-accent);
}

/* ===== 中间：正文 ===== */
/* 正文走正常文档流，是页面高度的唯一来源（无 max-height / 无 overflow）：
   页面滚动条即阅读进度，滚动时正文随页面上移，左右两栏 sticky 保持不动。 */
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
  top: calc(var(--vp-nav-height) + 80px);
  max-height: calc(100vh - var(--vp-nav-height) - 96px);
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
  color: var(--note-accent);
}

.outline-list li.active .outline-item {
  color: var(--note-accent);
  background: var(--note-active-bg);
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
