-- Sprint 2.7-b1: personalização de email em cadências
-- Adiciona campos de remetente (from_name, reply_to) por cadência
-- e cria registro de opt-outs (cadence_unsubscribes) para compliance LGPD.

ALTER TABLE public.agent_cadences
  ADD COLUMN IF NOT EXISTS from_name text,
  ADD COLUMN IF NOT EXISTS reply_to text;

CREATE TABLE IF NOT EXISTS public.cadence_unsubscribes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.user_agents(id) ON DELETE CASCADE,
  contact_email text NOT NULL,
  channel text NOT NULL DEFAULT 'email' CHECK (channel IN ('email','sms','whatsapp')),
  reason text,
  unsubscribed_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS cadence_unsubscribes_unique
  ON public.cadence_unsubscribes (agent_id, lower(contact_email), channel);

ALTER TABLE public.cadence_unsubscribes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cadence_unsubscribes_select_own" ON public.cadence_unsubscribes;
CREATE POLICY "cadence_unsubscribes_select_own"
  ON public.cadence_unsubscribes FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_agents
    WHERE user_agents.id = cadence_unsubscribes.agent_id
      AND user_agents.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "cadence_unsubscribes_delete_own" ON public.cadence_unsubscribes;
CREATE POLICY "cadence_unsubscribes_delete_own"
  ON public.cadence_unsubscribes FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_agents
    WHERE user_agents.id = cadence_unsubscribes.agent_id
      AND user_agents.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "cadence_unsubscribes_service_role" ON public.cadence_unsubscribes;
CREATE POLICY "cadence_unsubscribes_service_role"
  ON public.cadence_unsubscribes FOR ALL TO service_role
  USING (true) WITH CHECK (true);

GRANT SELECT, DELETE ON public.cadence_unsubscribes TO authenticated;
GRANT ALL ON public.cadence_unsubscribes TO service_role;
