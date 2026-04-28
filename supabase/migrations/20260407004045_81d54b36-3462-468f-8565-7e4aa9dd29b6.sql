
-- Platform admins can view all partner tiers
CREATE POLICY "Platform admins can view all partner_tiers"
ON public.partner_tiers
FOR SELECT
TO authenticated
USING (public.is_platform_user(auth.uid()));

-- Platform admins can update all partner tiers
CREATE POLICY "Platform admins can update all partner_tiers"
ON public.partner_tiers
FOR UPDATE
TO authenticated
USING (public.is_platform_user(auth.uid()));

-- Platform admins can insert partner tiers
CREATE POLICY "Platform admins can insert partner_tiers"
ON public.partner_tiers
FOR INSERT
TO authenticated
WITH CHECK (public.is_platform_user(auth.uid()));

-- Platform admins can delete partner tiers
CREATE POLICY "Platform admins can delete partner_tiers"
ON public.partner_tiers
FOR DELETE
TO authenticated
USING (public.is_platform_user(auth.uid()));
