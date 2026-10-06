import { formatWeight, type MeasurementSystem } from '../core/units';
import type { Risk } from '../core/models';

export function formatRiskMessage(risk: Risk, unit: MeasurementSystem): string {
  if (risk.id === 'overweight' && risk.excessWeightKg !== undefined) {
    return `超出承重 ${formatWeight(risk.excessWeightKg, unit)}，请移除重物。`;
  }
  return risk.message;
}
