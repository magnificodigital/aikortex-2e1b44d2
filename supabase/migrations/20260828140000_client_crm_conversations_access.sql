-- Cliente logado usa o mesmo app (CRM/Mensagens) escopado à conta dele.
-- Precisa ler/escrever os PRÓPRIOS contatos e ler as PRÓPRIAS conversas.
-- (o "próprio" = agency_clients.client_user_id = auth.uid()).

-- CRM: cliente gerencia os contatos do próprio client_id.
do $$
begin
  if to_regclass('public.crm_contacts') is not null then
    alter table public.crm_contacts enable row level security;
    drop policy if exists "client_rw_own_crm" on public.crm_contacts;
    create policy "client_rw_own_crm" on public.crm_contacts
      for all to authenticated
      using (exists (
        select 1 from public.agency_clients ac
        where ac.id = crm_contacts.client_id and ac.client_user_id = auth.uid()
      ))
      with check (exists (
        select 1 from public.agency_clients ac
        where ac.id = crm_contacts.client_id and ac.client_user_id = auth.uid()
      ));
  end if;
end $$;

-- Mensagens: cliente lê as conversas do próprio client_id.
do $$
begin
  if to_regclass('public.conversations') is not null then
    alter table public.conversations enable row level security;
    drop policy if exists "client_reads_own_conversations" on public.conversations;
    create policy "client_reads_own_conversations" on public.conversations
      for select to authenticated
      using (exists (
        select 1 from public.agency_clients ac
        where ac.id = conversations.client_id and ac.client_user_id = auth.uid()
      ));
  end if;
end $$;
