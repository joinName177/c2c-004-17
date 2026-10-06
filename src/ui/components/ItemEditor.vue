<script setup lang="ts">
import { reactive, watch } from 'vue';
import { formatMeasurement, parseMeasurement, toCanonicalValue, toDisplayValue, type MeasurementSystem } from '../../core/units';
import type { PackingItem } from '../../core/models';

const props = defineProps<{ unit: MeasurementSystem }>();
const emit = defineEmits<{ add: [item: PackingItem]; pendingChange: [pending: boolean] }>();

const canonicalDefaults = { length: 20, width: 15, height: 5, weight: 0.3 };
const makeForm = () => ({
  name: '',
  category: '衣物',
  length: formatMeasurement(canonicalDefaults.length, props.unit, 'dimension'),
  width: formatMeasurement(canonicalDefaults.width, props.unit, 'dimension'),
  height: formatMeasurement(canonicalDefaults.height, props.unit, 'dimension'),
  weight: toDisplayValue(canonicalDefaults.weight, props.unit, 'weight').toFixed(2).replace(/\.?0+$/, ''),
  priority: '2',
  mustHave: false,
  fragile: false,
});
const initial = makeForm();
const draft = reactive(makeForm());
let dirty = false;

function isDirty() {
  return draft.name !== initial.name
    || draft.category !== initial.category
    || draft.length !== initial.length
    || draft.width !== initial.width
    || draft.height !== initial.height
    || draft.weight !== initial.weight
    || draft.priority !== initial.priority
    || draft.mustHave !== initial.mustHave
    || draft.fragile !== initial.fragile;
}
function syncDirty() {
  const next = isDirty();
  if (next !== dirty) {
    dirty = next;
    emit('pendingChange', dirty);
  }
}
function resetDraft() {
  Object.assign(draft, makeForm());
  Object.assign(initial, makeForm());
  syncDirty();
}

watch(draft, syncDirty, { deep: true });
watch(() => props.unit, () => {
  if (!dirty) resetDraft();
});

function parsedValues() {
  return {
    length: parseMeasurement(draft.length),
    width: parseMeasurement(draft.width),
    height: parseMeasurement(draft.height),
    weight: parseMeasurement(draft.weight),
  };
}
function isValid() {
  return Object.values(parsedValues()).every((value) => value !== null);
}
function submit() {
  const values = parsedValues();
  if (values.length === null || values.width === null || values.height === null || values.weight === null) return;
  const name = draft.name.trim() || '未命名物品';
  emit('add', {
    id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    category: draft.category,
    length: toCanonicalValue(values.length, props.unit, 'dimension'),
    width: toCanonicalValue(values.width, props.unit, 'dimension'),
    height: toCanonicalValue(values.height, props.unit, 'dimension'),
    weight: toCanonicalValue(values.weight, props.unit, 'weight'),
    priority: Number(draft.priority) as 1 | 2 | 3,
    mustHave: draft.mustHave,
    fragile: draft.fragile,
  });
  resetDraft();
}

const dimensionLabel = props.unit === 'metric' ? 'cm' : 'in';
const weightLabel = props.unit === 'metric' ? 'kg' : 'lb';
</script>

<template>
  <form class="item-editor" data-testid="item-editor" @submit.prevent="submit">
    <input v-model="draft.name" aria-label="物品名称" placeholder="添加物品名称" />
    <select v-model="draft.category" aria-label="物品类别"><option>衣物</option><option>鞋履</option><option>数码</option><option>洗护</option><option>随身</option><option>其他</option></select>
    <label>长 <input v-model="draft.length" aria-label="物品长度" type="number" min="0.1" step="0.1" :placeholder="dimensionLabel" /></label>
    <label>宽 <input v-model="draft.width" aria-label="物品宽度" type="number" min="0.1" step="0.1" :placeholder="dimensionLabel" /></label>
    <label>高 <input v-model="draft.height" aria-label="物品高度" type="number" min="0.1" step="0.1" :placeholder="dimensionLabel" /></label>
    <label>重 <input v-model="draft.weight" aria-label="物品重量" type="number" min="0.1" :step="unit === 'metric' ? 0.05 : 0.1" :placeholder="weightLabel" /></label>
    <select v-model="draft.priority" aria-label="物品优先级"><option value="1">P1</option><option value="2">P2</option><option value="3">P3</option></select>
    <label class="check-control"><input v-model="draft.mustHave" type="checkbox" /> 必带</label>
    <label class="check-control"><input v-model="draft.fragile" type="checkbox" /> 易碎</label>
    <button type="submit" :disabled="!isValid()">＋ 添加</button>
    <button v-if="dirty" type="button" class="secondary" @click="resetDraft">取消</button>
    <p v-if="dirty && !isValid()" class="field-error">请填写有效的尺寸和重量。</p>
  </form>
</template>
