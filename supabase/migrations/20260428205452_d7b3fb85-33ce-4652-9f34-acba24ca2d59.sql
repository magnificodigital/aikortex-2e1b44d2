-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  api_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own API keys" ON public.user_api_keys FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_user_api_keys_updated_at BEFORE UPDATE ON public.user_api_keys FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Reunião',
  room_id TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  host_user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'ended')),
  settings JSONB NOT NULL DEFAULT '{"waiting_room": false,"chat_enabled": true,"screen_share_enabled": true}'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.meeting_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('host', 'participant')),
  status TEXT NOT NULL DEFAULT 'joined' CHECK (status IN ('waiting', 'joined', 'left')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  left_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.meeting_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  display_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can create meetings" ON public.meetings FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_user_id);
CREATE POLICY "Host can update their meetings" ON public.meetings FOR UPDATE TO authenticated USING (auth.uid() = host_user_id);
CREATE POLICY "Host can delete their meetings" ON public.meetings FOR DELETE TO authenticated USING (auth.uid() = host_user_id);

CREATE POLICY "Authenticated users can join meetings" ON public.meeting_participants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own participation" ON public.meeting_participants FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can send messages" ON public.meeting_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_participants;

CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.meeting_waiting_room (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL,
  guest_id text NOT NULL,
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'waiting',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meeting_waiting_room ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can request entry" ON public.meeting_waiting_room FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can read waiting room" ON public.meeting_waiting_room FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Host can update waiting room" ON public.meeting_waiting_room FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.meetings m WHERE m.id = meeting_waiting_room.meeting_id AND m.host_user_id = auth.uid())
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_waiting_room;

CREATE TABLE public.user_agents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  agent_type text NOT NULL DEFAULT 'Custom',
  name text NOT NULL,
  description text DEFAULT '',
  avatar_url text DEFAULT '',
  model text DEFAULT 'gemini-2.5-flash',
  status text NOT NULL DEFAULT 'configuring',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own agents" ON public.user_agents FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_user_agents_updated_at BEFORE UPDATE ON public.user_agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public) VALUES ('agent-avatars', 'agent-avatars', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view agent avatars" ON storage.objects FOR SELECT USING (bucket_id = 'agent-avatars');
CREATE POLICY "Authenticated users can upload agent avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'agent-avatars');
CREATE POLICY "Users can update their own agent avatars" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'agent-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete their own agent avatars" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'agent-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE TABLE public.user_apps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Meu App',
  description TEXT DEFAULT '',
  channel TEXT NOT NULL DEFAULT 'web',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  files JSONB NOT NULL DEFAULT '[]'::jsonb,
  tables_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_apps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own apps" ON public.user_apps FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_user_apps_updated_at BEFORE UPDATE ON public.user_apps FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wamid text,
  from_number text NOT NULL,
  to_number text,
  phone_number_id text,
  contact_name text,
  message_type text NOT NULL DEFAULT 'text',
  content text NOT NULL DEFAULT '',
  raw_payload jsonb DEFAULT '{}',
  direction text NOT NULL DEFAULT 'incoming',
  status text NOT NULL DEFAULT 'received',
  timestamp timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  app_id uuid REFERENCES public.user_apps(id) ON DELETE SET NULL,
  user_id uuid
);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own messages" ON public.whatsapp_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert messages" ON public.whatsapp_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role full access" ON public.whatsapp_messages FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_whatsapp_messages_from ON public.whatsapp_messages(from_number);
CREATE INDEX idx_whatsapp_messages_app ON public.whatsapp_messages(app_id);
CREATE INDEX idx_whatsapp_messages_direction ON public.whatsapp_messages(direction);
CREATE INDEX idx_whatsapp_messages_created ON public.whatsapp_messages(created_at DESC);

CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  price_monthly numeric(10,2) NOT NULL DEFAULT 0,
  price_yearly numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  trial_days integer DEFAULT 7,
  features jsonb DEFAULT '[]',
  limits jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid REFERENCES public.plans(id) NOT NULL,
  status text NOT NULL DEFAULT 'trialing',
  billing_cycle text NOT NULL DEFAULT 'monthly',
  trial_ends_at timestamptz,
  current_period_start timestamptz DEFAULT now(),
  current_period_end timestamptz,
  canceled_at timestamptz,
  payment_provider text,
  payment_subscription_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subscription_id uuid REFERENCES public.subscriptions(id),
  amount numeric(10,2) NOT NULL,
  currency text DEFAULT 'BRL',
  status text DEFAULT 'pending',
  due_date date,
  paid_at timestamptz,
  description text,
  payment_provider text,
  payment_id text,
  created_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_subscription_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('trialing','active','past_due','canceled','paused') THEN
    RAISE EXCEPTION 'Invalid subscription status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_subscription_status BEFORE INSERT OR UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.validate_subscription_status();

CREATE OR REPLACE FUNCTION public.validate_subscription_billing_cycle()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.billing_cycle NOT IN ('monthly','yearly') THEN
    RAISE EXCEPTION 'Invalid billing cycle: %', NEW.billing_cycle;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_subscription_billing_cycle BEFORE INSERT OR UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.validate_subscription_billing_cycle();

CREATE OR REPLACE FUNCTION public.validate_invoice_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('pending','paid','overdue','canceled') THEN
    RAISE EXCEPTION 'Invalid invoice status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_invoice_status BEFORE INSERT OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.validate_invoice_status();

CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plans are viewable by everyone" ON public.plans FOR SELECT USING (true);
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscriptions" ON public.subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own invoices" ON public.invoices FOR SELECT TO authenticated USING (auth.uid() = user_id);

INSERT INTO public.plans (name, slug, description, price_monthly, price_yearly, is_featured, trial_days, features, limits) VALUES
('Starter', 'starter', 'Ideal para agências iniciando com automação IA', 197, 1970, false, 7,
  '["3 agentes de IA","5 fluxos de automação","1.000 contatos","WhatsApp + Instagram","Suporte por email"]',
  '{"agents":3,"flows":5,"contacts":1000,"team_members":2,"apps":1}'),
('Pro', 'pro', 'Para agências em crescimento que precisam de mais poder', 397, 3970, true, 14,
  '["20 agentes de IA","Fluxos ilimitados","10.000 contatos","Todos os canais","Voz e ligações","App Builder","Suporte prioritário"]',
  '{"agents":20,"flows":-1,"contacts":10000,"team_members":10,"apps":5}'),
('Elite', 'elite', 'Para agências que querem oferecer o Aikortex com sua marca', 797, 7970, false, 14,
  '["Agentes ilimitados","Fluxos ilimitados","Contatos ilimitados","Todos os canais","White-label completo","Domínio customizado","Programa de parceiros Elite","Gerente de conta dedicado"]',
  '{"agents":-1,"flows":-1,"contacts":-1,"team_members":-1,"apps":-1}');

CREATE TABLE public.partner_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  tier text NOT NULL DEFAULT 'bronze',
  clients_served integer DEFAULT 0,
  revenue numeric(12,2) DEFAULT 0,
  solutions_published integer DEFAULT 0,
  certifications_earned integer DEFAULT 0,
  tier_upgraded_at timestamptz DEFAULT now(),
  tier_upgraded_by uuid,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_partner_tier()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.tier NOT IN ('bronze','silver','gold','elite') THEN
    RAISE EXCEPTION 'Invalid partner tier: %', NEW.tier;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_partner_tier_before_insert_update BEFORE INSERT OR UPDATE ON public.partner_tiers FOR EACH ROW EXECUTE FUNCTION public.validate_partner_tier();
CREATE TRIGGER update_partner_tiers_updated_at BEFORE UPDATE ON public.partner_tiers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.partner_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tier" ON public.partner_tiers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tier" ON public.partner_tiers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role full access" ON public.partner_tiers FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'agency_owner';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tenant_type text NOT NULL DEFAULT 'agency';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.validate_profile_role()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.role NOT IN ('platform_owner','platform_admin','agency_owner','agency_admin','agency_manager','agency_member','client_owner','client_viewer') THEN
    RAISE EXCEPTION 'Invalid role: %', NEW.role;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_profile_role_trigger BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.validate_profile_role();

CREATE OR REPLACE FUNCTION public.validate_profile_tenant_type()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.tenant_type NOT IN ('platform','agency','client') THEN
    RAISE EXCEPTION 'Invalid tenant_type: %', NEW.tenant_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_profile_tenant_type_trigger BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.validate_profile_tenant_type();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, avatar_url, role, tenant_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'role', 'agency_owner'),
    COALESCE(NEW.raw_user_meta_data->>'tenant_type', 'agency')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TABLE public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_owner_id uuid NOT NULL,
  member_user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'agency_member',
  department text,
  job_title text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_owner_id, member_user_id)
);

