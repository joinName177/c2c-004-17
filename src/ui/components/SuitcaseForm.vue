<script setup lang="ts">
import { reactive, watch } from 'vue';
import { validateSuitcase } from '../../core/packing-engine';
import { formatMeasurement, parseMeasurement, toCanonicalValue, type MeasurementSystem } from '../../core/units';
import type { Suitcase } from '../../core/models';

const props = defineProps<{ suitcase: Suitcase; errors: string[]; unit: MeasurementSystem }>();
const emit = defineEmits<{
  update: [patch: Partial<Suitcase>];
  pendingChange: [pending: boolean];
}>();

const fields = ['length', 'width', 'height'] as const;
const initial = () => ({
  length: formatMeasurement(props.suitcase.length, props.unit, 'dimension'),
  width: formatMeasurement(props.suitcase.width, props.unit, 'dimension'),
  height: formatMeasurement(props.suitcase.height, props.unit, 'dimension'),
  maxWeight: formatMeasurement(props.suitcase.maxWeight, props.unit, 'weight'),
});
const draft = reactive(initial());
let initialDraft = initial();
let dirty = false;

function syncDirty(next = fields.some((field) => draft[field] !== initialDraft[field]) || draft.maxWeight !== initialDraft.maxWeight) {
  if (next !== dirty) {
    dirty = next;
    emit('pendingChange', dirty);
  }
}
function resetDraft() {
  initialDraft = initial();
  Object.assign(draft, initialDraft);
  syncDirty(false);
}

watch(draft, () => syncDirty(), { deep: true });
watch(() => [props.suitcase.length, props.suitcase.width, props.suitcase.height, props.suitcase.maxWeight, props.unit], () => {
  if (!dirty) resetDraft();
});

function validationErrors(): string[] {
  const values = {
    length: parseMeasurement(draft.length),
    width: parseMeasurement(draft.width),
    height: parseMeasurement(draft.height),
    maxWeight: parseMeasurement(draft.maxWeight),
  };
  const errors: string[] = [];
  if (values.length === null) errors.push('请输入有效的行李箱长度');
  if (values.width === null) errors.push('请输入有效的行李箱宽度');
  if (values.height === null) errors.push('请输入有效的行李箱高度');
  if (values.maxWeight === null) errors.push('请输入有效的最大承重');
  if (errors.length) return errors;
  return validateSuitcase({
    length: toCanonicalValue(values.length ?? 0, props.unit, 'dimension'),
    width: toCanonicalValue(values.width ?? 0, props.unit, 'dimension'),
    height: toCanonicalValue(values.height ?? 0, props.unit, 'dimension'),
    maxWeight: toCanonicalValue(values.maxWeight ?? 0, props.unit, 'weight'),
  });
}

function submit() {
  if (validationErrors().length) return;
  const patch = {} as Partial<Record<typeof fields[number] | 'maxWeight', number>>;
  for (const field of fields) {
    if (draft[field] !== initialDraft[field]) {
      patch[field] = toCanonicalValue(parseMeasurement(draft[field]) ?? 0, props.unit, 'dimension');
    }
  }
  if (draft.maxWeight !== initialDraft.maxWeight) {
    patch.maxWeight = toCanonicalValue(parseMeasurement(draft.maxWeight) ?? 0, props.unit, 'weight');
  }
  if (Object.keys(patch).length) emit('update', patch as Partial<Suitcase>);
  resetDraft();
}

const formErrors = () => dirty ? validationErrors() : props.errors;
const dimensionLabel = props.unit === 'metric' ? 'CM' : 'IN';
const weightLabel = props.unit === 'metric' ? 'kg' : 'lb';
const rangeConfig = props.unit === 'metric'
  ? { min: 1, max: 35, step: 0.5 }
  : { min: 2.2, max: 77.1, step: 0.1 };
</script>

<template>
  <section class="panel suitcase-form">
    <div class="section-title"><div><span>01 / SUITCASE</span><h2>行李箱配置</h2></div><b>内部尺寸</b></div>
    <div class="dimension-grid">
      <label>长度 <span>{{ dimensionLabel }}</span><input aria-label="行李箱长度" type="number" :min="unit === 'metric' ? 1 : 0.4" :step="unit === 'metric' ? 1 : 0.1" v-model="draft.length" /></label>
      <i>×</i>
      <label>宽度 <span>{{ dimensionLabel }}</span><input aria-label="行李箱宽度" type="number" :min="unit === 'metric' ? 1 : 0.4" :step="unit === 'metric' ? 1 : 0.1" v-model="draft.width" /></label>
      <i>×</i>
      <label>高度 <span>{{ dimensionLabel }}</span><input aria-label="行李箱高度" type="number" :min="unit === 'metric' ? 1 : 0.4" :step="unit === 'metric' ? 1 : 0.1" v-model="draft.height" /></label>
    </div>
    <label class="weight-field">最大承重 <span>{{ draft.maxWeight }} {{ weightLabel }}</span><input type="range" :min="rangeConfig.min" :max="rangeConfig.max" :step="rangeConfig.step" v-model="draft.maxWeight" /></label>
    <div v-if="dirty" class="form-actions">
      <button type="button" class="secondary" @click="resetDraft">取消</button>
      <button type="button" class="primary" :disabled="validationErrors().length > 0" @click="submit">提交箱体</button>
    </div>
    <p v-for="error in formErrors()" :key="error" class="field-error">{{ error }}</p>
  </section>
</template>
