-- Cliente lê os agentes vinculados à conta dele (direto por client_id OU via
-- assinatura de template client_subscription_id), pra o módulo Agentes funcionar
-- escopado no app do cliente.
do $$
begin
  if to_regclass('public.user_agents') is not null then
    alter table public.user_agents enable row level security;
    drop policy if exists "client_reads_own_agents" on public.user_agents;
    create policy "client_reads_own_agents" on public.user_agents
      for select to authenticated
      using (
        exists (
          select 1 from public.agency_clients ac
          where ac.id = user_agents.client_id and ac.client_user_id = auth.uid()
        )
        or exists (
          select 1 from public.client_template_subscriptions cts
          join public.agency_clients ac on ac.id = cts.client_id
          where cts.id = user_agents.client_subscription_id and ac.client_user_id = auth.uid()
        )
      );
  end if;
end $$;
