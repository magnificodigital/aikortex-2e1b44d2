
-- Step 1: Update validation triggers FIRST
CREATE OR REPLACE FUNCTION public.validate_tier_module_access_tier()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if new.tier not in ('bronze','prata','gold') then
    raise exception 'Invalid tier: %', new.tier;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.validate_partner_tier()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.tier NOT IN ('bronze','prata','gold') THEN
    RAISE EXCEPTION 'Invalid partner tier: %', NEW.tier;
  END IF;
  RETURN NEW;
END;
$function$;

-- Step 2: Rename silver → prata
UPDATE tier_module_access SET tier = 'prata' WHERE tier = 'silver';
UPDATE partner_tiers SET tier = 'prata' WHERE tier = 'silver';

-- Step 3: Promote elite → gold
UPDATE partner_tiers SET tier = 'gold' WHERE tier = 'elite';

-- Step 4: Delete elite from tier_module_access
DELETE FROM tier_module_access WHERE tier = 'elite';

-- Step 5: Insert prata rows if they don't exist yet (from silver rename they should exist)
-- Add missing prata rows for any module_keys that might not have been covered
INSERT INTO tier_module_access (tier, module_key, has_access)
SELECT 'prata', mk.key, true
FROM (VALUES 
  ('aikortex.agentes'), ('aikortex.flows'), ('aikortex.apps'),
  ('aikortex.templates'), ('aikortex.mensagens'), ('aikortex.disparos'),
  ('gestao.clientes'), ('gestao.contratos'), ('gestao.vendas'),
  ('gestao.crm'), ('gestao.reunioes'), ('gestao.financeiro'),
  ('gestao.equipe'), ('gestao.tarefas')
) AS mk(key)
WHERE NOT EXISTS (
  SELECT 1 FROM tier_module_access WHERE tier = 'prata' AND module_key = mk.key
);
