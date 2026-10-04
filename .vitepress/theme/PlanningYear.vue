<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useData } from 'vitepress'
import SectionNav from './SectionNav.vue'
import PasswordGuard from './PasswordGuard.vue'

const { page } = useData()

// 该年日记（构建期注入 pageData.yearEntries：title/key/html）
const entries = computed(() => page.value.yearEntries ?? [])
const yearTitle = computed(() => page.value.yearTitle ?? '')

// 日记区会话钥匙（与全站门隔离）
const DIARY_SCOPE = 'miracle-auth-diary'

// 当前选中条目（key）—— A-2 方案：进入年份页不自动选中第一篇，右侧为空
const currentKey = ref('')
// 密码门是否弹出（点击某一篇时才触发）
const showDoor = ref(false)

function sessionUnlocked(): boolean {
  try {
    return sessionStorage.getItem(DIARY_SCOPE)?.length > 0
  } catch {
    return false
  }
}

// 点击左侧某一篇：未解锁 → 弹密码门；已解锁 → 直接显示
function selectEntry(e: { key: string }) {
  if (sessionUnlocked()) {
    currentKey.value = e.key
    history.replaceState(null, '', '#' + e.key)
  } else {
    // 记住用户想看的这篇，解锁后自动打开
    pendingKey.value = e.key
    showDoor.value = true
  }
}

// 解锁成功后：关闭密码门，打开之前想看的这篇
function onUnlocked() {
  showDoor.value = false
  if (pendingKey.value && entries.value.some((e) => e.key === pendingKey.value)) {
    currentKey.value = pendingKey.value
    history.replaceState(null, '', '#' + pendingKey.value)
    pendingKey.value = ''
  }
}

// 直链带 hash（如 /planning/日记/2025#反思日记1-3）：未解锁则弹门，解锁后直达该篇
onMounted(() => {
  const h = window.location.hash.replace(/^#/, '')
  if (h && entries.value.some((e) => e.key === h)) {
    pendingKey.value = h
    if (!sessionUnlocked()) showDoor.value = true
    else {
      currentKey.value = h
    }
  }
})

const pendingKey = ref('')
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
          <!-- 未选中任何一篇（A-2：先只显示列表，点击某篇才解锁显示内容） -->
          <div v-if="!currentKey" class="year-empty">
            <p>👈 点击左侧日记标题查看内容</p>
          </div>
          <div v-else class="vp-doc" v-html="currentHtml"></div>
        </main>
      </div>
    </div>

    <!-- 点击某篇日记时弹出密码门（会话级，关标签页再进需重新输密码） -->
    <PasswordGuard
      v-if="showDoor"
      :scope-key="DIARY_SCOPE"
      controlled
      :show="showDoor"
      @success="onUnlocked"
    />
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

.year-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 280px;
  border: 1px dashed var(--vp-c-divider);
  border-radius: 12px;
  color: var(--vp-c-text-3);
  font-size: 15px;
}
</style>
