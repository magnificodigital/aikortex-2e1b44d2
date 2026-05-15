
ALTER TABLE public.billing_events DROP CONSTRAINT IF EXISTS billing_events_client_id_fkey;
ALTER TABLE public.billing_events
  ADD CONSTRAINT billing_events_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.agency_clients(id) ON DELETE SET NULL;
