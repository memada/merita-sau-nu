import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLead, statusHistory } from '../../../../../lib/leads';
import {
  budgetLabels,
  goalLabels,
  nightLabels,
  solarLabels,
  statusLabels,
  timelineLabels,
} from '../../../../../lib/options';
import { dateLabel } from '../../../../../components/admin/LeadTable';
import LeadEditor from '../../../../../components/admin/LeadEditor';
function Details({ title, rows }: { title: string; rows: [string, React.ReactNode][] }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      <dl className="detail-list">
        {rows.map(([key, value]) => (
          <div key={key}>
            <dt>{key}</dt>
            <dd>{value || '—'}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
export default async function LeadDetail({ params }: { params: Promise<{ id: string }> }) {
  const lead = getLead((await params).id);
  if (!lead) notFound();
  const history = statusHistory(lead.id);
  return (
    <>
      <Link href="/admin/leads" className="text-link">
        ← Toate leadurile
      </Link>
      <div className="section-title-row">
        <div>
          <h1>{lead.name}</h1>
          <p className="micro">
            {lead.id} · {dateLabel(lead.createdAt)}
          </p>
        </div>
        <span className={`pill ${lead.leadCategory.toLowerCase()}`}>
          {lead.leadScore}/100 · {lead.leadCategory}
        </span>
      </div>
      {lead.possibleDuplicate && (
        <p className="notice">
          Posibil duplicat.{' '}
          {lead.duplicateOfLeadId && (
            <Link href={`/admin/leads/${lead.duplicateOfLeadId}`}>
              Vezi solicitarea anterioară →
            </Link>
          )}
        </p>
      )}
      <div className="admin-detail-grid">
        <div>
          <Details
            title="Contact"
            rows={[
              [
                'Telefon',
                <a key="phone" href={`tel:${lead.phone}`}>
                  {lead.phone}
                </a>,
              ],
              ['Email', lead.email],
              ['Județ', lead.county],
              ['Localitate', lead.city],
              ['Proprietar', lead.homeOwner ? 'Da' : 'Nu'],
              ['Detalii de la solicitant', lead.notes],
            ]}
          />
          <Details
            title="Date calculator"
            rows={[
              ['Panouri existente', solarLabels[lead.hasSolar]],
              ['Putere PV', lead.pvPowerKw ? `${lead.pvPowerKw} kW` : '—'],
              ['Invertor', `${lead.inverterBrand} ${lead.inverterModel}`],
              ['Consum lunar', `${lead.monthlyConsumptionKwh} kWh`],
              ['Categorie consum noapte', nightLabels[lead.nightConsumptionCategory]],
              ['Consum noapte reprezentativ / estimat', `${lead.estimatedNightConsumptionKwh} kWh`],
              ['Obiectiv', goalLabels[lead.goal]],
              ['Consumatori backup', lead.backupLoads.join(', ')],
              ['Buget', budgetLabels[lead.budgetRange]],
              ['Termen', timelineLabels[lead.purchaseTimeline]],
              ['Estimare baterie', lead.recommendationLabel],
              ['Precizie', lead.calculationConfidence],
            ]}
          />
          <Details
            title="Atribuire și sursă"
            rows={[
              ['Sursă', lead.source],
              ['UTM source', lead.utmSource],
              ['UTM medium', lead.utmMedium],
              ['UTM campaign', lead.utmCampaign],
              ['UTM content', lead.utmContent],
              ['UTM term', lead.utmTerm],
              ['Landing page', lead.landingPage],
              ['Referrer', lead.referrer],
            ]}
          />
        </div>
        <div>
          <LeadEditor id={lead.id} status={lead.status} internalNotes={lead.internalNotes} />
          <Details
            title="Consimțământ"
            rows={[
              ['Acord', lead.consentGiven ? 'Da' : 'Nu'],
              ['Text acceptat', lead.consentText],
              ['Data acordului', dateLabel(lead.consentTimestamp)],
              ['Versiune politică', lead.privacyPolicyVersion],
              ['Verificare', lead.verificationStatus],
            ]}
          />
          <section className="card">
            <h2>Istoric status</h2>
            {history.length ? (
              history.map((h) => (
                <p key={h.id}>
                  {statusLabels[h.oldStatus]} → {statusLabels[h.newStatus]}
                  <br />
                  <small>
                    {dateLabel(h.changedAt)} · {h.changedBy}
                  </small>
                </p>
              ))
            ) : (
              <p>Nicio schimbare de status.</p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
