<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import type { Suitcase } from '../../core/models';
import {
  WEIGHT_SLIDER_RANGE,
  formatLengthCm,
  formatWeightKg,
  lengthUnitLabel,
  parseLengthToCm,
  parseWeightToKg,
  weightUnitLabel,
  type UnitSystem,
} from '../../core/units';

const props = defineProps<{ suitcase: Suitcase; errors: string[]; unit: UnitSystem }>();
const emit = defineEmits<{
  update: [patch: Partial<Suitcase>];
  'pending-change': [pending: boolean];
}>();

type LengthKey = 'length' | 'width' | 'height';
const POSITIVE_MESSAGE: Record<LengthKey | 'maxWeight', string> = {
  length: '行李箱长度必须大于 0',
  width: '行李箱宽度必须大于 0',
  height: '行李箱高度必须大于 0',
  maxWeight: '承重必须大于 0',
};

const draft = reactive({ length: '', width: '', height: '', maxWeight: '' });
const fieldErrors = reactive({ length: '', width: '', height: '', maxWeight: '' });
const pending = ref(false);
const lengthUnit = computed(() => lengthUnitLabel(props.unit));
const weightUnit = computed(() => weightUnitLabel(props.unit));
const sliderRange = computed(() => WEIGHT_SLIDER_RANGE[props.unit]);

function syncFromProps() {
  draft.length = formatLengthCm(props.suitcase.length, props.unit);
  draft.width = formatLengthCm(props.suitcase.width, props.unit);
  draft.height = formatLengthCm(props.suitcase.height, props.unit);
  draft.maxWeight = formatWeightKg(props.suitcase.maxWeight, props.unit);
}
function clearErrors() {
  fieldErrors.length = '';
  fieldErrors.width = '';
  fieldErrors.height = '';
  fieldErrors.maxWeight = '';
}
syncFromProps();

watch(
  () => [props.suitcase.length, props.suitcase.width, props.suitcase.height, props.suitcase.maxWeight],
  () => { if (!pending.value) syncFromProps();
});
// 待确认状态下单位切换会被界面阻止，因此这里只需在切换后重绘草稿。
watch(() => props.unit, () => { syncFromProps(); clearErrors(); });

function isDirty() {
  return draft.length !== formatLengthCm(props.suitcase.length, props.unit)
    || draft.width !== formatLengthCm(props.suitcase.width, props.unit)
    || draft.height !== formatLengthCm(props.suitcase.height, props.unit)
    || draft.maxWeight !== formatWeightKg(props.suitcase.maxWeight, props.unit);
}

function setPending() {
  const next = isDirty();
  if (next !== pending.value) {
    pending.value = next;
    emit('pending-change', next);
  }
}

function validateLength(key: LengthKey): number | null {
  const parsed = parseLengthToCm(draft[key], props.unit);
  if (!parsed.ok) {
    fieldErrors[key] = parsed.reason === 'empty' ? '请输入数值' : '请输入有效数字';
    return null;
  }
  if (!(parsed.value > 0)) {
    fieldErrors[key] = POSITIVE_MESSAGE[key];
    return null;
  }
  fieldErrors[key] = '';
  return parsed.value;
}

function validateWeight(): number | null {
  const parsed = parseWeightToKg(draft.maxWeight, props.unit);
  if (!parsed.ok) {
    fieldErrors.maxWeight = parsed.reason === 'empty' ? '请输入数值' : '请输入有效数字';
    return null;
  }
  if (!(parsed.value > 0)) {
    fieldErrors.maxWeight = POSITIVE_MESSAGE.maxWeight;
    return null;
  }
  fieldErrors.maxWeight = '';
  return parsed.value;
}

function onLengthInput(key: LengthKey) { validateLength(key); setPending(); }
function onWeightInput() { validateWeight(); setPending(); }

const sliderValue = computed(() => {
  const value = Number(draft.maxWeight);
  if (Number.isFinite(value) && value > 0) return value;
  return Number(formatWeightKg(props.suitcase.maxWeight, props.unit));
});
function onSlider(event: Event) {
  draft.maxWeight = String(Number((event.target as HTMLInputElement).value));
  onWeightInput();
}

function finish() {
  syncFromProps();
  clearErrors();
  pending.value = false;
  emit('pending-change', false);
}

function submit() {
  const length = validateLength('length');
  const width = validateLength('width');
  const height = validateLength('height');
  const maxWeight = validateWeight();
  if (length === null || width === null || height === null || maxWeight === null) return;

  const patch: Partial<{ length: number; width: number; height: number; maxWeight: number }> = {};
  if (length !== props.suitcase.length) patch.length = length;
  if (width !== props.suitcase.width) patch.width = width;
  if (height !== props.suitcase.height) patch.height = height;
  if (maxWeight !== props.suitcase.maxWeight) patch.maxWeight = maxWeight;
  if (Object.keys(patch).length) emit('update', patch);
  finish();
}

function cancel() { finish(); }
</script>

<template>
  <section class="panel suitcase-form">
    <div class="section-title"><div><span>01 / SUITCASE</span><h2>行李箱配置</h2></div><b>内部尺寸 · {{ lengthUnit }}</b></div>
    <div class="dimension-grid">
      <label>长度 <span>{{ lengthUnit }}</span><input v-model="draft.length" aria-label="行李箱长度" type="text" inputmode="decimal" @input="onLengthInput('length')" /></label>
      <i>×</i>
      <label>宽度 <span>{{ lengthUnit }}</span><input v-model="draft.width" aria-label="行李箱宽度" type="text" inputmode="decimal" @input="onLengthInput('width')" /></label>
      <i>×</i>
      <label>高度 <span>{{ lengthUnit }}</span><input v-model="draft.height" aria-label="行李箱高度" type="text" inputmode="decimal" @input="onLengthInput('height')" /></label>
    </div>
    <p v-for="(error, index) in [fieldErrors.length, fieldErrors.width, fieldErrors.height].filter(Boolean)" :key="`field-${index}`" class="field-error">{{ error }}</p>
    <label class="weight-field">最大承重 <span>{{ draft.maxWeight }} {{ weightUnit }}</span><input type="range" :min="sliderRange.min" :max="sliderRange.max" :step="sliderRange.step" :value="sliderValue" @input="onSlider" /></label>
    <p v-if="fieldErrors.maxWeight" class="field-error">{{ fieldErrors.maxWeight }}</p>
    <div v-if="pending" class="form-actions" data-testid="suitcase-actions">
      <button type="button" class="primary" data-testid="suitcase-submit" @click="submit">提交修改</button>
      <button type="button" data-testid="suitcase-cancel" @click="cancel">取消</button>
    </div>
    <p v-for="error in errors" :key="error" class="field-error">{{ error }}</p>
  </section>
</template>
