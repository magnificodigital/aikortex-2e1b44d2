-- Add Anthropic Managed Agents fields to user_agents
alter table public.user_agents
  add column if not exists anthropic_agent_id text,
  add column if not exists anthropic_agent_version integer,
  add column if not exists provider text not null default 'auto',
  add column if not exists use_managed_sessions boolean not null default false;

-- Validation trigger for provider
create or replace function public.validate_user_agent_provider()
returns trigger language plpgsql set search_path = 'public' as $$
begin
  if new.provider not in ('auto','anthropic','openai','gemini','openrouter') then
    raise exception 'Invalid provider: %', new.provider;
  end if;
  return new;
end;
$$;

create trigger trg_validate_user_agent_provider
  before insert or update on public.user_agents
  for each row execute function public.validate_user_agent_provider();

-- Partial index for Anthropic agent lookups
create index if not exists idx_user_agents_anthropic
  on public.user_agents(anthropic_agent_id)
  where anthropic_agent_id is not null;