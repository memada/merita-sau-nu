import { leadSchema } from '../lib/validation';
export const validCalculator = {
  hasSolar: 'yes',
  pvPowerKw: 6,
  inverterBrand: 'Huawei',
  inverterModel: '',
  monthlyConsumptionKwh: 500,
  nightConsumptionCategory: 'medium',
  goal: 'self_consumption',
  backupLoads: [],
  budgetRange: '10000_20000',
  purchaseTimeline: 'asap',
};
export function submission(phone = '0700000000') {
  return leadSchema.parse({
    calculator: validCalculator,
    contact: {
      county: 'Cluj',
      city: 'Localitate test',
      homeOwner: true,
      name: 'DEMO — nu contacta',
      phone,
      email: 'demo@example.invalid',
      notes: 'Date fictive',
      consentGiven: true,
    },
    attribution: {
      utmSource: 'test',
      utmCampaign: 'unit-test',
      landingPage: 'http://localhost:3002/',
    },
  });
}
