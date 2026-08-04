-- Solicitudes de servicio desde el Apple TV de cada habitación (Conserje El Encino).
-- RLS deny-all: solo la service key del backend las toca. Config de la TV en
-- hotel_settings key 'tv_config' (wifi, horarios, teléfonos, URL de descarga de
-- la app del Directorio — cambiable por DB sin rebuild de la TV).
CREATE TABLE IF NOT EXISTS service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_number text NOT NULL,
  request_type text NOT NULL CHECK (request_type IN ('limpieza','toallas','agua','problema','otro')),
  note text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','done')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
