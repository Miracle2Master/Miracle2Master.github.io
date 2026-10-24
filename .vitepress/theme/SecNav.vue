<script setup lang="ts">
import { useRoute } from 'vitepress'
import { sectionTab, type SectionTab } from './section'

const route = useRoute()

// 二级导航项：首页 / 笔记 / 规划
// 「笔记」「规划」不再跳转独立页面，而是切换首页 main 容器内的 Tab
const items: { key: SectionTab; text: string; link: string }[] = [
  { key: 'home', text: '首页', link: '/' },
  { key: 'learning', text: '笔记', link: '/#learning' },
  { key: 'planning', text: '规划', link: '/#planning' }
]

// 点击二级导航：在首页就地切换 Tab（只改 Vue 状态，不跳转）；在独立页则整页跳回首页对应 Tab
function go(item: { key: SectionTab; link: string }) {
  const p = route.path
  if (p !== '/' && p !== '/index.html') {
    window.location.href = item.link
    return
  }
  sectionTab.value = item.key
}

function isActive(item: { key: SectionTab }): boolean {
  const p = route.path
  // 独立页（非首页）：按路径归属分区（直接访问 /notes、/planning 独立页时的兼容高亮）
  if (p !== '/' && p !== '/index.html') {
    if (p.startsWith('/notes')) return item.key === 'learning'
    if (p.startsWith('/planning')) return item.key === 'planning'
    return false
  }
  // 首页：由共享 Tab 状态驱动，与首页 main 容器内容联动
  return sectionTab.value === item.key
}
</script>

<template>
  <div class="SecNav">
    <div class="sec-nav-inner">
      <a
        v-for="item in items"
        :key="item.key"
        class="sec-nav-item"
        :class="{ active: isActive(item) }"
        :href="item.link"
        @click.prevent="go(item)"
      >
        {{ item.text }}
      </a>
    </div>
  </div>
</template>
