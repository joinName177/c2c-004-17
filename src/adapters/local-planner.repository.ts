import { createSampleSnapshot } from '../core/sample-data';
import { normalizeUnit } from '../core/units';
import type { PackingSnapshot } from '../core/models';
import type { LoadResult, PlannerRepository } from '../ports/planner-repository.port';

const KEY = 'c2c-004.planner';

export class LocalPlannerRepository implements PlannerRepository {
  constructor(private readonly storage: Storage) {}

  load(): LoadResult<PackingSnapshot> {
    const raw = this.storage.getItem(KEY);
    if (!raw) return { value: createSampleSnapshot() };
    try {
      const snapshot = JSON.parse(raw) as PackingSnapshot;
      // 旧规划没有 unit 字段（或字段损坏）时默认公制，基础值不做任何换算。
      snapshot.unit = normalizeUnit(snapshot.unit);
      return { value: snapshot };
    } catch {
      return { value: createSampleSnapshot(), warning: '本地数据无法读取，已恢复示例。' };
    }
  }

  save(snapshot: PackingSnapshot): void {
    this.storage.setItem(KEY, JSON.stringify(snapshot));
  }
}