CREATE OR REPLACE FUNCTION public.validate_workspace_member_role()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.role NOT IN ('agency_admin','agency_manager','agency_member') THEN
    RAISE EXCEPTION 'Invalid workspace member role: %', NEW.role;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_workspace_member_role_trigger BEFORE INSERT OR UPDATE ON public.workspace_members FOR EACH ROW EXECUTE FUNCTION public.validate_workspace_member_role();

CREATE OR REPLACE FUNCTION public.validate_workspace_member_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('active','invited','suspended') THEN
    RAISE EXCEPTION 'Invalid workspace member status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_workspace_member_status_trigger BEFORE INSERT OR UPDATE ON public.workspace_members FOR EACH ROW EXECUTE FUNCTION public.validate_workspace_member_status();
CREATE TRIGGER update_workspace_members_updated_at BEFORE UPDATE ON public.workspace_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace owner manages members" ON public.workspace_members FOR ALL USING (auth.uid() = workspace_owner_id) WITH CHECK (auth.uid() = workspace_owner_id);
CREATE POLICY "Members view own record" ON public.workspace_members FOR SELECT USING (auth.uid() = member_user_id);

CREATE OR REPLACE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.is_platform_user(check_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = check_user_id AND role IN ('platform_owner', 'platform_admin'));
$$;

CREATE POLICY "Platform admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_platform_user(auth.uid()));
CREATE POLICY "Platform admins can update all profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.is_platform_user(auth.uid()));

INSERT INTO public.profiles (user_id, full_name, role, tenant_type, is_active)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'full_name', u.email),
  COALESCE(u.raw_user_meta_data->>'role', 'agency_owner'),
  COALESCE(u.raw_user_meta_data->>'tenant_type', 'agency'), true
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = u.id);

