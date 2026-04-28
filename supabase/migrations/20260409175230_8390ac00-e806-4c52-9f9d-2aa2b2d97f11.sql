-- Tabela de uso mensal por usuário
create table if not exists monthly_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  year_month text not null,
  message_count integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, year_month)
);

alter table monthly_usage enable row level security;

create policy "Users view own usage" on monthly_usage 
  for select using (auth.uid() = user_id);

create policy "Service role full access on monthly_usage" on monthly_usage
  for all to service_role using (true) with check (true);

create policy "Platform admins manage all usage" on monthly_usage 
  for all to authenticated using (
    is_platform_user(auth.uid())
  ) with check (
    is_platform_user(auth.uid())
  );

-- Limites por slug de plano
create table if not exists plan_message_limits (
  plan_slug text primary key,
  monthly_limit integer not null default 500
);

alter table plan_message_limits enable row level security;

create policy "Anyone can read plan limits" on plan_message_limits
  for select using (true);

create policy "Platform admins manage limits" on plan_message_limits
  for all to authenticated using (is_platform_user(auth.uid()))
  with check (is_platform_user(auth.uid()));

insert into plan_message_limits (plan_slug, monthly_limit) values
('starter', 500),
('pro', 2000),
('elite', -1)
on conflict (plan_slug) do update set monthly_limit = excluded.monthly_limit;

-- RPC para incremento atômico
create or replace function increment_monthly_usage(p_user_id uuid, p_year_month text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into monthly_usage (user_id, year_month, message_count)
  values (p_user_id, p_year_month, 1)
  on conflict (user_id, year_month) 
  do update set 
    message_count = monthly_usage.message_count + 1,
    updated_at = now();
end;
$$;

-- Remove trigger de wallet automática (se existir)
drop trigger if exists on_user_created_wallet on profiles;