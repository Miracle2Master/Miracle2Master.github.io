<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useData } from 'vitepress'
import { sectionTab, sectionClick } from './section'
import NoteView from './NoteView.vue'
import PasswordGuard from './PasswordGuard.vue'

// 全站唯一的分区 pane：笔记 / 日记 / 归档 / 未来任何新目录都用它。
// 数据来自 config.mts 的 buildSectionContent()，构建期已按 order 升序排好；
// 每个分区交给 NoteView 的都是「整个分区作用域」（root=""），所以根级散文件和
// 任意深度的子文件夹会由 FileTree 递归成同一棵树，不需要分区特例。
const props = defineProps<{ sectionKey: string }>()

const { page } = useData()

type NoteEntry = { title: string; key: string; html: string; order: number }

// 本分区内容
const notes = computed<NoteEntry[]>(() => {
  const all = page.value.sectionContent as Record<string, NoteEntry[]> | undefined
  return all?.[props.sectionKey] ?? []
})

// 左栏标题：默认取导航里的显示文字（日记 → 日记 / 归档 → 归档）。
// 笔记分区沿用原来的「全部笔记」，不因这次统一而改动既有界面。
const label = computed(() => {
  if (props.sectionKey === 'notes') return '全部笔记'
  const nav = page.value.sectionNav as { key: string; text: string }[] | undefined
  return nav?.find((s) => s.key === props.sectionKey)?.text ?? props.sectionKey
})

// order 最小的一篇（构建期已排好，取第一项）
const firstKey = computed(() => notes.value[0]?.key ?? '')

// 显式选择优先，未选择时回落第一篇。
// 用计算属性而不是在 onMounted 里赋值——SSR 阶段拿得到 pageData 但拿不到 onMounted，
// 这样首屏直接渲染第一篇正文，不会先闪一下空状态。
const pickedKey = ref('')

// ===== 鉴权旁挂：只有登记过的分区才需要密码 =====
// 作用域 key 与旧年份页保持一致，老会话钥匙继续有效
const AUTH_SCOPES: Record<string, string> = { diary: 'miracle-auth-diary' }
const scope = computed(() => AUTH_SCOPES[props.sectionKey] ?? '')

// 会话钥匙状态。SSR 阶段没有 sessionStorage，初始 false —— 构建产物里受保护分区是锁定态，
// 客户端 onMounted 读到钥匙后立刻切到已解锁。未受保护分区不看这个值。
const unlocked = ref(false)
function sessionUnlocked(key: string): boolean {
  if (!key) return false
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return false
    // 与 PasswordGuard 写入的格式保持一致：{ authed: true }
    return JSON.parse(raw)?.authed === true
  } catch {
    return false
  }
}

// 未解锁时不指向任何一篇：左栏完整可见，中栏显示锁提示，右栏自然为空
const lockedNow = computed(() => !!scope.value && !unlocked.value)
const currentKey = computed(() => (lockedNow.value ? '' : pickedKey.value || firstKey.value))

// 密码门与「解锁后要打开的那篇」
// 门只在「本分区正被选中」时显示：HomeNoteList 用 v-show 挂载全部分区，
// 否则深链加载时其它分区的 pane 也会把门弹出来（10.7 坑 2 的同类问题）
const doorRequested = ref(false)
const showDoor = computed(() => doorRequested.value && sectionTab.value === props.sectionKey)
const pendingKey = ref('')

// 打开某篇（左栏点击）
function openNote(key: string) {
  if (lockedNow.value) {
    pendingKey.value = key
    doorRequested.value = true
    return
  }
  pickedKey.value = key
  // 兜底：href="#" 触发的 hashchange 可能把分区翻回首页，这里锁定本分区
  sectionTab.value = props.sectionKey
  history.replaceState(null, '', '#note-' + key)
  window.scrollTo({ top: 0, behavior: 'auto' })
}

function onUnlocked() {
  doorRequested.value = false
  unlocked.value = true
  const key = pendingKey.value
  pendingKey.value = ''
  if (key && notes.value.some((n) => n.key === key)) {
    pickedKey.value = key
    sectionTab.value = props.sectionKey
    history.replaceState(null, '', '#note-' + key)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }
}

// hash 解析：#note-<key> 指向本分区某篇；#<分区key>（点导航进来）或空 hash → 回到第一篇
function syncFromHash() {
  const h = decodeURIComponent(window.location.hash.replace(/^#/, ''))
  const key = h.startsWith('note-') ? h.slice(5) : ''
  if (key && notes.value.some((n) => n.key === key)) {
    if (lockedNow.value) {
      // 直链带 hash 但未解锁：弹门，解锁后直达该篇
      pendingKey.value = key
      doorRequested.value = true
      return
    }
    pickedKey.value = key
    return
  }
  if (!h || h === props.sectionKey) pickedKey.value = ''
}

// 离开本分区 → 清空显式选择与挂起的密码门，回到第一篇
watch(sectionTab, (v) => {
  if (v !== props.sectionKey) {
    pickedKey.value = ''
    pendingKey.value = ''
    doorRequested.value = false
  }
})

// 从二级导航点进来（含重复点击当前分区）→ 回到默认视图
watch(sectionClick, () => {
  if (sectionTab.value !== props.sectionKey) return
  pickedKey.value = ''
  pendingKey.value = ''
  doorRequested.value = false
  window.scrollTo({ top: 0, behavior: 'auto' })
})

onMounted(() => {
  unlocked.value = sessionUnlocked(scope.value)
  syncFromHash()
  window.addEventListener('hashchange', syncFromHash)
})
onUnmounted(() => {
  window.removeEventListener('hashchange', syncFromHash)
})
</script>

<template>
  <div class="section-pane">
    <!-- 空分区（如只有 .gitkeep 的归档）也渲染同一套三栏：左栏标题照常显示，
         中栏显示「该分区暂无内容。」，不白屏、不换界面 -->
    <NoteView
      :notes="notes"
      :current-key="currentKey"
      :label="label"
      :locked="lockedNow"
      root=""
      hide-back
      @open="openNote"
    >
      <!-- 中栏正文：受保护分区未解锁时换成锁提示，左栏目录与点击行为不受影响 -->
      <template #lock>
        <div class="locked-tip">
          <p class="locked-title">🔒 该分区内容已加密</p>
          <p class="locked-hint">点击左侧任意标题，输入密码后即可阅读。</p>
        </div>
      </template>
    </NoteView>

    <!-- 点击左栏条目时弹门（会话级）。放在最外层，不受三栏布局影响 -->
    <PasswordGuard
      v-if="scope && showDoor"
      :scope-key="scope"
      controlled
      :show="showDoor"
      @success="onUnlocked"
    />
  </div>
</template>

<style scoped>
/* 未解锁时的中栏占位：与正文同宽同起点，左右目录位置不跳 */
.locked-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 280px;
  padding: 24px;
  border: 1px dashed var(--vp-c-divider);
  border-radius: 12px;
  text-align: center;
}

.locked-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.locked-hint {
  margin: 0;
  font-size: 13px;
  color: var(--vp-c-text-3);
}
</style>
