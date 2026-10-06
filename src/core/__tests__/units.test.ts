import { describe, expect, it } from 'vitest';
import { formatMeasurement, formatWeight, parseMeasurement, toCanonicalValue, toDisplayValue } from '../units';

describe('measurement units', () => {
  it('uses fixed physical conversion factors', () => {
    expect(toDisplayValue(2.54, 'imperial', 'dimension')).toBeCloseTo(1);
    expect(toCanonicalValue(1, 'imperial', 'dimension')).toBeCloseTo(2.54);
    expect(toCanonicalValue(1, 'imperial', 'weight')).toBeCloseTo(0.45359237);
    expect(toDisplayValue(0.45359237, 'imperial', 'weight')).toBeCloseTo(1);
    expect(toDisplayValue(10, 'metric', 'weight')).toBe(10);
  });

  it('parses only positive finite values', () => {
    expect(parseMeasurement('12.5')).toBe(12.5);
    expect(parseMeasurement('12,5')).toBe(12.5);
    expect(parseMeasurement('')).toBeNull();
    expect(parseMeasurement('abc')).toBeNull();
    expect(parseMeasurement('0')).toBeNull();
    expect(parseMeasurement('-1')).toBeNull();
  });

  it('formats presentation without turning it into a comparison value', () => {
    expect(formatMeasurement(0.38, 'imperial', 'weight')).toBe('0.8');
    expect(toCanonicalValue(parseMeasurement(formatMeasurement(0.38, 'imperial', 'weight')) ?? 0, 'imperial', 'weight')).not.toBe(0.38);
    expect(formatWeight(1, 'metric')).toBe('1 kg');
  });
});
