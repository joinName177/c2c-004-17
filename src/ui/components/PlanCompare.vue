<script setup lang="ts">
import { formatMeasurement, weightUnit, type MeasurementSystem } from '../../core/units';
import type { PackingPlan, PlanMode, Suitcase } from '../../core/models';
const props = defineProps<{ plans: Record<PlanMode, PackingPlan>; selected: PlanMode; suitcase: Suitcase; unit: MeasurementSystem }>();
const emit = defineEmits<{ select: [mode: PlanMode] }>();
</script>

<template>
  <div class="plan-tabs">
    <button v-for="plan in plans" :key="plan.id" type="button" :data-plan="plan.id" :class="{ active: plan.id === selected }" @click="emit('select', plan.id)">
      <span>{{ plan.id === 'minimal' ? 'LIGHT' : plan.id === 'comfort' ? 'BALANCED' : 'RESERVE' }}</span>
      <strong>{{ plan.name }}</strong>
      <small>{{ plan.placements.length }} 件 · {{ Math.round(plan.capacityRatio * 100) }}% 空间 · {{ formatMeasurement(plan.totalWeight, unit, 'weight') }}/{{ formatMeasurement(suitcase.maxWeight, unit, 'weight') }} {{ weightUnit(unit) }}</small>
    </button>
  </div>
</template>
