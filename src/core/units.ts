/**
 * 单位制：领域模型与装箱引擎始终使用公制基础值（厘米 / 千克）。
 * 英制只影响界面展示与“新输入如何解释”，绝不回写已保存的基础值。
 */
export type UnitSystem = 'metric' | 'imperial';

// 1 英寸 = 25.4 毫米；1 磅 = 453.59237 克（国际常衡磅）。
const CM_PER_INCH = 0.1 * 25.4;
const KG_PER_LB = 0.001 * 453.59237;

export function isUnitSystem(value: unknown): value is UnitSystem {
  return value === 'metric' || value === 'imperial';
}

/** 旧规划或损坏的单位字段一律按公制处理。 */
export function normalizeUnit(value: unknown): UnitSystem {
  return isUnitSystem(value) ? value : 'metric';
}

export function lengthUnitLabel(unit: UnitSystem): string {
  return unit === 'imperial' ? 'in' : 'cm';
}

export function weightUnitLabel(unit: UnitSystem): string {
  return unit === 'imperial' ? 'lb' : 'kg';
}

export function unitSystemName(unit: UnitSystem): string {
  return unit === 'imperial' ? '英制（英寸 / 磅）' : '公制（厘米 / 千克）';
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  const rounded = Math.round((value + Number.EPSILON) * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
}

/** 按精度四舍五入并去掉无意义的尾零；仅用于展示。 */
function print(value: number, digits: number): string {
  return String(roundTo(value, digits));
}

/** 把公制基础长度（厘米）格式化为当前单位的展示文本。 */
export function formatLengthCm(centimeters: number, unit: UnitSystem): string {
  return unit === 'imperial'
    ? print(centimeters / CM_PER_INCH, 2)
    : print(centimeters, 1);
}

/** 把公制基础重量（千克）格式化为当前单位的展示文本。 */
export function formatWeightKg(kilograms: number, unit: UnitSystem): string {
  return unit === 'imperial'
    ? print(kilograms / KG_PER_LB, 2)
    : print(kilograms, 2);
}

export type ParsedValue =
  | { ok: true; value: number }
  | { ok: false; reason: 'empty' | 'invalid' };

/** 解析用户输入：空字符串与无法解析的数字都显式失败，绝不悄悄变成 0。 */
export function parseUserValue(text: string): ParsedValue {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, reason: 'empty' };
  const value = Number(trimmed);
  return Number.isFinite(value) ? { ok: true, value } : { ok: false, reason: 'invalid' };
}

/** 按当前单位解释长度输入并换算为厘米基础值。 */
export function parseLengthToCm(text: string, unit: UnitSystem): ParsedValue {
  const parsed = parseUserValue(text);
  if (!parsed.ok) return parsed;
  return { ok: true, value: unit === 'imperial' ? parsed.value * CM_PER_INCH : parsed.value };
}

/** 按当前单位解释重量输入并换算为千克基础值。 */
export function parseWeightToKg(text: string, unit: UnitSystem): ParsedValue {
  const parsed = parseUserValue(text);
  if (!parsed.ok) return parsed;
  return { ok: true, value: unit === 'imperial' ? parsed.value * KG_PER_LB : parsed.value };
}

/** 英制承重滑杆的边界由公制边界（1–35 kg）换算而来。 */
export const WEIGHT_SLIDER_RANGE: Record<UnitSystem, { min: number; max: number; step: number }> = {
  metric: { min: 1, max: 35, step: 0.5 },
  imperial: { min: 2, max: 78, step: 0.1 },
};
