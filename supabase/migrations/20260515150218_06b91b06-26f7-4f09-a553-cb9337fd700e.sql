-- Security fix: Privilege escalation defense in depth for profiles table
-- Adds WITH CHECK to "Users can update their own profile" policy so UPDATE
-- cannot change role or tenant_type (trigger remains as second layer).

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    -- Block direct escalation via UPDATE:
    AND role = (SELECT role FROM public.profiles WHERE user_id = auth.uid())
    AND COALESCE(tenant_type, '') = COALESCE((SELECT tenant_type FROM public.profiles WHERE user_id = auth.uid()), '')
  );