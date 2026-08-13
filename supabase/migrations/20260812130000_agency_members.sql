-- Equipe da Agência: usuários que PERTENCEM a uma agência sem serem o dono.
-- Corrige o bug de "criar usuário na agência" que criava uma AGÊNCIA NOVA
-- (antes, associar um usuário a uma agência só era possível via agency_profiles.user_id).
create table if not exists public.agency_members (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agency_profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'agency_member',
  created_at timestamptz not null default now(),
  unique (agency_id, user_id)
);
create index if not exists idx_agency_members_agency on public.agency_members(agency_id);
create index if not exists idx_agency_members_user on public.agency_members(user_id);

alter table public.agency_members enable row level security;

-- Dono da agência OU admin da plataforma gerenciam os membros.
drop policy if exists "Agency owner/platform manages members" on public.agency_members;
create policy "Agency owner/platform manages members" on public.agency_members
  for all to authenticated
  using (
    exists (select 1 from public.agency_profiles ap where ap.id = agency_members.agency_id and ap.user_id = auth.uid())
    or exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('platform_owner','platform_admin'))
  )
  with check (
    exists (select 1 from public.agency_profiles ap where ap.id = agency_members.agency_id and ap.user_id = auth.uid())
    or exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('platform_owner','platform_admin'))
  );

-- Membro pode ver a própria associação.
drop policy if exists "Member sees own membership" on public.agency_members;
create policy "Member sees own membership" on public.agency_members
  for select to authenticated using (user_id = auth.uid());

-- service_role (edge functions) acesso total.
drop policy if exists "Service role manages agency_members" on public.agency_members;
create policy "Service role manages agency_members" on public.agency_members
  for all to service_role using (true) with check (true);
