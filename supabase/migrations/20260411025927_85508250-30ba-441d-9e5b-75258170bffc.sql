ALTER TABLE public.partner_tiers ALTER COLUMN tier SET DEFAULT 'starter';

UPDATE public.partner_tiers SET tier = 'starter' WHERE tier = 'bronze';
UPDATE public.partner_tiers SET tier = 'explorer' WHERE tier = 'prata';
UPDATE public.partner_tiers SET tier = 'hack' WHERE tier = 'gold';