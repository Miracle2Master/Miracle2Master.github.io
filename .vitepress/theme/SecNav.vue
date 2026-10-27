<script setup lang="ts">
import { computed } from 'vue'
import { useData, useRoute } from 'vitepress'
import { sectionTab, HOME_KEY, navToSection } from './section'

const route = useRoute()
const { page } = useData()

// 分区清单由构建期扫描 docs/ 得出；首页是唯一写死的固定项
type SectionEntry = { key: string; text: string }
const sectionNav = computed<SectionEntry[]>(() => (page.value.sectionNav as SectionEntry[]) ?? [])

const items = computed(() => [
  { key: HOME_KEY, text: '首页' },
  ...sectionNav.value.map((s) => ({ key: s.key, text: s.text }))
])

const isHome = computed(() => route.path === '/' || route.path === '/index.html')

// 点击二级导航：首页内就地切换分区；独立页则整页跳回首页对应分区
// 首页内用 navToSection 而非 setSection：让分区 pane 知道「这是从导航进来的」，回到默认视图
function go(item: { key: string }) {
  if (!isHome.value) {
    window.location.href = item.key === HOME_KEY ? '/' : '/#' + item.key
    return
  }
  navToSection(item.key)
}

// 高亮判定：首页由共享 Tab 状态驱动；其他页面只看路径第一段，不回退到 sectionTab
// （sectionTab 是首页内状态，独立页上它可能是过期残留值，不能参与判定）
// 例：/notes/Spring/AI/x.html → 第一段 notes → 高亮「笔记」
function isActive(item: { key: string }): boolean {
  if (isHome.value) return sectionTab.value === item.key
  if (item.key === HOME_KEY) return false
  const first = route.path.replace(/^\//, '').split('/')[0].replace(/\.html$/, '')
  return first === item.key
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
        :href="item.key === HOME_KEY ? '/' : '/#' + item.key"
        @click.prevent="go(item)"
      >
        {{ item.text }}
      </a>
    </div>
  </div>
</template>
