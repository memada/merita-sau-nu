import type { Metadata } from 'next';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Administrare',
  robots: { index: false, follow: false },
  alternates: { canonical: '/admin' },
};
export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return children;
}
