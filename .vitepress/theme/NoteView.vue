<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import FileTree from './FileTree.vue'

// intro 是分区封面（frontmatter intro: true）：能进来默认展示，但不进左栏目录树
type Note = { title: string; key: string; html: string; order: number; intro?: boolean }

// root 语义：
//   ''        → 作用域 = 整个分区（首页所有分区的 pane 都用这个，左栏标题取 label）
//   'Spring/AI' → 作用域 = 指定子目录
//   undefined → 作用域 = 当前笔记的一级目录（如 Spring）
const props = defineProps<{
  notes: Note[]
  currentKey: string
  root?: string
  hideBack?: boolean
  // 左栏标题：root === ''（全分区作用域）时用它；不传则显示「全部笔记」
  label?: string
  // 正文加锁：左栏目录照常可见可点，中栏不渲染正文、改用 #lock 占位（右栏因扫不到标题而自动隐藏）
  locked?: boolean
}>()
const emit = defineEmits<{ open: [key: string]; back: [] }>()

// 当前笔记
const current = computed(() => props.notes.find((n) => n.key === props.currentKey))
// 目录树的作用域前缀
const prefix = computed(() => (props.root !== undefined ? props.root : props.currentKey.split('/')[0] || ''))
// 文件夹名（作用域的最后一段）；全局作用域显示调用方给的标题
const group = computed(() =>
  prefix.value ? prefix.value.split('/').pop() ?? '' : props.label ?? '全部笔记'
)
// 作用域内全部笔记
const groupNotes = computed(() =>
  prefix.value ? props.notes.filter((n) => n.key.startsWith(prefix.value + '/')) : props.notes
)

// ===== 左侧目录树：把作用域内的笔记按子文件夹层级组织（任意深度） =====
// 结构：直接文件（顶层）+ 子文件夹（每项含该子文件夹内直接文件 + 更深一层子文件夹）
type TreeFile = { title: string; key: string }
type SubGroup = { name: string; path: string; files: TreeFile[]; subs: SubGroup[] }

function buildTree(notes: Note[]): { rootFiles: TreeFile[]; subs: SubGroup[] } {
  const rootFiles: TreeFile[] = []
  const subs: SubGroup[] = []

  for (const n of notes) {
    // 分区封面不进目录树：它是「进来就看的那篇」，不是可浏览的条目。
    // 正文照常可读，只是左栏不列它；当前选中态也不会出现在左栏（这是预期行为）。
    if (n.intro) continue
    // 去掉作用域前缀；全局作用域下 key 本身就是完整相对路径
    const rel = prefix.value ? n.key.slice(prefix.value.length + 1) : n.key
    const seg = rel.split('/')
    const file: TreeFile = { title: n.title, key: n.key }
    if (seg.length === 1) {
      rootFiles.push(file)
      continue
    }
    // 逐级下钻，任意深度都支持
    let list = subs
    for (let i = 0; i < seg.length - 1; i++) {
      let next = list.find((s) => s.name === seg[i])
      if (!next) {
        next = {
          name: seg[i],
          // 完整相对路径：不同层级的同名文件夹（如 a/img 与 b/img）不能共用一个展开状态
          path: seg.slice(0, i + 1).join('/'),
          files: [],
          subs: []
        }
        list.push(next)
      }
      if (i === seg.length - 2) next.files.push(file)
      list = next.subs
    }
  }

  // 排序递归到任意深度（不要写死到第几层，层级变深时会漏排）
  const sortFiles = (files: TreeFile[]) => files.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
  const sortList = (list: SubGroup[]) => {
    list.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
    for (const s of list) {
      sortFiles(s.files)
      sortList(s.subs)
    }
  }
  sortFiles(rootFiles)
  sortList(subs)
  return { rootFiles, subs }
}

const tree = computed(() => buildTree(groupNotes.value))

// ===== 文件夹展开 / 收起 =====
// 默认全部收起（左栏只看到一级文件夹名）。
// 展开状态记「相对作用域根的完整路径」，只存文件夹名会让不同层级的同名文件夹串台。

