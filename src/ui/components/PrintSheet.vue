<script setup lang="ts">
import { formatDimensions, formatWeight, type MeasurementSystem } from '../../core/units';
import type { PackingItem, PackingPlan, Risk, Suitcase } from '../../core/models';
import { formatRiskMessage } from '../risk-display';
defineProps<{ suitcase: Suitcase; items: PackingItem[]; plan: PackingPlan; risks: Risk[]; unit: MeasurementSystem }>();
</script>

<template><section class="print-sheet"><h1>行李箱空间规划单</h1><p>{{ formatDimensions(suitcase, unit) }} · 限重 {{ formatWeight(suitcase.maxWeight, unit) }}</p><h2>{{ plan.name }}</h2><ol><li v-for="item in items" :key="item.id">{{ plan.placements.some(p => p.itemId === item.id) ? '□' : '×' }} {{ item.name }} — {{ formatDimensions(item, unit) }} · {{ formatWeight(item.weight, unit) }}</li></ol><h3>风险提示</h3><p v-for="risk in risks" :key="risk.id">{{ risk.title }}：{{ formatRiskMessage(risk, unit) }}</p></section></template>
