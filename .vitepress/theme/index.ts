import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import './style.css'
import NoteList from './NoteList.vue'
import CategoryList from './CategoryList.vue'
import HomeLayout from './HomeLayout.vue'
import PlanningList from './PlanningList.vue'
import PlanningYear from './PlanningYear.vue'
import PasswordGuard from './PasswordGuard.vue'

// 密码门不再全站包裹：仅由 PlanningYear（日记区域）按需触发
export default {
  extends: DefaultTheme,
  Layout: HomeLayout,
  enhanceApp({ app }) {
    app.component('NoteList', NoteList)
    app.component('CategoryList', CategoryList)
    app.component('PlanningList', PlanningList)
    app.component('PlanningYear', PlanningYear)
    app.component('PasswordGuard', PasswordGuard)
  }
} satisfies Theme
