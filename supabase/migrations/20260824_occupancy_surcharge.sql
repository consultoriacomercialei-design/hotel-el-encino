-- b12: componente de cargo por adultos extra (separado del base para poder
-- recalcular ocupación sin pisar tarifas negociadas).
-- Aplicada en prod el 24-ago-2026 vía MCP (hotel_b12_occupancy_surcharge).
alter table reservations add column if not exists occupancy_surcharge_mxn numeric not null default 0;
