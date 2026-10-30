import { createLead } from '../lib/leads';
import { getDb } from '../lib/db';
import { leadSchema } from '../lib/validation';
if (process.env.NODE_ENV === 'production' || !process.argv.includes('--allow-demo')) {
  console.error('Doar development: npm run db:seed -- --allow-demo');
  process.exit(1);
}
// Synthetic, intentionally non-dialable fixture contacts. Never send to suppliers.
const names = ['DEMO — nu contacta A', 'DEMO — nu contacta B', 'DEMO — nu contacta C'];
for (let i = 0; i < names.length; i++) {
  const phone = `DEMO-NOT-A-PHONE-${i}`;
  if (
    getDb()
      .prepare('SELECT id FROM leads WHERE phone = ? AND source = ?')
      .get(phone, 'development_seed')
  )
    continue;
  const fixture = leadSchema.parse({
    calculator: {
      hasSolar: 'yes',
      pvPowerKw: i + 3,
      inverterBrand: 'Nu știu',
      monthlyConsumptionKwh: 300 + i * 200,
      nightConsumptionCategory: ['low', 'medium', 'high'][i],
      goal: 'self_consumption',
      budgetRange: 'unknown',
      purchaseTimeline: 'research',
    },
    contact: {
      county: ['Cluj', 'Brașov', 'București'][i],
      city: 'Localitate fictivă',
      homeOwner: true,
      name: names[i],
      phone: '0700000000',
      email: `demo${i}@example.invalid`,
      notes: 'FIȘĂ SINTETICĂ. Nu contacta și nu transmite.',
      consentGiven: true,
    },
    attribution: { source: 'development_seed' },
  });
  fixture.contact.phone = phone;
  createLead(fixture);
}
console.log('Leaduri DEMO create, fără persoane reale.');
