<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import PlanningList from './PlanningList.vue'

// 人生规划 Tab：读取构建期注入的年份列表（config.mts transformPageData）
const { page } = useData()
const planningYears = computed(() => page.value.planningYears ?? [])
</script>

<template>
  <PlanningList :years="planningYears" />
</template>
