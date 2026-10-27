// 全站共享的「分区」Tab 状态。
// 分区清单由构建期扫描 docs/ 得出（config.mts → pageData.sectionNav），这里只保存当前选中的 key。
// HomeNoteList（首页分区内容）与 SecNav（顶部二级导航）共用同一状态，保证两处联动一致。
import { ref } from 'vue'

// 首页固定标识：导航里只有它是写死的，且不出现在扫描结果中
export const HOME_KEY = 'home'

// 当前分区 key（= docs 下一个一级目录名，或 HOME_KEY）
export const sectionTab = ref<string>(HOME_KEY)

// 二级导航点击计数：每点一次自增（含重复点击当前分区）。
// 分区 pane 用它判断「用户从导航进来」，从而回到默认视图（该分区第一篇）。
// 与直接改 sectionTab 分开，是因为 pane 内部（切到某篇）也会锁定分区，
// 那些动作不能算作「从导航进入」。
export const sectionClick = ref(0)

// 切换分区并同步地址栏 hash（#notes / #diary / #archive；首页回到 /）
export function setSection(key: string) {
  sectionTab.value = key
  if (typeof window === 'undefined') return
  history.replaceState(null, '', key === HOME_KEY ? '/' : '#' + key)
}

// 二级导航点击入口：先记一次点击，再切换分区
export function navToSection(key: string) {
  sectionClick.value++
  setSection(key)
}