// 当前笔记的各级父文件夹路径：初始就展开它们，否则首屏左栏里看不到正在读的这篇
const ancestorPaths = computed(() => {
  const key = props.currentKey
  if (!key) return []
  const rel = prefix.value ? key.slice(prefix.value.length + 1) : key
  // 最后一段是文件名，只取目录部分
  const dirs = rel.split('/').slice(0, -1)
  return dirs.map((_, i) => dirs.slice(0, i + 1).join('/'))
})

// 初始化即带上当前笔记的祖先（SSR 阶段也能拿到 currentKey，首屏就是对的）
const expanded = ref<string[]>([...ancestorPaths.value])

// 换到别处的笔记 → 自动展开它的各级父文件夹（用户手动收起的状态保留）
watch(() => props.currentKey, () => {
  const set = new Set(expanded.value)
  for (const p of ancestorPaths.value) set.add(p)
  expanded.value = [...set]
})

// 作用域切换（点别的分区 / 目录树根变了）→ 只保留新作用域里当前笔记的祖先，
// 否则上一个作用域的路径会残留在新作用域里（路径空间不同，留着会串台）
watch(prefix, () => {
  expanded.value = [...ancestorPaths.value]
})

// 当前作用域里的全部文件夹路径（供「全部展开 / 全部收起」使用）
const allPaths = computed(() => {
  const out: string[] = []
  const walkNodes = (list: SubGroup[]) => {
    for (const s of list) {
      out.push(s.path)
      walkNodes(s.subs)
    }
  }
  walkNodes(tree.value.subs)
  return out
})

// 是否处于「已全部收起」状态：除当前笔记的祖先链外，没有任何文件夹是展开的。
// 用这个而不是「全部展开了吗」来判断按钮语义——因为祖先链是自动展开的，
// 若按「全部展开」判定，收起到只剩祖先链时按钮会错误地显示「全部收起」而点不动。
const allCollapsed = computed(() =>
  allPaths.value.every((p) => !expanded.value.includes(p) || ancestorPaths.value.includes(p))
)

function toggleFolder(path: string) {
  // 当前笔记所在的祖先链展开着才看得到选中项：允许收起，
  // 但收起后再点「全部展开」或切换笔记就会恢复，所以这里不做拦截，保持操作直观。
  const set = new Set(expanded.value)
  if (set.has(path)) set.delete(path)
  else set.add(path)
  expanded.value = [...set]
}

function toggleAll() {
  // 两种稳定状态之间切换：
  //   全部收起（只剩当前笔记的祖先链）→ 全部展开
  //   其它任何状态（含手动展开过几个）      → 全部收起，只保留祖先链
  expanded.value = allCollapsed.value ? [...allPaths.value] : [...ancestorPaths.value]
}

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

// 换篇 / 解锁（locked 由 true 变 false）都要重扫标题：解锁后右栏才有内容
watch([() => props.currentKey, () => props.locked], rescan)
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
function scrollToEl(el: HTMLElement) {
  const top = window.scrollY + el.getBoundingClientRect().top - stickyTopOffset()
  window.scrollTo({ top, behavior: 'smooth' })
}

function goHeading(id: string) {
  const el = outline.value.find((o) => o.id === id)?.el
  if (!el) return
  scrollToEl(el)
}

// ===== 正文标题旁的 # 锚点：就地滚动，不动地址栏 =====
// 这些锚点在构建期被 config.mts 的 rewriteInlineAnchors 去掉了 href、换成 data-heading
// （原因见那里的注释：VitePress 的 window 捕获阶段点击代理会抢先改 hash，
// 而首页把全部分区挂在同一个 DOM 里，未知 hash 会让 HomeNoteList 把分区翻回首页）。
// 这里接管点击/回车：按「当前这篇」的范围找标题，天然避开跨笔记的同名 id。
function jumpToHeading(slug: string) {
  const root = contentRef.value
  if (!root || !slug) return
  // 属性选择器里只需转义 " 和 \，其余字符在双引号包裹下无需处理
  const el = root.querySelector<HTMLElement>(`[id="${slug.replace(/["\\]/g, '\\$&')}"]`)
  if (!el) return
  scrollToEl(el)
}

