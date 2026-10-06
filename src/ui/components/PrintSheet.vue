<script setup lang="ts">
import type { PackingItem, PackingPlan, Risk, Suitcase } from '../../core/models';
import { formatLengthCm, formatWeightKg, lengthUnitLabel, unitSystemName, weightUnitLabel, type UnitSystem } from '../../core/units';
defineProps<{ suitcase: Suitcase; items: PackingItem[]; plan: PackingPlan; risks: Risk[]; unit: UnitSystem }>();
</script>

<template><section class="print-sheet"><h1>行李箱空间规划单</h1><p class="print-units">{{ unitSystemName(unit) }}</p><p>{{ formatLengthCm(suitcase.length, unit) }} × {{ formatLengthCm(suitcase.width, unit) }} × {{ formatLengthCm(suitcase.height, unit) }} {{ lengthUnitLabel(unit) }} · 限重 {{ formatWeightKg(suitcase.maxWeight, unit) }} {{ weightUnitLabel(unit) }}</p><h2>{{ plan.name }}</h2><ol><li v-for="item in items" :key="item.id">{{ plan.placements.some(p => p.itemId === item.id) ? '□' : '×' }} {{ item.name }}（{{ formatLengthCm(item.length, unit) }}×{{ formatLengthCm(item.width, unit) }}×{{ formatLengthCm(item.height, unit) }} {{ lengthUnitLabel(unit) }}）— {{ formatWeightKg(item.weight, unit) }} {{ weightUnitLabel(unit) }}</li></ol><h3>风险提示</h3><p v-for="risk in risks" :key="risk.id">{{ risk.title }}：{{ risk.message }}<template v-if="risk.weightOverrunKg !== undefined">超出承重 {{ formatWeightKg(risk.weightOverrunKg, unit) }} {{ weightUnitLabel(unit) }}。</template></p></section></template>
