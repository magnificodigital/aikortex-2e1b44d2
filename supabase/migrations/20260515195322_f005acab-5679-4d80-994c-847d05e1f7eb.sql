-- Normaliza valores legados
UPDATE public.agency_clients SET status = 'inactive' WHERE status = 'suspended';
UPDATE public.agency_clients SET status = 'active' WHERE status IS NULL OR status NOT IN ('active', 'inactive');

-- Default
ALTER TABLE public.agency_clients ALTER COLUMN status SET DEFAULT 'active';

-- CHECK constraint
ALTER TABLE public.agency_clients DROP CONSTRAINT IF EXISTS agency_clients_status_check;
ALTER TABLE public.agency_clients
  ADD CONSTRAINT agency_clients_status_check
  CHECK (status IN ('active', 'inactive'));