CREATE POLICY "Platform admins can delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.is_platform_user(auth.uid()));
CREATE POLICY "Platform admins can view all subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (public.is_platform_user(auth.uid()));
CREATE POLICY "Platform admins can insert subscriptions" ON public.subscriptions FOR INSERT TO authenticated WITH CHECK (public.is_platform_user(auth.uid()));
CREATE POLICY "Platform admins can update all subscriptions" ON public.subscriptions FOR UPDATE TO authenticated USING (public.is_platform_user(auth.uid()));
CREATE POLICY "Platform admins can delete subscriptions" ON public.subscriptions FOR DELETE TO authenticated USING (public.is_platform_user(auth.uid()));
CREATE POLICY "Platform admins can view all partner_tiers" ON public.partner_tiers FOR SELECT TO authenticated USING (public.is_platform_user(auth.uid()));
CREATE POLICY "Platform admins can update all partner_tiers" ON public.partner_tiers FOR UPDATE TO authenticated USING (public.is_platform_user(auth.uid()));
CREATE POLICY "Platform admins can insert partner_tiers" ON public.partner_tiers FOR INSERT TO authenticated WITH CHECK (public.is_platform_user(auth.uid()));
CREATE POLICY "Platform admins can delete partner_tiers" ON public.partner_tiers FOR DELETE TO authenticated USING (public.is_platform_user(auth.uid()));

create table public.tier_module_access (
  id uuid primary key default gen_random_uuid(),
  tier text not null,
  module_key text not null,
  has_access boolean not null default false,
  updated_at timestamptz default now(),
  updated_by uuid,
  unique(tier, module_key)
);

create or replace function public.validate_tier_module_access_tier()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.tier not in ('bronze','silver','gold','elite') then
    raise exception 'Invalid tier: %', new.tier;
  end if;
  return new;
end;
$$;

create trigger trg_validate_tier_module_access_tier before insert or update on public.tier_module_access for each row execute function public.validate_tier_module_access_tier();
create trigger update_tier_module_access_updated_at before update on public.tier_module_access for each row execute function public.update_updated_at_column();

alter table public.tier_module_access enable row level security;

create policy "Authenticated users can read tier access" on public.tier_module_access for select to authenticated using (true);
create policy "Platform admins can insert tier access" on public.tier_module_access for insert to authenticated with check (public.is_platform_user(auth.uid()));
create policy "Platform admins can update tier access" on public.tier_module_access for update to authenticated using (public.is_platform_user(auth.uid()));
create policy "Platform admins can delete tier access" on public.tier_module_access for delete to authenticated using (public.is_platform_user(auth.uid()));

insert into public.tier_module_access (tier, module_key, has_access) values
('bronze','aikortex.agentes', true),('bronze','aikortex.flows', false),('bronze','aikortex.apps', false),
('bronze','aikortex.templates', true),('bronze','aikortex.mensagens', true),('bronze','aikortex.disparos', false),
('bronze','gestao.clientes', true),('bronze','gestao.contratos', false),('bronze','gestao.vendas', true),
('bronze','gestao.crm', false),('bronze','gestao.reunioes', false),('bronze','gestao.financeiro', false),
('bronze','gestao.equipe', true),('bronze','gestao.tarefas', true),
('silver','aikortex.agentes', true),('silver','aikortex.flows', true),('silver','aikortex.apps', false),
('silver','aikortex.templates', true),('silver','aikortex.mensagens', true),('silver','aikortex.disparos', true),
('silver','gestao.clientes', true),('silver','gestao.contratos', true),('silver','gestao.vendas', true),
('silver','gestao.crm', true),('silver','gestao.reunioes', false),('silver','gestao.financeiro', true),
('silver','gestao.equipe', true),('silver','gestao.tarefas', true),
('gold','aikortex.agentes', true),('gold','aikortex.flows', true),('gold','aikortex.apps', true),
('gold','aikortex.templates', true),('gold','aikortex.mensagens', true),('gold','aikortex.disparos', true),
('gold','gestao.clientes', true),('gold','gestao.contratos', true),('gold','gestao.vendas', true),
('gold','gestao.crm', true),('gold','gestao.reunioes', true),('gold','gestao.financeiro', true),
('gold','gestao.equipe', true),('gold','gestao.tarefas', true),
('elite','aikortex.agentes', true),('elite','aikortex.flows', true),('elite','aikortex.apps', true),
('elite','aikortex.templates', true),('elite','aikortex.mensagens', true),('elite','aikortex.disparos', true),
('elite','gestao.clientes', true),('elite','gestao.contratos', true),('elite','gestao.vendas', true),
('elite','gestao.crm', true),('elite','gestao.reunioes', true),('elite','gestao.financeiro', true),
('elite','gestao.equipe', true),('elite','gestao.tarefas', true);

ALTER TABLE public.tier_module_access ADD COLUMN sub_features jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.validate_tier_module_access_tier()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
begin
  if new.tier not in ('bronze','prata','gold') then
    raise exception 'Invalid tier: %', new.tier;
  end if;
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION public.validate_partner_tier()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.tier NOT IN ('bronze','prata','gold') THEN
    RAISE EXCEPTION 'Invalid partner tier: %', NEW.tier;
  END IF;
  RETURN NEW;
END;
$$;

UPDATE tier_module_access SET tier = 'prata' WHERE tier = 'silver';
UPDATE partner_tiers SET tier = 'prata' WHERE tier = 'silver';
UPDATE partner_tiers SET tier = 'gold' WHERE tier = 'elite';
DELETE FROM tier_module_access WHERE tier = 'elite';

INSERT INTO tier_module_access (tier, module_key, has_access)
SELECT 'prata', mk.key, true
FROM (VALUES
  ('aikortex.agentes'), ('aikortex.flows'), ('aikortex.apps'),
  ('aikortex.templates'), ('aikortex.mensagens'), ('aikortex.disparos'),
  ('gestao.clientes'), ('gestao.contratos'), ('gestao.vendas'),
  ('gestao.crm'), ('gestao.reunioes'), ('gestao.financeiro'),
  ('gestao.equipe'), ('gestao.tarefas')
) AS mk(key)
WHERE NOT EXISTS (SELECT 1 FROM tier_module_access WHERE tier = 'prata' AND module_key = mk.key);

