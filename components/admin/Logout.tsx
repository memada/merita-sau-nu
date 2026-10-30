'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
export default function Logout() {
  const router = useRouter();
  const [error, setError] = useState(false);
  return (
    <>
      <button
        className="button secondary small"
        onClick={async () => {
          try {
            const response = await fetch('/api/admin/logout', { method: 'POST' });
            if (!response.ok) throw new Error();
            router.replace('/admin/login');
            router.refresh();
          } catch {
            setError(true);
          }
        }}
      >
        Ieși
      </button>
      {error && <span role="alert">Încearcă din nou.</span>}
    </>
  );
}
