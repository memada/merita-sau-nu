import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreLead } from '../lib/leadScoring';
import { normalizePhone } from '../lib/phone';
import { leadSchema, calculatorSchema } from '../lib/validation';
import { submission, validCalculator } from './fixtures';
const base = {
  homeOwner: true,
  purchaseTimeline: 'asap',
  budgetRange: '10000_20000',
  hasSolar: 'yes',
  county: 'Cluj',
  phoneValid: true,
  calculatorCompleted: true,
} as const;
test('score caps at 100 and produces HOT', () =>
  assert.deepEqual(scoreLead(base), { leadScore: 100, leadCategory: 'HOT' }));
test('scoring category boundaries 70/45', () => {
  assert.deepEqual(scoreLead({ ...base, purchaseTimeline: 'research', hasSolar: 'no' }), {
    leadScore: 65,
    leadCategory: 'WARM',
  });
  assert.deepEqual(
    scoreLead({ ...base, homeOwner: false, purchaseTimeline: 'research', hasSolar: 'no' }),
    { leadScore: 45, leadCategory: 'WARM' },
  );
  assert.equal(
    scoreLead({
      ...base,
      homeOwner: false,
      purchaseTimeline: 'research',
      hasSolar: 'no',
      budgetRange: 'unknown',
    }).leadCategory,
    'COLD',
  );
  assert.equal(
    scoreLead({ ...base, purchaseTimeline: '3_6_months', hasSolar: 'no' }).leadCategory,
    'HOT',
  );
});
test('Romanian mobile normalization', () => {
  assert.equal(normalizePhone('0700 000 000'), '+40700000000');
  assert.equal(normalizePhone('+40 700-000-000'), '+40700000000');
  for (const v of ['123', '+447000000000', '0800000000', '+407000000000', '07abcdef12'])
    assert.equal(normalizePhone(v), null);
});
test('lead requires explicit consent, valid county, owner boolean, phone and email', () => {
  const data = submission();
  for (const contact of [
    { ...data.contact, consentGiven: false },
    { ...data.contact, county: 'Fals' },
    { ...data.contact, homeOwner: 'true' },
    { ...data.contact, phone: '123' },
    { ...data.contact, email: 'bad' },
  ])
    assert.equal(leadSchema.safeParse({ ...data, contact }).success, false);
});
test('blank optional email accepted; text sanitized; UTM bounded', () => {
  const data = submission();
  const parsed = leadSchema.parse({
    ...data,
    contact: { ...data.contact, email: '', notes: '<script>alert(1)</script> text' },
  });
  assert.equal(parsed.contact.email, '');
  assert.equal(parsed.contact.notes.includes('<script>'), false);
  assert.equal(
    leadSchema.safeParse({ ...data, attribution: { utmSource: 'x'.repeat(201) } }).success,
    false,
  );
});
test('required PV and finite consumption boundaries', () => {
  for (const value of [NaN, 0, 49, 5001, Infinity])
    assert.equal(
      calculatorSchema.safeParse({ ...validCalculator, monthlyConsumptionKwh: value }).success,
      false,
    );
  assert.equal(
    calculatorSchema.safeParse({ ...validCalculator, pvPowerKw: undefined }).success,
    false,
  );
  assert.equal(
    calculatorSchema.safeParse({ ...validCalculator, hasSolar: 'no', pvPowerKw: undefined })
      .success,
    true,
  );
  assert.equal(calculatorSchema.safeParse({ ...validCalculator, pvPowerKw: 101 }).success, false);
});
