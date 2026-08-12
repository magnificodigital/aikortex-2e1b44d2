INSERT INTO public.profiles (user_id, full_name, role, tenant_type, is_active)
VALUES ('aad94909-2857-4dd2-86f7-e0d1b6398df4', 'Willy', 'platform_owner', 'platform', true)
ON CONFLICT DO NOTHING;