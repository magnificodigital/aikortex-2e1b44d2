-- Usuários do CLIENTE: um cliente (agency_clients) pode ter VÁRIOS usuários,
-- além do dono (agency_clients.client_user_id). Espelha public.agency_members.
create table if not exists public.client_members (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.agency_clients(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'client_viewer',
  created_at timestamptz not null default now(),
  unique (client_id, user_id)
);
create index if not exists idx_client_members_client on public.client_members(client_id);
create index if not exists idx_client_members_user on public.client_members(user_id);

alter table public.client_members enable row level security;

-- A agência dona do cliente OU admin da plataforma gerenciam os membros do cliente.
drop policy if exists "Agency/platform manages client members" on public.client_members;
create policy "Agency/platform manages client members" on public.client_members
  for all to authenticated
  using (
    exists (
      select 1 from public.agency_clients ac
      join public.agency_profiles ap on ap.id = ac.agency_id
      where ac.id = client_members.client_id and ap.user_id = auth.uid()
    )
    or exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('platform_owner','platform_admin'))
  )
  with check (
    exists (
      select 1 from public.agency_clients ac
      join public.agency_profiles ap on ap.id = ac.agency_id
      where ac.id = client_members.client_id and ap.user_id = auth.uid()
    )
    or exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('platform_owner','platform_admin'))
  );

-- Membro vê a própria associação.
drop policy if exists "Client member sees own" on public.client_members;
create policy "Client member sees own" on public.client_members
  for select to authenticated using (user_id = auth.uid());

-- service_role (edge functions) acesso total.
drop policy if exists "Service role manages client_members" on public.client_members;
create policy "Service role manages client_members" on public.client_members
  for all to service_role using (true) with check (true);
