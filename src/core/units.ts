export type MeasurementSystem = 'metric' | 'imperial';
export type MeasurementKind = 'dimension' | 'weight';

const CM_PER_INCH = 2.54;
const KG_PER_POUND = 0.45359237;

export const MEASUREMENT_SYSTEMS: MeasurementSystem[] = ['metric', 'imperial'];

export function isMeasurementSystem(value: unknown): value is MeasurementSystem {
  return value === 'metric' || value === 'imperial';
}

export function dimensionUnit(system: MeasurementSystem): string {
  return system === 'metric' ? 'cm' : 'in';
}

export function weightUnit(system: MeasurementSystem): string {
  return system === 'metric' ? 'kg' : 'lb';
}

export function toDisplayValue(value: number, system: MeasurementSystem, kind: MeasurementKind): number {
  if (system === 'imperial') return kind === 'dimension' ? value / CM_PER_INCH : value / KG_PER_POUND;
  return value;
}

export function toCanonicalValue(value: number, system: MeasurementSystem, kind: MeasurementKind): number {
  if (system === 'imperial') return kind === 'dimension' ? value * CM_PER_INCH : value * KG_PER_POUND;
  return value;
}

export function parseMeasurement(input: string | number): number | null {
  const normalized = String(input).trim().replace(',', '.');
  if (!normalized) return null;
  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function formatMeasurement(value: number, system: MeasurementSystem, kind: MeasurementKind): string {
  const displayValue = toDisplayValue(value, system, kind);
  const precision = kind === 'dimension'
    ? (system === 'metric' ? 1 : 1)
    : (system === 'metric' ? 2 : 1);
  return displayValue.toFixed(precision).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

export function formatMeasurementWithUnit(value: number, system: MeasurementSystem, kind: MeasurementKind): string {
  return `${formatMeasurement(value, system, kind)} ${kind === 'dimension' ? dimensionUnit(system) : weightUnit(system)}`;
}

export function formatDimensions(dimensions: { length: number; width: number; height: number }, system: MeasurementSystem): string {
  return [dimensions.length, dimensions.width, dimensions.height]
    .map((value) => formatMeasurement(value, system, 'dimension'))
    .join(' × ')
    .concat(` ${dimensionUnit(system)}`);
}

export function formatWeight(value: number, system: MeasurementSystem): string {
  return formatMeasurementWithUnit(value, system, 'weight');
}
