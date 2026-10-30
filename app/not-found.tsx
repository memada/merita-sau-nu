import Link from 'next/link';
export default function NotFound() {
  return (
    <main id="main" className="container tool-page empty-state">
      <h1>Pagina nu a fost găsită.</h1>
      <Link className="button" href="/">
        Înapoi la început
      </Link>
    </main>
  );
}
