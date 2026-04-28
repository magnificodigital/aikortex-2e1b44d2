
-- Carteira de créditos por agência
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

-- Pacotes disponíveis para compra
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

-- Histórico de transações
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

-- Validation trigger for transaction type (instead of CHECK constraint)
CREATE OR REPLACE FUNCTION public.validate_credit_transaction_type()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  IF NEW.type NOT IN ('purchase','consumption','refund','bonus','manual') THEN
    RAISE EXCEPTION 'Invalid credit transaction type: %', NEW.type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_credit_transaction_type_trigger
  BEFORE INSERT OR UPDATE ON public.credit_transactions
  FOR EACH ROW EXECUTE FUNCTION public.validate_credit_transaction_type();

-- RLS
ALTER TABLE public.agency_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- agency_wallets policies
CREATE POLICY "Users can view own wallet" ON public.agency_wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own wallet" ON public.agency_wallets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role manages wallets" ON public.agency_wallets FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Platform admins view all wallets" ON public.agency_wallets FOR SELECT TO authenticated USING (public.is_platform_user(auth.uid()));
CREATE POLICY "Platform admins update all wallets" ON public.agency_wallets FOR UPDATE TO authenticated USING (public.is_platform_user(auth.uid()));
CREATE POLICY "Platform admins insert wallets" ON public.agency_wallets FOR INSERT TO authenticated WITH CHECK (public.is_platform_user(auth.uid()));

-- credit_packages policies
CREATE POLICY "Anyone can view active packages" ON public.credit_packages FOR SELECT USING (is_active = true);
CREATE POLICY "Platform admins manage packages" ON public.credit_packages FOR ALL TO authenticated USING (public.is_platform_user(auth.uid())) WITH CHECK (public.is_platform_user(auth.uid()));

-- credit_transactions policies
CREATE POLICY "Users view own transactions" ON public.credit_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own transactions" ON public.credit_transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Platform admins manage all transactions" ON public.credit_transactions FOR ALL TO authenticated USING (public.is_platform_user(auth.uid())) WITH CHECK (public.is_platform_user(auth.uid()));
CREATE POLICY "Service role manages transactions" ON public.credit_transactions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Auto-create wallet on profile creation (can't use auth.users trigger)
CREATE OR REPLACE FUNCTION public.create_wallet_on_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  INSERT INTO public.agency_wallets (user_id, balance) VALUES (NEW.user_id, 100)
  ON CONFLICT (user_id) DO NOTHING;
  
  IF FOUND THEN
    INSERT INTO public.credit_transactions (user_id, type, amount, balance_after, description)
    VALUES (NEW.user_id, 'bonus', 100, 100, 'Bônus de boas-vindas — 100 créditos grátis');
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_wallet
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_wallet_on_signup();

-- Updated_at trigger for wallets
CREATE TRIGGER update_agency_wallets_updated_at
  BEFORE UPDATE ON public.agency_wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed: pacotes padrão
INSERT INTO public.credit_packages (name, credits, price_brl, is_featured, sort_order) VALUES
('Starter',  500,   29.00, false, 1),
('Basic',   1500,   79.00, true,  2),
('Pro',     4000,  179.00, false, 3),
('Business',12000, 449.00, false, 4);
