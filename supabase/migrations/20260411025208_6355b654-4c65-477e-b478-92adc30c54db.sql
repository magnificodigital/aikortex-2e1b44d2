-- Update validation function for tier_module_access
CREATE OR REPLACE FUNCTION public.validate_tier_module_access_tier()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if new.tier not in ('starter','explorer','hack') then
    raise exception 'Invalid tier: %', new.tier;
  end if;
  return new;
end;
$function$;

-- Update validation function for partner_tiers
CREATE OR REPLACE FUNCTION public.validate_partner_tier()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.tier NOT IN ('starter','explorer','hack') THEN
    RAISE EXCEPTION 'Invalid partner tier: %', NEW.tier;
  END IF;
  RETURN NEW;
END;
$function$;