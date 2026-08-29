-- FASE 3 — Custo/quotas + anti-abuso
-- Rodar no Supabase SQL Editor (project jcahtniqqiaefszhgpqx).
-- Travas: 40 msgs de teste grátis por agente · 7 dias validade do rascunho · 5 rascunhos/agência.
-- (validade e cap de rascunho usam status + created_at existentes — sem coluna nova pra isso.)

-- 1) Contador de mensagens de teste por agente (fonte da verdade server-side).
alter table public.user_agents
  add column if not exists test_messages_used int not null default 0;

-- 2) Incremento atômico + retorno do novo valor (chamado a cada msg de teste).
create or replace function public.bump_agent_test_usage(p_agent_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare v int;
begin
  update public.user_agents
    set test_messages_used = coalesce(test_messages_used, 0) + 1
    where id = p_agent_id
    returning test_messages_used into v;
  return coalesce(v, 0);
end;
$$;

grant execute on function public.bump_agent_test_usage(uuid) to authenticated;

-- 3) (opcional) Ao PUBLICAR, zera o contador de teste — produção passa a ser
--    coberta pela assinatura/quota do plano, não pela quota de teste.
--    Já tratamos isso no app; deixo aqui como referência caso queira via trigger.
-- update public.user_agents set test_messages_used = 0 where status = 'active';
