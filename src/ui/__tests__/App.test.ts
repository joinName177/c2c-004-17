import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
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

let storage: MemoryStorage;

function render(store: MemoryStorage = storage) {
  let printCount = 0;
  const wrapper = mount(App, { props: {
    repository: new LocalPlannerRepository(store),
    printPort: { print: () => { printCount += 1; } },
  } });
  return { wrapper, getPrintCount: () => printCount };
}

afterEach(() => { storage?.clear(); });

describe('Luggage planner App', () => {
  it('renders sample luggage and catches invalid dimensions', async () => {
    storage = new MemoryStorage();
    const { wrapper } = render();
    expect(wrapper.text()).toContain('行李箱空间规划师');
    expect(wrapper.text()).toContain('轻薄外套');
    await wrapper.get('[aria-label="行李箱长度"]').setValue('0');
    expect(wrapper.text()).toContain('行李箱长度必须大于 0');
  });

  it('adds and deletes an item', async () => {
    storage = new MemoryStorage();
    const { wrapper } = render();
    await wrapper.get('[aria-label="物品名称"]').setValue('新物品');
    await wrapper.get('[data-testid="item-editor"]').trigger('submit');
    expect(wrapper.text()).toContain('新物品');
    await wrapper.get('[aria-label="删除 新物品"]').trigger('click');
    expect(wrapper.text()).not.toContain('新物品');
  });

  it('selects a plan and highlights the same item in both projections', async () => {
    storage = new MemoryStorage();
    const { wrapper } = render();
    await wrapper.get('[data-plan="shopping"]').trigger('click');
    expect(wrapper.get('[data-plan="shopping"]').classes()).toContain('active');
    const jacket = wrapper.findAll('[data-item-id="jacket"]');
    expect(jacket.length).toBe(2);
    await jacket[0].trigger('click');
    expect(wrapper.findAll('[data-item-id="jacket"].selected')).toHaveLength(2);
  });

  it('delegates printing through the print port', async () => {
    storage = new MemoryStorage();
    const { wrapper, getPrintCount } = render();
    await wrapper.get('[data-testid="print-button"]').trigger('click');
    expect(getPrintCount()).toBe(1);
  });

  it('shows every dimension, weight, map caption and print sheet in the selected unit', async () => {
    storage = new MemoryStorage();
    const { wrapper } = render();
    // 公制默认：52 × 35 cm 箱体标注。
    expect(wrapper.text()).toContain('52 × 35 cm');

    await wrapper.get('[data-testid="unit-imperial"]').trigger('click');

    // 52 cm = 20.47 in；35 cm = 13.78 in；0.65 kg = 1.43 lb；10 kg = 22.05 lb。
    expect(wrapper.get('[data-testid="unit-imperial"]').classes()).toContain('active');
    expect(wrapper.text()).toContain('20.47 × 13.78 in');
    expect(wrapper.text()).toContain('1.43 lb');
    expect(wrapper.text()).toContain('/22.05lb');
    expect(wrapper.text()).toContain('英制（英寸 / 磅）');
    // 打印单使用同一份所选单位。
    const printSheet = wrapper.get('.print-sheet');
    expect(printSheet.text()).toContain('20.47 × 13.78 × 9.06 in');
    expect(printSheet.text()).toContain('限重 22.05 lb');
  });

  it('interprets new imperial inputs as inches/pounds but stores cm/kg base values', async () => {
    storage = new MemoryStorage();
    const { wrapper } = render();
    await wrapper.get('[data-testid="unit-imperial"]').trigger('click');
    await wrapper.get('[aria-label="物品名称"]').setValue('英制书籍');
    await wrapper.get('[aria-label="物品长度"]').setValue('10');
    await wrapper.get('[aria-label="物品宽度"]').setValue('8');
    await wrapper.get('[aria-label="物品高度"]').setValue('2');
    await wrapper.get('[aria-label="物品重量"]').setValue('2');
    await wrapper.get('[data-testid="item-editor"]').trigger('submit');

    expect(wrapper.text()).toContain('英制书籍');
    // 列表回到公制前，先在英制下检查展示；切回公制后基础值为 25.4×20.32×5.08 cm、0.91 kg。
    const saved = JSON.parse(storage.getItem('c2c-004.planner') as string);
    const added = saved.items.find((item: { name: string }) => item.name === '英制书籍');
    expect(added.length).toBeCloseTo(25.4, 6);
    expect(added.width).toBeCloseTo(20.32, 6);
    expect(added.height).toBeCloseTo(5.08, 6);
    expect(added.weight).toBeCloseTo(0.90718474, 6);
  });

  it('requires submit or cancel before switching while a suitcase edit is pending', async () => {
    storage = new MemoryStorage();
    const { wrapper } = render();
    await wrapper.get('[aria-label="行李箱长度"]').setValue('60');
    expect(wrapper.find('[data-testid="suitcase-actions"]').exists()).toBe(true);

    await wrapper.get('[data-testid="unit-imperial"]').trigger('click');
    expect(wrapper.get('[data-testid="unit-metric"]').classes()).toContain('active');
    expect(wrapper.text()).toContain('请先提交或取消当前未确认的输入，再切换单位');
    // 草稿原样保留。
    expect((wrapper.get('[aria-label="行李箱长度"]').element as HTMLInputElement).value).toBe('60');

    await wrapper.get('[data-testid="suitcase-cancel"]').trigger('click');
    await wrapper.get('[data-testid="unit-imperial"]').trigger('click');
    expect(wrapper.get('[data-testid="unit-imperial"]').classes()).toContain('active');
  });

  it('never writes empty or unparsable numbers into the item list', async () => {
    storage = new MemoryStorage();
    const { wrapper } = render();
    await wrapper.get('[aria-label="物品名称"]').setValue('坏数据');
    await wrapper.get('[aria-label="物品重量"]').setValue('abc');
    await wrapper.get('[data-testid="item-editor"]').trigger('submit');
    expect(wrapper.text()).toContain('请输入有效数字');
    expect(wrapper.text()).not.toContain('坏数据');

    await wrapper.get('[aria-label="物品重量"]').setValue('');
    await wrapper.get('[data-testid="item-editor"]').trigger('submit');
    expect(wrapper.text()).toContain('请输入数值');
    expect(wrapper.text()).not.toContain('坏数据');
  });

  it('keeps loaded counts and placements after repeated switches and a reload', async () => {
    storage = new MemoryStorage();
    const first = render();
    const countAt = (text: string) => {
      const matches = text.match(/(\d+) 件/g);
      return matches;
    };
    expect(countAt(first.wrapper.text())).toBeTruthy();
    await first.wrapper.get('[data-plan="comfort"]').trigger('click');
    await first.wrapper.get('[data-testid="unit-imperial"]').trigger('click');
    expect(first.wrapper.text()).toContain('20.47 × 13.78 in');
    await first.wrapper.get('[data-testid="unit-metric"]').trigger('click');
    await first.wrapper.get('[data-testid="unit-imperial"]').trigger('click');
    const beforeIds = first.wrapper.findAll('[data-item-id]').map((node) => `${node.attributes('data-item-id')}:${node.attributes('style')}`);
    first.wrapper.unmount();

    const second = render();
    // 刷新后仍是英制偏好，装入数量与摆放坐标完全一致。
    expect(second.wrapper.get('[data-testid="unit-imperial"]').classes()).toContain('active');
    expect(second.wrapper.text()).toContain('20.47 × 13.78 in');
    const afterIds = second.wrapper.findAll('[data-item-id]').map((node) => `${node.attributes('data-item-id')}:${node.attributes('style')}`);
    expect(afterIds).toEqual(beforeIds);
  });
});
