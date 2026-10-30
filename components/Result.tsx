'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { calculatorSchema, type CalculatorInput } from '../lib/validation';
import { calculateBattery } from '../lib/batteryCalculator';
import { goalLabels, nightLabels, solarLabels } from '../lib/options';
import { DISCLAIMER } from '../lib/privacy';
import { trackEvent } from '../lib/analytics';
import LeadForm from './LeadForm';
import Icon from './Icon';
export default function Result() {
  const [input, setInput] = useState<CalculatorInput | null>(null);
  const [ready, setReady] = useState(false);
  const [showForm, setShowForm] = useState(false);
  useEffect(() => {
    try {
      const value = calculatorSchema.safeParse(
        JSON.parse(sessionStorage.getItem('merita_calculator') || 'null'),
      );
      if (value.success) setInput(value.data);
    } catch {}
    setReady(true);
  }, []);
  if (!ready) return <p role="status">Pregătim rezultatul…</p>;
  if (!input)
    return (
      <div className="empty-state">
        <h1>Hai să începem cu datele tale.</h1>
        <p>Completează calculatorul pentru a primi o estimare.</p>
        <Link href="/calculator-baterie" className="button">
          Deschide calculatorul
        </Link>
      </div>
    );
  const result = calculateBattery(input);
  return (
    <div className="result-layout">
      <div>
        <Link className="text-link" href="/calculator-baterie">
          ← Modifică datele
        </Link>
        <div className="result-hero">
          <span className="eyebrow">PENTRU PROFILUL TĂU</span>
          <h1>
            O baterie în zona <strong>{result.recommendationLabel}</strong> ar putea avea sens.
          </h1>
          <p className="result-disclaimer">
            <Icon name="shield" size={19} />
            {DISCLAIMER}
          </p>
          <span className="pill">
            Precizie{' '}
            {result.calculationConfidence === 'LOW'
              ? 'redusă — consum de seară estimat'
              : 'medie — interval de consum'}
          </span>
        </div>
        <dl className="result-metrics">
          <div>
            <dt>Consum lunar</dt>
            <dd>
              {input.monthlyConsumptionKwh} <small>kWh</small>
            </dd>
          </div>
          <div>
            <dt>Consum seara / noaptea</dt>
            <dd>
              {result.nightConsumptionEstimated
                ? `≈ ${result.estimatedNightConsumptionKwh} kWh/zi`
                : nightLabels[input.nightConsumptionCategory].split(' — ')[1]}
            </dd>
          </div>
          <div>
            <dt>Sistem fotovoltaic</dt>
            <dd>
              {input.hasSolar === 'yes' ? `${input.pvPowerKw} kW` : solarLabels[input.hasSolar]}
            </dd>
          </div>
          <div>
            <dt>Obiectiv</dt>
            <dd>{goalLabels[input.goal]}</dd>
          </div>
        </dl>
        <article className="card explanation">
          <h2>De ce?</h2>
          <p>
            Consumul tău de seară este principalul motiv pentru această estimare. O baterie
            semnificativ mai mare ar putea rămâne parțial nefolosită în multe zile, iar una prea
            mică poate acoperi doar o parte din consum.
          </p>
          <p>
            Rezultatul indică o zonă de capacitate, nu un model sau o compatibilitate garantată.
            Bugetul și termenul de achiziție nu modifică estimarea tehnică.
          </p>
          {!result.nightConsumptionEstimated && (
            <p className="field-hint">
              Pentru categoria selectată am folosit o valoare reprezentativă de{' '}
              {result.estimatedNightConsumptionKwh} kWh. Nu reprezintă o măsurătoare.
            </p>
          )}
        </article>
        {result.nightConsumptionEstimated && (
          <p className="notice">
            Am estimat consumul de seară la aproximativ {result.estimatedNightConsumptionKwh} kWh/zi
            deoarece nu ai introdus această valoare. Formula: consum lunar ÷ 30 × 45%. Precizia
            rezultatului este mai mică.
          </p>
        )}
        {result.warnings.map((w) => (
          <p className="notice" key={w}>
            {w}
          </p>
        ))}
      </div>
      <aside className="lead-cta card">
        <span className="icon-tile">
          <Icon name="chart" />
        </span>
        <h2>Vrei să compari până la 3 oferte?</h2>
        <p>Putem transmite cererea ta către maximum 3 furnizori relevanți din zona ta.</p>
        <p className="field-hint">
          Verificăm informațiile înainte de transmitere. Solicitarea nu presupune o obligație de
          achiziție.
        </p>
        {!showForm ? (
          <button
            className="button full"
            onClick={() => {
              setShowForm(true);
              trackEvent('lead_form_opened');
            }}
          >
            Vreau oferte <Icon name="arrow" size={18} />
          </button>
        ) : (
          <LeadForm calculator={input} />
        )}
      </aside>
    </div>
  );
}
