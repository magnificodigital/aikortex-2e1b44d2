ALTER TABLE public.available_llms
  ADD COLUMN IF NOT EXISTS tool_calling_reliable boolean NOT NULL DEFAULT false;

UPDATE public.available_llms
SET tool_calling_reliable = true
WHERE model_id IN (
  'openai/gpt-4o-mini',
  'openai/gpt-4o',
  'anthropic/claude-3-5-sonnet',
  'anthropic/claude-sonnet-4.6',
  'anthropic/claude-haiku-4.5',
  'google/gemini-2.5-flash',
  'google/gemini-2.5-pro'
);

INSERT INTO public.available_llms (provider, model_id, display_name, tier, priority, supports_tools, tool_calling_reliable, status, notes)
VALUES
  ('openai', 'openai/gpt-4o-mini', 'GPT-4o Mini', 'paid', 100, true, true, 'unknown', 'Paid fallback for tool calling. ~$0.15/1M input tokens'),
  ('anthropic', 'anthropic/claude-haiku-4.5', 'Claude Haiku 4.5', 'paid', 110, true, true, 'unknown', 'Paid fallback. Excellent function calling.')
ON CONFLICT (model_id) DO UPDATE SET
  tool_calling_reliable = true,
  supports_tools = true,
  active = true;