
CREATE TABLE public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_owner_id uuid NOT NULL,
  member_user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'agency_member',
  department text,
  job_title text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_owner_id, member_user_id)
);

-- Validation triggers instead of CHECK constraints
CREATE OR REPLACE FUNCTION public.validate_workspace_member_role()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $function$
BEGIN
  IF NEW.role NOT IN ('agency_admin','agency_manager','agency_member') THEN
    RAISE EXCEPTION 'Invalid workspace member role: %', NEW.role;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER validate_workspace_member_role_trigger
BEFORE INSERT OR UPDATE ON public.workspace_members
FOR EACH ROW EXECUTE FUNCTION public.validate_workspace_member_role();

CREATE OR REPLACE FUNCTION public.validate_workspace_member_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $function$
BEGIN
  IF NEW.status NOT IN ('active','invited','suspended') THEN
    RAISE EXCEPTION 'Invalid workspace member status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER validate_workspace_member_status_trigger
BEFORE INSERT OR UPDATE ON public.workspace_members
FOR EACH ROW EXECUTE FUNCTION public.validate_workspace_member_status();

-- Updated at trigger
CREATE TRIGGER update_workspace_members_updated_at
BEFORE UPDATE ON public.workspace_members
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace owner manages members" ON public.workspace_members
  FOR ALL USING (auth.uid() = workspace_owner_id)
  WITH CHECK (auth.uid() = workspace_owner_id);

CREATE POLICY "Members view own record" ON public.workspace_members
  FOR SELECT USING (auth.uid() = member_user_id);