CREATE TABLE public.agency_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance integer NOT NULL DEFAULT 0,
  total_purchased integer NOT NULL DEFAULT 0,
  total_consumed integer NOT NULL DEFAULT 0,
  low_balance_alert integer NOT NULL DEFAULT 50,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.credit_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  credits integer NOT NULL,
  price_brl numeric(10,2) NOT NULL,
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  amount integer NOT NULL,
  balance_after integer NOT NULL,
  description text,
  provider text,
  model text,
  tokens_input integer DEFAULT 0,
  tokens_output integer DEFAULT 0,
  session_id text,
  payment_id text,
  created_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_credit_transaction_type()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.type NOT IN ('purchase','consumption','refund','bonus','manual') THEN
    RAISE EXCEPTION 'Invalid credit transaction type: %', NEW.type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_credit_transaction_type_trigger BEFORE INSERT OR UPDATE ON public.credit_transactions FOR EACH ROW EXECUTE FUNCTION public.validate_credit_transaction_type();

ALTER TABLE public.agency_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet" ON public.agency_wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own wallet" ON public.agency_wallets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role manages wallets" ON public.agency_wallets FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Platform admins view all wallets" ON public.agency_wallets FOR SELECT TO authenticated USING (public.is_platform_user(auth.uid()));
CREATE POLICY "Platform admins update all wallets" ON public.agency_wallets FOR UPDATE TO authenticated USING (public.is_platform_user(auth.uid()));
CREATE POLICY "Platform admins insert wallets" ON public.agency_wallets FOR INSERT TO authenticated WITH CHECK (public.is_platform_user(auth.uid()));

CREATE POLICY "Anyone can view active packages" ON public.credit_packages FOR SELECT USING (is_active = true);
CREATE POLICY "Platform admins manage packages" ON public.credit_packages FOR ALL TO authenticated USING (public.is_platform_user(auth.uid())) WITH CHECK (public.is_platform_user(auth.uid()));

CREATE POLICY "Users view own transactions" ON public.credit_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own transactions" ON public.credit_transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Platform admins manage all transactions" ON public.credit_transactions FOR ALL TO authenticated USING (public.is_platform_user(auth.uid())) WITH CHECK (public.is_platform_user(auth.uid()));
CREATE POLICY "Service role manages transactions" ON public.credit_transactions FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.create_wallet_on_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  INSERT INTO public.agency_wallets (user_id, balance) VALUES (NEW.user_id, 100) ON CONFLICT (user_id) DO NOTHING;
  IF FOUND THEN
    INSERT INTO public.credit_transactions (user_id, type, amount, balance_after, description)
    VALUES (NEW.user_id, 'bonus', 100, 100, 'Bônus de boas-vindas — 100 créditos grátis');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_wallet AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.create_wallet_on_signup();
CREATE TRIGGER update_agency_wallets_updated_at BEFORE UPDATE ON public.agency_wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.credit_packages (name, credits, price_brl, is_featured, sort_order) VALUES
('Starter', 500, 29.00, false, 1),
('Basic', 1500, 79.00, true, 2),
('Pro', 4000, 179.00, false, 3),
('Business', 12000, 449.00, false, 4);

create or replace function public.add_to_wallet_consumed(user_uuid uuid, consumed integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  update agency_wallets set total_consumed = total_consumed + consumed, updated_at = now() where user_id = user_uuid;
end;
$$;

alter table public.user_agents
  add column if not exists anthropic_agent_id text,
  add column if not exists anthropic_agent_version integer,
  add column if not exists provider text not null default 'auto',
  add column if not exists use_managed_sessions boolean not null default false;

create or replace function public.validate_user_agent_provider()
returns trigger language plpgsql set search_path = 'public' as $$
begin
  if new.provider not in ('auto','anthropic','openai','gemini','openrouter') then
    raise exception 'Invalid provider: %', new.provider;
  end if;
  return new;
end;
$$;

create trigger trg_validate_user_agent_provider before insert or update on public.user_agents for each row execute function public.validate_user_agent_provider();

create index if not exists idx_user_agents_anthropic on public.user_agents(anthropic_agent_id) where anthropic_agent_id is not null;

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

create or replace function public.validate_agent_session_channel()
returns trigger language plpgsql set search_path = 'public' as $$
begin
  if new.channel not in ('chat','whatsapp','instagram','telegram','voice','email') then
    raise exception 'Invalid channel: %', new.channel;
  end if;
  return new;
end;
$$;

create trigger trg_validate_agent_session_channel before insert or update on public.agent_sessions for each row execute function public.validate_agent_session_channel();

create or replace function public.validate_agent_session_status()
returns trigger language plpgsql set search_path = 'public' as $$
begin
  if new.status not in ('idle','running','terminated','archived') then
    raise exception 'Invalid session status: %', new.status;
  end if;
  return new;
end;
$$;

create trigger trg_validate_agent_session_status before insert or update on public.agent_sessions for each row execute function public.validate_agent_session_status();
create trigger update_agent_sessions_updated_at before update on public.agent_sessions for each row execute function public.update_updated_at_column();

alter table public.agent_sessions enable row level security;

create policy "Users manage own sessions" on public.agent_sessions for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Service role full access on sessions" on public.agent_sessions for all to service_role using (true) with check (true);

create index idx_agent_sessions_contact on public.agent_sessions(user_id, contact_identifier, channel);
create index idx_agent_sessions_anthropic on public.agent_sessions(anthropic_session_id) where anthropic_session_id is not null;

create table if not exists monthly_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  year_month text not null,
  message_count integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, year_month)
);

