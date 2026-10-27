import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import './style.css'
import CustomLayout from './CustomLayout.vue'
import { installHomeNoteRedirect } from './noteRoute'

// 分区正文化不再注册全局组件：
// 所有分区共用 SectionPane（内部局部 import NoteView / FileTree / PasswordGuard），
// 不为任何单个分区注册专属组件，新增文件夹无需改这里。
export default {
  extends: DefaultTheme,
  Layout: CustomLayout,
  // enhanceApp 在 SSR 阶段也会被调用（dist/client/app/ssr.js → createApp），
  // 而改道要动 window/history，所以只在浏览器端挂。
  enhanceApp({ router, siteData }) {
    if (typeof window === 'undefined') return
    installHomeNoteRedirect(router, siteData.value.base)
  }
} satisfies Theme
