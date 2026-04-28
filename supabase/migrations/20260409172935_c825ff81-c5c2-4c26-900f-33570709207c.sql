-- Tabela de sessões de agentes gerenciados
create table public.agent_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  agent_id uuid references public.user_agents(id) on delete set null,
  anthropic_session_id text unique,
  contact_identifier text,
  channel text not null default 'chat',
  status text not null default 'idle',
  last_message_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Validation trigger for channel
create or replace function public.validate_agent_session_channel()
returns trigger language plpgsql set search_path = 'public' as $$
begin
  if new.channel not in ('chat','whatsapp','instagram','telegram','voice','email') then
    raise exception 'Invalid channel: %', new.channel;
  end if;
  return new;
end;
$$;

create trigger trg_validate_agent_session_channel
  before insert or update on public.agent_sessions
  for each row execute function public.validate_agent_session_channel();

-- Validation trigger for status
create or replace function public.validate_agent_session_status()
returns trigger language plpgsql set search_path = 'public' as $$
begin
  if new.status not in ('idle','running','terminated','archived') then
    raise exception 'Invalid session status: %', new.status;
  end if;
  return new;
end;
$$;

create trigger trg_validate_agent_session_status
  before insert or update on public.agent_sessions
  for each row execute function public.validate_agent_session_status();

-- Updated_at trigger
create trigger update_agent_sessions_updated_at
  before update on public.agent_sessions
  for each row execute function public.update_updated_at_column();

-- RLS
alter table public.agent_sessions enable row level security;

create policy "Users manage own sessions"
  on public.agent_sessions for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Service role full access on sessions"
  on public.agent_sessions for all
  to service_role
  using (true)
  with check (true);

-- Indexes
create index idx_agent_sessions_contact on public.agent_sessions(user_id, contact_identifier, channel);
create index idx_agent_sessions_anthropic on public.agent_sessions(anthropic_session_id) where anthropic_session_id is not null;