alter table monthly_usage enable row level security;

create policy "Users view own usage" on monthly_usage for select using (auth.uid() = user_id);
create policy "Service role full access on monthly_usage" on monthly_usage for all to service_role using (true) with check (true);
create policy "Platform admins manage all usage" on monthly_usage for all to authenticated using (is_platform_user(auth.uid())) with check (is_platform_user(auth.uid()));

create table if not exists plan_message_limits (
  plan_slug text primary key,
  monthly_limit integer not null default 500
);

alter table plan_message_limits enable row level security;

create policy "Anyone can read plan limits" on plan_message_limits for select using (true);
create policy "Platform admins manage limits" on plan_message_limits for all to authenticated using (is_platform_user(auth.uid())) with check (is_platform_user(auth.uid()));

insert into plan_message_limits (plan_slug, monthly_limit) values
('starter', 500),('pro', 2000),('elite', -1)
on conflict (plan_slug) do update set monthly_limit = excluded.monthly_limit;

create or replace function increment_monthly_usage(p_user_id uuid, p_year_month text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into monthly_usage (user_id, year_month, message_count)
  values (p_user_id, p_year_month, 1)
  on conflict (user_id, year_month)
  do update set message_count = monthly_usage.message_count + 1, updated_at = now();
end;
$$;

drop trigger if exists on_user_created_wallet on profiles;

CREATE TABLE public.agent_memory_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id uuid NOT NULL REFERENCES public.user_agents(id) ON DELETE CASCADE,
  anthropic_memory_store_id text UNIQUE,
  name text NOT NULL DEFAULT 'Memória principal',
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(agent_id)
);

ALTER TABLE public.agent_memory_stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own memory stores" ON public.agent_memory_stores FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role full access on memory stores" ON public.agent_memory_stores FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER update_agent_memory_stores_updated_at BEFORE UPDATE ON public.agent_memory_stores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.flow_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  flow_id text NOT NULL,
  flow_name text,
  status text NOT NULL DEFAULT 'running',
  trigger_type text NOT NULL DEFAULT 'manual',
  trigger_data jsonb DEFAULT '{}',
  context jsonb DEFAULT '{}',
  current_node_id text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_flow_execution_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('running','completed','failed','paused') THEN
    RAISE EXCEPTION 'Invalid flow execution status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_flow_execution_status_trigger BEFORE INSERT OR UPDATE ON public.flow_executions FOR EACH ROW EXECUTE FUNCTION public.validate_flow_execution_status();

CREATE OR REPLACE FUNCTION public.validate_flow_execution_trigger_type()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.trigger_type NOT IN ('manual','whatsapp','webhook','schedule','flow') THEN
    RAISE EXCEPTION 'Invalid trigger type: %', NEW.trigger_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_flow_execution_trigger_type_trigger BEFORE INSERT OR UPDATE ON public.flow_executions FOR EACH ROW EXECUTE FUNCTION public.validate_flow_execution_trigger_type();

ALTER TABLE public.flow_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own executions" ON public.flow_executions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role full access on flow_executions" ON public.flow_executions FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.flow_node_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id uuid NOT NULL REFERENCES public.flow_executions(id) ON DELETE CASCADE,
  node_id text NOT NULL,
  node_type text NOT NULL,
  node_label text,
  status text NOT NULL DEFAULT 'running',
  input jsonb DEFAULT '{}',
  output jsonb DEFAULT '{}',
  agent_session_id text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  error_message text
);

CREATE OR REPLACE FUNCTION public.validate_flow_node_log_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('running','completed','failed','skipped') THEN
    RAISE EXCEPTION 'Invalid node log status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_flow_node_log_status_trigger BEFORE INSERT OR UPDATE ON public.flow_node_logs FOR EACH ROW EXECUTE FUNCTION public.validate_flow_node_log_status();

ALTER TABLE public.flow_node_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own logs" ON public.flow_node_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.flow_executions WHERE id = execution_id AND user_id = auth.uid())
);
CREATE POLICY "Service role full access on flow_node_logs" ON public.flow_node_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.user_flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  nodes jsonb NOT NULL DEFAULT '[]',
  edges jsonb NOT NULL DEFAULT '[]',
  is_active boolean DEFAULT false,
  trigger_type text DEFAULT 'manual',
  trigger_config jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own flows" ON public.user_flows FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_user_flows_updated_at BEFORE UPDATE ON public.user_flows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.broadcast_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  broadcast_name text,
  total_contacts integer DEFAULT 0,
  sent integer DEFAULT 0,
  failed integer DEFAULT 0,
  use_ai boolean DEFAULT false,
  agent_id uuid,
  channel text DEFAULT 'whatsapp',
  status text DEFAULT 'running',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_broadcast_log_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('running','completed','failed') THEN
    RAISE EXCEPTION 'Invalid broadcast status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_broadcast_log_status_trigger BEFORE INSERT OR UPDATE ON public.broadcast_logs FOR EACH ROW EXECUTE FUNCTION public.validate_broadcast_log_status();

