-- 1. Backfill: criar profile para todos os users em auth.users que ainda não têm.
INSERT INTO public.profiles (user_id, full_name, role, tenant_type, is_active)
SELECT
  au.id,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email),
  COALESCE(au.raw_user_meta_data->>'role', 'agency_owner'),
  COALESCE(au.raw_user_meta_data->>'tenant_type', 'agency'),
  true
FROM auth.users au
LEFT JOIN public.profiles p ON p.user_id = au.id
WHERE p.user_id IS NULL;

-- 2. Recriar trigger garantidamente, caso esteja desabilitado ou fora de sincronia.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, avatar_url, role, tenant_type, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'role', 'agency_owner'),
    COALESCE(NEW.raw_user_meta_data->>'tenant_type', 'agency'),
    true
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();