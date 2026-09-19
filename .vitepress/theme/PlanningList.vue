<script setup lang="ts">
import { computed } from 'vue'

// 从首页 pageData 读取构建期注入的年份列表（config.mts transformPageData 注入）
const props = defineProps<{ years?: { year: string; count: number; link: string }[] }>()
const years = computed(() => props.years ?? [])
</script>

<template>
  <div class="planning-list">
    <div v-if="years.length === 0" class="planning-empty">
      <p>人生规划暂未添加内容。</p>
    </div>
    <div v-else class="planning-grid">
      <a v-for="y in years" :key="y.year" class="year-card" :href="y.link">
        <h2>{{ y.year }}</h2>
        <span class="year-count">{{ y.count }} 篇日记</span>
      </a>
    </div>
  </div>
</template>

<style scoped>
.planning-list {
  margin: 24px 0;
}

.planning-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.year-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 28px 24px;
  border: 1px solid rgba(34, 211, 238, 0.28);
  border-radius: 12px;
  background: var(--vp-c-bg);
  text-decoration: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.year-card:hover {
  border-color: rgba(34, 211, 238, 0.6);
  box-shadow: 0 0 14px rgba(34, 211, 238, 0.22);
}

.year-card h2 {
  font-size: 26px;
  line-height: 32px;
  font-weight: 700;
  margin: 0;
  color: var(--vp-c-brand-1);
  font-family: var(--vp-font-family-mono);
}

.year-count {
  font-size: 13px;
  color: var(--vp-c-text-3);
}

.planning-empty {
  padding: 48px;
  text-align: center;
  border: 1px dashed var(--vp-c-divider);
  border-radius: 12px;
  color: var(--vp-c-text-3);
}
</style>