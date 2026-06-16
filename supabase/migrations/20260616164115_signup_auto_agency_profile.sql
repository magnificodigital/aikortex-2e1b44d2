-- Sprint A — Onboarding agency signup
--
-- Extende handle_new_user pra também criar agency_profiles quando o signup
-- é de uma agência (tenant_type='agency'). Antes o profile era criado mas
-- agency_profiles ficava NULL, exigindo intervenção manual (como aconteceu
-- com a primeira conta Magnifico que precisou de UPDATE manual no SQL).
--
-- Lê agency_name de raw_user_meta_data. Fallback pra full_name.
-- Tier default: 'start' (Master v7.4 §3.2).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_tenant_type text;
  v_role text;
  v_full_name text;
  v_agency_name text;
begin
  v_tenant_type := coalesce(new.raw_user_meta_data->>'tenant_type', 'agency');
  v_role := coalesce(new.raw_user_meta_data->>'role', 'agency_owner');
  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', new.email);
  v_agency_name := coalesce(
    nullif(new.raw_user_meta_data->>'agency_name', ''),
    v_full_name
  );

  -- 1. Profile sempre é criado
  insert into public.profiles (user_id, full_name, avatar_url, role, tenant_type)
  values (
    new.id,
    v_full_name,
    new.raw_user_meta_data->>'avatar_url',
    v_role,
    v_tenant_type
  )
  on conflict (user_id) do nothing;

  -- 2. agency_profiles só é criado pra agency_owner+agency (não pra cliente
  --    nem pra platform). Não cria duplicado se já existe.
  if v_tenant_type = 'agency' and v_role = 'agency_owner' then
    insert into public.agency_profiles (user_id, agency_name, tier)
    values (new.id, v_agency_name, 'start')
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$function$;
