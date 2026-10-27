<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useData, useRoute } from 'vitepress'
import HomePane from './HomePane.vue'
import SectionPane from './SectionPane.vue'
import { sectionTab, HOME_KEY } from './section'
import { parseNoteHash, decodeHash } from '../shared/noteHash'
import type { Component } from 'vue'

const route = useRoute()
const { page } = useData()

// 分区清单（构建期扫描注入：只有 key + 显示名）
type SectionEntry = { key: string; text: string }
const sectionNav = computed<SectionEntry[]>(() => (page.value.sectionNav as SectionEntry[]) ?? [])

// 分区正文（构建期渲染）：Record<分区key, 条目[]>，只用来判断 hash 属于哪个分区
const sectionContent = computed(
  () => (page.value.sectionContent as Record<string, unknown[]>) ?? {}
)

// 当前分区（共享状态，与二级导航联动）
const active = sectionTab

// 分区 → pane：首页是唯一写死的专属 pane，其余分区全部走同一个 SectionPane。
// 想让某个分区长得不一样，只改 SectionPane，不需要再为它注册组件。
const SECTION_PANES: Record<string, Component> = {
  [HOME_KEY]: HomePane
}

function paneOf(key: string): Component {
  return SECTION_PANES[key] ?? SectionPane
}

// 渲染清单：首页固定在最前，其余按扫描顺序
const paneKeys = computed(() => [HOME_KEY, ...sectionNav.value.map((s) => s.key)])

// 宽容器（三栏阅读）适用于所有非首页分区——
// 「所有分区的主界面应该跟笔记的主界面一模一样」，不按分区名逐个白名单
const isWide = computed(() => active.value !== HOME_KEY)

// hash 归属判定（仅旧格式用）：#note-<key> 没带分区，只能按 key 反查它属于哪个分区。
// 抽出来是因为分区数现在是动态的，不能写死 notes。
function sectionOfNote(key: string): string {
  for (const [k, list] of Object.entries(sectionContent.value)) {
    if ((list as { key: string }[]).some((n) => n.key === key)) return k
  }
  return HOME_KEY
}

// 从 URL hash 恢复分区：
// #note-<分区>/<key> 直接用分区段（各分区有同名笔记，key 单独不足以定位）；
// 其余 hash 命中分区 key 即切换，未命中回首页
function syncFromHash() {
  const parsed = parseNoteHash(window.location.hash, sectionNav.value)
  if (parsed) {
    // 新格式自带分区，直接用；旧格式（#note-<key>，旧链接）按归属反查
    sectionTab.value = parsed.section || sectionOfNote(parsed.key)
    return
  }
  const key = decodeHash(window.location.hash)
  sectionTab.value = sectionNav.value.some((s) => s.key === key) ? key : HOME_KEY
}

// 分区内的子视图由 SectionPane 接管 hash，这里只在 hash 明确指向分区时同步
onMounted(() => {
  syncFromHash()
  // 锚点链接点击由浏览器直接改 hash（不触发 VitePress 路由），用原生 hashchange 兜底
  window.addEventListener('hashchange', syncFromHash)
})

onUnmounted(() => {
  window.removeEventListener('hashchange', syncFromHash)
})

// 路由变化（如从独立页跳回首页）时也同步一次
route.onAfterRouteChanged = () => {
  syncFromHash()
}

// 分区被删（目录被删或改名）→ 当前 Tab 失效，退回首页
watch(sectionNav, (nav) => {
  if (active.value !== HOME_KEY && !nav.some((s) => s.key === active.value)) {
    active.value = HOME_KEY
  }
})
</script>

<template>
  <section class="home-content" :class="{ 'is-wide': isWide }">
    <div class="container">
      <div class="tab-shell">
        <div v-for="key in paneKeys" :key="key" v-show="active === key" class="tab-pane">
          <component :is="paneOf(key)" :section-key="key" />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* 顶栏(VPNav)与二级导航(SecNav)均 fixed 不占文档流，
   主容器需让出导航区高度，避免侵入导航栏下方 */
.home-content {
  margin-top: calc(var(--vp-nav-height) + 40px);
  padding: 48px 0;
}

@media (max-width: 959px) {
  .home-content {
    /* 移动端标题栏隐藏，二级导航贴顶，只让出它的高度 */
    margin-top: 40px;
  }
}

/* 内容容器：水平居中 + 限宽（宽分区内放宽到导航栏宽度） */
.container {
  margin: auto;
  width: 100%;
  max-width: 1152px;
  padding: 0 24px;
}

/* 宽容器分区：内容区放宽到导航栏宽度，左右留白更少，左右栏与导航栏对齐 */
.home-content.is-wide .container {
  max-width: calc(var(--vp-layout-max-width) - 64px);
}

/* 宽容器分区内：主容器顶部与二级导航下沿保持 40px 间距 */
.home-content.is-wide {
  margin-top: calc(var(--vp-nav-height) + 40px);
  padding-top: 0;
}

/* 宽容器分区内：tab-shell 顶部与主容器(margin)间距一致，
   让 sticky 目录吸顶位置 = 初始位置，进入/滚动时目录始终固定在与导航栏隔 40px 处 */
.home-content.is-wide .tab-shell {
  padding-top: 40px;
}

/* 宽容器分区不锁视口高度：正文按正常文档流铺开，页面高度由正文决定
   → 滚动的是整页（屏幕最右侧滚动条即阅读进度），中间正文随页面上移，
   左右两侧目录在 NoteView 里 sticky 吸顶保持不动。
   约束：从 .home-content 到 .note-view 的祖先链上不得出现 overflow:hidden /
   transform / 固定 height 的裁剪，否则 sticky 会失效或目录被裁掉。 */

.tab-pane {
  animation: fadeIn 0.2s ease;
  min-height: 320px;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
