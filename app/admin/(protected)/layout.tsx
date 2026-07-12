/**
 * Protected admin layout — verifies session cookie server-side
 * Applies to /admin, /admin/reservaciones, /admin/nueva, /admin/calendario
 */

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyAdminToken } from '@/app/lib/admin-auth';
import AdminNav from './AdminNav';

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('hotel_admin_session')?.value;

  if (!verifyAdminToken(token)) {
    redirect('/admin/login');
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#f5f3ef', fontFamily: 'system-ui, sans-serif', overflowX: 'hidden' }}>
      <AdminNav />
      <main style={{ padding: '20px 16px', maxWidth: '1100px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        {children}
      </main>
    </div>
  );
}
