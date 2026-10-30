import Link from 'next/link';
import { dashboardStats, listLeads } from '../../../lib/leads';
import LeadTable from '../../../components/admin/LeadTable';
export default function Dashboard() {
  const stats = dashboardStats();
  return (
    <>
      <span className="eyebrow">MERITĂ SAU NU · ADMIN</span>
      <h1>Privire de ansamblu</h1>
      <p>Solicitări de verificat înainte de a le transmite furnizorilor.</p>
      <div className="kpi-grid">
        {[
          ['Leaduri azi', stats.today],
          ['Ultimele 7 zile', stats.week],
          ['Leaduri totale', stats.total],
          ['Leaduri verificate', stats.verified],
          ['Leaduri HOT', stats.hot],
        ].map(([label, value]) => (
          <article className="card kpi" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <div className="section-title-row">
        <h2>Solicitări recente</h2>
        <Link className="text-link" href="/admin/leads">
          Toate leadurile →
        </Link>
      </div>
      <LeadTable leads={listLeads().leads.slice(0, 10)} />
    </>
  );
}
