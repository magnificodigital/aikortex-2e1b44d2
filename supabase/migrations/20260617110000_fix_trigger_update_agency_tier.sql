-- Continuação do realinhamento Master v7.4.
--
-- A função trigger_update_agency_tier() recalcula o tier da agência quando
-- agency_clients muda (insert/update/delete). Foi criada em
-- 20260411044920 com:
--   - Nomes antigos: starter, explorer, hack
--   - Thresholds antigos: 15 e 5 clientes
--
-- Problemas resultantes:
--   1. Ao cadastrar cliente, trigger tenta UPDATE agency_profiles SET tier='starter'
--      → validate_agency_profile_tier() rejeita com "Invalid agency tier: starter"
--      → cadastro de cliente falha
--   2. Mesmo se passasse, thresholds não batem com Master v7.4 §3.4
--      (Start→Hack precisa 10 clientes, Hack→Growth precisa 30)
--
-- Fix:
--   - Tiers Master: start/hack/growth
--   - Thresholds Master v7.4 §3.4: >=30 = growth, >=10 = hack, senão start

CREATE OR REPLACE FUNCTION public.trigger_update_agency_tier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  target_agency_id uuid;
  active_clients integer;
  new_tier text;
  old_tier text;
  owner_user_id uuid;
  is_overridden boolean;
BEGIN
  target_agency_id := COALESCE(NEW.agency_id, OLD.agency_id);

  SELECT tier, user_id, COALESCE(tier_manually_overridden, false)
  INTO old_tier, owner_user_id, is_overridden
  FROM public.agency_profiles
  WHERE id = target_agency_id;

  SELECT COUNT(*) INTO active_clients
  FROM public.agency_clients
  WHERE agency_id = target_agency_id AND status = 'active';

  UPDATE public.agency_profiles
  SET active_clients_count = active_clients, updated_at = now()
  WHERE id = target_agency_id;

  -- Skip tier update if manually overridden by platform admin
  IF is_overridden THEN
    RETURN NEW;
  END IF;

  -- Master v7.4 §3.4
  IF active_clients >= 30 THEN
    new_tier := 'growth';
  ELSIF active_clients >= 10 THEN
    new_tier := 'hack';
  ELSE
    new_tier := 'start';
  END IF;

  UPDATE public.agency_profiles
  SET tier = new_tier, updated_at = now()
  WHERE id = target_agency_id;

  IF old_tier IS DISTINCT FROM new_tier AND new_tier > old_tier AND owner_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, action_url)
    VALUES (
      owner_user_id,
      'Você subiu de tier! 🎉',
      'Parabéns! Você atingiu o tier ' || UPPER(new_tier) || ' com ' || active_clients || ' clientes ativos. Novos templates e benefícios desbloqueados.',
      'success',
      '/partners?tab=tiers'
    );
  END IF;

  RETURN NEW;
END;
$function$;
