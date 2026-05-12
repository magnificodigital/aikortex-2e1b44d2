-- ── Sprint 2.4-a: agent_tools + monthly usage ────────────────────────────

create table if not exists public.agent_tools (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.user_agents(id) on delete cascade,
  tool_key text not null,
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agent_id, tool_key)
);

create index if not exists idx_agent_tools_agent on public.agent_tools(agent_id);

alter table public.agent_tools enable row level security;

drop policy if exists "Owners read agent_tools" on public.agent_tools;
create policy "Owners read agent_tools"
  on public.agent_tools for select
  using (exists (select 1 from public.user_agents ua where ua.id = agent_tools.agent_id and ua.user_id = auth.uid()));

drop policy if exists "Owners insert agent_tools" on public.agent_tools;
create policy "Owners insert agent_tools"
  on public.agent_tools for insert
  with check (exists (select 1 from public.user_agents ua where ua.id = agent_tools.agent_id and ua.user_id = auth.uid()));

drop policy if exists "Owners update agent_tools" on public.agent_tools;
create policy "Owners update agent_tools"
  on public.agent_tools for update
  using (exists (select 1 from public.user_agents ua where ua.id = agent_tools.agent_id and ua.user_id = auth.uid()));

drop policy if exists "Owners delete agent_tools" on public.agent_tools;
create policy "Owners delete agent_tools"
  on public.agent_tools for delete
  using (exists (select 1 from public.user_agents ua where ua.id = agent_tools.agent_id and ua.user_id = auth.uid()));

drop trigger if exists agent_tools_set_updated_at on public.agent_tools;
create trigger agent_tools_set_updated_at
  before update on public.agent_tools
  for each row execute function public.update_updated_at_column();

-- ── monthly usage per agency × tool ──────────────────────────────────────
create table if not exists public.agent_tool_usage_monthly (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  year_month text not null,
  tool_key text not null,
  call_count integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (agency_id, year_month, tool_key)
);

create index if not exists idx_agent_tool_usage_agency_ym
  on public.agent_tool_usage_monthly(agency_id, year_month);

alter table public.agent_tool_usage_monthly enable row level security;

-- Reads via RPC only (or platform admins); no direct client writes.
drop policy if exists "Platform admins read tool_usage" on public.agent_tool_usage_monthly;
create policy "Platform admins read tool_usage"
  on public.agent_tool_usage_monthly for select
  using (public.is_platform_user(auth.uid()));

-- RPC: increment usage (called from edge functions with service_role)
create or replace function public.increment_agency_tool_usage(
  p_agency_id uuid,
  p_year_month text,
  p_tool_key text
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_count integer;
begin
  insert into public.agent_tool_usage_monthly (agency_id, year_month, tool_key, call_count)
  values (p_agency_id, p_year_month, p_tool_key, 1)
  on conflict (agency_id, year_month, tool_key)
  do update set
    call_count = agent_tool_usage_monthly.call_count + 1,
    updated_at = now()
  returning call_count into v_count;
  return v_count;
end;
$$;

-- RPC: read current usage for an agency (used by UI)
create or replace function public.get_agency_tool_usage(
  p_agency_id uuid,
  p_year_month text
) returns table (tool_key text, call_count integer)
language sql
stable
security definer
set search_path = public
as $$
  select tool_key, call_count
  from public.agent_tool_usage_monthly
  where agency_id = p_agency_id and year_month = p_year_month
$$;