ALTER TABLE public.broadcast_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own broadcasts" ON public.broadcast_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role full access on broadcast_logs" ON public.broadcast_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.help_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Geral',
  icon_name text NOT NULL DEFAULT 'BookOpen',
  read_time text NOT NULL DEFAULT '5 min',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view active articles" ON public.help_articles FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Platform admins full access" ON public.help_articles FOR ALL TO authenticated USING (is_platform_user(auth.uid())) WITH CHECK (is_platform_user(auth.uid()));

CREATE TRIGGER update_help_articles_updated_at BEFORE UPDATE ON public.help_articles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.help_articles
  ADD COLUMN IF NOT EXISTS video_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS article_type text NOT NULL DEFAULT 'article',
  ADD COLUMN IF NOT EXISTS collection text NOT NULL DEFAULT 'Geral';

CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'normal',
  admin_reply text,
  admin_replied_at timestamptz,
  admin_replied_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create own tickets" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own tickets" ON public.support_tickets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Platform admins full access on tickets" ON public.support_tickets FOR ALL TO authenticated USING (is_platform_user(auth.uid())) WITH CHECK (is_platform_user(auth.uid()));

CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.validate_support_ticket_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('open','in_progress','resolved','closed') THEN
    RAISE EXCEPTION 'Invalid ticket status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_support_ticket_status_trigger BEFORE INSERT OR UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.validate_support_ticket_status();

CREATE OR REPLACE FUNCTION public.validate_help_article_type()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.article_type NOT IN ('article','video','faq') THEN
    RAISE EXCEPTION 'Invalid article type: %', NEW.article_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_help_article_type_trigger BEFORE INSERT OR UPDATE ON public.help_articles FOR EACH ROW EXECUTE FUNCTION public.validate_help_article_type();

DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own tier" ON public.partner_tiers;

CREATE POLICY "Anon can view meeting by room_id" ON public.meetings FOR SELECT TO anon USING (false);

CREATE POLICY "Participants can view messages" ON public.meeting_messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.meeting_participants mp WHERE mp.meeting_id = meeting_messages.meeting_id AND mp.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.meetings m WHERE m.id = meeting_messages.meeting_id AND m.host_user_id = auth.uid())
);

CREATE POLICY "Participants can view meeting participants" ON public.meeting_participants FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.meeting_participants mp2 WHERE mp2.meeting_id = meeting_participants.meeting_id AND mp2.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.meetings m WHERE m.id = meeting_participants.meeting_id AND m.host_user_id = auth.uid())
);

CREATE TABLE IF NOT EXISTS public.platform_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  description text,
  is_secret boolean DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);
ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform owners can manage config" ON public.platform_config FOR ALL TO authenticated USING (public.is_platform_user(auth.uid())) WITH CHECK (public.is_platform_user(auth.uid()));
CREATE POLICY "Edge functions can read config" ON public.platform_config FOR SELECT TO service_role USING (true);

CREATE TABLE IF NOT EXISTS public.call_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  agent_id uuid REFERENCES public.user_agents(id) ON DELETE SET NULL,
  direction text NOT NULL DEFAULT 'outbound',
  channel text NOT NULL DEFAULT 'browser',
  phone_from text,
  phone_to text,
  duration_seconds integer DEFAULT 0,
  status text DEFAULT 'initiated',
  transcript jsonb DEFAULT '[]',
  recording_url text,
  telnyx_call_id text,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own call logs" ON public.call_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role full access on call_logs" ON public.call_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.validate_call_log_direction()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.direction NOT IN ('inbound','outbound') THEN
    RAISE EXCEPTION 'Invalid call direction: %', NEW.direction;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_call_log_direction BEFORE INSERT OR UPDATE ON public.call_logs FOR EACH ROW EXECUTE FUNCTION public.validate_call_log_direction();

CREATE OR REPLACE FUNCTION public.validate_call_log_channel()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.channel NOT IN ('browser','phone') THEN
    RAISE EXCEPTION 'Invalid call channel: %', NEW.channel;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_call_log_channel BEFORE INSERT OR UPDATE ON public.call_logs FOR EACH ROW EXECUTE FUNCTION public.validate_call_log_channel();

CREATE OR REPLACE FUNCTION public.validate_call_log_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('initiated','ringing','in_progress','completed','failed','no_answer') THEN
    RAISE EXCEPTION 'Invalid call status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_call_log_status BEFORE INSERT OR UPDATE ON public.call_logs FOR EACH ROW EXECUTE FUNCTION public.validate_call_log_status();

ALTER TABLE public.user_agents
  ADD COLUMN IF NOT EXISTS voice_provider text DEFAULT 'elevenlabs',
  ADD COLUMN IF NOT EXISTS voice_id text,
  ADD COLUMN IF NOT EXISTS voice_language text DEFAULT 'pt-BR',
  ADD COLUMN IF NOT EXISTS voice_stability float DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS voice_similarity float DEFAULT 0.75,
  ADD COLUMN IF NOT EXISTS telnyx_phone_number text,
  ADD COLUMN IF NOT EXISTS call_webhook_url text,
  ADD COLUMN IF NOT EXISTS max_call_duration_seconds integer DEFAULT 300;

