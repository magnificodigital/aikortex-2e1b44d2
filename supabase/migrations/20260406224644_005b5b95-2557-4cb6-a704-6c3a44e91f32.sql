
-- Recreate the trigger on auth.users for new user profile creation
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create a security definer function to check platform role without recursion
CREATE OR REPLACE FUNCTION public.is_platform_user(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = check_user_id
    AND role IN ('platform_owner', 'platform_admin')
  );
$$;

-- Allow platform admins to view all profiles
CREATE POLICY "Platform admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_platform_user(auth.uid()));

-- Allow platform admins to update all profiles  
CREATE POLICY "Platform admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_platform_user(auth.uid()));

-- Backfill: create profiles for any existing auth users that don't have one
INSERT INTO public.profiles (user_id, full_name, role, tenant_type, is_active)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email),
  COALESCE(u.raw_user_meta_data->>'role', 'agency_owner'),
  COALESCE(u.raw_user_meta_data->>'tenant_type', 'agency'),
  true
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = u.id);
