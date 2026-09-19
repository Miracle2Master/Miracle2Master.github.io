<script setup lang="ts">
defineProps<{ active: string; vertical?: boolean }>()
defineEmits<{ select: [tab: string] }>()

const tabs = [
  { key: 'home', text: '个人主页' },
  { key: 'learning', text: '学习记录' },
  { key: 'planning', text: '人生规划' }
]
</script>

<template>
  <nav class="section-nav" :class="{ vertical }" aria-label="分区导航">
    <button
      v-for="t in tabs"
      :key="t.key"
      class="nav-tab"
      :class="{ active: active === t.key }"
      @click="$emit('select', t.key)"
    >
      {{ t.text }}
    </button>
  </nav>
</template>

<style scoped>
.section-nav {
  display: flex;
  border: 1px solid rgba(34, 211, 238, 0.28);
  border-radius: 12px;
  background: var(--vp-c-bg);
  overflow: hidden;
  margin-bottom: 24px;
}

.nav-tab {
  flex: 1;
  padding: 18px 16px;
  font-size: 16px;
  font-weight: 600;
  font-family: inherit;
  border: none;
  background: transparent;
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.2s ease;
  border-right: 1px solid rgba(34, 211, 238, 0.15);
}

.nav-tab:last-child {
  border-right: none;
}

.nav-tab:hover {
  background: rgba(34, 211, 238, 0.08);
  color: var(--vp-c-brand-1);
}

.nav-tab.active {
  background: rgba(34, 211, 238, 0.15);
  color: var(--vp-c-brand-1);
  box-shadow: inset 0 -2px 0 var(--vp-c-brand-1);
}

/* ===== 竖向模式（无外框，纯文字列表） ===== */
.section-nav.vertical {
  display: flex;
  flex-direction: column;
  border: none;
  border-radius: 0;
  background: transparent;
  overflow: visible;
  margin-bottom: 20px;
}

.section-nav.vertical .nav-tab {
  flex: none;
  padding: 10px 12px;
  text-align: left;
  font-size: 15px;
  border: none;
  border-right: none;
  border-bottom: none;
  background: transparent;
}

.section-nav.vertical .nav-tab:last-child {
  border-bottom: none;
}

.section-nav.vertical .nav-tab:hover {
  background: rgba(34, 211, 238, 0.08);
  color: var(--vp-c-brand-1);
}

.section-nav.vertical .nav-tab.active {
  background: rgba(34, 211, 238, 0.12);
  color: var(--vp-c-brand-1);
  box-shadow: inset 3px 0 0 var(--vp-c-brand-1);
  border-radius: 6px;
}
</style>
