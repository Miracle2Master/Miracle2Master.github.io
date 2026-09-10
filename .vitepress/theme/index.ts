import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import NoteList from './NoteList.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('NoteList', NoteList)
  }
} satisfies Theme
