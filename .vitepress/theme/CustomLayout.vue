<script setup lang="ts">
import { useRoute } from 'vitepress'
import { computed, provide, useSlots, watch } from 'vue'
import VPBackdrop from 'vitepress/dist/client/theme-default/components/VPBackdrop.vue'
import VPContent from 'vitepress/dist/client/theme-default/components/VPContent.vue'
import VPFooter from 'vitepress/dist/client/theme-default/components/VPFooter.vue'
import VPLocalNav from 'vitepress/dist/client/theme-default/components/VPLocalNav.vue'
import VPNav from 'vitepress/dist/client/theme-default/components/VPNav.vue'
import VPSidebar from 'vitepress/dist/client/theme-default/components/VPSidebar.vue'
import VPSkipLink from 'vitepress/dist/client/theme-default/components/VPSkipLink.vue'
import { useData } from 'vitepress'
import { useSidebar, useCloseSidebarOnEscape } from 'vitepress/dist/client/theme-default/composables/sidebar'
import SecNav from './SecNav.vue'
import HomeNoteList from './HomeNoteList.vue'

const {
  isOpen: isSidebarOpen,
  open: openSidebar,
  close: closeSidebar
} = useSidebar()

const route = useRoute()
watch(() => route.path, closeSidebar)

useCloseSidebarOnEscape(isSidebarOpen, closeSidebar)

const { frontmatter } = useData()

const slots = useSlots()
// 首页 hero 右侧始终渲染（模板里已提供默认矩形块占位内容）
const heroImageSlotExists = computed(() => true)

// 是否首页（决定是否挂载 HomeNoteList、是否跳过空 VPContent）
const isHome = computed(() => route.path === '/' || route.path === '/index.html')

provide('hero-image-slot-exists', heroImageSlotExists)
</script>

<template>
  <div v-if="frontmatter.layout !== false" class="Layout" :class="frontmatter.pageClass">
    <slot name="layout-top" />
    <VPSkipLink />
    <VPBackdrop class="backdrop" :show="isSidebarOpen" @click="closeSidebar" />
    <VPNav>
      <template #nav-bar-title-before><slot name="nav-bar-title-before" /></template>
      <template #nav-bar-title-after><slot name="nav-bar-title-after" /></template>
      <template #nav-bar-content-before><slot name="nav-bar-content-before" /></template>
      <template #nav-bar-content-after><slot name="nav-bar-content-after" /></template>
      <template #nav-screen-content-before><slot name="nav-screen-content-before" /></template>
      <template #nav-screen-content-after><slot name="nav-screen-content-after" /></template>
    </VPNav>

    <!-- 标题栏下方：二级导航（固定吸顶） -->
    <SecNav />

    <VPLocalNav :open="isSidebarOpen" @open-menu="openSidebar" />

    <!-- 首页：Main 容器 = 页面主体（hero + 导航下方全部内容），由 HomeNoteList 挂载 -->
    <HomeNoteList v-if="isHome" />

    <VPSidebar :open="isSidebarOpen">
      <template #sidebar-nav-before><slot name="sidebar-nav-before" /></template>
      <template #sidebar-nav-after><slot name="sidebar-nav-after" /></template>
    </VPSidebar>

    <!-- 首页不需要 VPContent：index.md 正文为空，渲染它只会多出
         「最后更新」与 96px 空 padding，给学习 Tab 的整页滚动凭空增加行程、并多出一段空白。
         其他页面（笔记独立页 / 规划等）照常渲染。
         首页只保留同名锚点，让 VPSkipLink 的 #VPContent 跳转不失效（空元素不占高度）。 -->
    <div v-if="isHome" id="VPContent" />
    <VPContent v-else>
      <template #page-top><slot name="page-top" /></template>
      <template #page-bottom><slot name="page-bottom" /></template>

      <template #not-found><slot name="not-found" /></template>
      <template #home-hero-before><slot name="home-hero-before" /></template>
      <template #home-hero-info-before><slot name="home-hero-info-before" /></template>
      <template #home-hero-info><slot name="home-hero-info" /></template>
      <template #home-hero-info-after><slot name="home-hero-info-after" /></template>
      <template #home-hero-actions-after><slot name="home-hero-actions-after" /></template>
      <template #home-hero-image>
        <slot name="home-hero-image">
          <!-- 首页 hero 右侧：两个上下排列的占位矩形块 -->
          <div class="hero-blocks">
            <div class="hero-block"></div>
            <div class="hero-block"></div>
          </div>
        </slot>
      </template>
      <template #home-hero-after><slot name="home-hero-after" /></template>
      <template #home-features-before><slot name="home-features-before" /></template>
      <template #home-features-after><slot name="home-features-after" /></template>

      <template #doc-footer-before><slot name="doc-footer-before" /></template>
      <template #doc-before><slot name="doc-before" /></template>
      <template #doc-after><slot name="doc-after" /></template>
      <template #doc-top><slot name="doc-top" /></template>
      <template #doc-bottom><slot name="doc-bottom" /></template>

      <template #aside-top><slot name="aside-top" /></template>
      <template #aside-bottom><slot name="aside-bottom" /></template>
      <template #aside-outline-before><slot name="aside-outline-before" /></template>
      <template #aside-outline-after><slot name="aside-outline-after" /></template>
      <template #aside-ads-before><slot name="aside-ads-before" /></template>
      <template #aside-ads-after><slot name="aside-ads-after" /></template>
    </VPContent>

    <VPFooter />
    <slot name="layout-bottom" />
  </div>
  <Content v-else />
</template>

<style scoped>
.Layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
</style>
