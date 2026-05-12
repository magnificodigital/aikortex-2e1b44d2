-- 1. Tabela agent_versions
CREATE TABLE public.agent_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.user_agents(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  config_snapshot jsonb NOT NULL,
  label text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (agent_id, version_number)
);

CREATE INDEX idx_agent_versions_agent_id_version_number
  ON public.agent_versions (agent_id, version_number DESC);

CREATE INDEX idx_agent_versions_created_at
  ON public.agent_versions (created_at DESC);

ALTER TABLE public.agent_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_versions_select_own_agent"
  ON public.agent_versions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_agents
    WHERE user_agents.id = agent_versions.agent_id
      AND user_agents.user_id = auth.uid()
  ));

CREATE POLICY "agent_versions_insert_own_agent"
  ON public.agent_versions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_agents
    WHERE user_agents.id = agent_id
      AND user_agents.user_id = auth.uid()
  ));

CREATE POLICY "agent_versions_update_label_only"
  ON public.agent_versions FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_agents
    WHERE user_agents.id = agent_versions.agent_id
      AND user_agents.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_agents
    WHERE user_agents.id = agent_versions.agent_id
      AND user_agents.user_id = auth.uid()
  ));

-- Trigger imutabilidade
CREATE OR REPLACE FUNCTION public.enforce_agent_version_immutability()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.config_snapshot IS DISTINCT FROM OLD.config_snapshot
     OR NEW.version_number IS DISTINCT FROM OLD.version_number
     OR NEW.agent_id IS DISTINCT FROM OLD.agent_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'Apenas label e notes podem ser alterados em agent_versions.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_agent_version_immutability
  BEFORE UPDATE ON public.agent_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_agent_version_immutability();

-- 2. Colunas em user_agents
ALTER TABLE public.user_agents
  ADD COLUMN IF NOT EXISTS published_version_id uuid REFERENCES public.agent_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS draft_updated_at timestamptz;

CREATE OR REPLACE FUNCTION public.touch_user_agent_draft()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.config IS DISTINCT FROM OLD.config THEN
    NEW.draft_updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_user_agent_draft ON public.user_agents;
CREATE TRIGGER trg_touch_user_agent_draft
  BEFORE UPDATE ON public.user_agents
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_user_agent_draft();

-- 3. RPC publish_agent_version
CREATE OR REPLACE FUNCTION public.publish_agent_version(
  p_agent_id uuid,
  p_label text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_config jsonb;
  v_next_version integer;
  v_new_version_id uuid;
BEGIN
  SELECT user_id, config INTO v_user_id, v_config
  FROM public.user_agents
  WHERE id = p_agent_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Agente não encontrado.';
  END IF;

  IF v_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Sem permissão para publicar este agente.';
  END IF;

  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next_version
  FROM public.agent_versions
  WHERE agent_id = p_agent_id;

  INSERT INTO public.agent_versions (
    agent_id, version_number, config_snapshot, label, notes, created_by
  ) VALUES (
    p_agent_id, v_next_version, v_config, p_label, p_notes, auth.uid()
  ) RETURNING id INTO v_new_version_id;

  UPDATE public.user_agents
  SET published_version_id = v_new_version_id
  WHERE id = p_agent_id;

  RETURN jsonb_build_object(
    'version_id', v_new_version_id,
    'version_number', v_next_version
  );
END;
$$;

REVOKE ALL ON FUNCTION public.publish_agent_version(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_agent_version(uuid, text, text) TO authenticated;