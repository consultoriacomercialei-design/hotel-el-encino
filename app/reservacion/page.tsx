import { redirect } from 'next/navigation';

export default function ReservacionPage() {
  redirect('/?reservar=1');
}
