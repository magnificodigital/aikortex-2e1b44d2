
-- Add tier_manually_overridden column
ALTER TABLE public.agency_profiles 
ADD COLUMN IF NOT EXISTS tier_manually_overridden boolean DEFAULT false;

-- Update the trigger function to respect manual override
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

  -- Check if tier is manually overridden
  SELECT tier, user_id, COALESCE(tier_manually_overridden, false) 
  INTO old_tier, owner_user_id, is_overridden
  FROM public.agency_profiles
  WHERE id = target_agency_id;

  SELECT COUNT(*) INTO active_clients
  FROM public.agency_clients
  WHERE agency_id = target_agency_id AND status = 'active';

  -- Always update active_clients_count
  UPDATE public.agency_profiles
  SET active_clients_count = active_clients, updated_at = now()
  WHERE id = target_agency_id;

  -- Skip tier update if manually overridden
  IF is_overridden THEN
    RETURN NEW;
  END IF;

  IF active_clients >= 15 THEN
    new_tier := 'hack';
  ELSIF active_clients >= 5 THEN
    new_tier := 'explorer';
  ELSE
    new_tier := 'starter';
  END IF;

  UPDATE public.agency_profiles
  SET tier = new_tier, updated_at = now()
  WHERE id = target_agency_id;

  -- Insert tier upgrade notification if tier increased
  IF old_tier IS DISTINCT FROM new_tier AND new_tier > old_tier AND owner_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, action_url)
    VALUES (
      owner_user_id,
      'Você subiu de tier! 🎉',
      'Parabéns! Você atingiu o tier ' || UPPER(new_tier) || ' com ' || active_clients || ' clientes ativos. Novos templates e benefícios desbloqueados.',
      'success',
      '/templates'
    );
  END IF;

  RETURN NEW;
END;
$function$;
