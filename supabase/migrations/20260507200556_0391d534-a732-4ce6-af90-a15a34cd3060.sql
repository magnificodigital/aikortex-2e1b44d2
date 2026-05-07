
-- Prevent privilege escalation: block users from changing their own role/tenant_type
CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_platform_user(auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Não é permitido alterar o próprio role';
  END IF;
  IF NEW.tenant_type IS DISTINCT FROM OLD.tenant_type THEN
    RAISE EXCEPTION 'Não é permitido alterar o próprio tenant_type';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_self_role_escalation_trg ON public.profiles;
CREATE TRIGGER prevent_self_role_escalation_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_role_escalation();

-- Subscriptions: remove user-facing INSERT (only platform admins / service_role can create)
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.subscriptions;
