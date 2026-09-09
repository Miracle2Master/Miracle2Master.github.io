import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Miracle2Master 笔记',
  description: '我的学习笔记站',
  lang: 'zh-CN',
  base: '/',
  srcDir: 'docs',
  ignoreDeadLinks: true,
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '微服务', link: '/微服务/微服务01' }
    ],
    sidebar: [
      {
        text: '微服务',
        items: [
          { text: '微服务01', link: '/微服务/微服务01' },
          { text: '微服务02', link: '/微服务/微服务02' },
          { text: '微服务面试', link: '/微服务/微服务面试' }
        ]
      }
    ],
    outline: {
      label: '本页目录',
      level: [2, 3]
    },
    docFooter: {
      prev: '上一篇',
      next: '下一篇'
    },
    lastUpdated: {
      text: '最后更新'
    },
    search: {
      provider: 'local'
    }
  }
})
