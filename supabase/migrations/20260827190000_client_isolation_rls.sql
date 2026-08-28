-- ISOLAMENTO MULTI-TENANT (back): o CLIENTE nunca lê dados de AGÊNCIA/plataforma.
-- Usa policies RESTRICTIVE — combinam com AND às policies permissivas existentes,
-- então NÃO removem nada; só adicionam uma trava a mais pra contas de cliente.
-- (service_role/edge functions ignoram RLS; agências e plataforma não são afetadas.)

-- Helper: o chamador é uma conta de cliente?
create or replace function public.is_client()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.tenant_type = 'client'
  );
$$;

-- Tabelas 100% de agência/plataforma — cliente não lê nenhuma linha.
do $$
declare t text;
begin
  foreach t in array array[
    'agency_profiles','partner_tiers','billing_events','subscriptions',
    'agency_members','agency_secrets'
  ] loop
    if to_regclass('public.'||t) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('drop policy if exists "block_client_read" on public.%I', t);
      execute format(
        'create policy "block_client_read" on public.%I as restrictive for select to authenticated using (not public.is_client())',
        t
      );
    end if;
  end loop;
end $$;

-- agency_clients: o cliente só enxerga a PRÓPRIA linha (não os outros clientes da agência).
do $$
begin
  if to_regclass('public.agency_clients') is not null then
    drop policy if exists "client_own_row_only" on public.agency_clients;
    create policy "client_own_row_only" on public.agency_clients as restrictive for select to authenticated
      using (not public.is_client() or client_user_id = auth.uid());
  end if;
end $$;
