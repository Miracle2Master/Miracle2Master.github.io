import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import { h } from 'vue'
import './style.css'
import NoteList from './NoteList.vue'
import CategoryList from './CategoryList.vue'
import HomeLayout from './HomeLayout.vue'
import PlanningList from './PlanningList.vue'
import PlanningYear from './PlanningYear.vue'
import PasswordGuard from './PasswordGuard.vue'

// 全站密码门：包住整个 Layout，所有页面进入前先校验（sessionStorage + 7 天过期）
const GuardedLayout = {
  setup() {
    return () => h(PasswordGuard, null, { default: () => h(HomeLayout) })
  }
}

export default {
  extends: DefaultTheme,
  Layout: GuardedLayout,
  enhanceApp({ app }) {
    app.component('NoteList', NoteList)
    app.component('CategoryList', CategoryList)
    app.component('PlanningList', PlanningList)
    app.component('PlanningYear', PlanningYear)
  }
} satisfies Theme
