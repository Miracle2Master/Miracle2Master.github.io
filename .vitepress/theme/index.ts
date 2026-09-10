import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import NoteList from './NoteList.vue'
import HomeLayout from './HomeLayout.vue'

export default {
  extends: DefaultTheme,
  Layout: HomeLayout,
  enhanceApp({ app }) {
    app.component('NoteList', NoteList)
  }
} satisfies Theme
