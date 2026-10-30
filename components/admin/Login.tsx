'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export default function Login() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(e.currentTarget);
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.get('username'), password: form.get('password') }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      router.push('/admin');
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Autentificarea a eșuat.');
      setBusy(false);
    }
  }
  return (
    <section className="form-card login-card">
      <span className="eyebrow">SPAȚIU PRIVAT</span>
      <h1>Administrare</h1>
      <p>Autentifică-te pentru a verifica solicitările.</p>
      <form onSubmit={submit}>
        <label className="field">
          Utilizator
          <input name="username" autoComplete="username" required maxLength={100} />
        </label>
        <label className="field">
          Parolă
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={200}
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="button full" disabled={busy}>
          {busy ? 'Se verifică…' : 'Intră în admin'}
        </button>
      </form>
    </section>
  );
}
