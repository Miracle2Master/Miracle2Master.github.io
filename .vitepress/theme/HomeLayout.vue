<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import HomeNoteList from './HomeNoteList.vue'

const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <template #home-features-after>
      <HomeNoteList />
    </template>
  </Layout>
</template>
