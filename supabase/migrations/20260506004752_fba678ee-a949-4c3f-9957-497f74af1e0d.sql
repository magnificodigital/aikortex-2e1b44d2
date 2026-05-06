UPDATE public.profiles
SET role = 'platform_owner', tenant_type = 'platform', is_active = true, updated_at = now()
WHERE user_id = 'aad94909-2857-4dd2-86f7-e0d1b6398df4';