INSERT INTO storage.buckets (id, name, public) VALUES ('call-audio', 'call-audio', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read call-audio" ON storage.objects FOR SELECT USING (bucket_id = 'call-audio');
CREATE POLICY "Service role write call-audio" ON storage.objects FOR INSERT TO service_role WITH CHECK (bucket_id = 'call-audio');

CREATE TABLE IF NOT EXISTS public.call_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  call_control_id text UNIQUE NOT NULL,
  agent_id uuid REFERENCES public.user_agents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  messages jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on call_sessions" ON public.call_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.platform_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  category text NOT NULL,
  thumbnail_url text,
  demo_url text,
  features jsonb DEFAULT '[]',
  platform_price_monthly numeric(10,2) NOT NULL,
  min_tier text NOT NULL DEFAULT 'starter',
  is_active boolean DEFAULT true,
  is_exclusive boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_platform_template_category()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.category NOT IN ('agent', 'automation', 'app') THEN
    RAISE EXCEPTION 'Invalid category: %', NEW.category;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_platform_template_category BEFORE INSERT OR UPDATE ON public.platform_templates FOR EACH ROW EXECUTE FUNCTION public.validate_platform_template_category();

CREATE OR REPLACE FUNCTION public.validate_platform_template_min_tier()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.min_tier NOT IN ('starter', 'explorer', 'hack') THEN
    RAISE EXCEPTION 'Invalid min_tier: %', NEW.min_tier;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_platform_template_min_tier BEFORE INSERT OR UPDATE ON public.platform_templates FOR EACH ROW EXECUTE FUNCTION public.validate_platform_template_min_tier();

ALTER TABLE public.platform_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read active templates" ON public.platform_templates FOR SELECT USING (is_active = true);
CREATE POLICY "Platform owner manages templates" ON public.platform_templates FOR ALL TO authenticated USING (is_platform_user(auth.uid())) WITH CHECK (is_platform_user(auth.uid()));

INSERT INTO public.platform_templates (name, slug, description, category, platform_price_monthly, min_tier, features) VALUES
('SDR - Qualificador de Leads', 'sdr-qualificador', 'Agente de IA que qualifica leads automaticamente via WhatsApp e outros canais, faz follow-up e registra no CRM.', 'agent', 197.00, 'starter',
  '["Qualificação automática de leads", "Follow-up D+1, D+3, D+7", "Integração CRM", "Transferência para humano", "Relatório de conversão"]'::jsonb),
('SAC - Suporte ao Cliente', 'sac-suporte', 'Agente de atendimento ao cliente com triagem automática, base de conhecimento e escalonamento para humano.', 'agent', 197.00, 'starter',
  '["Triagem automática de chamados", "Base de conhecimento", "Escalonamento para humano", "CSAT automático", "Dashboard de atendimento"]'::jsonb),
('Social Media Manager', 'social-media-manager', 'Agente especializado em gestão de redes sociais, criação de conteúdo e engajamento automatizado.', 'agent', 297.00, 'explorer',
  '["Criação de conteúdo automática", "Agendamento de posts", "Resposta automática a comentários", "Relatório de engajamento", "Sugestão de hashtags"]'::jsonb);

CREATE TABLE IF NOT EXISTS public.agency_profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  agency_name text,
  logo_url text,
  tier text NOT NULL DEFAULT 'starter',
  active_clients_count integer DEFAULT 0,
  asaas_api_key text,
  asaas_wallet_id text,
  custom_pricing jsonb DEFAULT '{}',
  platform_fee_monthly numeric(10,2) DEFAULT 47.00,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_agency_profile_tier()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tier NOT IN ('starter', 'explorer', 'hack') THEN
    RAISE EXCEPTION 'Invalid agency tier: %', NEW.tier;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_agency_profile_tier BEFORE INSERT OR UPDATE ON public.agency_profiles FOR EACH ROW EXECUTE FUNCTION public.validate_agency_profile_tier();

ALTER TABLE public.agency_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency sees own profile" ON public.agency_profiles FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Platform admins manage agency profiles" ON public.agency_profiles FOR ALL TO authenticated USING (is_platform_user(auth.uid())) WITH CHECK (is_platform_user(auth.uid()));

CREATE TABLE IF NOT EXISTS public.agency_clients (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id uuid REFERENCES public.agency_profiles(id) ON DELETE CASCADE NOT NULL,
  client_name text NOT NULL,
  client_email text,
  client_phone text,
  client_document text,
  status text DEFAULT 'active',
  asaas_customer_id text,
  platform_subscription_id text,
  platform_subscription_status text DEFAULT 'pending',
  client_logo_url text,
  client_primary_color text,
  client_user_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_agency_client_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('active', 'inactive', 'pending', 'suspended') THEN
    RAISE EXCEPTION 'Invalid client status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_agency_client_status BEFORE INSERT OR UPDATE ON public.agency_clients FOR EACH ROW EXECUTE FUNCTION public.validate_agency_client_status();

ALTER TABLE public.agency_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency sees own clients" ON public.agency_clients FOR ALL TO authenticated
USING (agency_id IN (SELECT id FROM public.agency_profiles WHERE user_id = auth.uid()))
WITH CHECK (agency_id IN (SELECT id FROM public.agency_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Platform admins manage agency clients" ON public.agency_clients FOR ALL TO authenticated USING (is_platform_user(auth.uid())) WITH CHECK (is_platform_user(auth.uid()));

CREATE TABLE IF NOT EXISTS public.client_template_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES public.agency_clients(id) ON DELETE CASCADE NOT NULL,
  template_id uuid REFERENCES public.platform_templates(id) NOT NULL,
  agency_id uuid REFERENCES public.agency_profiles(id) NOT NULL,
  agency_price_monthly numeric(10,2) NOT NULL,
  platform_price_monthly numeric(10,2) NOT NULL,
  agency_profit_monthly numeric(10,2) GENERATED ALWAYS AS (agency_price_monthly - platform_price_monthly) STORED,
  status text DEFAULT 'pending',
  trial_ends_at timestamptz,
  asaas_subscription_id text,
  asaas_subscription_status text,
  is_activated boolean DEFAULT false,
  activated_at timestamptz,
  activated_channel text,
  agent_id uuid REFERENCES public.user_agents(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_client_template_sub_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'trial', 'active', 'cancelled', 'suspended') THEN
    RAISE EXCEPTION 'Invalid subscription status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_client_template_sub_status BEFORE INSERT OR UPDATE ON public.client_template_subscriptions FOR EACH ROW EXECUTE FUNCTION public.validate_client_template_sub_status();

ALTER TABLE public.client_template_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency sees own template subscriptions" ON public.client_template_subscriptions FOR ALL TO authenticated
USING (agency_id IN (SELECT id FROM public.agency_profiles WHERE user_id = auth.uid()))
WITH CHECK (agency_id IN (SELECT id FROM public.agency_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Platform admins manage template subscriptions" ON public.client_template_subscriptions FOR ALL TO authenticated USING (is_platform_user(auth.uid())) WITH CHECK (is_platform_user(auth.uid()));

CREATE TABLE IF NOT EXISTS public.billing_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id uuid REFERENCES public.agency_profiles(id),
  client_id uuid REFERENCES public.agency_clients(id),
  subscription_id uuid REFERENCES public.client_template_subscriptions(id),
  event_type text NOT NULL,
  amount numeric(10,2),
  platform_amount numeric(10,2),
  agency_amount numeric(10,2),
  asaas_payment_id text,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_billing_event_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.event_type NOT IN ('payment_received', 'payment_failed', 'subscription_created', 'subscription_cancelled', 'refund') THEN
    RAISE EXCEPTION 'Invalid billing event type: %', NEW.event_type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_billing_event_type BEFORE INSERT OR UPDATE ON public.billing_events FOR EACH ROW EXECUTE FUNCTION public.validate_billing_event_type();

ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency sees own billing events" ON public.billing_events FOR ALL TO authenticated
USING (agency_id IN (SELECT id FROM public.agency_profiles WHERE user_id = auth.uid()))
WITH CHECK (agency_id IN (SELECT id FROM public.agency_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Platform admins manage billing events" ON public.billing_events FOR ALL TO authenticated USING (is_platform_user(auth.uid())) WITH CHECK (is_platform_user(auth.uid()));

CREATE TRIGGER update_agency_profiles_updated_at BEFORE UPDATE ON public.agency_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_agency_clients_updated_at BEFORE UPDATE ON public.agency_clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_client_template_subs_updated_at BEFORE UPDATE ON public.client_template_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_platform_templates_updated_at BEFORE UPDATE ON public.platform_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  action_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_notification_type()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.type NOT IN ('info', 'success', 'warning', 'error') THEN
    RAISE EXCEPTION 'Invalid notification type: %', NEW.type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_notification_type_trigger BEFORE INSERT OR UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.validate_notification_type();

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Service role full access on notifications" ON public.notifications FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id, is_read) WHERE is_read = false;

CREATE OR REPLACE FUNCTION public.validate_tier_module_access_tier()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
begin
  if new.tier not in ('starter','explorer','hack') then
    raise exception 'Invalid tier: %', new.tier;
  end if;
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION public.validate_partner_tier()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.tier NOT IN ('starter','explorer','hack') THEN
    RAISE EXCEPTION 'Invalid partner tier: %', NEW.tier;
  END IF;
  RETURN NEW;
END;
$$;

ALTER TABLE public.partner_tiers ALTER COLUMN tier SET DEFAULT 'starter';

UPDATE public.partner_tiers SET tier = 'starter' WHERE tier = 'bronze';
UPDATE public.partner_tiers SET tier = 'explorer' WHERE tier = 'prata';
UPDATE public.partner_tiers SET tier = 'hack' WHERE tier = 'gold';

UPDATE public.tier_module_access SET tier = 'starter' WHERE tier = 'bronze';
UPDATE public.tier_module_access SET tier = 'explorer' WHERE tier = 'prata';
UPDATE public.tier_module_access SET tier = 'hack' WHERE tier = 'gold';

CREATE OR REPLACE FUNCTION public.trigger_update_agency_tier()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
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

  IF old_tier IS DISTINCT FROM new_tier AND new_tier > old_tier AND owner_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, action_url)
    VALUES (owner_user_id, 'Você subiu de tier! 🎉',
      'Parabéns! Você atingiu o tier ' || UPPER(new_tier) || ' com ' || active_clients || ' clientes ativos. Novos templates e benefícios desbloqueados.',
      'success', '/templates');
  END IF;

  RETURN NEW;
END;
$$;

ALTER TABLE public.agency_profiles ADD COLUMN IF NOT EXISTS tier_manually_overridden boolean DEFAULT false;

CREATE TRIGGER agency_clients_tier_update AFTER INSERT OR UPDATE OR DELETE ON public.agency_clients FOR EACH ROW EXECUTE FUNCTION public.trigger_update_agency_tier();

CREATE POLICY "Host or participants can view meetings" ON public.meetings FOR SELECT TO authenticated USING (
  host_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.meeting_participants mp WHERE mp.meeting_id = meetings.id AND mp.user_id = auth.uid())
);

UPDATE storage.buckets SET public = false WHERE id = 'call-audio';

DROP POLICY IF EXISTS "Public read call-audio" ON storage.objects;

CREATE POLICY "Users read their own call audio" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'call-audio' AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Service role manages call audio" ON storage.objects FOR ALL TO service_role USING (bucket_id = 'call-audio') WITH CHECK (bucket_id = 'call-audio');