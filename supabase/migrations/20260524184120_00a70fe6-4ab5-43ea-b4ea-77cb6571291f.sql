ALTER TABLE public.agent_cadences
  ADD COLUMN IF NOT EXISTS auto_trigger_table_id uuid REFERENCES public.client_tables(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_agent_cadences_auto_trigger
  ON public.agent_cadences (auto_trigger_table_id)
  WHERE auto_trigger_table_id IS NOT NULL AND enabled = true AND trigger_type = 'auto';

CREATE OR REPLACE FUNCTION public.dispatch_cadence_on_row_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cadence record;
  v_first_step jsonb;
  v_delay_sec integer;
  v_contact_name text;
  v_contact_phone text;
  v_contact_email text;
  v_total_steps integer;
BEGIN
  v_contact_name := COALESCE(
    NEW.data->>'nome', NEW.data->>'name', NEW.data->>'full_name',
    NEW.data->>'cliente', NEW.data->>'contato'
  );
  v_contact_phone := COALESCE(
    NEW.data->>'telefone', NEW.data->>'phone',
    NEW.data->>'celular', NEW.data->>'whatsapp'
  );
  v_contact_email := COALESCE(NEW.data->>'email', NEW.data->>'Email');

  FOR v_cadence IN
    SELECT id, agent_id, steps
    FROM public.agent_cadences
    WHERE auto_trigger_table_id = NEW.table_id
      AND enabled = true
      AND trigger_type = 'auto'
  LOOP
    BEGIN
      v_first_step := v_cadence.steps->0;
      v_total_steps := jsonb_array_length(v_cadence.steps);
      IF v_total_steps = 0 OR v_first_step IS NULL THEN
        CONTINUE;
      END IF;

      v_delay_sec := COALESCE((v_first_step->>'day')::int, 0) * 86400
                   + COALESCE((v_first_step->>'hour')::int, 0) * 3600
                   + COALESCE((v_first_step->>'minute')::int, 0) * 60;

      INSERT INTO public.cadence_executions (
        cadence_id, agent_id, contact_name, contact_phone, contact_metadata,
        current_step, total_steps, status, started_at, next_run_at, metadata
      ) VALUES (
        v_cadence.id, v_cadence.agent_id, v_contact_name, v_contact_phone, NEW.data,
        0, v_total_steps, 'pending', now(), now() + (v_delay_sec || ' seconds')::interval,
        jsonb_build_object(
          'auto_triggered', true,
          'source_table_id', NEW.table_id,
          'source_row_id', NEW.id,
          'source_email', v_contact_email
        )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'dispatch_cadence_on_row_insert: cadence_id=%, error=%', v_cadence.id, SQLERRM;
    END;
  END LOOP;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'dispatch_cadence_on_row_insert (top): error=%', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_dispatch_cadence_on_row_insert ON public.client_table_rows;
CREATE TRIGGER tg_dispatch_cadence_on_row_insert
  AFTER INSERT ON public.client_table_rows
  FOR EACH ROW
  EXECUTE FUNCTION public.dispatch_cadence_on_row_insert();

NOTIFY pgrst, 'reload schema';