-- Fase 1C: Hardening de segurança do banco de dados
-- 1C1: Restringir permissões do anon (apenas SELECT)
-- 1C2: Adicionar FK constraints faltantes
-- 1C3: Trigger anti role-escalation

-- ── 1C1: Restringir permissões ───────────────────────────────────────────
-- Remove permissões excessivas e concede apenas SELECT para anon
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;

-- authenticated mantém permissões normais (RLS controla)
-- Remove grants excessivos anteriores
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- ── 1C2: FK constraints faltantes ────────────────────────────────────────

-- agency_wallets.user_id → auth.users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_agency_wallets_user_id'
  ) THEN
    ALTER TABLE public.agency_wallets
      ADD CONSTRAINT fk_agency_wallets_user_id
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- credit_transactions.user_id → auth.users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_credit_transactions_user_id'
  ) THEN
    ALTER TABLE public.credit_transactions
      ADD CONSTRAINT fk_credit_transactions_user_id
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- whatsapp_messages.user_id → auth.users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_whatsapp_messages_user_id'
  ) THEN
    ALTER TABLE public.whatsapp_messages
      ADD CONSTRAINT fk_whatsapp_messages_user_id
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- workspace_members.workspace_owner_id → auth.users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_workspace_members_owner'
  ) THEN
    ALTER TABLE public.workspace_members
      ADD CONSTRAINT fk_workspace_members_owner
      FOREIGN KEY (workspace_owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- workspace_members.member_user_id → auth.users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_workspace_members_member'
  ) THEN
    ALTER TABLE public.workspace_members
      ADD CONSTRAINT fk_workspace_members_member
      FOREIGN KEY (member_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ── 1C3: Trigger anti role-escalation ─────────────────────────────────────
-- Impede que um platform_admin altere seu próprio role para platform_owner
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.user_id = auth.uid()
     AND OLD.role != 'platform_owner'
     AND NEW.role = 'platform_owner'
  THEN
    RAISE EXCEPTION 'Não é permitido auto-promover para platform_owner.';
  END IF;
  RETURN NEW;
END;
$$;

-- Garante que o trigger existe apenas uma vez
DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();
