import { describe, expect, it } from 'vitest';
import { itemVolume, normalizeSnapshot, suitcaseVolume, type PackingItem, type PackingSnapshot, type Suitcase } from '../models';

describe('volume helpers', () => {
  it('multiplies an item dimensions in centimeters', () => {
    const item = { length: 10, width: 4, height: 3 } as PackingItem;
    expect(itemVolume(item)).toBe(120);
  });

  it('multiplies suitcase internal dimensions', () => {
    const suitcase = { length: 50, width: 30, height: 20 } as Suitcase;
    expect(suitcaseVolume(suitcase)).toBe(30_000);
  });

  it('defaults a legacy snapshot to metric', () => {
    const legacy = { suitcase: {} as Suitcase, items: [], selectedPlan: 'comfort' } as PackingSnapshot;
    expect(normalizeSnapshot(legacy).displayUnit).toBe('metric');
  });
});
