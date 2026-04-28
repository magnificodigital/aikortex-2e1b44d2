
CREATE OR REPLACE FUNCTION public.trigger_update_agency_tier()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  target_agency_id uuid;
  active_clients integer;
  new_tier text;
  old_tier text;
  owner_user_id uuid;
BEGIN
  target_agency_id := COALESCE(NEW.agency_id, OLD.agency_id);

  SELECT COUNT(*) INTO active_clients
  FROM public.agency_clients
  WHERE agency_id = target_agency_id AND status = 'active';

  IF active_clients >= 15 THEN
    new_tier := 'hack';
  ELSIF active_clients >= 5 THEN
    new_tier := 'explorer';
  ELSE
    new_tier := 'starter';
  END IF;

  -- Get current tier and user_id before update
  SELECT tier, user_id INTO old_tier, owner_user_id
  FROM public.agency_profiles
  WHERE id = target_agency_id;

  UPDATE public.agency_profiles
  SET active_clients_count = active_clients,
      tier = new_tier,
      updated_at = now()
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
$$;
