-- Partner tiers table
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

-- Validation trigger for tier values
CREATE OR REPLACE FUNCTION public.validate_partner_tier()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.tier NOT IN ('bronze','silver','gold','elite') THEN
    RAISE EXCEPTION 'Invalid partner tier: %', NEW.tier;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_partner_tier_before_insert_update
  BEFORE INSERT OR UPDATE ON public.partner_tiers
  FOR EACH ROW EXECUTE FUNCTION public.validate_partner_tier();

-- Updated_at trigger
CREATE TRIGGER update_partner_tiers_updated_at
  BEFORE UPDATE ON public.partner_tiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.partner_tiers ENABLE ROW LEVEL SECURITY;

-- Users can view their own tier
CREATE POLICY "Users can view own tier"
  ON public.partner_tiers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own tier (for auto-creation on first access)
CREATE POLICY "Users can insert own tier"
  ON public.partner_tiers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own tier metrics
CREATE POLICY "Users can update own tier"
  ON public.partner_tiers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role full access (for admin operations)
CREATE POLICY "Service role full access"
  ON public.partner_tiers FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);