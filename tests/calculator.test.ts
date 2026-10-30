import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateBattery, capacityForNight } from '../lib/batteryCalculator';
import { calculatorSchema } from '../lib/validation';
import { validCalculator } from './fixtures';
for (const [night, label] of [
  [3, '5 kWh'],
  [4, '5–10 kWh'],
  [6, '5–10 kWh'],
  [8, '5–10 kWh'],
  [10, '10–15 kWh'],
  [12, '10–15 kWh'],
  [15, '15+ kWh'],
] as const)
  test(`night ${night}: ${label}`, () => assert.equal(capacityForNight(night).label, label));
test('unknown night uses 45% of monthly / 30 and lower confidence', () => {
  const result = calculateBattery(
    calculatorSchema.parse({ ...validCalculator, nightConsumptionCategory: 'unknown' }),
  );
  assert.equal(result.estimatedNightConsumptionKwh, 7.5);
  assert.equal(result.recommendationLabel, '5–10 kWh');
  assert.equal(result.calculationConfidence, 'LOW');
});
test('warnings for small PV, large battery, backup and both', () => {
  for (const goal of ['backup', 'both']) {
    const result = calculateBattery(
      calculatorSchema.parse({
        ...validCalculator,
        pvPowerKw: 3,
        nightConsumptionCategory: 'very_high',
        goal,
      }),
    );
    assert.equal(result.warnings.length, 3);
    assert.equal(result.recommendedBatteryMaxKwh, null);
    assert.ok(result.warnings.some((w) => w.includes('puterea necesară')));
  }
});
test('5–10 range with small PV also receives compatibility warning', () =>
  assert.equal(
    calculateBattery(calculatorSchema.parse({ ...validCalculator, pvPowerKw: 2 })).warnings.length,
    1,
  ));
test('no existing PV does not pretend production is known', () =>
  assert.ok(
    calculateBattery(
      calculatorSchema.parse({ ...validCalculator, hasSolar: 'no', pvPowerKw: undefined }),
    ).warnings.some((w) => w.includes('viitorului')),
  ));
test('invalid night input rejected', () => {
  assert.throws(() => capacityForNight(NaN));
  assert.throws(() => capacityForNight(-1));
});
