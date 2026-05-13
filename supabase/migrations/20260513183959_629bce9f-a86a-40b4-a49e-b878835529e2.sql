DELETE FROM public.user_agents
WHERE name = 'Carregando...'
  AND published_version_id IS NULL
  AND status = 'configuring'
  AND created_at < now() - interval '5 minutes';