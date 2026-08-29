-- Rename dos templates de lançamento para "nomes de gente" (sem siglas técnicas).
-- Rodar no Supabase SQL Editor (project jcahtniqqiaefszhgpqx).
-- Casa pelo NOME atual (não assume o id) — só muda o texto exibido.

-- 1) Ver o que existe hoje:
-- select id, name, category, is_active from public.platform_templates order by sort_order;

update public.platform_templates
set name = 'Qualificador de Leads'
where name ilike '%SDR%';

update public.platform_templates
set name = 'Suporte ao Cliente'
where name ilike '%SAC%';

-- 2) Conferir depois:
-- select id, name, category, is_active from public.platform_templates order by sort_order;
