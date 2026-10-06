import { describe, expect, it } from 'vitest';
import {
  formatLengthCm,
  formatWeightKg,
  isUnitSystem,
  lengthUnitLabel,
  normalizeUnit,
  parseLengthToCm,
  parseUserValue,
  parseWeightToKg,
  weightUnitLabel,
} from '../units';

describe('normalizeUnit', () => {
  it('keeps valid systems and defaults everything else to metric', () => {
    expect(normalizeUnit('metric')).toBe('metric');
    expect(normalizeUnit('imperial')).toBe('imperial');
    expect(normalizeUnit(undefined)).toBe('metric');
    expect(normalizeUnit(null)).toBe('metric');
    expect(normalizeUnit('IMPERIAL')).toBe('metric');
    expect(normalizeUnit(42)).toBe('metric');
  });

  it('recognizes only the two supported systems', () => {
    expect(isUnitSystem('metric')).toBe(true);
    expect(isUnitSystem('imperial')).toBe(true);
    expect(isUnitSystem('')).toBe(false);
  });
});

describe('labels', () => {
  it('uses cm/in for length and kg/lb for weight', () => {
    expect(lengthUnitLabel('metric')).toBe('cm');
    expect(lengthUnitLabel('imperial')).toBe('in');
    expect(weightUnitLabel('metric')).toBe('kg');
    expect(weightUnitLabel('imperial')).toBe('lb');
  });
});

describe('formatLengthCm', () => {
  it('shows one trimmed decimal in metric and two trimmed decimals in inches', () => {
    expect(formatLengthCm(52, 'metric')).toBe('52');
    expect(formatLengthCm(52.36, 'metric')).toBe('52.4');
    expect(formatLengthCm(2.54, 'imperial')).toBe('1');
    expect(formatLengthCm(52, 'imperial')).toBe('20.47');
  });

  it('rounds only the display text and never mutates underlying precision', () => {
    const raw = 2.5;
    expect(formatLengthCm(raw, 'imperial')).toBe('0.98');
    // 原始物理值仍是 2.5 厘米，不会被展示舍入回写。
    expect(raw).toBe(2.5);
  });
});

describe('formatWeightKg', () => {
  it('formats kilograms and pounds at two trimmed decimals', () => {
    expect(formatWeightKg(0.65, 'metric')).toBe('0.65');
    expect(formatWeightKg(0.45359237, 'imperial')).toBe('1');
    expect(formatWeightKg(10, 'imperial')).toBe('22.05');
  });
});

describe('parseUserValue', () => {
  it('rejects empty and unparsable text explicitly', () => {
    expect(parseUserValue('')).toEqual({ ok: false, reason: 'empty' });
    expect(parseUserValue('   ')).toEqual({ ok: false, reason: 'empty' });
    expect(parseUserValue('abc')).toEqual({ ok: false, reason: 'invalid' });
    expect(parseUserValue('1.2.3')).toEqual({ ok: false, reason: 'invalid' });
    expect(parseUserValue('12')).toEqual({ ok: true, value: 12 });
    expect(parseUserValue('  2.5 ')).toEqual({ ok: true, value: 2.5 });
  });
});

describe('parseLengthToCm', () => {
  it('keeps metric values in centimeters and converts inches to centimeters', () => {
    expect(parseLengthToCm('20', 'metric')).toEqual({ ok: true, value: 20 });
    const imperial = parseLengthToCm('10', 'imperial');
    expect(imperial).toEqual({ ok: true, value: 25.4 });
  });

  it('does not reinterpret already stored canonical values on every switch', () => {
    // 同一个厘米基础值在两种单位下只是展示/解释不同，换算常量保持稳定。
    const fromInches = parseLengthToCm('20.47', 'imperial');
    expect(fromInches.ok).toBe(true);
    if (fromInches.ok) expect(fromInches.value).toBeCloseTo(51.9938, 4);
  });

  it('propagates empty/invalid failures', () => {
    expect(parseLengthToCm('', 'imperial')).toEqual({ ok: false, reason: 'empty' });
    expect(parseLengthToCm('x', 'metric')).toEqual({ ok: false, reason: 'invalid' });
  });
});

describe('parseWeightToKg', () => {
  it('keeps kilograms and converts pounds', () => {
    expect(parseWeightToKg('0.3', 'metric')).toEqual({ ok: true, value: 0.3 });
    expect(parseWeightToKg('1', 'imperial')).toEqual({ ok: true, value: 0.45359237 });
  });
});
