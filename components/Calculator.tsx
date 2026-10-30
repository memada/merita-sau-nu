'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { calculatorSchema, calculatorDraftSchema, type CalculatorInput } from '../lib/validation';
import { firstInvalidStep } from '../lib/calculatorWizard';
import {
  backupOptions,
  budgetLabels,
  goalLabels,
  inverterBrands,
  nightLabels,
  solarLabels,
  timelineLabels,
} from '../lib/options';
import { captureAttribution, trackEvent } from '../lib/analytics';
import Choices from './Choices';
import Icon from './Icon';
const titles = [
  'Sistemul actual',
  'Consumul casei',
  'Ce îți dorești',
  'Buget și achiziție',
  'Pregătit pentru estimare',
];
const defaults: Partial<CalculatorInput> = {
  inverterBrand: 'Nu știu',
  inverterModel: '',
  backupLoads: [],
  nightConsumptionCategory: 'unknown',
  goal: 'self_consumption',
  budgetRange: 'unknown',
  purchaseTimeline: 'research',
};
export default function Calculator() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [input, setInput] = useState<Partial<CalculatorInput>>(defaults);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    captureAttribution();
    try {
      const stored = JSON.parse(sessionStorage.getItem('merita_draft') || 'null');
      if (stored?.input && typeof stored.input === 'object') {
        const draft = calculatorDraftSchema.safeParse(stored.input);
        if (draft.success) {
          const restored = { ...defaults, ...draft.data };
          const requestedStep = Math.max(0, Math.min(4, Math.floor(Number(stored.step) || 0)));
          const invalid = firstInvalidStep(restored, requestedStep - 1);
          setInput(restored);
          setStep(invalid?.step ?? requestedStep);
          if (invalid) setError(invalid.message);
        }
      }
    } catch {}
    setReady(true);
    trackEvent('calculator_start');
  }, []);
  useEffect(() => {
    if (ready)
      try {
        sessionStorage.setItem('merita_draft', JSON.stringify({ input, step }));
      } catch {}
  }, [input, step, ready]);
  function update<K extends keyof CalculatorInput>(key: K, value: CalculatorInput[K] | undefined) {
    setInput((prev) => ({ ...prev, [key]: value }));
    setError('');
  }
  function next() {
    const invalid = firstInvalidStep(input, step);
    if (invalid) {
      setStep(invalid.step);
      setError(invalid.message);
      requestAnimationFrame(() => heading.current?.focus());
      return;
    }
    if (step < 4) {
      trackEvent('calculator_step_completed', { step: step + 1 });
      setStep(step + 1);
      setError('');
      requestAnimationFrame(() => heading.current?.focus());
      return;
    }
    const checked = calculatorSchema.safeParse(input);
    if (!checked.success) {
      setError('Verifică datele introduse.');
      return;
    }
    try {
      sessionStorage.setItem('merita_calculator', JSON.stringify(checked.data));
    } catch {
      setError('Permite stocarea în această filă pentru a vedea estimarea.');
      return;
    }
    trackEvent('calculator_step_completed', { step: 5 });
    trackEvent('calculator_completed');
    router.push('/rezultat');
  }
  if (!ready)
    return (
      <p className="loading" role="status">
        Pregătim calculatorul…
      </p>
    );
  return (
    <div className="wizard-layout">
      <aside className="wizard-intro">
        <span className="eyebrow">CALCULATOR BATERIE</span>
        <h1>
          O decizie mai bună începe cu <span className="accent-serif">datele tale.</span>
        </h1>
        <p>Câteva întrebări simple. O estimare explicată. Fără cont și fără obligații.</p>
        <div className="wizard-side-steps">
          {titles.map((title, i) => (
            <div key={title} className={i === step ? 'active' : i < step ? 'done' : ''}>
              <span>{i < step ? <Icon name="check" size={15} /> : i + 1}</span>
              {title}
            </div>
          ))}
        </div>
        <p className="micro">
          <Icon name="shield" size={16} /> Nu cerem date de contact înainte de rezultat.
        </p>
      </aside>
      <section className="form-card">
        <div className="progress-heading">
          <span>Pasul {step + 1} din 5</span>
          <span>{Math.round(((step + 1) / 5) * 100)}%</span>
        </div>
        <div
          className="progress"
          role="progressbar"
          aria-label="Progres calculator"
          aria-valuenow={step + 1}
          aria-valuemin={0}
          aria-valuemax={5}
        >
          <span style={{ width: `${(step + 1) * 20}%` }} />
        </div>
        <h2 tabIndex={-1} ref={heading}>
          {titles[step]}
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            next();
          }}
          noValidate
        >
          {step === 0 && (
            <>
              <Choices
                label="Ai deja panouri fotovoltaice?"
                options={solarLabels}
                value={input.hasSolar}
                onChange={(v) => {
                  update('hasSolar', v as CalculatorInput['hasSolar']);
                  if (v !== 'yes')
                    setInput((prev) => ({
                      ...prev,
                      pvPowerKw: undefined,
                      inverterBrand: 'Nu știu',
                      inverterModel: '',
                    }));
                }}
              />
              {input.hasSolar === 'yes' && (
                <>
                  <label className="field">
                    Ce putere are sistemul?
                    <span className="input-unit">
                      <input
                        type="number"
                        inputMode="decimal"
                        min="1"
                        max="100"
                        step="0.1"
                        placeholder="6"
                        value={input.pvPowerKw ?? ''}
                        onChange={(e) =>
                          update(
                            'pvPowerKw',
                            e.target.value === '' ? undefined : Number(e.target.value),
                          )
                        }
                      />
                      <span>kW</span>
                    </span>
                  </label>
                  <label className="field">
                    Ce tip de invertor ai?
                    <select
                      value={input.inverterBrand}
                      onChange={(e) =>
                        update('inverterBrand', e.target.value as CalculatorInput['inverterBrand'])
                      }
                    >
                      {inverterBrands.map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                  {input.inverterBrand === 'Altul' && (
                    <label className="field">
                      Marcă / model <span className="optional">(opțional)</span>
                      <input
                        maxLength={150}
                        value={input.inverterModel}
                        onChange={(e) => update('inverterModel', e.target.value)}
                      />
                    </label>
                  )}
                  <p className="field-hint">
                    Nu știi invertorul? Poți continua fără această informație.
                  </p>
                </>
              )}
            </>
          )}
          {step === 1 && (
            <>
              <label className="field">
                Cât consumi aproximativ într-o lună?
                <span className="input-unit">
                  <input
                    type="number"
                    min="50"
                    max="5000"
                    inputMode="numeric"
                    placeholder="500"
                    value={input.monthlyConsumptionKwh ?? ''}
                    onChange={(e) =>
                      update(
                        'monthlyConsumptionKwh',
                        e.target.value === '' ? undefined : Number(e.target.value),
                      )
                    }
                  />
                  <span>kWh / lună</span>
                </span>
              </label>
              <div className="quick-values">
                {[250, 400, 500, 700, 1000].map((v) => (
                  <button
                    type="button"
                    className={input.monthlyConsumptionKwh === v ? 'active' : ''}
                    key={v}
                    onClick={() => update('monthlyConsumptionKwh', v)}
                  >
                    {v}
                    {v === 1000 ? '+' : ''}
                  </button>
                ))}
              </div>
              <Choices
                label="Cât consumi aproximativ seara și noaptea?"
                options={nightLabels}
                value={input.nightConsumptionCategory}
                onChange={(v) =>
                  update(
                    'nightConsumptionCategory',
                    v as CalculatorInput['nightConsumptionCategory'],
                  )
                }
              />
              {input.nightConsumptionCategory === 'unknown' && (
                <p className="notice">
                  Vom estima consumul de seară din consumul lunar. Precizia rezultatului va fi mai
                  mică.
                </p>
              )}
            </>
          )}
          {step === 2 && (
            <>
              <Choices
                label="Ce vrei să obții cu bateria?"
                options={{
                  self_consumption:
                    'Consum propriu mai mare — Vreau să folosesc seara mai mult din energia produsă ziua.',
                  backup: 'Backup — Vreau energie disponibilă și la întreruperi.',
                  both: 'Ambele — Vreau și autoconsum, și rezervă.',
                }}
                value={input.goal}
                onChange={(v) => {
                  update('goal', v as CalculatorInput['goal']);
                  if (v === 'self_consumption') update('backupLoads', []);
                }}
              />
              {input.goal !== 'self_consumption' && (
                <fieldset className="checks">
                  <legend>Ce ai vrea să poți alimenta în caz de pană?</legend>
                  {backupOptions.map((v) => (
                    <label key={v}>
                      <input
                        type="checkbox"
                        checked={input.backupLoads?.includes(v) || false}
                        onChange={(e) =>
                          update(
                            'backupLoads',
                            e.target.checked
                              ? [...(input.backupLoads || []), v]
                              : (input.backupLoads || []).filter((x) => x !== v),
                          )
                        }
                      />
                      {v}
                    </label>
                  ))}
                  <p className="field-hint">
                    Opțional. Aceste informații nu dimensionează puterea de backup.
                  </p>
                </fieldset>
              )}
            </>
          )}
          {step === 3 && (
            <>
              <Choices
                label="Ce buget aproximativ ai pentru baterie / upgrade?"
                options={budgetLabels}
                value={input.budgetRange}
                onChange={(v) => update('budgetRange', v as CalculatorInput['budgetRange'])}
              />
              <label className="field">
                Când ai vrea să faci achiziția?
                <select
                  value={input.purchaseTimeline}
                  onChange={(e) =>
                    update(
                      'purchaseTimeline',
                      e.target.value as CalculatorInput['purchaseTimeline'],
                    )
                  }
                >
                  {Object.entries(timelineLabels).map(([v, l]) => (
                    <option value={v} key={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          {step === 4 && (
            <>
              <p>Ai completat datele. Îți arătăm estimarea înainte să îți cerem date personale.</p>
              <dl className="summary-list">
                <div>
                  <dt>Consum lunar</dt>
                  <dd>{input.monthlyConsumptionKwh} kWh</dd>
                </div>
                <div>
                  <dt>Seara și noaptea</dt>
                  <dd>{nightLabels[input.nightConsumptionCategory!]}</dd>
                </div>
                <div>
                  <dt>Sistem fotovoltaic</dt>
                  <dd>
                    {input.hasSolar === 'yes'
                      ? input.pvPowerKw === undefined
                        ? 'Necompletat'
                        : `${input.pvPowerKw} kW`
                      : solarLabels[input.hasSolar!]}
                  </dd>
                </div>
                <div>
                  <dt>Obiectiv</dt>
                  <dd>{goalLabels[input.goal!]}</dd>
                </div>
              </dl>
              <p className="notice">
                Estimarea este orientativă. Compatibilitatea, producția disponibilă și instalarea
                trebuie verificate de un specialist autorizat.
              </p>
            </>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="wizard-actions">
            {step > 0 ? (
              <button
                className="button secondary"
                type="button"
                onClick={() => {
                  setStep(step - 1);
                  setError('');
                }}
              >
                Înapoi
              </button>
            ) : (
              <span />
            )}
            <button className="button" type="submit">
              {step === 4 ? 'Vezi estimarea' : 'Continuă'}
              <Icon name="arrow" size={18} />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
