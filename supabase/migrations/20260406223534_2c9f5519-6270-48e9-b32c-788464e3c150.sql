
-- Add role column with validation trigger instead of CHECK constraint
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'agency_owner';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tenant_type text NOT NULL DEFAULT 'agency';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Create validation trigger for role
CREATE OR REPLACE FUNCTION public.validate_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  IF NEW.role NOT IN ('platform_owner','platform_admin','agency_owner','agency_admin','agency_manager','agency_member','client_owner','client_viewer') THEN
    RAISE EXCEPTION 'Invalid role: %', NEW.role;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER validate_profile_role_trigger
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.validate_profile_role();

-- Create validation trigger for tenant_type
CREATE OR REPLACE FUNCTION public.validate_profile_tenant_type()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  IF NEW.tenant_type NOT IN ('platform','agency','client') THEN
    RAISE EXCEPTION 'Invalid tenant_type: %', NEW.tenant_type;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER validate_profile_tenant_type_trigger
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.validate_profile_tenant_type();

-- Update handle_new_user function to include new columns
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, avatar_url, role, tenant_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'role', 'agency_owner'),
    COALESCE(NEW.raw_user_meta_data->>'tenant_type', 'agency')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;
