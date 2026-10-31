import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_SEARCH_COOKIE, adminSearch } from '../../../../lib/adminSearch';
import { currentAdmin } from '../../../../lib/auth';
import Link from 'next/link';
import { filtersFrom, listLeads } from '../../../../lib/leads';
import { counties, statusLabels, timelineLabels } from '../../../../lib/options';
import LeadTable from '../../../../components/admin/LeadTable';
export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw))
    if (typeof value === 'string' && key !== 'q') params.set(key, value);
  async function applyFilters(form: FormData) {
    'use server';
    if (!(await currentAdmin())) redirect('/admin/login');
    (await cookies()).set(ADMIN_SEARCH_COOKIE, String(form.get('q') || '').slice(0, 200), {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 900,
    });
    const next = new URLSearchParams();
    for (const key of ['status', 'county', 'category', 'from', 'to', 'timeline']) {
      const value = String(form.get(key) || '');
      if (value) next.set(key, value.slice(0, 200));
    }
    redirect(`/admin/leads?${next}`);
  }
  const filters = { ...filtersFrom(params), q: await adminSearch() };
  const result = listLeads(filters);
  function pageUrl(page: number) {
    const q = new URLSearchParams(params);
    q.set('page', String(page));
    return `/admin/leads?${q}`;
  }
  return (
    <>
      <span className="eyebrow">SOLICITĂRI</span>
      <div className="section-title-row">
        <h1>
          Leaduri <span className="count-label">{result.total}</span>
        </h1>
        <a href={`/api/admin/leads/export?${params}`} className="button secondary small">
          Export CSV
        </a>
      </div>
      <form className="filter-grid card" action={applyFilters}>
        <label className="field">
          Caută
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="Nume, telefon sau email"
            maxLength={200}
          />
        </label>
        <label className="field">
          Status
          <select name="status" defaultValue={filters.status}>
            <option value="">Toate</option>
            {Object.entries(statusLabels).map(([v, l]) => (
              <option value={v} key={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Județ
          <select name="county" defaultValue={filters.county}>
            <option value="">Toate</option>
            {counties.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Categorie
          <select name="category" defaultValue={filters.category}>
            <option value="">Toate</option>
            {['HOT', 'WARM', 'COLD'].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="field">
          De la
          <input type="date" name="from" defaultValue={filters.from} />
        </label>
        <label className="field">
          Până la
          <input type="date" name="to" defaultValue={filters.to} />
        </label>
        <label className="field">
          Termen achiziție
          <select name="timeline" defaultValue={filters.timeline}>
            <option value="">Toate</option>
            {Object.entries(timelineLabels).map(([v, l]) => (
              <option value={v} key={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <div className="actions">
          <button className="button small">Aplică filtrele</button>
          <button
            className="preferences-link"
            formAction={async () => {
              'use server';
              if (!(await currentAdmin())) redirect('/admin/login');
              (await cookies()).delete(ADMIN_SEARCH_COOKIE);
              redirect('/admin/leads');
            }}
          >
            Resetează
          </button>
        </div>
      </form>
      <LeadTable leads={result.leads} />
      <nav className="pagination" aria-label="Paginare leaduri">
        {result.page > 1 && (
          <Link className="button secondary small" href={pageUrl(result.page - 1)}>
            ← Anterior
          </Link>
        )}
        <span>
          Pagina {result.page} din {result.pages}
        </span>
        {result.page < result.pages && (
          <Link className="button secondary small" href={pageUrl(result.page + 1)}>
            Următor →
          </Link>
        )}
      </nav>
    </>
  );
}
