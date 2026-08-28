-- O cliente precisa ler o PRÓPRIO registro em agency_clients pra o /workspace
-- carregar enabled_modules (os módulos que a agência liberou) e o nome.
-- Sem essa policy permissiva, o cliente lê NULL → workspace vem vazio.
-- Junto com a policy RESTRICTIVE de isolamento, ele lê só a si (não os outros).
alter table public.agency_clients enable row level security;

drop policy if exists "client_reads_own_agency_client" on public.agency_clients;
create policy "client_reads_own_agency_client" on public.agency_clients
  for select to authenticated
  using (client_user_id = auth.uid());
