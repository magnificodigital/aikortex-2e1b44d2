-- "Lançar todos": pra cada tabela de módulo que TEM client_id, deixa o cliente
-- ler/gerenciar só os PRÓPRIOS registros (client_id = o cliente dele).
-- Guardado por existência da tabela E da coluna → nunca quebra nem vaza.
do $$
declare t text;
begin
  foreach t in array array['call_logs','user_apps','invoices','tasks','messages','app_projects','user_apps_messages'] loop
    if to_regclass('public.'||t) is not null
       and exists (
         select 1 from information_schema.columns
         where table_schema = 'public' and table_name = t and column_name = 'client_id'
       ) then
      execute format('alter table public.%I enable row level security', t);
      execute format('drop policy if exists "client_rw_own" on public.%I', t);
      execute format(
        'create policy "client_rw_own" on public.%I for all to authenticated '
        || 'using (exists (select 1 from public.agency_clients ac where ac.id::text = %I.client_id::text and ac.client_user_id = auth.uid())) '
        || 'with check (exists (select 1 from public.agency_clients ac where ac.id::text = %I.client_id::text and ac.client_user_id = auth.uid()))',
        t, t, t
      );
    end if;
  end loop;
end $$;
