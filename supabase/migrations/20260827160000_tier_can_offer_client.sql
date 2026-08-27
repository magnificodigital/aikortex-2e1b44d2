-- Segunda dimensão em tier_module_access: o que o tier pode LIBERAR pro cliente
-- (além de has_access = o que a própria agência usa).
alter table public.tier_module_access
  add column if not exists can_offer_client boolean not null default false;

-- Cria as linhas dos módulos NOVOS (Ligações e Stark) pra cada tier, se faltarem
-- (senão os toggles no admin não têm o que atualizar).
insert into public.tier_module_access (tier, module_key, has_access, can_offer_client, sub_features)
select t.tier, m.mk,
  (t.tier in ('hack','growth') or m.mk = 'stark.copilot'),
  (t.tier in ('hack','growth') or m.mk = 'stark.copilot'),
  '{}'::jsonb
from (values ('start'),('hack'),('growth')) as t(tier)
cross join (values ('aikortex.ligacoes'),('stark.copilot')) as m(mk)
where not exists (
  select 1 from public.tier_module_access x
  where x.tier = t.tier and x.module_key = m.mk
);

-- Baseline (RODAR UMA VEZ): por padrão, o que a agência usa também pode ser
-- liberado ao cliente. Depois o admin ajusta individualmente no painel.
update public.tier_module_access set can_offer_client = has_access where can_offer_client = false;
