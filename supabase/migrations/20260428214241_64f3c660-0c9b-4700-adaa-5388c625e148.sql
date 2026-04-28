-- Seed de desenvolvimento: libera todos os módulos para todos os tiers.
-- Em produção, ajustar conforme master v6 (Starter básico / Explorer intermediário / Hack tudo).

INSERT INTO public.tier_module_access (tier, module_key, has_access)
SELECT t.tier, m.module_key, true
FROM (VALUES ('starter'), ('explorer'), ('hack')) AS t(tier)
CROSS JOIN (VALUES
  ('aikortex.agentes'),
  ('aikortex.flows'),
  ('aikortex.apps'),
  ('aikortex.templates'),
  ('aikortex.mensagens'),
  ('aikortex.disparos'),
  ('gestao.clientes'),
  ('gestao.contratos'),
  ('gestao.vendas'),
  ('gestao.crm'),
  ('gestao.reunioes'),
  ('gestao.financeiro'),
  ('gestao.equipe'),
  ('gestao.tarefas')
) AS m(module_key)
ON CONFLICT (tier, module_key) DO UPDATE SET has_access = EXCLUDED.has_access;