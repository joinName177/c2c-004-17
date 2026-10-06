import { describe, expect, it } from 'vitest';
import { createSampleSnapshot } from '../../core/sample-data';
import { usePlanner } from '../usePlanner';
import type { PackingSnapshot } from '../../core/models';
import type { PlannerRepository } from '../../ports/planner-repository.port';

class MemoryRepository implements PlannerRepository {
  saved?: PackingSnapshot;
  constructor(private snapshot = createSampleSnapshot()) {}
  load() { return { value: structuredClone(this.snapshot) }; }
  save(snapshot: PackingSnapshot) { this.saved = structuredClone(snapshot); }
}

describe('usePlanner', () => {
  it('adds, updates and removes items while marking results stale', () => {
    const repository = new MemoryRepository();
    const planner = usePlanner({ repository, printPort: { print() {} } });
    const initial = planner.state.items.length;
    planner.addItem({ id: 'new', name: '帽子', category: '衣物', length: 12, width: 12, height: 5, weight: 0.2, priority: 2, mustHave: false });
    expect(planner.state.items).toHaveLength(initial + 1);
    expect(planner.isStale.value).toBe(true);
    planner.updateItem('new', { name: '遮阳帽' });
    expect(planner.state.items.find((item) => item.id === 'new')?.name).toBe('遮阳帽');
    planner.removeItem('new');
    expect(planner.state.items).toHaveLength(initial);
  });

  it('regenerates plans and persists the selected mode', () => {
    const repository = new MemoryRepository();
    const planner = usePlanner({ repository, printPort: { print() {} } });
    planner.updateSuitcase({ maxWeight: 12 });
    expect(planner.isStale.value).toBe(true);
    planner.regenerate();
    planner.selectPlan('shopping');
    expect(planner.isStale.value).toBe(false);
    expect(planner.plans.value.shopping.name).toBe('购物版');
    expect(repository.saved?.selectedPlan).toBe('shopping');
  });

  it('defaults legacy snapshots without a unit field to metric', () => {
    const legacy = createSampleSnapshot();
    delete legacy.unit;
    const planner = usePlanner({ repository: new MemoryRepository(legacy), printPort: { print() {} } });
    expect(planner.unit.value).toBe('metric');
    expect(planner.state.unit).toBe('metric');
  });

  it('switches units without reinterpreting stored base values or changing placements', () => {
    const repository = new MemoryRepository();
    const planner = usePlanner({ repository, printPort: { print() {} } });
    const before = {
      suitcase: JSON.parse(JSON.stringify(planner.state.suitcase)),
      items: JSON.parse(JSON.stringify(planner.state.items)),
      count: planner.currentPlan.value.placements.length,
      coordinates: planner.currentPlan.value.placements.map((p) => `${p.itemId}@${p.x},${p.y},${p.z}`),
    };

    planner.setUnit('imperial');
    expect(planner.unit.value).toBe('imperial');
    expect(planner.state.unit).toBe('imperial');
    expect(repository.saved?.unit).toBe('imperial');
    // 厘米 / 千克基础值原封不动，不做反复换算。
    expect(planner.state.suitcase).toEqual(before.suitcase);
    expect(planner.state.items).toEqual(before.items);
    // 已生成方案不重新计算，装入数量与位置保持一致。
    expect(planner.currentPlan.value.placements.length).toBe(before.count);
    expect(planner.currentPlan.value.placements.map((p) => `${p.itemId}@${p.x},${p.y},${p.z}`)).toEqual(before.coordinates);
    expect(planner.isStale.value).toBe(false);

    // 多次切换仍然稳定。
    planner.setUnit('metric');
    planner.setUnit('imperial');
    expect(planner.state.suitcase).toEqual(before.suitcase);
    expect(planner.currentPlan.value.placements.length).toBe(before.count);
  });

  it('restores metric and sample base values on reset', () => {
    const repository = new MemoryRepository();
    const planner = usePlanner({ repository, printPort: { print() {} } });
    planner.setUnit('imperial');
    planner.resetSample();
    expect(planner.unit.value).toBe('metric');
    expect(repository.saved?.unit).toBe('metric');
    expect(planner.state.suitcase.length).toBe(52);
  });
});
