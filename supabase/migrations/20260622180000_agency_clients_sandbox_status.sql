-- Sprint R fix: Sandbox client da agência deve ser invisível no dropdown
-- de clientes reais. Estende enum de status pra incluir 'sandbox' e migra
-- rows existentes que foram criadas erroneamente com status='active'.

-- 1. CHECK constraint antigo só aceita active|inactive|pending|suspended.
-- Substitui pra aceitar 'sandbox' também.
ALTER TABLE public.agency_clients
  DROP CONSTRAINT IF EXISTS agency_clients_status_check;

ALTER TABLE public.agency_clients
  ADD CONSTRAINT agency_clients_status_check
  CHECK (status IN ('active', 'inactive', 'pending', 'suspended', 'sandbox'));

-- 2. Trigger function também precisa aceitar (segunda camada de validação).
CREATE OR REPLACE FUNCTION public.validate_agency_client_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('active', 'inactive', 'pending', 'suspended', 'sandbox') THEN
    RAISE EXCEPTION 'Invalid client status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 3. Migra Sandbox/Testes rows existentes que ficaram com status='active'
-- (criadas antes desta migration). Identificadas pelo client_name padrão.
UPDATE public.agency_clients
SET status = 'sandbox'
WHERE client_name = 'Sandbox / Testes'
  AND status = 'active';
