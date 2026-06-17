-- Remapeia agency_clients.enabled_modules pra alinhar com os items da sidebar.
--
-- Antes (F1 inicial): 4 slugs abstratos
--   workspace.dashboard / workspace.messages / workspace.crm / workspace.settings
--
-- Agora: 10 slugs que batem 1:1 com os items dos grupos Aikortex + Gestão
-- da sidebar da agência. A agência liga/desliga cada um no Add/Edit Cliente,
-- e tanto o switcher modo cliente quanto o /workspace/* do cliente final
-- filtram a sidebar pelos mesmos slugs.
--
-- Default pra rows existentes: tudo liberado (mantém comportamento atual).

update public.agency_clients
   set enabled_modules = '{aikortex.agentes,aikortex.crm,aikortex.ligacoes,aikortex.apps,aikortex.mensagens,gestao.clientes,gestao.vendas,gestao.financeiro,gestao.equipe,gestao.tarefas}'
 where enabled_modules && '{workspace.dashboard,workspace.messages,workspace.crm,workspace.settings}'::text[]
    or enabled_modules = '{}';

notify pgrst, 'reload schema';
