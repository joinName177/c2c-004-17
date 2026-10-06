<script setup lang="ts">
import { computed } from 'vue';
import { dimensionUnit, formatMeasurement, type MeasurementSystem } from '../../core/units';
import type { PackingItem, PackingPlan, Suitcase } from '../../core/models';
const props = defineProps<{ plan: PackingPlan; suitcase: Suitcase; items: PackingItem[]; view: 'top'|'side'; selectedId?: string; unit: MeasurementSystem }>();
const emit = defineEmits<{ select: [id: string] }>();
const colors = ['#df6d45', '#507d68', '#d8a84e', '#5978a7', '#9d6a83', '#6d7d86'];
const itemIndex = computed(() => new Map(props.items.map((item, index) => [item.id, index])));
const verticalSize = computed(() => props.view === 'top' ? props.suitcase.width : props.suitcase.height);
const horizontalLabel = computed(() => `${formatMeasurement(props.suitcase.length, props.unit, 'dimension')} ${dimensionUnit(props.unit)}`);
const verticalLabel = computed(() => `${formatMeasurement(verticalSize.value, props.unit, 'dimension')} ${dimensionUnit(props.unit)}`);
function styleFor(itemId: string, x: number, y: number, length: number, width: number) {
  return { left: `${x / props.suitcase.length * 100}%`, top: `${y / verticalSize.value * 100}%`, width: `${length / props.suitcase.length * 100}%`, height: `${width / verticalSize.value * 100}%`, background: colors[(itemIndex.value.get(itemId) ?? 0) % colors.length] };
}
</script>

<template>
  <div class="projection-card">
    <header><span>{{ view === 'top' ? 'TOP VIEW' : 'SIDE VIEW' }}</span><b>{{ view === 'top' ? '俯视图' : '侧视图' }} · {{ horizontalLabel }} × {{ verticalLabel }}</b></header>
    <div class="projection-layout" :class="view">
      <span class="axis-label vertical">{{ verticalLabel }}</span>
      <div>
        <div class="projection" :class="view">
          <button v-for="(placement, index) in plan.placements" :key="placement.itemId" type="button" :data-item-id="placement.itemId" :class="{ selected: placement.itemId === selectedId }" :style="styleFor(placement.itemId, placement.x, view === 'top' ? placement.y : placement.z, placement.dimensions.length, view === 'top' ? placement.dimensions.width : placement.dimensions.height)" @click="emit('select', placement.itemId)"><span>{{ index + 1 }}</span></button>
        </div>
        <span class="axis-label horizontal">{{ horizontalLabel }}</span>
      </div>
    </div>
  </div>
</template>
