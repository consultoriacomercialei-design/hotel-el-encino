'use server';

import { cookies } from 'next/headers';
import { verifyAdminToken } from '@/app/lib/admin-auth';
import { deleteCalendarEvent } from '@/app/lib/google-calendar';
import { redirect } from 'next/navigation';

async function requireAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('hotel_admin_session')?.value;
  if (!verifyAdminToken(token)) throw new Error('No autorizado');
}

export async function deleteCalendarEventAction(formData: FormData) {
  await requireAuth();
  const eventId   = formData.get('eventId') as string;
  const monthParam = formData.get('month') as string;
  if (eventId) await deleteCalendarEvent(eventId);
  redirect(`/admin/calendario${monthParam ? `?month=${monthParam}` : ''}`);
}
