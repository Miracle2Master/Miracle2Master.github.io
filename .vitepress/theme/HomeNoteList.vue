<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vitepress'
import HomePane from './HomePane.vue'
import LearningPane from './LearningPane.vue'
import PlanningPane from './PlanningPane.vue'
import { sectionTab } from './section'

const route = useRoute()

// 当前分区（共享状态，与二级导航/各 Tab 组件联动）
const active = sectionTab

// 从 URL hash 恢复分区（锚点链接直链 /#learning、/#planning、#note-*、#cat-*，以及刷新后还原）
function syncFromHash() {
  const h = window.location.hash
  // #note-xxx / #cat-xxx 是「学习记录」Tab 内的子视图（当前笔记/分类）
  if (h.startsWith('#learning') || h.startsWith('#note-') || h.startsWith('#cat-')) {
    sectionTab.value = 'learning'
  } else if (h.startsWith('#planning')) {
    sectionTab.value = 'planning'
  } else {
    sectionTab.value = 'home'
  }
}

onMounted(() => {
  syncFromHash()
  // 锚点链接点击由浏览器直接改 hash（不触发 VitePress 路由），
  // 用原生 hashchange 兜底，把 hash 同步到 Tab 状态
  window.addEventListener('hashchange', syncFromHash)
})

onUnmounted(() => {
  window.removeEventListener('hashchange', syncFromHash)
})

// 路由路径变化（如从独立页 /notes 跳回首页）时也同步一次
route.onAfterRouteChanged = () => {
  syncFromHash()
}

// 当前可见的 Tab 面板（供调试/统计用，避免直接读写 sectionTab 的模板访问方式）
const visiblePane = computed(() => {
  if (active.value === 'learning') return 'learning'
  if (active.value === 'planning') return 'planning'
  return 'home'
})
</script>

<template>
  <section class="home-content" :class="{ 'is-learning': active === 'learning' }">
    <div class="container">
      <div class="tab-shell">
        <!-- 个人主页 -->
        <div v-show="active === 'home'" class="tab-pane">
          <HomePane />
        </div>
        <!-- 学习记录 -->
        <div v-show="active === 'learning'" class="tab-pane">
          <LearningPane />
        </div>
        <!-- 人生规划 -->
        <div v-show="active === 'planning'" class="tab-pane">
          <PlanningPane />
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

.container {
  margin: auto;
  width: 100%;
  max-width: 1152px;
  padding: 0 24px;
}

/* 学习记录（含笔记三栏视图）：内容区放宽到导航栏宽度，左右留白更少，左右栏与导航栏对齐 */
.home-content.is-learning .container {
  max-width: calc(var(--vp-layout-max-width) - 64px);
}

/* ===== 内容区：无外框无背景，直接融入页面 ===== */
.tab-shell {
  padding: 24px 0;
}

.tab-pane {
  animation: fadeIn 0.2s ease;
  min-height: 320px;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
