import { computed, reactive, ref } from 'vue';
import { createSampleSnapshot } from '../core/sample-data';
import { generatePlans } from '../core/plan-service';
import { detectRisks } from '../core/risk-engine';
import { validatePackingItem, validateSuitcase } from '../core/packing-engine';
import { normalizeSnapshot, type PackingItem, type PackingSnapshot, type PlanMode, type Suitcase } from '../core/models';
import type { MeasurementSystem } from '../core/units';
import type { PlannerRepository } from '../ports/planner-repository.port';
import type { PrintPort } from '../ports/print.port';

export interface PlannerDependencies { repository: PlannerRepository; printPort: PrintPort }

export function usePlanner({ repository, printPort }: PlannerDependencies) {
  const loaded = repository.load();
  const state = reactive<PackingSnapshot>(normalizeSnapshot(loaded.value));
  const notice = ref(loaded.warning ?? '');
  const isStale = ref(false);
  const pendingEditors = ref(0);
  const hasPendingInput = computed(() => pendingEditors.value > 0);
  const displayUnit = computed<MeasurementSystem>(() => state.displayUnit ?? 'metric');
  const plans = ref(generatePlans(state.suitcase, state.items));
  const currentPlan = computed(() => plans.value[state.selectedPlan]);
  const risks = computed(() => detectRisks(currentPlan.value, state.suitcase, state.items));

  const save = () => repository.save(JSON.parse(JSON.stringify(state)) as PackingSnapshot);
  const markStale = () => { isStale.value = true; save(); };

  function addItem(item: PackingItem) {
    if (validatePackingItem(item).length) return;
    state.items.push(item);
    markStale();
  }
  function updateItem(id: string, patch: Partial<PackingItem>) {
    const index = state.items.findIndex((item) => item.id === id);
    if (index < 0) return;
    const candidate = { ...state.items[index], ...patch };
    if (validatePackingItem(candidate).length) return;
    state.items[index] = candidate;
    markStale();
  }
  function removeItem(id: string) { state.items = state.items.filter((item) => item.id !== id); markStale(); }
  function updateSuitcase(patch: Partial<Suitcase>) {
    const candidate = { ...state.suitcase, ...patch };
    if (validateSuitcase(candidate).length) return;
    Object.assign(state.suitcase, patch);
    markStale();
  }
  function setPendingInput(active: boolean) {
    if (active) pendingEditors.value += 1;
    else if (pendingEditors.value > 0) pendingEditors.value -= 1;
  }
  function setDisplayUnit(unit: MeasurementSystem) {
    if (hasPendingInput.value) {
      notice.value = '请先提交或取消当前输入，再切换单位。';
      return false;
    }
    if (state.displayUnit === unit) return true;
    state.displayUnit = unit;
    save();
    notice.value = unit === 'metric' ? '已切换为公制显示' : '已切换为英制显示';
    return true;
  }
  function regenerate() { plans.value = generatePlans(state.suitcase, state.items); isStale.value = false; notice.value = '三套方案已重新计算'; save(); }
  function selectPlan(mode: PlanMode) { state.selectedPlan = mode; save(); }
  function resetSample() {
    const sample = normalizeSnapshot(createSampleSnapshot());
    sample.displayUnit = displayUnit.value;
    Object.assign(state, sample);
    plans.value = generatePlans(state.suitcase, state.items);
    isStale.value = false;
    notice.value = '已恢复登机箱示例';
    save();
  }

  return { state, notice, isStale, hasPendingInput, displayUnit, plans, currentPlan, risks, addItem, updateItem, removeItem, updateSuitcase, setPendingInput, setDisplayUnit, regenerate, selectPlan, resetSample, print: () => printPort.print() };
}
