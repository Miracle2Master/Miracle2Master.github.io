<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useData } from 'vitepress'
import SectionNav from './SectionNav.vue'

const { page } = useData()

// 该年日记（构建期注入 pageData.yearEntries：title/key/html）
const entries = computed(() => page.value.yearEntries ?? [])
const yearTitle = computed(() => page.value.yearTitle ?? '')

// 当前选中条目（key）
const currentKey = ref('')

// 初始选中第一篇（或按 hash 直达）
onMounted(() => {
  syncFromHash()
})

function syncFromHash() {
  const h = window.location.hash.replace(/^#/, '')
  if (h && entries.value.some((e) => e.key === h)) {
    currentKey.value = h
  } else if (entries.value.length) {
    currentKey.value = entries.value[0].key
  }
}

function selectEntry(e: { key: string }) {
  currentKey.value = e.key
  history.replaceState(null, '', '#' + e.key)
}

// 当前内容
const currentHtml = computed(() => {
  const hit = entries.value.find((e) => e.key === currentKey.value)
  return hit ? hit.html : ''
})

// 面包屑：点击跳回首页对应 Tab（年页在人生规划 Tab 内）
function goTab(tab: string) {
  if (tab === 'home') {
    window.location.href = '/'
  } else if (tab === 'learning') {
    window.location.href = '/#learning'
  } else {
    window.location.href = '/#planning'
  }
}
</script>

<template>
  <div class="planning-year">
    <div class="container">
      <SectionNav active="planning" @select="goTab" />
      <div class="year-shell">
        <aside class="year-sidebar">
          <h2 class="year-title">{{ yearTitle }}</h2>
          <div class="year-nav">
            <button
              v-for="e in entries"
              :key="e.key"
              class="year-item"
              :class="{ current: e.key === currentKey }"
              @click="selectEntry(e)"
            >{{ e.title }}</button>
          </div>
        </aside>

        <main class="year-content">
          <div class="vp-doc" v-html="currentHtml"></div>
        </main>
      </div>
    </div>
  </div>
</template>

<style scoped>
.planning-year {
  padding: 48px 0;
}

.container {
  margin: auto;
  width: 100%;
  max-width: 1152px;
  padding: 0 24px;
}

.year-shell {
  display: flex;
  gap: 28px;
  align-items: flex-start;
  border: 1px solid rgba(34, 211, 238, 0.28);
  border-radius: 16px;
  background: var(--vp-c-bg-soft);
  padding: 24px;
}

.year-sidebar {
  flex: 3;
  min-width: 0;
  position: sticky;
  top: 80px;
}

.year-content {
  flex: 7;
  min-width: 0;
}

@media (max-width: 768px) {
  .year-shell {
    flex-direction: column;
  }
  .year-sidebar {
    position: static;
  }
}

.year-title {
  font-size: 22px;
  line-height: 28px;
  font-weight: 700;
  margin: 0 0 16px;
  color: var(--vp-c-brand-1);
  font-family: var(--vp-font-family-mono);
}

.year-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.year-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 10px 12px;
  font-size: 15px;
  font-family: inherit;
  color: var(--vp-c-text-2);
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.year-item:hover {
  background: rgba(34, 211, 238, 0.08);
  color: var(--vp-c-brand-1);
}

.year-item.current {
  background: rgba(34, 211, 238, 0.12);
  color: var(--vp-c-brand-1);
  box-shadow: inset 3px 0 0 var(--vp-c-brand-1);
}
</style>
