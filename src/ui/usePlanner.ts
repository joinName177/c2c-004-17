import { computed, reactive, ref } from 'vue';
import { createSampleSnapshot } from '../core/sample-data';
import { generatePlans } from '../core/plan-service';
import { detectRisks } from '../core/risk-engine';
import { normalizeUnit, unitSystemName, type UnitSystem } from '../core/units';
import type { PackingItem, PackingSnapshot, PlanMode, Suitcase } from '../core/models';
import type { PlannerRepository } from '../ports/planner-repository.port';
import type { PrintPort } from '../ports/print.port';

export interface PlannerDependencies { repository: PlannerRepository; printPort: PrintPort }

export function usePlanner({ repository, printPort }: PlannerDependencies) {
  const loaded = repository.load();
  const state = reactive<PackingSnapshot>(loaded.value);
  state.unit = normalizeUnit(state.unit);
  const notice = ref(loaded.warning ?? '');
  const isStale = ref(false);
  const unit = ref<UnitSystem>(state.unit);
  const plans = ref(generatePlans(state.suitcase, state.items));
  const currentPlan = computed(() => plans.value[state.selectedPlan]);
  const risks = computed(() => detectRisks(currentPlan.value, state.suitcase, state.items));

  const save = () => repository.save(JSON.parse(JSON.stringify(state)) as PackingSnapshot);
  const markStale = () => { isStale.value = true; save(); };

  function addItem(item: PackingItem) { state.items.push(item); markStale(); }
  function updateItem(id: string, patch: Partial<PackingItem>) {
    const index = state.items.findIndex((item) => item.id === id);
    if (index >= 0) state.items[index] = { ...state.items[index], ...patch } as PackingItem;
    markStale();
  }
  function removeItem(id: string) { state.items = state.items.filter((item) => item.id !== id); markStale(); }
  function updateSuitcase(patch: Partial<Suitcase>) { Object.assign(state.suitcase, patch); markStale(); }
  function regenerate() { plans.value = generatePlans(state.suitcase, state.items); isStale.value = false; notice.value = '三套方案已重新计算'; save(); }
  function selectPlan(mode: PlanMode) { state.selectedPlan = mode; save(); }
  /**
   * 切换单位只改变展示与后续输入解释：已保存的厘米 / 千克基础值不做反复换算，
   * 已生成的摆放方案（装入数量与坐标）保持不变。
   */
  function setUnit(next: UnitSystem) {
    if (unit.value === next) return;
    unit.value = next;
    state.unit = next;
    notice.value = `已切换为${unitSystemName(next)}，尺寸与重量基础值保持不变`;
    save();
  }
  function notify(message: string) { notice.value = message; }
  function resetSample() {
    const sample = createSampleSnapshot();
    Object.assign(state, sample);
    unit.value = sample.unit ?? 'metric';
    plans.value = generatePlans(state.suitcase, state.items);
    isStale.value = false;
    notice.value = '已恢复登机箱示例';
    save();
  }

  return { state, notice, isStale, unit, plans, currentPlan, risks, addItem, updateItem, removeItem, updateSuitcase, regenerate, selectPlan, setUnit, notify, resetSample, print: () => printPort.print() };
}
