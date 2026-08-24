-- Raíz del "Tomar no hace nada" (b13): el CHECK de status solo admitía
-- pending/done, y TODO el flujo móvil escribe in_progress/resolved — la base
-- rechazaba cada Tomar/Listo en silencio (mismo patrón que el checked_out
-- fantasma de reservations). Vocabulario canónico único:
--   pending → in_progress → resolved
alter table public.service_requests
  drop constraint if exists service_requests_status_check;

update public.service_requests set status = 'resolved' where status = 'done';

alter table public.service_requests
  add constraint service_requests_status_check
  check (status = any (array['pending'::text, 'in_progress'::text, 'resolved'::text]));
