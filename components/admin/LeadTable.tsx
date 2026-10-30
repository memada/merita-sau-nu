import Link from 'next/link';
import type { Lead } from '../../lib/leads';
import { budgetLabels, statusLabels, timelineLabels } from '../../lib/options';
export function dateLabel(value: string) {
  return new Intl.DateTimeFormat('ro-RO', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Europe/Bucharest',
  }).format(new Date(value));
}
export default function LeadTable({ leads }: { leads: Lead[] }) {
  if (!leads.length)
    return (
      <div className="empty-state card">
        <h2>Nicio solicitare încă.</h2>
        <p>Leadurile care corespund filtrelor vor apărea aici.</p>
      </div>
    );
  return (
    <div className="table-wrap">
      <table>
        <caption className="sr-only">Solicitări de oferte, cele mai recente primele</caption>
        <thead>
          <tr>
            {[
              'Data',
              'Nume',
              'Telefon',
              'Județ',
              'PV',
              'Consum',
              'Rezultat baterie',
              'Buget',
              'Termen',
              'Score',
              'Status',
            ].map((h) => (
              <th scope="col" key={h}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => (
            <tr key={l.id}>
              <td>{dateLabel(l.createdAt)}</td>
              <td>
                <Link className="text-link" href={`/admin/leads/${l.id}`}>
                  {l.name}
                </Link>
                {l.possibleDuplicate && <span className="pill warning">Posibil duplicat</span>}
              </td>
              <td>{l.phone}</td>
              <td>{l.county}</td>
              <td>{l.pvPowerKw ? `${l.pvPowerKw} kW` : '—'}</td>
              <td>{l.monthlyConsumptionKwh} kWh</td>
              <td>{l.recommendationLabel}</td>
              <td>{budgetLabels[l.budgetRange]}</td>
              <td>{timelineLabels[l.purchaseTimeline]}</td>
              <td>
                <span className={`pill ${l.leadCategory.toLowerCase()}`}>
                  {l.leadScore} · {l.leadCategory}
                </span>
              </td>
              <td>{statusLabels[l.status]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
