UPDATE public.user_agents
SET config = jsonb_set(
  COALESCE(config, '{}'::jsonb),
  '{capabilities}',
  '{
    "planning": { "enabled": false, "max_steps": 10 },
    "reasoning": { "enabled": false, "depth": "medium" },
    "code_runtime": { "enabled": false },
    "memory": { "enabled": false, "scope": "agent" },
    "auto_integration": { "enabled": false }
  }'::jsonb,
  true
)
WHERE config IS NULL OR NOT (config ? 'capabilities');