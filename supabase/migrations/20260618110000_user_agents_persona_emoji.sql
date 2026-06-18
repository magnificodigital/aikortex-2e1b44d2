-- Persona com emoji por agente — adiciona dimensão visual leve, sem
-- substituir avatar_url. UI prioriza avatar_url (imagem), cai pra emoji
-- quando vazio. Comportamento atual de agente sem nenhum dos dois fica
-- idêntico (UI vai gerar inicial do nome como hoje).
--
-- Coluna nullable; nada que já existe quebra. Sem default — só tem emoji
-- agente criado/editado depois desta migration.

alter table public.user_agents
  add column if not exists persona_emoji text;

notify pgrst, 'reload schema';
