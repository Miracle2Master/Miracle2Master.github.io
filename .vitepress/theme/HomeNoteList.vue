<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useData } from 'vitepress'
import SectionNav from './SectionNav.vue'
import PlanningList from './PlanningList.vue'

const active = ref<'home' | 'learning' | 'planning'>('home')
const route = useRoute()
const { isDark, page } = useData()

// 首页注入的年份列表（config.mts transformPageData）
const planningYears = computed(() => page.value.planningYears ?? [])

// 分组卡片（学习记录）
const modules = import.meta.glob('../../docs/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true
})

type Entry = { title: string; link: string; order: number }

function orderOf(raw: string): number {
  const fm = raw.match(/^---\s*\n([\s\S]*?)\n---/)
  if (!fm) return Number.MAX_SAFE_INTEGER
  const m = fm[1].match(/order\s*:\s*(\d+)/)
  return m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER
}

const MAX_SHOW = 3

const groups = computed(() => {
  const map = new Map<string, Entry[]>()
  for (const [path, raw] of Object.entries(modules)) {
    const rel = path.replace(/^\.\.\/\.\.\/docs\//, '')
    if (rel === 'index.md') continue
    if (rel === 'notes.md') continue
    if (rel === 'planning.md') continue
    if (rel.startsWith('planning/')) continue
    const seg = rel.split('/')
    if (seg[0] === 'category') continue
    const group = seg.length > 1 ? seg[0] : '其他'
    const title = seg[seg.length - 1].replace(/\.md$/, '')
    const link = '/' + rel.replace(/\.md$/, '.html')
    const order = orderOf(raw as string)
    if (!map.has(group)) map.set(group, [])
    map.get(group)!.push({ title, link, order })
  }
  const arr = Array.from(map.entries()).map(([group, entries]) => {
    entries.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'zh-CN'))
    return {
      group,
      entries: entries.slice(0, MAX_SHOW),
      total: entries.length,
      link: '/category/' + group + '.html',
      order: Math.min(...entries.map((e) => e.order))
    }
  })
  arr.sort((a, b) => a.order - b.order || a.group.localeCompare(b.group, 'zh-CN'))
  return arr
})

function select(tab: string) {
  active.value = tab as 'home' | 'learning' | 'planning'
  const mode = isDark.value ? 'dark' : 'light'
  history.replaceState(null, '', tab === 'home' ? '/' : `#${tab}-${mode}`)
}

// 点击分类卡片空白处 → 进入该分类目录页；点内部链接不重复跳转
function goCategory(link: string, e: Event) {
  const target = e.target as HTMLElement
  if (target.closest('a')) return // 内部有 <a>（标签 / 查看全部），交给原生导航
  window.location.href = link
}

function syncFromHash() {
  const h = window.location.hash
  if (h.startsWith('#learning')) active.value = 'learning'
  else if (h.startsWith('#planning')) active.value = 'planning'
  else active.value = 'home'
}

onMounted(() => {
  syncFromHash()
})

route.onAfterRouteChanged = () => {
  syncFromHash()
}
</script>

<template>
  <section class="home-content">
    <div class="container">
      <div class="tab-shell">
        <SectionNav :active="active" @select="select" />

        <div class="tab-body">
          <!-- 左侧：个人信息卡（所有 Tab 共用，内含竖向导航） -->
          <aside class="profile">
            <div class="profile-card">
              <div class="profile-avatar">
                <img class="profile-avatar-img" src="/headIcon.png" alt="头像" />
              </div>
              <div class="profile-name">
                <span class="profile-name-text">奇迹师</span>
              </div>
              <div class="profile-bio">
                <span class="bio-line">不属于这个时代的愚者</span>
                <span class="bio-line">灰雾之上的神秘主宰</span>
                <span class="bio-line">执掌好运的黄黑之王</span>
              </div>
              <div class="profile-stats">
                <div class="stat"><span class="stat-num">67</span><span class="stat-label">笔记</span></div>
                <div class="stat"><span class="stat-num">-</span><span class="stat-label">分类</span></div>
                <div class="stat"><span class="stat-num">-</span><span class="stat-label">阅读</span></div>
              </div>

              <!-- 卡片下半：竖向分区导航 -->
              <div class="profile-nav">
                <SectionNav vertical :active="active" @select="select" />
              </div>
            </div>
          </aside>

          <!-- 右侧：当前 Tab 内容 -->
          <main class="tab-content">
            <!-- 个人主页 -->
            <div v-show="active === 'home'" class="tab-pane">
              <h2 class="section-title">关于我</h2>
              <div class="intro-text">
                <p>我是奇迹师，一位行走在知识与神秘之间的记录者。作为愚者的信徒，相信奇迹并非遥不可及——它藏在每一次从不懂到懂的顿悟里，藏在每一页翻开又合上的笔记中。</p>
                <p>我的占卜家途径，是沿着 Java 与微服务的骨架、机器学习的算符、深度学习的神经网络一路占卜前进的方向。这里记录了我从凡俗到非凡的学习轨迹，愿每一次阅读，都是一次神秘的聚合。</p>
              </div>
            </div>

            <!-- 学习记录 -->
            <div v-show="active === 'learning'" class="tab-pane">
              <div class="group-grid">
                <div
                  v-for="g in groups"
                  :key="g.group"
                  class="note-group"
                  role="link"
                  tabindex="0"
                  @click="goCategory(g.link, $event)"
                  @keydown.enter="goCategory(g.link, $event)"
                >
                  <h3>{{ g.group }}</h3>
                  <div class="entry-list">
                    <a v-for="e in g.entries" :key="e.link" class="entry-tag" :href="e.link">{{ e.title }}</a>
                    <a v-if="g.total > MAX_SHOW" class="more-link" :href="g.link">查看全部（共 {{ g.total }} 篇）→</a>
                  </div>
                  <span class="cat-hint">进入该分类 →</span>
                </div>
              </div>
            </div>

            <!-- 人生规划 -->
            <div v-show="active === 'planning'" class="tab-pane">
              <PlanningList :years="planningYears" />
            </div>
          </main>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.home-content {
  margin-top: 0;
  padding: 48px 0;
}

