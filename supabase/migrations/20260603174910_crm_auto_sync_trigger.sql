-- ─────────────────────────────────────────────────────────────────────────
-- Auto-sync Trigger — Sprint 2.2
--
-- AFTER INSERT/UPDATE em crm_contacts → invoca crm-hubspot-push via pg_net
-- quando agency tem auto_sync ON. Fire-and-forget (não bloqueia o write).
--
-- Smart: dispara apenas quando campos relevantes pro CRM mudaram (não
-- em updates de external_ids ou updated_at sozinhos — evita loop infinito
-- porque a função escreve em external_ids depois de sincronizar).
-- ─────────────────────────────────────────────────────────────────────────

-- pg_net já vem habilitado em Supabase. Verificamos defensivamente.
create extension if not exists pg_net with schema extensions;

create or replace function public.crm_auto_sync_hubspot()
returns trigger language plpgsql security definer
set search_path = public, extensions, net
as $$
declare
  v_config_enabled boolean;
  v_auto_sync boolean;
  v_function_url text;
  v_service_key text;
  v_changed boolean := false;
begin
  -- INSERT: sempre considera "mudou"
  if tg_op = 'INSERT' then
    v_changed := true;
  else
    -- UPDATE: só dispara se mudaram campos REAIS (não external_ids/updated_at)
    if new.name is distinct from old.name
       or new.email is distinct from old.email
       or new.phone is distinct from old.phone
       or new.company is distinct from old.company
       or new.role is distinct from old.role
       or new.stage_slug is distinct from old.stage_slug
       or new.temperature is distinct from old.temperature
       or new.budget is distinct from old.budget
       or new.authority is distinct from old.authority
       or new.need is distinct from old.need
       or new.timeline is distinct from old.timeline
       or new.notes is distinct from old.notes then
      v_changed := true;
    end if;
  end if;

  if not v_changed then
    return new;
  end if;

  -- Lê config da agência: só dispara se enabled + auto_sync
  select enabled, auto_sync into v_config_enabled, v_auto_sync
    from public.crm_sync_configs
   where agency_id = new.agency_id and provider = 'hubspot'
   limit 1;

  if not coalesce(v_config_enabled, false) or not coalesce(v_auto_sync, false) then
    return new;
  end if;

  -- Endpoint da edge function. URL hardcoded pro projeto (CLAUDE.md).
  v_function_url := 'https://jcahtniqqiaefszhgpqx.supabase.co/functions/v1/crm-hubspot-push';

  -- Service role key vem do Supabase Vault (criptografado). User precisa rodar 1x:
  --   select vault.create_secret('eyJ...', 'crm_sync_service_key');
  -- (a service_role key fica em Dashboard → Settings → API → service_role)
  -- Vault é a forma recomendada — alter database app.settings.* é bloqueado.
  select decrypted_secret into v_service_key
    from vault.decrypted_secrets
   where name = 'crm_sync_service_key'
   limit 1;

  if v_service_key is null or v_service_key = '' then
    raise notice '[crm_auto_sync] vault secret "crm_sync_service_key" não encontrada; skip';
    return new;
  end if;

  -- Fire-and-forget POST. pg_net é assíncrono; não bloqueia o trigger.
  -- Schema é "net" (não "extensions.net" — esse é interpretado como db.schema).
  perform net.http_post(
    url := v_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := jsonb_build_object('contact_id', new.id::text)
  );

  return new;
end;
$$;

drop trigger if exists crm_contacts_auto_sync on public.crm_contacts;
create trigger crm_contacts_auto_sync
  after insert or update on public.crm_contacts
  for each row execute function public.crm_auto_sync_hubspot();

comment on function public.crm_auto_sync_hubspot is
  'AFTER INSERT/UPDATE on crm_contacts: dispara sync com HubSpot via pg_net se config.auto_sync=true. Smart: ignora updates de external_ids (evita loop).';
