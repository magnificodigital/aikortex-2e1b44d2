
-- Tabela: client_tables
CREATE TABLE public.client_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.agency_clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  columns jsonb NOT NULL DEFAULT '[]'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, name)
);

CREATE INDEX idx_client_tables_client_enabled
  ON public.client_tables (client_id, enabled)
  WHERE enabled = true;

CREATE TRIGGER set_client_tables_updated_at
  BEFORE UPDATE ON public.client_tables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela: client_table_rows
CREATE TABLE public.client_table_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL REFERENCES public.client_tables(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_table_rows_table
  ON public.client_table_rows (table_id, created_at DESC);

CREATE TRIGGER set_client_table_rows_updated_at
  BEFORE UPDATE ON public.client_table_rows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.client_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_table_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_tables_select_own_client" ON public.client_tables
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agency_clients ac
    JOIN public.agency_profiles ap ON ap.id = ac.agency_id
    WHERE ac.id = client_tables.client_id AND ap.user_id = auth.uid()));

CREATE POLICY "client_tables_write_own_client" ON public.client_tables
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agency_clients ac
    JOIN public.agency_profiles ap ON ap.id = ac.agency_id
    WHERE ac.id = client_tables.client_id AND ap.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agency_clients ac
    JOIN public.agency_profiles ap ON ap.id = ac.agency_id
    WHERE ac.id = client_id AND ap.user_id = auth.uid()));

CREATE POLICY "client_table_rows_select_own_client" ON public.client_table_rows
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.client_tables ct
    JOIN public.agency_clients ac ON ac.id = ct.client_id
    JOIN public.agency_profiles ap ON ap.id = ac.agency_id
    WHERE ct.id = client_table_rows.table_id AND ap.user_id = auth.uid()));

CREATE POLICY "client_table_rows_write_own_client" ON public.client_table_rows
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.client_tables ct
    JOIN public.agency_clients ac ON ac.id = ct.client_id
    JOIN public.agency_profiles ap ON ap.id = ac.agency_id
    WHERE ct.id = client_table_rows.table_id AND ap.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.client_tables ct
    JOIN public.agency_clients ac ON ac.id = ct.client_id
    JOIN public.agency_profiles ap ON ap.id = ac.agency_id
    WHERE ct.id = table_id AND ap.user_id = auth.uid()));

CREATE POLICY "client_tables_service_role" ON public.client_tables
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "client_table_rows_service_role" ON public.client_table_rows
  FOR ALL TO service_role USING (true) WITH CHECK (true);