.container {
  margin: auto;
  width: 100%;
  max-width: 1152px;
  padding: 0 24px;
}

/* ===== 总外框：罩住 Tab + 全部内容，延伸到底 ===== */
.tab-shell {
  border: 1px solid rgba(34, 211, 238, 0.28);
  border-radius: 16px;
  background: var(--vp-c-bg-soft);
  padding: 24px;
}

/* ===== 主体：左 3/10 个人信息 + 右 7/10 内容 ===== */
.tab-body {
  display: flex;
  gap: 28px;
  align-items: flex-start;
}

.profile {
  flex: 3;
  min-width: 0;
}

.tab-content {
  flex: 7;
  min-width: 0;
}

@media (max-width: 768px) {
  .tab-body {
    flex-direction: column;
  }
}

.tab-pane {
  animation: fadeIn 0.2s ease;
  min-height: 320px;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ===== 左侧个人信息占位卡 ===== */
.profile-card {
  border: 1px solid rgba(34, 211, 238, 0.28);
  border-radius: 12px;
  background: var(--vp-c-bg);
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.profile-card:hover {
  border-color: rgba(34, 211, 238, 0.6);
  box-shadow: 0 0 14px rgba(34, 211, 238, 0.22);
}

.profile-avatar {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  border: 2px solid rgba(34, 211, 238, 0.5);
  background: rgba(34, 211, 238, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.avatar-placeholder {
  font-size: 32px;
  color: var(--vp-c-brand-1);
  opacity: 0.7;
}

.profile-avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.profile-name {
  margin-bottom: 12px;
  width: 100%;
  display: flex;
  justify-content: center;
}

.profile-name-text {
  font-size: 20px;
  font-weight: 700;
  color: var(--vp-c-brand-1);
  letter-spacing: 2px;
}

.profile-bio {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 20px;
}

.bio-line {
  font-size: 13px;
  color: var(--vp-c-text-2);
  line-height: 1.5;
}

.profile-stats {
  display: flex;
  justify-content: space-around;
  width: 100%;
  border-top: 1px solid var(--vp-c-divider);
  padding-top: 16px;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stat-num {
  font-size: 18px;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  font-family: var(--vp-font-family-mono);
}

.stat-label {
  font-size: 12px;
  color: var(--vp-c-text-3);
}

/* 卡片下半：竖向导航 */
.profile-nav {
  width: 100%;
  margin-top: 20px;
  border-top: 1px solid var(--vp-c-divider);
  padding-top: 20px;
}

.profile-nav :deep(.section-nav) {
  margin-bottom: 0;
}

/* ===== 右侧内容 ===== */
.section-title {
  font-size: 24px;
  line-height: 32px;
  font-weight: 600;
  text-align: left;
  margin: 0 0 20px;
}

.intro-text p {
  margin: 0 0 12px;
  font-size: 15px;
  line-height: 1.8;
  color: var(--vp-c-text-1);
}

.intro-text p:last-child {
  margin-bottom: 0;
}

.group-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

@media (max-width: 900px) {
  .group-grid {
    grid-template-columns: 1fr;
  }
}

.note-group {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  padding: 20px 24px;
  border: 1px solid rgba(34, 211, 238, 0.28);
  border-radius: 12px;
  background: var(--vp-c-bg);
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.note-group:hover {
  border-color: rgba(34, 211, 238, 0.6);
  box-shadow: 0 0 14px rgba(34, 211, 238, 0.22);
}

.note-group h3 {
  font-size: 18px;
  line-height: 24px;
  font-weight: 600;
  margin: 0;
  color: var(--vp-c-text-1);
}

.entry-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.entry-tag {
  display: inline-block;
  padding: 4px 12px;
  border: 1px solid rgba(34, 211, 238, 0.35);
  border-radius: 999px;
  background: rgba(34, 211, 238, 0.06);
  color: var(--vp-c-brand-1);
  text-decoration: none;
  font-size: 14px;
  line-height: 22px;
  transition: all 0.2s ease;
}

.entry-tag:hover {
  color: #04121a;
  background: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 10px rgba(34, 211, 238, 0.5);
}

.more-link {
  display: inline-block;
  font-size: 13px;
  color: var(--vp-c-brand-1);
  text-decoration: none;
  transition: color 0.2s ease;
}

.more-link:hover {
  color: var(--vp-c-brand-2);
  text-decoration: underline;
}

/* 整卡可点击提示：右下角 */
.cat-hint {
  position: absolute;
  right: 16px;
  bottom: 10px;
  font-size: 12px;
  color: var(--vp-c-brand-1);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.note-group:hover .cat-hint {
  opacity: 1;
}
</style>
