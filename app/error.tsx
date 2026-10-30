'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="container tool-page empty-state">
      <h1>Pagina nu a putut fi încărcată.</h1>
      <p>Încearcă din nou în câteva momente.</p>
      <button className="button" onClick={reset}>
        Încearcă din nou
      </button>
    </main>
  );
}
