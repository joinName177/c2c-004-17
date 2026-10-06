import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import App from '../App.vue';
import { LocalPlannerRepository } from '../../adapters/local-planner.repository';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  clear() { this.data.clear(); }
  getItem(key: string) { return this.data.get(key) ?? null; }
  key(index: number) { return [...this.data.keys()][index] ?? null; }
  removeItem(key: string) { this.data.delete(key); }
  setItem(key: string, value: string) { this.data.set(key, value); }
}

function render(initialData?: string) {
  let printCount = 0;
  const storage = new MemoryStorage();
  if (initialData !== undefined) storage.setItem('c2c-004.planner', initialData);
  const wrapper = mount(App, { props: {
    repository: new LocalPlannerRepository(storage),
    printPort: { print: () => { printCount += 1; } },
  } });
  return { wrapper, storage, getPrintCount: () => printCount };
}

describe('Luggage planner App', () => {
  it('renders sample luggage and catches invalid dimensions', async () => {
    const { wrapper } = render();
    expect(wrapper.text()).toContain('行李箱空间规划师');
    expect(wrapper.text()).toContain('轻薄外套');
    await wrapper.get('[aria-label="行李箱长度"]').setValue('0');
    expect(wrapper.text()).toContain('请输入有效的行李箱长度');
    expect(wrapper.get('[data-testid="print-button"]').attributes('disabled')).toBeUndefined();
  });

  it('adds and deletes an item', async () => {
    const { wrapper } = render();
    await wrapper.get('[aria-label="物品名称"]').setValue('新物品');
    await wrapper.get('[data-testid="item-editor"]').trigger('submit');
    expect(wrapper.text()).toContain('新物品');
    await wrapper.get('[aria-label="删除 新物品"]').trigger('click');
    expect(wrapper.text()).not.toContain('新物品');
  });

  it('selects a plan and highlights the same item in both projections', async () => {
    const { wrapper } = render();
    await wrapper.get('[data-plan="shopping"]').trigger('click');
    expect(wrapper.get('[data-plan="shopping"]').classes()).toContain('active');
    const jacket = wrapper.findAll('[data-item-id="jacket"]');
    expect(jacket.length).toBe(2);
    await jacket[0].trigger('click');
    expect(wrapper.findAll('[data-item-id="jacket"].selected')).toHaveLength(2);
  });

  it('delegates printing through the print port', async () => {
    const { wrapper, getPrintCount } = render();
    await wrapper.get('[data-testid="print-button"]').trigger('click');
    expect(getPrintCount()).toBe(1);
  });

  it('defaults old plans to metric and only changes presentation when switching to imperial', async () => {
    const oldSnapshot = JSON.stringify({
      suitcase: { length: 52, width: 35, height: 23, maxWeight: 10 },
      selectedPlan: 'comfort',
      items: [
        { id: 'book', name: '旅行读物', category: '随身', length: 21, width: 15, height: 2, weight: 0.38, priority: 1, mustHave: false },
      ],
    });
    const { wrapper, storage } = render(oldSnapshot);
    expect(wrapper.text()).toContain('CM');
    expect(wrapper.text()).toContain('21 × 15 × 2 cm · 0.38 kg');
    await wrapper.get('.unit-switch button:last-child').trigger('click');
    expect(wrapper.text()).toContain('IN');
    expect(wrapper.text()).toContain('8.3 × 5.9 × 0.8 in · 0.8 lb');
    expect(wrapper.text()).toContain('限重 22 lb');
    const persisted = JSON.parse(storage.getItem('c2c-004.planner') ?? '{}');
    expect(persisted.suitcase).toEqual({ length: 52, width: 35, height: 23, maxWeight: 10 });
    expect(persisted.items[0].weight).toBe(0.38);
    expect(persisted.displayUnit).toBe('imperial');

    const placementBefore = wrapper.findAll('.projection-card:first-child [data-item-id]').map((node) => ({
      id: node.attributes('data-item-id'),
      style: node.attributes('style'),
    }));
    wrapper.unmount();
    const reloaded = mount(App, { props: {
      repository: new LocalPlannerRepository(storage),
      printPort: { print: () => {} },
    } });
    expect(reloaded.text()).toContain('8.3 × 5.9 × 0.8 in · 0.8 lb');
    const placementAfter = reloaded.findAll('.projection-card:first-child [data-item-id]').map((node) => ({
      id: node.attributes('data-item-id'),
      style: node.attributes('style'),
    }));
    expect(placementAfter).toEqual(placementBefore);
  });

  it('requires a pending suitcase edit to be submitted or cancelled before switching units', async () => {
    const { wrapper } = render();
    await wrapper.get('[aria-label="行李箱长度"]').setValue('60');
    await wrapper.get('.unit-switch button:last-child').trigger('click');
    expect(wrapper.text()).toContain('请先提交或取消当前输入，再切换单位。');
    expect(wrapper.get('[aria-label="行李箱长度"]').element).toHaveProperty('value', '60');
    expect(wrapper.text()).toContain('CM');

    await wrapper.get('.suitcase-form .secondary').trigger('click');
    await wrapper.get('.unit-switch button:last-child').trigger('click');
    expect(wrapper.text()).toContain('IN');
    expect(wrapper.get('[aria-label="行李箱长度"]').element).toHaveProperty('value', '20.5');
  });

  it('does not write empty or unparsable item numbers and submits subsequent imperial values as canonical metric values', async () => {
    const { wrapper } = render();
    await wrapper.get('[aria-label="物品长度"]').setValue('');
    expect(wrapper.get('[data-testid="item-editor"] button[type="submit"]').attributes('disabled')).toBeDefined();
    await wrapper.get('[aria-label="物品长度"]').setValue('abc');
    expect(wrapper.get('[data-testid="item-editor"] button[type="submit"]').attributes('disabled')).toBeDefined();
    await wrapper.get('.item-editor .secondary').trigger('click');

    await wrapper.get('.unit-switch button:last-child').trigger('click');
    await wrapper.get('[aria-label="物品名称"]').setValue('英制物品');
    await wrapper.get('[aria-label="物品长度"]').setValue('10');
    await wrapper.get('[aria-label="物品宽度"]').setValue('5');
    await wrapper.get('[aria-label="物品高度"]').setValue('2');
    await wrapper.get('[aria-label="物品重量"]').setValue('1');
    await wrapper.get('[data-testid="item-editor"]').trigger('submit');
    expect(wrapper.text()).toContain('10 × 5 × 2 in · 1 lb');
  });
});
