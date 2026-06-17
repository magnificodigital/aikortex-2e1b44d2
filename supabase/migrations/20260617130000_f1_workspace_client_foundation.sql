-- F1 — Fundação do workspace do cliente.
--
-- Permite que o cliente logado (tenant_type='client') leia os dados
-- vinculados a ele: agentes que a agência criou pra ele, conversas
-- desses agentes, contatos do CRM atribuídos a ele.
--
-- Também adiciona enabled_modules em agency_clients pra agência escolher
-- quais áreas do workspace o cliente vê na sidebar.
--
-- Idempotente (CREATE OR REPLACE, IF NOT EXISTS, DROP POLICY IF EXISTS).

-- ── 1. enabled_modules em agency_clients ───────────────────────────────────
-- Lista de slugs tipo {'workspace.messages', 'workspace.crm', 'workspace.settings'}.
-- Default {} = nada liberado. Agência define no wizard / edit.
alter table public.agency_clients
  add column if not exists enabled_modules text[] not null default '{}';

-- ── 2. Helper: pega client_id do user logado se ele é tenant=client ────────
create or replace function public.current_client_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.agency_clients
  where client_user_id = auth.uid()
  limit 1;
$$;

-- ── 3. RLS: cliente lê dados dele ──────────────────────────────────────────

-- agency_clients: cliente lê o próprio registro (pra saber enabled_modules)
drop policy if exists "client_view_own_record" on public.agency_clients;
create policy "client_view_own_record"
  on public.agency_clients for select to authenticated
  using (client_user_id = auth.uid());

-- crm_contacts: cliente vê contatos atribuídos a ele
drop policy if exists "client_view_own_crm_contacts" on public.crm_contacts;
create policy "client_view_own_crm_contacts"
  on public.crm_contacts for select to authenticated
  using (client_id = public.current_client_id());

-- crm_interactions: via crm_contacts do cliente
drop policy if exists "client_view_own_crm_interactions" on public.crm_interactions;
create policy "client_view_own_crm_interactions"
  on public.crm_interactions for select to authenticated
  using (contact_id in (
    select id from public.crm_contacts
    where client_id = public.current_client_id()
  ));

-- crm_pipeline_stages: cliente vê stages da agência dele (read-only)
drop policy if exists "client_view_agency_pipeline_stages" on public.crm_pipeline_stages;
create policy "client_view_agency_pipeline_stages"
  on public.crm_pipeline_stages for select to authenticated
  using (agency_id in (
    select agency_id from public.agency_clients
    where client_user_id = auth.uid()
  ));

-- conversations: cliente vê conversas dele
drop policy if exists "client_view_own_conversations" on public.conversations;
create policy "client_view_own_conversations"
  on public.conversations for select to authenticated
  using (client_id = public.current_client_id());

-- messages: cliente vê mensagens das próprias conversations
drop policy if exists "client_view_own_messages" on public.messages;
create policy "client_view_own_messages"
  on public.messages for select to authenticated
  using (conversation_id in (
    select id from public.conversations
    where client_id = public.current_client_id()
  ));

-- user_agents: cliente vê agentes que a agência criou pra ele
-- (user_agents.client_id refere agency_clients.id quando o agente é "do cliente")
drop policy if exists "client_view_own_agents" on public.user_agents;
create policy "client_view_own_agents"
  on public.user_agents for select to authenticated
  using (client_id = public.current_client_id());

-- ── 4. Schema cache reload ─────────────────────────────────────────────────
notify pgrst, 'reload schema';
