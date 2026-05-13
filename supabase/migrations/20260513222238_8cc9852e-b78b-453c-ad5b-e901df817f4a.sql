DELETE FROM public.agent_knowledge_bases
WHERE name LIKE 'Test KB %'
  AND agent_id IN (
    SELECT id FROM public.user_agents
    WHERE user_id = (SELECT id FROM auth.users WHERE email = 'willy@aikortex.com')
  );