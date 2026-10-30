import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentAdmin } from '../../../lib/auth';
import Logout from '../../../components/admin/Logout';
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const admin = await currentAdmin();
  if (!admin) redirect('/admin/login');
  return (
    <main id="main" className="container admin-page">
      <div className="admin-bar">
        <nav>
          <Link href="/admin">Dashboard</Link>
          <Link href="/admin/leads">Toate leadurile</Link>
        </nav>
        <div>
          <span className="micro">{admin}</span>
          <Logout />
        </div>
      </div>
      {children}
    </main>
  );
}