function onBodyClick(e: MouseEvent) {
  const el = e.target
  if (!(el instanceof Element)) return
  const a = el.closest<HTMLElement>('[data-heading]')
  if (!a) return
  // 去掉 href 后浏览器已无默认行为，这里只为把 focus / 点击统一到一个入口
  e.preventDefault()
  jumpToHeading(a.dataset.heading ?? '')
}

// 原锚点靠 href 进入 Tab 序列、靠回车触发；去掉 href 后要手动补回回车行为
function onBodyKeydown(e: KeyboardEvent) {
  if (e.key !== 'Enter' || e.ctrlKey || e.shiftKey || e.altKey || e.metaKey) return
  const el = e.target
  if (!(el instanceof HTMLElement) || !el.hasAttribute('data-heading')) return
  e.preventDefault()
  jumpToHeading(el.dataset.heading ?? '')
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
    <!-- 左侧：文件夹内文件目录（按子文件夹层级展示，递归任意深度） -->
    <aside class="note-file-nav">
      <button v-if="!hideBack" class="back-btn" @click="emit('back')">← 返回全部</button>
      <!-- 标题行：左边是作用域名，右边是全部展开/收起 -->
      <div class="file-nav-head">
        <h2 class="file-nav-title">{{ group }}</h2>
        <button
          v-if="allPaths.length"
          class="expand-all-btn"
          type="button"
          :aria-label="allCollapsed ? '全部展开' : '全部收起'"
          :title="allCollapsed ? '全部展开' : '全部收起'"
          @click="toggleAll"
        >
          <!-- 双箭头：背离 = 展开，相向 = 收起。
               与左栏文件夹的单个 ▸ 不是一套图形，避免「全部」和「这一个」混淆 -->
          <svg
            class="expand-all-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <template v-if="allCollapsed">
              <path d="m7 15 5 5 5-5" />
              <path d="m7 9 5-5 5 5" />
            </template>
            <template v-else>
              <path d="m7 20 5-5 5 5" />
              <path d="m7 4 5 5 5-5" />
            </template>
          </svg>
        </button>
      </div>

      <FileTree
        :root-files="tree.rootFiles"
        :subs="tree.subs"
        :current-key="currentKey"
        :expanded="expanded"
        @open="(key: string) => emit('open', key)"
        @toggle="toggleFolder"
      />
    </aside>

    <!-- 中间：当前笔记正文 -->
    <!-- ref 绑在正文容器上，仅用于扫描标题 / 定位目标（正文本身不自建滚动容器） -->
    <div ref="contentRef" class="note-body" @click="onBodyClick" @keydown="onBodyKeydown">
      <!-- 加锁时只换正文，左栏目录与点击行为完全不变；右栏因扫不到标题自动隐藏 -->
      <slot v-if="locked" name="lock" />
      <!-- 分区为空（如 docs/archive/ 只有 .gitkeep）：保留三栏骨架，中栏给提示，不白屏 -->
      <p v-else-if="!notes.length" class="note-empty">该分区暂无内容。</p>
      <article v-else class="vp-doc" v-html="current?.html ?? ''"></article>
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

/* 标题行：作用域名与「全部展开」同一行，按钮靠右 */
.file-nav-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

/* 全部展开 / 全部收起：纯图标小按钮，不抢标题的视觉重量 */
.expand-all-btn {
  flex: none;
  display: inline-flex;
  align-items: center;
  /* 标题行是按文字基线对齐的；按钮里没有文字，基线会退化成它的下沿，
     图标整体偏高。单独改成居中，标题的对齐方式不受影响 */
  align-self: center;
  padding: 0;
  font-size: 12px;
  font-family: inherit;
  line-height: 1.6;
  color: var(--vp-c-text-3);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color 0.2s ease;
}

.expand-all-btn:hover {
  color: var(--note-accent);
}

.expand-all-icon {
  display: block;
  width: 16px;
  height: 16px;
}

/* 左侧目录树（.file-nav-list / .file-nav-sub / .file-nav-item 等）已移到 FileTree.vue，
   因为它现在是递归组件，样式必须跟着组件走 */

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

/* 空分区提示：中栏居中的一句话，保持三栏骨架不变 */
.note-empty {
  padding: 48px 0;
  text-align: center;
  color: var(--vp-c-text-3);
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
