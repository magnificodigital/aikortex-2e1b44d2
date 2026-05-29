-- Email templates por agência. Espelha o conceito dos WhatsApp templates,
-- mas sem aprovação externa (Resend não exige). Reusa placeholders {chave}
-- compatíveis com os steps de cadência (subject_template, message_template).

CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  subject text NOT NULL DEFAULT '',
  body_html text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS email_templates_user_id_idx
  ON public.email_templates (user_id);

-- Trigger pra atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.set_email_templates_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_email_templates_updated_at ON public.email_templates;
CREATE TRIGGER trg_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_email_templates_updated_at();

-- RLS: isolamento por user_id
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_templates_select_own"
  ON public.email_templates FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "email_templates_insert_own"
  ON public.email_templates FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "email_templates_update_own"
  ON public.email_templates FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "email_templates_delete_own"
  ON public.email_templates FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
