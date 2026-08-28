-- Master GLOBAL por funcionalidade: a função existe (ativa) ou não na plataforma.
-- Independente do tier — quando active=false, some pra todo mundo.
create table if not exists public.platform_module_flags (
  module_key text primary key,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

alter table public.platform_module_flags enable row level security;

drop policy if exists "read flags" on public.platform_module_flags;
create policy "read flags" on public.platform_module_flags
  for select to authenticated using (true);

drop policy if exists "platform manages flags" on public.platform_module_flags;
create policy "platform manages flags" on public.platform_module_flags
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('platform_owner','platform_admin')))
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('platform_owner','platform_admin')));

-- Seed: todos os módulos ativos por padrão.
insert into public.platform_module_flags (module_key, active) values
  ('stark.copilot', true), ('dashboard', true),
  ('aikortex.agentes', true), ('aikortex.mensagens', true), ('aikortex.ligacoes', true), ('aikortex.apps', true),
  ('canais', true), ('conectores', true),
  ('gestao.clientes', true), ('gestao.vendas', true), ('gestao.reunioes', true),
  ('gestao.financeiro', true), ('gestao.equipe', true), ('gestao.tarefas', true)
on conflict (module_key) do nothing;

-- Dashboard entra na matriz por tier também.
insert into public.tier_module_access (tier, module_key, has_access, can_offer_client, sub_features)
select t.tier, 'dashboard', true, true, '{}'::jsonb
from (values ('start'),('hack'),('growth')) as t(tier)
where not exists (
  select 1 from public.tier_module_access x where x.tier = t.tier and x.module_key = 'dashboard'
);
