-- Sprint R fix: Sandbox client da agência deve ser invisível no dropdown
-- de clientes reais. Estende enum de status pra incluir 'sandbox' e migra
-- rows existentes que foram criadas erroneamente com status='active'.

-- 1. Estende validation pra aceitar 'sandbox'
CREATE OR REPLACE FUNCTION public.validate_agency_client_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('active', 'inactive', 'pending', 'suspended', 'sandbox') THEN
    RAISE EXCEPTION 'Invalid client status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 2. Migra Sandbox/Testes rows existentes que ficaram com status='active'
-- (criadas antes desta migration). Identificadas pelo client_name padrão.
UPDATE public.agency_clients
SET status = 'sandbox'
WHERE client_name = 'Sandbox / Testes'
  AND status = 'active';
