
-- Platform admins can manage all subscriptions
CREATE POLICY "Platform admins can view all subscriptions"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (public.is_platform_user(auth.uid()));

CREATE POLICY "Platform admins can insert subscriptions"
ON public.subscriptions
FOR INSERT
TO authenticated
WITH CHECK (public.is_platform_user(auth.uid()));

CREATE POLICY "Platform admins can update all subscriptions"
ON public.subscriptions
FOR UPDATE
TO authenticated
USING (public.is_platform_user(auth.uid()));

CREATE POLICY "Platform admins can delete subscriptions"
ON public.subscriptions
FOR DELETE
TO authenticated
USING (public.is_platform_user(auth.uid()));
