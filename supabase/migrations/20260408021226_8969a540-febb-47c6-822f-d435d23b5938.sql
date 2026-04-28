
create table public.tier_module_access (
  id uuid primary key default gen_random_uuid(),
  tier text not null,
  module_key text not null,
  has_access boolean not null default false,
  updated_at timestamptz default now(),
  updated_by uuid,
  unique(tier, module_key)
);

-- Validation trigger for tier values
create or replace function public.validate_tier_module_access_tier()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.tier not in ('bronze','silver','gold','elite') then
    raise exception 'Invalid tier: %', new.tier;
  end if;
  return new;
end;
$$;

create trigger trg_validate_tier_module_access_tier
before insert or update on public.tier_module_access
for each row execute function public.validate_tier_module_access_tier();

-- Updated_at trigger
create trigger update_tier_module_access_updated_at
before update on public.tier_module_access
for each row execute function public.update_updated_at_column();

alter table public.tier_module_access enable row level security;

-- Anyone authenticated can read (needed for gate checks)
create policy "Authenticated users can read tier access"
on public.tier_module_access
for select
to authenticated
using (true);

-- Platform admins can manage
create policy "Platform admins can insert tier access"
on public.tier_module_access
for insert
to authenticated
with check (public.is_platform_user(auth.uid()));

create policy "Platform admins can update tier access"
on public.tier_module_access
for update
to authenticated
using (public.is_platform_user(auth.uid()));

create policy "Platform admins can delete tier access"
on public.tier_module_access
for delete
to authenticated
using (public.is_platform_user(auth.uid()));

-- Seed data
insert into public.tier_module_access (tier, module_key, has_access) values
('bronze','aikortex.agentes', true),
('bronze','aikortex.flows', false),
('bronze','aikortex.apps', false),
('bronze','aikortex.templates', true),
('bronze','aikortex.mensagens', true),
('bronze','aikortex.disparos', false),
('bronze','gestao.clientes', true),
('bronze','gestao.contratos', false),
('bronze','gestao.vendas', true),
('bronze','gestao.crm', false),
('bronze','gestao.reunioes', false),
('bronze','gestao.financeiro', false),
('bronze','gestao.equipe', true),
('bronze','gestao.tarefas', true),
('silver','aikortex.agentes', true),
('silver','aikortex.flows', true),
('silver','aikortex.apps', false),
('silver','aikortex.templates', true),
('silver','aikortex.mensagens', true),
('silver','aikortex.disparos', true),
('silver','gestao.clientes', true),
('silver','gestao.contratos', true),
('silver','gestao.vendas', true),
('silver','gestao.crm', true),
('silver','gestao.reunioes', false),
('silver','gestao.financeiro', true),
('silver','gestao.equipe', true),
('silver','gestao.tarefas', true),
('gold','aikortex.agentes', true),
('gold','aikortex.flows', true),
('gold','aikortex.apps', true),
('gold','aikortex.templates', true),
('gold','aikortex.mensagens', true),
('gold','aikortex.disparos', true),
('gold','gestao.clientes', true),
('gold','gestao.contratos', true),
('gold','gestao.vendas', true),
('gold','gestao.crm', true),
('gold','gestao.reunioes', true),
('gold','gestao.financeiro', true),
('gold','gestao.equipe', true),
('gold','gestao.tarefas', true),
('elite','aikortex.agentes', true),
('elite','aikortex.flows', true),
('elite','aikortex.apps', true),
('elite','aikortex.templates', true),
('elite','aikortex.mensagens', true),
('elite','aikortex.disparos', true),
('elite','gestao.clientes', true),
('elite','gestao.contratos', true),
('elite','gestao.vendas', true),
('elite','gestao.crm', true),
('elite','gestao.reunioes', true),
('elite','gestao.financeiro', true),
('elite','gestao.equipe', true),
('elite','gestao.tarefas', true);
