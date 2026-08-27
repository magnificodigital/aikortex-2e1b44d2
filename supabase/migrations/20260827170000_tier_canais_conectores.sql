-- Novos módulos de capacidade na matriz por tier: Canais e Conectores.
-- Cria as linhas por tier (senão o toggle no admin não tem o que atualizar).
insert into public.tier_module_access (tier, module_key, has_access, can_offer_client, sub_features)
select t.tier, m.mk,
  (t.tier <> 'start' or m.mk = 'canais'),   -- start já libera canais; conectores só hack/growth
  (t.tier <> 'start' or m.mk = 'canais'),
  '{}'::jsonb
from (values ('start'),('hack'),('growth')) as t(tier)
cross join (values ('canais'),('conectores')) as m(mk)
where not exists (
  select 1 from public.tier_module_access x
  where x.tier = t.tier and x.module_key = m.mk
);
