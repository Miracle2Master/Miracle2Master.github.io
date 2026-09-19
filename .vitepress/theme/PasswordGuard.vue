<script setup lang="ts">
import { ref, onMounted } from 'vue'

// ===== 密码门配置（前置访问门槛，防普通访客）=====
// ⚠️ 纯前端防护：高级用户可阅读 JS 源码绕过，切勿存放真正机密内容
const TTL_MS = 7 * 24 * 60 * 60 * 1000 // 会话有效期：7 天
const ITERATIONS = 1000 // SHA-256 迭代次数（明文密码不落源码，多加密几次）
// 密码「lihan20020104」迭代 1000 次 SHA-256 得到的哈希（不存明文）
const STORED_HASH = '82fa6d846161044dca64dbbf9e55abe49ea97dedcddecd2ec8cd765d3affb976'
const STORAGE_KEY = 'miracle-auth'

const locked = ref(true)
const password = ref('')
const error = ref('')
const checking = ref(false)

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// 与生成时一致的迭代哈希校验
async function check(input: string): Promise<boolean> {
  let h = input
  for (let i = 0; i < ITERATIONS; i++) {
    h = await sha256Hex(h)
  }
  return h === STORED_HASH
}

// sessionStorage 中存储 { authed, at }，at 为登录时间戳，超 7 天失效
function sessionValid(): boolean {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const data = JSON.parse(raw)
    return (
      data &&
      data.authed === true &&
      typeof data.at === 'number' &&
      Date.now() - data.at < TTL_MS
    )
  } catch {
    return false
  }
}

onMounted(() => {
  locked.value = !sessionValid()
})

async function submit() {
  if (!password.value || checking.value) return
  checking.value = true
  error.value = ''
  const ok = await check(password.value)
  checking.value = false
  if (ok) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ authed: true, at: Date.now() }))
    locked.value = false
  } else {
    error.value = '密码错误，请重试'
    password.value = ''
  }
}
</script>

<template>
  <slot v-if="!locked" />
  <div v-else class="guard">
    <form class="guard-box" @submit.prevent="submit">
      <div class="guard-title">🔒 请输入访问密码</div>
      <input
        v-model="password"
        type="password"
        class="guard-input"
        placeholder="输入密码"
        autofocus
        autocomplete="current-password"
      />
      <button type="submit" class="guard-btn" :disabled="checking">
        {{ checking ? '校验中…' : '进入' }}
      </button>
      <p v-if="error" class="guard-error">{{ error }}</p>
    </form>
  </div>
</template>

<style scoped>
.guard {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--vp-c-bg, #0b1220);
}

.guard-box {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: min(340px, 84vw);
  padding: 32px 28px;
  border: 1px solid rgba(34, 211, 238, 0.35);
  border-radius: 16px;
  background: var(--vp-c-bg-soft, #111a2e);
  box-shadow: 0 0 30px rgba(34, 211, 238, 0.15);
}

.guard-title {
  font-size: 18px;
  font-weight: 600;
  text-align: center;
  color: var(--vp-c-text-1, #e2e8f0);
  margin-bottom: 4px;
}

.guard-input {
  padding: 12px 14px;
  font-size: 15px;
  border: 1px solid rgba(34, 211, 238, 0.4);
  border-radius: 10px;
  background: var(--vp-c-bg, #0b1220);
  color: var(--vp-c-text-1, #e2e8f0);
  outline: none;
  transition: border-color 0.2s;
}

.guard-input:focus {
  border-color: var(--vp-c-brand-1, #22d3ee);
  box-shadow: 0 0 10px rgba(34, 211, 238, 0.3);
}

.guard-btn {
  padding: 12px;
  font-size: 15px;
  font-weight: 600;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #0e7490, #22d3ee);
  color: #04121a;
  cursor: pointer;
  transition: opacity 0.2s;
}

.guard-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.guard-error {
  text-align: center;
  color: #f87171;
  font-size: 13px;
  margin: 0;
}
</style>