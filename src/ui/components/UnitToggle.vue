<script setup lang="ts">
import type { UnitSystem } from '../../core/units';
defineProps<{ modelValue: UnitSystem }>();
const emit = defineEmits<{ 'update:modelValue': [unit: UnitSystem] }>();
</script>

<template>
  <div class="unit-toggle" role="group" aria-label="度量单位切换">
    <button type="button" data-testid="unit-metric" :class="{ active: modelValue === 'metric' }" :aria-pressed="modelValue === 'metric'" @click="emit('update:modelValue', 'metric')">公制 cm/kg</button>
    <button type="button" data-testid="unit-imperial" :class="{ active: modelValue === 'imperial' }" :aria-pressed="modelValue === 'imperial'" @click="emit('update:modelValue', 'imperial')">英制 in/lb</button>
  </div>
</template>
