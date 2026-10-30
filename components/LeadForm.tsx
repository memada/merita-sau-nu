'use client';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { contactSchema, type CalculatorInput } from '../lib/validation';
import { counties } from '../lib/options';
import { CONSENT_TEXT } from '../lib/privacy';
import { getAttribution, trackEvent } from '../lib/analytics';
export default function LeadForm({ calculator }: { calculator: CalculatorInput }) {
  const router = useRouter();
  const started = useRef(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError('');
    const form = new FormData(event.currentTarget);
    const contact = {
      county: form.get('county'),
      city: form.get('city'),
      homeOwner:
        form.get('homeOwner') === 'yes' ? true : form.get('homeOwner') === 'no' ? false : undefined,
      name: form.get('name'),
      phone: form.get('phone'),
      email: form.get('email'),
      notes: form.get('notes'),
      consentGiven: form.get('consent') === 'on',
    };
    const parsed = contactSchema.safeParse(contact);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calculator,
          contact: parsed.data,
          attribution: getAttribution(),
          website: form.get('website') || '',
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Cererea nu a putut fi salvată.');
      trackEvent('lead_submitted');
      router.push('/multumim');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Verifică conexiunea și încearcă din nou.');
      setBusy(false);
    }
  }
  return (
    <form
      className="lead-form"
      onSubmit={submit}
      noValidate
      onFocus={() => {
        if (!started.current) {
          trackEvent('lead_form_started');
          started.current = true;
        }
      }}
    >
      <label className="field">
        Județ
        <select name="county" required defaultValue="">
          <option value="" disabled>
            Selectează județul
          </option>
          {counties.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <label className="field">
        Localitate
        <input name="city" required maxLength={100} autoComplete="address-level2" />
      </label>
      <fieldset className="inline-radios">
        <legend>Ești proprietarul locuinței?</legend>
        <label>
          <input type="radio" name="homeOwner" value="yes" required />
          Da
        </label>
        <label>
          <input type="radio" name="homeOwner" value="no" />
          Nu
        </label>
      </fieldset>
      <label className="field">
        Nume
        <input name="name" required maxLength={120} autoComplete="name" />
      </label>
      <label className="field">
        Telefon
        <input
          name="phone"
          type="tel"
          required
          maxLength={30}
          placeholder="07xx xxx xxx"
          autoComplete="tel"
        />
      </label>
      <label className="field">
        Email <span className="optional">(opțional)</span>
        <input name="email" type="email" maxLength={254} autoComplete="email" />
      </label>
      <label className="field">
        Alte detalii <span className="optional">(opțional)</span>
        <textarea
          name="notes"
          rows={3}
          maxLength={2000}
          placeholder="Ex: am deja invertor Huawei SUN2000 și caut baterie compatibilă."
        />
      </label>
      <div className="honeypot" aria-hidden="true">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <label className="consent">
        <input type="checkbox" name="consent" required />
        <span>
          {CONSENT_TEXT}{' '}
          <Link href="/confidentialitate" target="_blank" rel="noopener">
            Politica de confidențialitate
          </Link>
        </span>
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="button full" type="submit" disabled={busy}>
        {busy ? 'Se salvează…' : 'Trimite cererea'}
      </button>
      <p className="micro">
        Datele tale sunt folosite pentru această solicitare, fără înscriere la newsletter.
      </p>
    </form>
  );
}
