
CREATE POLICY "Platform admins can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (public.is_platform_user(auth.uid()));
