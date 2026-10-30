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
      {message && <p role="status">{message}</p>}
    </form>
  );
}
