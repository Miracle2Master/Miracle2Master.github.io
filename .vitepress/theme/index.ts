import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import './style.css'
import CustomLayout from './CustomLayout.vue'

// 分区正文化不再注册全局组件：
// 所有分区共用 SectionPane（内部局部 import NoteView / FileTree / PasswordGuard），
// 不为任何单个分区注册专属组件，新增文件夹无需改这里。
export default {
  extends: DefaultTheme,
  Layout: CustomLayout
} satisfies Theme
