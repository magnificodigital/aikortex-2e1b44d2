-- ─────────────────────────────────────────────────────────────────────────
-- Sprint 2.3 — Inbound webhook HubSpot → Aikortex (bidirectional)
--
-- Adiciona:
-- - webhook_token em crm_sync_configs (URL pública mas inadivinhável)
-- - last_inbound_at em crm_contacts (prevenção de loop)
-- - Trigger update: skip outbound sync se last_inbound_at < 10s atrás
-- ─────────────────────────────────────────────────────────────────────────

alter table public.crm_sync_configs
  add column if not exists webhook_token text;

-- Gera token aleatório pra configs existentes que ainda não têm
update public.crm_sync_configs
   set webhook_token = encode(gen_random_bytes(24), 'hex')
 where webhook_token is null;

alter table public.crm_contacts
  add column if not exists last_inbound_at timestamptz;

create index if not exists idx_crm_contacts_last_inbound
  on public.crm_contacts (last_inbound_at)
  where last_inbound_at is not null;

-- Atualiza trigger pra pular outbound sync quando o update veio de webhook
-- (last_inbound_at recente). Janela de 10s é segura — eventos de webhook
-- chegam rápido e a propagação dura < 5s.
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
  -- Anti-loop: se este UPDATE foi causado por um webhook inbound recente,
  -- não dispara outbound (evita ping-pong infinito).
  if tg_op = 'UPDATE'
     and new.last_inbound_at is not null
     and new.last_inbound_at > now() - interval '10 seconds' then
    return new;
  end if;

  if tg_op = 'INSERT' then v_changed := true;
  else
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

  if not v_changed then return new; end if;

  select enabled, auto_sync into v_config_enabled, v_auto_sync
    from public.crm_sync_configs
   where agency_id = new.agency_id and provider = 'hubspot' limit 1;

  if not coalesce(v_config_enabled, false) or not coalesce(v_auto_sync, false) then
    return new;
  end if;

  v_function_url := 'https://jcahtniqqiaefszhgpqx.supabase.co/functions/v1/crm-hubspot-push';

  select decrypted_secret into v_service_key
    from vault.decrypted_secrets
   where name = 'crm_sync_service_key' limit 1;

  if v_service_key is null or v_service_key = '' then
    raise notice '[crm_auto_sync] vault secret missing; skip';
    return new;
  end if;

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
