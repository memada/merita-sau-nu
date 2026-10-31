import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const origin = 'https://127.0.0.1:3102';
test('calculator → lead → protected admin → update → filtered CSV', async ({ page }, testInfo) => {
  await page.setExtraHTTPHeaders({
    'cf-connecting-ip': testInfo.project.name === 'mobile' ? '192.0.2.1' : '192.0.2.2',
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?utm_source=tiktok&utm_campaign=test-campanie');
  await expect(
    page.getByRole('heading', { name: 'Ce baterie merită pentru casa ta?' }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  mkdirSync('artifacts', { recursive: true });
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-landing.png`, fullPage: true });
  await page.getByRole('link', { name: 'Calculează gratuit', exact: true }).click();
  await page.getByRole('radio', { name: 'Da', exact: true }).check();
  await page.getByLabel('Ce putere are sistemul?').fill('6');
  await page.getByRole('button', { name: 'Continuă' }).click();
  await page.getByRole('button', { name: '500', exact: true }).click();
  await page.getByRole('radio', { name: 'Mediu — 4–8 kWh/noapte' }).check();
  await page.getByRole('button', { name: 'Continuă' }).click();
  await page.getByRole('button', { name: 'Înapoi', exact: true }).click();
  await expect(page.getByLabel('Cât consumi aproximativ într-o lună?')).toHaveValue('500');
  await page.getByRole('button', { name: 'Continuă' }).click();
  await page.getByRole('button', { name: 'Continuă' }).click();
  await page.getByRole('button', { name: 'Continuă' }).click();
  await page.getByRole('button', { name: 'Vezi estimarea' }).click();
  await expect(
    page.getByRole('heading', { name: 'O baterie în zona 5–10 kWh ar putea avea sens.' }),
  ).toBeVisible();
  await expect(page.getByLabel('Telefon', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: `artifacts/${testInfo.project.name}-result.png`, fullPage: true });
  await page.getByRole('button', { name: 'Vreau oferte' }).click();
  await page.getByRole('combobox', { name: 'Județ', exact: true }).selectOption('Cluj');
  await page.getByLabel('Localitate', { exact: true }).fill('Localitate test');
  await page.getByRole('radio', { name: 'Da', exact: true }).check();
  const name = `DEMO ${testInfo.project.name}`;
  await page.getByLabel('Nume', { exact: true }).fill(name);
  await page
    .getByLabel('Telefon', { exact: true })
    .fill(testInfo.project.name === 'mobile' ? '0700000000' : '0700000001');
  await expect(page.getByRole('checkbox')).not.toBeChecked();
  await page.getByRole('button', { name: 'Trimite cererea' }).click();
  await expect(page.locator('main').getByRole('alert')).toContainText('Trebuie să fii de acord');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Trimite cererea' }).click();
  await expect(page).toHaveURL(/multumim/);
  await page.goto('/admin');
  await expect(page).toHaveURL(/admin\/login/);
  await page.getByLabel('Utilizator').fill('e2e-admin');
  await page.getByLabel('Parolă').fill('e2e-password-local-only');
  await page.getByRole('button', { name: 'Intră în admin' }).click();
  await expect(page.getByRole('heading', { name: 'Privire de ansamblu' })).toBeVisible();
  await page.getByRole('link', { name, exact: true }).click();
  await expect(page.getByText('test-campanie', { exact: true })).toBeVisible();
  await expect(page.getByText('tiktok', { exact: true })).toHaveCount(2);
  await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('VERIFIED');
  await page.getByLabel('Note interne').fill('Verificare E2E, fără contact real.');
  await page.getByRole('button', { name: 'Salvează modificările' }).click();
  await expect(page.getByRole('status')).toContainText('Modificările au fost salvate');
  const api = await page.request.get('/api/admin/leads?status=VERIFIED&county=Cluj');
  expect(api.status()).toBe(200);
  const data = await api.json();
  expect(data.leads.some((l: { name: string }) => l.name === name)).toBe(true);
  await page.goto('/admin/leads');
  await page.getByRole('textbox', { name: 'Caută' }).fill(name);
  await page.getByRole('button', { name: 'Aplică filtrele' }).click();
  await expect(page.getByRole('link', { name, exact: true })).toBeVisible();
  expect(new URL(page.url()).searchParams.has('q')).toBe(false);
  expect(await page.getByRole('link', { name: 'Export CSV' }).getAttribute('href')).not.toContain(
    'q=',
  );
  const csv = await page.request.get('/api/admin/leads/export?status=VERIFIED');
  expect(csv.headers()['content-type']).toContain('text/csv');
  expect(await csv.text()).toContain(name);
  await page.getByRole('button', { name: 'Ieși', exact: true }).click();
  await expect(page).toHaveURL(/admin\/login/);
  expect((await page.request.get('/api/admin/leads')).status()).toBe(401);
  expect(
    (await page.context().cookies()).some((cookie) => cookie.name === 'merita_admin_search'),
  ).toBe(false);
  expect(errors).toEqual([]);
});
test('private APIs, origin, server validation, duplicates, honeypot and rate limit', async ({
  request,
}, testInfo) => {
  for (const path of [
    '/api/admin/leads',
    '/api/admin/leads/export',
    '/api/admin/leads/nonexistent',
  ])
    expect((await request.get(path)).status()).toBe(401);
  const headers = {
    Origin: origin,
    'cf-connecting-ip': testInfo.project.name === 'mobile' ? '192.0.2.3' : '192.0.2.4',
  };
  const calculator = {
    hasSolar: 'yes',
    pvPowerKw: 6,
    monthlyConsumptionKwh: 500,
    nightConsumptionCategory: 'unknown',
    goal: 'both',
    budgetRange: 'unknown',
    purchaseTimeline: 'research',
  };
  const contact = {
    county: 'Cluj',
    city: 'Test',
    homeOwner: true,
    name: 'DEMO API',
    phone: testInfo.project.name === 'mobile' ? '0700000002' : '0700000003',
    consentGiven: true,
  };
  const data = { calculator, contact, attribution: { utmSource: 'test' } };
  expect(
    (
      await request.post('/api/leads', {
        headers: { ...headers, Origin: 'https://other.invalid' },
        data,
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post('/api/leads', {
        headers,
        data: { ...data, contact: { ...contact, consentGiven: false } },
      })
    ).status(),
  ).toBe(400);
  expect(
    (await request.post('/api/leads', { headers, data: { ...data, website: 'spam' } })).status(),
  ).toBe(400);
  const first = await request.post('/api/leads', { headers, data });
  expect(first.status()).toBe(201);
  const firstLead = await first.json();
  const second = await request.post('/api/leads', { headers, data });
  expect(second.status()).toBe(201);
  const secondLead = await second.json();
  await request.post('/api/admin/login', {
    headers,
    data: { username: 'e2e-admin', password: 'e2e-password-local-only' },
  });
  const stored = await request.get(`/api/admin/leads/${secondLead.id}`);
  expect(stored.status()).toBe(200);
  const detail = await stored.json();
  expect(detail.lead.possibleDuplicate).toBe(true);
  expect(detail.lead.duplicateOfLeadId).toBe(firstLead.id);
  expect(detail.lead.calculatorResult.estimatedNightConsumptionKwh).toBe(7.5);
  expect(detail.lead.consentTimestamp).toBeTruthy();
  expect(
    (
      await request.patch(`/api/admin/leads/${secondLead.id}`, {
        headers: { Origin: 'https://other.invalid' },
        data: { status: 'VERIFIED', internalNotes: '' },
      })
    ).status(),
  ).toBe(403);
  await request.post('/api/leads', { headers, data });
  expect((await request.post('/api/leads', { headers, data })).status()).toBe(429);
});

test('PV is required on step 1 and incomplete saved progress is repaired', async ({ page }) => {
  await page.goto('/calculator-baterie');
  await page.getByRole('radio', { name: 'Da', exact: true }).check();
  await page.getByRole('button', { name: 'Continuă' }).click();
  await expect(page.getByText('Pasul 1 din 5', { exact: true })).toBeVisible();
  await expect(page.locator('main').getByRole('alert')).toContainText('Introdu puterea sistemului');
  await page.evaluate(() =>
    sessionStorage.setItem(
      'merita_draft',
      JSON.stringify({
        step: 4,
        input: {
          hasSolar: 'yes',
          monthlyConsumptionKwh: 500,
          nightConsumptionCategory: 'medium',
          goal: 'self_consumption',
          budgetRange: 'unknown',
          purchaseTimeline: 'research',
        },
      }),
    ),
  );
  await page.reload();
  await expect(page.getByText('Pasul 1 din 5', { exact: true })).toBeVisible();
  await expect(page.locator('main').getByRole('alert')).toContainText('Introdu puterea sistemului');
  await expect(page.locator('main')).not.toContainText('undefined');
  await page.getByLabel('Ce putere are sistemul?').fill('6');
  for (let step = 0; step < 4; step++) await page.getByRole('button', { name: 'Continuă' }).click();
  await expect(page.getByText('500 kWh', { exact: true })).toBeVisible();
  await expect(page.getByText('6 kW', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Vezi estimarea' }).click();
  await expect(page).toHaveURL(/rezultat/);
});

test('analytics consent gates loading, sanitizes context, and disables collection on admin', async ({
  page,
}) => {
  await page.route('https://www.googletagmanager.com/**', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: '/* test-only stub: no external telemetry */',
    }),
  );
  await page.goto('/?phone=private-value&utm_source=tiktok');
  // QA build uses a synthetic GA ID. Without an ID, analytics must stay absent.
  if ((await page.getByRole('button', { name: 'Preferințe de măsurare' }).count()) === 0) {
    await expect(page.locator('#merita-ga')).toHaveCount(0);
    return;
  }
  const consent = page.getByRole('button', { name: 'Accept măsurarea' });
  await expect(consent).toBeVisible();
  await expect(page.locator('#merita-ga')).toHaveCount(0);
  await consent.click();
  await expect(page.locator('#merita-ga')).toHaveCount(1);
  const payload = await page.evaluate(() => JSON.stringify(window.dataLayer));
  expect(payload).not.toContain('private-value');
  expect(payload).not.toContain('utm_source');
  await page.goto('/admin/login');
  await expect(page.locator('#merita-ga')).toHaveCount(0);
  await page.goto('/');
  await page.getByRole('button', { name: 'Preferințe de măsurare' }).click();
  await page.getByRole('button', { name: 'Doar funcționale' }).click();
  await expect(page.locator('#merita-ga')).toHaveCount(0);
});
