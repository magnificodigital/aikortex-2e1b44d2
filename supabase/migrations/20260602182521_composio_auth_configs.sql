-- Cache de auth_config_id por toolkit do Composio.
-- Cada toolkit (googlecalendar, gmail, hubspot, etc.) tem 1 auth_config global
-- criado on-demand na primeira conexão. Reutilizado por todos os users.

create table if not exists public.composio_auth_configs (
  toolkit_slug text primary key,
  auth_config_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.composio_auth_configs enable row level security;

-- Apenas service_role lê/escreve. Frontend nunca acessa direto.
create policy "composio_auth_configs_service_role"
  on public.composio_auth_configs
  for all
  to service_role
  using (true)
  with check (true);
