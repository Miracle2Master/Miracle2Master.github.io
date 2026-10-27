<script setup lang="ts">
// 左侧文件树：递归渲染任意层级的子文件夹
// 展开状态由 NoteView 统一持有（用完整路径作 key），这样「全部展开 / 全部收起」
// 与「当前笔记自动展开祖先」都能一次改到所有层级，递归组件本身只负责显示与上报点击。
type TreeFile = { title: string; key: string }
type SubGroup = { name: string; path: string; files: TreeFile[]; subs: SubGroup[] }

const props = defineProps<{
  rootFiles?: TreeFile[]
  subs?: SubGroup[]
  currentKey: string
  // 已展开的文件夹路径（相对作用域根，如 'Spring'、'Spring/AI'）
  expanded: string[]
}>()

const emit = defineEmits<{ open: [key: string]; toggle: [path: string] }>()

function isOpen(path: string): boolean {
  return props.expanded.includes(path)
}
</script>

<template>
  <!-- 当前文件夹的直接文件 -->
  <ul v-if="rootFiles?.length" class="file-nav-list">
    <li v-for="n in rootFiles" :key="n.key">
      <button
        class="file-nav-item"
        :class="{ current: n.key === currentKey }"
        @click="emit('open', n.key)"
      >{{ n.title }}</button>
    </li>
  </ul>

  <!-- 子文件夹（递归） -->
  <div v-for="sub in subs" :key="sub.path" class="file-nav-sub">
    <!-- 文件夹标题即折叠开关：点一下收起/展开，不触发选中 -->
    <button
      class="file-nav-sub-title"
      :class="{ collapsed: !isOpen(sub.path) }"
      :aria-expanded="isOpen(sub.path)"
      @click="emit('toggle', sub.path)"
    >
      <span class="file-nav-chevron">▸</span>
      <span class="file-nav-sub-name">{{ sub.name }}</span>
    </button>
    <FileTree
      v-if="isOpen(sub.path)"
      :root-files="sub.files"
      :subs="sub.subs"
      :current-key="currentKey"
      :expanded="expanded"
      @open="(key: string) => emit('open', key)"
      @toggle="(path: string) => emit('toggle', path)"
    />
  </div>
</template>

<style scoped>
.file-nav-list {
  list-style: none;
  padding-left: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.file-nav-list li {
  margin: 0;
  padding: 0;
}

/* 子文件夹分组：与上一组保持距离；第二层起再加缩进与左侧竖线 */
.file-nav-sub {
  margin-top: 16px;
}

.file-nav-sub .file-nav-sub {
  margin-top: 8px;
  padding-left: 12px;
  border-left: 1px solid var(--vp-c-divider);
}

/* 子文件夹标题：既是标签也是折叠开关 */
.file-nav-sub-title {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 2px 12px 6px;
  font-size: 13px;
  font-weight: 700;
  font-family: inherit;
  line-height: 1.6;
  text-align: left;
  letter-spacing: 0.5px;
  color: var(--note-accent);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color 0.2s ease;
}

.file-nav-sub-title:hover {
  color: var(--note-accent-hover);
}

.file-nav-sub-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 层级小箭头：展开时朝下，收起时朝右 */
.file-nav-chevron {
  flex: none;
  font-size: 11px;
  line-height: 1;
  color: var(--note-accent);
  transform: rotate(90deg);
  transition: transform 0.15s ease;
}

.file-nav-sub-title.collapsed .file-nav-chevron {
  transform: rotate(0deg);
}

.file-nav-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 12px;
  font-size: 14px;
  font-family: inherit;
  line-height: 1.6;
  color: var(--vp-c-text-2);
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.file-nav-item:hover {
  background: var(--note-active-bg);
  color: var(--note-accent);
}

.file-nav-item.current {
  background: var(--note-active-bg);
  color: var(--note-accent);
  font-weight: 600;
  /* 选中项左侧竖条：与选中字色一致 */
  box-shadow: inset 3px 0 0 var(--note-accent);
}
</style>
