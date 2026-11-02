'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { statusLabels, type LeadStatus } from '../../lib/options';
export default function LeadEditor({
  id,
  status,
  internalNotes,
}: {
  id: string;
  status: LeadStatus;
  internalNotes: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/admin/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: form.get('status'),
          internalNotes: form.get('internalNotes'),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMessage('Modificările au fost salvate.');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Salvarea a eșuat.');
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (
      busy ||
      !window.confirm(
        'Ștergi definitiv acest lead și istoricul său? Acțiunea nu poate fi anulată din admin.',
      )
    )
      return;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(`/api/admin/leads/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(
          data?.error || 'Ștergerea a eșuat. Verifică autentificarea și încearcă din nou.',
        );
      }
      router.replace('/admin/leads');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Ștergerea a eșuat.');
      setBusy(false);
    }
  }
  return (
    <form className="card" onSubmit={save}>
      <h2>Verificare și note interne</h2>
      <label className="field">
        Status
        <select name="status" defaultValue={status}>
          {Object.entries(statusLabels).map(([v, l]) => (
            <option value={v} key={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Note interne
        <textarea name="internalNotes" rows={5} maxLength={10000} defaultValue={internalNotes} />
      </label>
      <p className="micro">
        Statusul „Trimis furnizorilor” consemnează o acțiune manuală. Nu trimite automat date.
      </p>
      <button className="button" disabled={busy}>
        {busy ? 'Se salvează…' : 'Salvează modificările'}
      </button>
      <div className="lead-delete">
        <p className="micro">Ștergerea elimină definitiv leadul și istoricul său din aplicație.</p>
        <button type="button" className="button danger" disabled={busy} onClick={remove}>
          Șterge leadul
        </button>
      </div>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
