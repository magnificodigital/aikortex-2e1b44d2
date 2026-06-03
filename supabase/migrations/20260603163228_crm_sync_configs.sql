-- ─────────────────────────────────────────────────────────────────────────
-- CRM Sync — Sprint 2.1 (Outbound Aikortex → HubSpot via Composio)
--
-- Config por agência (1:N — futuro: também Pipedrive, RD Station)
-- Logs de cada operação pra debug/audit
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.crm_sync_configs (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agency_profiles(id) on delete cascade,
  provider text not null,                  -- 'hubspot' | 'pipedrive' | 'rd_station' (futuro)
  enabled boolean not null default false,
  -- HubSpot specific
  hubspot_pipeline_id text,                -- ID do Deal Pipeline padrão pra criar Deals
  -- Mapping Aikortex stage_slug → provider stage ID
  stage_mapping jsonb not null default '{}'::jsonb,
  -- Flags de comportamento
  auto_sync boolean not null default false, -- dispara em todo INSERT/UPDATE
  inbound_enabled boolean not null default false, -- webhook ativo (Sprint 2.3)
  -- Last sync stats
  last_sync_at timestamptz,
  last_sync_error text,
  total_synced int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, provider)
);

create index if not exists idx_crm_sync_configs_agency
  on public.crm_sync_configs (agency_id, enabled);

-- Logs de cada operação de sync (push/pull). Ajuda debug + auditoria.
create table if not exists public.crm_sync_logs (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agency_profiles(id) on delete cascade,
  contact_id uuid references public.crm_contacts(id) on delete set null,
  provider text not null,
  direction text not null check (direction in ('push', 'pull')),
  action text not null,                    -- 'create_contact' | 'update_contact' | 'create_deal' | 'update_deal'
  status text not null check (status in ('success', 'error', 'skipped')),
  external_id text,                        -- ID retornado pelo provider (contact ou deal)
  error_message text,
  request_payload jsonb,
  response_payload jsonb,
  duration_ms int,
  created_at timestamptz not null default now()
);

create index if not exists idx_crm_sync_logs_contact_time
  on public.crm_sync_logs (contact_id, created_at desc);
create index if not exists idx_crm_sync_logs_agency_time
  on public.crm_sync_logs (agency_id, created_at desc);

-- Trigger updated_at
create or replace function public.set_crm_sync_configs_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists crm_sync_configs_updated_at on public.crm_sync_configs;
create trigger crm_sync_configs_updated_at
  before update on public.crm_sync_configs
  for each row execute function public.set_crm_sync_configs_updated_at();

-- RLS
alter table public.crm_sync_configs enable row level security;
alter table public.crm_sync_logs enable row level security;

drop policy if exists "crm_sync_configs_owner" on public.crm_sync_configs;
create policy "crm_sync_configs_owner" on public.crm_sync_configs
  for all to authenticated
  using (agency_id = public.user_agency_id())
  with check (agency_id = public.user_agency_id());

drop policy if exists "crm_sync_logs_owner" on public.crm_sync_logs;
create policy "crm_sync_logs_owner" on public.crm_sync_logs
  for select to authenticated
  using (agency_id = public.user_agency_id());

drop policy if exists "crm_sync_configs_service" on public.crm_sync_configs;
create policy "crm_sync_configs_service" on public.crm_sync_configs
  for all to service_role using (true) with check (true);
drop policy if exists "crm_sync_logs_service" on public.crm_sync_logs;
create policy "crm_sync_logs_service" on public.crm_sync_logs
  for all to service_role using (true) with check (true);

-- Mapping padrão Aikortex → HubSpot dealstage IDs comuns.
-- HubSpot pipelines têm IDs próprios; user precisa configurar os reais via UI.
-- Esses defaults servem como ponto de partida (HubSpot default pipeline).
comment on column public.crm_sync_configs.stage_mapping is
  'JSONB { aikortex_stage_slug: hubspot_stage_id }. Ex: { "new": "appointmentscheduled", "qualified": "qualifiedtobuy", "meeting_scheduled": "presentationscheduled", "won": "closedwon", "lost": "closedlost" }';
