import { describe, expect, it } from 'vitest';
import { packItems, validateSuitcase } from '../packing-engine';
import { formatWeightKg } from '../units';
import type { Suitcase } from '../models';

const suitcase = (overrides: Partial<Suitcase> = {}): Suitcase => ({ length: 10, width: 8, height: 6, maxWeight: 10, ...overrides });
const item = (id: string, overrides: Partial<import('../models').PackingItem> = {}): import('../models').PackingItem => ({
  id, name: id, category: '衣物', length: 3, width: 2, height: 1, weight: 1, priority: 2, mustHave: false, ...overrides,
});

describe('validateSuitcase', () => {
  it('rejects each non-positive capacity', () => {
    expect(validateSuitcase(suitcase({ height: 0 }))).toContain('行李箱高度必须大于 0');
    expect(validateSuitcase(suitcase({ maxWeight: -1 }))).toContain('承重必须大于 0');
  });
});

describe('packItems', () => {
  it('allows total weight exactly at the suitcase limit', () => {
    const plan = packItems(suitcase({ maxWeight: 2 }), [item('a'), item('b')], 'comfort');
    expect(plan.placements).toHaveLength(2);
    expect(plan.totalWeight).toBe(2);
  });

  it('uses rotation when the original orientation does not fit', () => {
    const plan = packItems(suitcase({ length: 4, width: 3, height: 2 }), [item('rotated', { length: 2, width: 4, height: 3 })], 'comfort');
    expect(plan.placements[0]?.dimensions).toEqual({ length: 4, width: 3, height: 2 });
  });

  it('keeps placements inside bounds and non-overlapping', () => {
    const plan = packItems(suitcase(), [item('a'), item('b'), item('c')], 'comfort');
    expect(plan.placements.every((p) => p.x + p.dimensions.length <= 10 && p.y + p.dimensions.width <= 8 && p.z + p.dimensions.height <= 6)).toBe(true);
    expect(new Set(plan.placements.map((p) => `${p.x}:${p.y}:${p.z}`)).size).toBe(3);
  });

  it('returns deterministic coordinates and an unplaced reason', () => {
    const inputs = [item('a'), item('huge', { length: 30 })];
    expect(packItems(suitcase(), inputs, 'comfort')).toEqual(packItems(suitcase(), inputs, 'comfort'));
    expect(packItems(suitcase(), inputs, 'comfort').unplaced[0]?.reason).toContain('空间');
  });

  it('judges weight limits from physical values, not from displayed rounding', () => {
    // 10 kg 换算显示为 “22.05 lb”。临界物品的磅数显示同样是 “22.05 lb”，
    // 但一个真实地低于限值、一个真实地高于限值；判定只能来自物理值。
    const limit = 10;
    expect(formatWeightKg(limit, 'imperial')).toBe('22.05');

    const under = item('under', { weight: 9.9995 });
    expect(formatWeightKg(under.weight, 'imperial')).toBe('22.05');
    const underPlan = packItems(suitcase({ maxWeight: limit }), [under], 'comfort');
    expect(underPlan.placements).toHaveLength(1);

    const barelyOver = item('over', { weight: 10.002 });
    expect(formatWeightKg(barelyOver.weight, 'imperial')).toBe('22.05');
    const overPlan = packItems(suitcase({ maxWeight: limit }), [barelyOver], 'comfort');
    expect(overPlan.placements).toHaveLength(0);
    expect(overPlan.unplaced[0]?.reason).toContain('承重');
  });
});
