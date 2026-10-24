// 全站共享的「分区」Tab 状态：首页 main 容器内的分区（个人主页 / 学习记录 / 人生规划）。
// HomeNoteList（首页 Tab 内容）与 SecNav（顶部二级导航）共用同一状态，
// 保证点击任一处切换分区时，另一处的高亮与内容保持联动一致。
import { ref } from 'vue'

export type SectionTab = 'home' | 'learning' | 'planning'

export const sectionTab = ref<SectionTab>('home')
