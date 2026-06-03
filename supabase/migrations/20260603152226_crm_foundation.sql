-- ─────────────────────────────────────────────────────────────────────────
-- CRM Foundation — Sprint 1 do Conversation CRM
--
-- Camada unificada de contatos (leads/clientes/tickets) em cima das tabelas
-- per-agent que já existem (client_table_rows). Cada contato pode ter
-- vários eventos (interactions) — chamada do agente, mensagem, agendamento,
-- mudança de stage. Pipeline configurável por agência.
--
-- Sprint 2 (sync HubSpot/Pipedrive) reutiliza external_ids JSONB.
-- Sprint 3 (sync genérico via Composio) idem.
-- ─────────────────────────────────────────────────────────────────────────

-- Stages do pipeline (configurável por agência). Defaults criados via seed
-- na primeira leitura. Estilo Kanban — `order_index` define posição da coluna.
create table if not exists public.crm_pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agency_profiles(id) on delete cascade,
  name text not null,
  slug text not null,
  order_index int not null default 0,
  color text default '#94a3b8',
  is_won boolean not null default false,
  is_lost boolean not null default false,
  created_at timestamptz not null default now(),
  unique (agency_id, slug)
);

create index if not exists idx_crm_pipeline_stages_agency
  on public.crm_pipeline_stages (agency_id, order_index);

-- Contatos unificados — leads, clientes, prospects. Um contato pode aparecer
-- em várias `client_tables` (ex: foi lead, virou cliente) — `client_table_row_id`
-- mantém link de volta pra row original que o agente criou.
create table if not exists public.crm_contacts (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agency_profiles(id) on delete cascade,
  client_id uuid references public.agency_clients(id) on delete set null,

  -- Identidade
  name text,
  email text,
  phone text,
  company text,
  role text,

  -- Estado CRM
  stage_slug text not null default 'new',
  temperature text check (temperature in ('hot','warm','cold')),

  -- Qualificação (BANT-ish — campos genéricos que servem pra qualquer arquétipo)
  budget text,
  authority text,
  need text,
  timeline text,
  notes text,

  -- Origem e contexto
  primary_agent_id uuid references public.user_agents(id) on delete set null,
  source_channel text,
  client_table_row_id uuid references public.client_table_rows(id) on delete set null,

  -- Extensibilidade (Sprint 2/3: sync com CRMs externos)
  external_ids jsonb not null default '{}'::jsonb,
  custom_fields jsonb not null default '{}'::jsonb,

  -- Timing
  last_interaction_at timestamptz,
  next_action_at timestamptz,
  next_action_text text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_crm_contacts_agency_stage
  on public.crm_contacts (agency_id, stage_slug, updated_at desc);
create index if not exists idx_crm_contacts_agency_agent
  on public.crm_contacts (agency_id, primary_agent_id);
create index if not exists idx_crm_contacts_email
  on public.crm_contacts (agency_id, email) where email is not null;

-- Trigger pra updated_at automático
create or replace function public.set_crm_contacts_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger crm_contacts_updated_at
  before update on public.crm_contacts
  for each row execute function public.set_crm_contacts_updated_at();

-- Interactions — timeline de tudo que aconteceu com o contato
create table if not exists public.crm_interactions (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.crm_contacts(id) on delete cascade,
  agency_id uuid not null references public.agency_profiles(id) on delete cascade,
  agent_id uuid references public.user_agents(id) on delete set null,
  -- Tipo: message_in | message_out | tool_called | stage_changed | note |
  -- email_sent | calendar_created | call_made
  type text not null,
  channel text,
  -- Texto principal (mensagem, nota, descrição da ação)
  content text,
  -- Detalhes estruturados (tool args, mudança de stage from→to, etc.)
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_crm_interactions_contact_time
  on public.crm_interactions (contact_id, created_at desc);
create index if not exists idx_crm_interactions_agency_time
  on public.crm_interactions (agency_id, created_at desc);

-- ── RLS ────────────────────────────────────────────────────────────────
alter table public.crm_pipeline_stages enable row level security;
alter table public.crm_contacts enable row level security;
alter table public.crm_interactions enable row level security;

-- Helper: agency_id do user logado
create or replace function public.user_agency_id()
returns uuid
language sql stable as $$
  select id from public.agency_profiles where user_id = auth.uid() limit 1
$$;

create policy "crm_pipeline_stages_owner"
  on public.crm_pipeline_stages for all
  to authenticated
  using (agency_id = public.user_agency_id())
  with check (agency_id = public.user_agency_id());

create policy "crm_contacts_owner"
  on public.crm_contacts for all
  to authenticated
  using (agency_id = public.user_agency_id())
  with check (agency_id = public.user_agency_id());

create policy "crm_interactions_owner"
  on public.crm_interactions for all
  to authenticated
  using (agency_id = public.user_agency_id())
  with check (agency_id = public.user_agency_id());

-- service_role tem full access pra runtime (auto-popular via tool-table-write)
create policy "crm_contacts_service" on public.crm_contacts
  for all to service_role using (true) with check (true);
create policy "crm_interactions_service" on public.crm_interactions
  for all to service_role using (true) with check (true);
create policy "crm_pipeline_stages_service" on public.crm_pipeline_stages
  for all to service_role using (true) with check (true);

-- ── Seed: default stages pra novas agências ────────────────────────────
-- Função que cria os 5 stages padrão SDR-style pra uma agência
create or replace function public.seed_default_crm_stages(p_agency_id uuid)
returns void language plpgsql as $$
begin
  insert into public.crm_pipeline_stages (agency_id, name, slug, order_index, color, is_won, is_lost)
  values
    (p_agency_id, 'Novo',          'new',                0, '#94a3b8', false, false),
    (p_agency_id, 'Contatado',     'contacted',          1, '#60a5fa', false, false),
    (p_agency_id, 'Qualificado',   'qualified',          2, '#a78bfa', false, false),
    (p_agency_id, 'Reunião agendada', 'meeting_scheduled', 3, '#fbbf24', false, false),
    (p_agency_id, 'Ganhou',        'won',                4, '#34d399', true,  false),
    (p_agency_id, 'Perdeu',        'lost',               5, '#f87171', false, true)
  on conflict (agency_id, slug) do nothing;
end;
$$;
