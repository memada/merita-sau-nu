import { test } from 'node:test';
import assert from 'node:assert/strict';
import { firstInvalidStep } from '../lib/calculatorWizard';
import { validCalculator } from './fixtures';
test('step 1 requires PV power even when later required fields are missing', () => {
  const error = firstInvalidStep({ hasSolar: 'yes' }, 0);
  assert.equal(error?.step, 0);
  assert.match(error!.message, /Introdu puterea/);
  assert.equal(firstInvalidStep({ hasSolar: 'yes', pvPowerKw: 6 }, 0), null);
});
test('no PV and planned PV can proceed without PV power', () => {
  for (const hasSolar of ['no', 'planned']) assert.equal(firstInvalidStep({ hasSolar }, 0), null);
});
test('restored or changed drafts return to the earliest incomplete step', () => {
  assert.equal(firstInvalidStep({ ...validCalculator, pvPowerKw: undefined }, 3)?.step, 0);
  assert.equal(
    firstInvalidStep({ ...validCalculator, monthlyConsumptionKwh: undefined }, 3)?.step,
    1,
  );
  assert.equal(firstInvalidStep(validCalculator, 3), null);
});
