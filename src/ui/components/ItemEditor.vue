<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import type { PackingItem } from '../../core/models';
import {
  formatLengthCm,
  formatWeightKg,
  lengthUnitLabel,
  parseLengthToCm,
  parseWeightToKg,
  weightUnitLabel,
  type UnitSystem,
} from '../../core/units';

const props = defineProps<{ unit: UnitSystem }>();
const emit = defineEmits<{
  add: [item: PackingItem];
  'pending-change': [pending: boolean];
}>();

const draft = reactive({ name: '', category: '衣物', length: '20', width: '15', height: '5', weight: '0.3' });
const fieldErrors = reactive({ length: '', width: '', height: '', weight: '' });
const pending = ref(false);
const lengthUnit = computed(() => lengthUnitLabel(props.unit));
const weightUnit = computed(() => weightUnitLabel(props.unit));

const METRIC_DEFAULTS = { length: 20, width: 15, height: 5, weight: 0.3 };

function syncFromUnit() {
  draft.length = formatLengthCm(METRIC_DEFAULTS.length, props.unit);
  draft.width = formatLengthCm(METRIC_DEFAULTS.width, props.unit);
  draft.height = formatLengthCm(METRIC_DEFAULTS.height, props.unit);
  draft.weight = formatWeightKg(METRIC_DEFAULTS.weight, props.unit);
}
syncFromUnit();
// 单位切换在有待确认输入时会被界面阻止；切换发生后用新单位重绘默认草稿。
watch(() => props.unit, () => { syncFromUnit(); clearErrors(); });

function clearErrors() {
  fieldErrors.length = '';
  fieldErrors.width = '';
  fieldErrors.height = '';
  fieldErrors.weight = '';
}

function isDirty() {
  return draft.name.trim() !== ''
    || draft.length !== formatLengthCm(METRIC_DEFAULTS.length, props.unit)
    || draft.width !== formatLengthCm(METRIC_DEFAULTS.width, props.unit)
    || draft.height !== formatLengthCm(METRIC_DEFAULTS.height, props.unit)
    || draft.weight !== formatWeightKg(METRIC_DEFAULTS.weight, props.unit);
}

function setPending() {
  const next = isDirty();
  if (next !== pending.value) {
    pending.value = next;
    emit('pending-change', next);
  }
}

function validateLength(key: 'length' | 'width' | 'height'): number | null {
  const parsed = parseLengthToCm(draft[key], props.unit);
  if (!parsed.ok) {
    fieldErrors[key] = parsed.reason === 'empty' ? '请输入数值' : '请输入有效数字';
    return null;
  }
  if (!(parsed.value > 0)) {
    fieldErrors[key] = '尺寸必须大于 0';
    return null;
  }
  fieldErrors[key] = '';
  return parsed.value;
}

function validateWeight(): number | null {
  const parsed = parseWeightToKg(draft.weight, props.unit);
  if (!parsed.ok) {
    fieldErrors.weight = parsed.reason === 'empty' ? '请输入数值' : '请输入有效数字';
    return null;
  }
  if (!(parsed.value > 0)) {
    fieldErrors.weight = '重量必须大于 0';
    return null;
  }
  fieldErrors.weight = '';
  return parsed.value;
}

function cancel() {
  draft.name = '';
  draft.category = '衣物';
  syncFromUnit();
  clearErrors();
  pending.value = false;
  emit('pending-change', false);
}

function submit() {
  const length = validateLength('length');
  const width = validateLength('width');
  const height = validateLength('height');
  const weight = validateWeight();
  if (length === null || width === null || height === null || weight === null) return;

  const name = draft.name.trim() || '未命名物品';
  // 提交时才把当前单位的输入换算为厘米 / 千克基础值，空值和无法解析的值永远不会进入状态。
  emit('add', {
    id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    category: draft.category,
    length, width, height, weight,
    priority: 2,
    mustHave: false,
  });
  cancel();
}
</script>

<template>
  <form class="item-editor" data-testid="item-editor" @submit.prevent="submit">
    <input v-model="draft.name" aria-label="物品名称" placeholder="添加物品名称" @input="setPending" />
    <select v-model="draft.category" aria-label="物品类别"><option>衣物</option><option>鞋履</option><option>数码</option><option>洗护</option><option>随身</option><option>其他</option></select>
    <label class="measure">长 <span>{{ lengthUnit }}</span><input v-model="draft.length" aria-label="物品长度" type="text" inputmode="decimal" @input="validateLength('length'); setPending()" /></label>
    <label class="measure">宽 <span>{{ lengthUnit }}</span><input v-model="draft.width" aria-label="物品宽度" type="text" inputmode="decimal" @input="validateLength('width'); setPending()" /></label>
    <label class="measure">高 <span>{{ lengthUnit }}</span><input v-model="draft.height" aria-label="物品高度" type="text" inputmode="decimal" @input="validateLength('height'); setPending()" /></label>
    <label class="measure">重量 <span>{{ weightUnit }}</span><input v-model="draft.weight" aria-label="物品重量" type="text" inputmode="decimal" @input="validateWeight(); setPending()" /></label>
    <p v-for="(error, index) in [fieldErrors.length, fieldErrors.width, fieldErrors.height, fieldErrors.weight].filter(Boolean)" :key="`error-${index}`" class="field-error editor-error">{{ error }}</p>
    <div class="editor-actions">
      <button type="submit">＋ 添加</button>
      <button v-if="pending" type="button" class="ghost" data-testid="item-cancel" @click="cancel">取消</button>
    </div>
  </form>
</template>
