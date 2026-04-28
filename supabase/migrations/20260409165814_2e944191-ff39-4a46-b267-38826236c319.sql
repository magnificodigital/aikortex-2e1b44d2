create or replace function public.add_to_wallet_consumed(user_uuid uuid, consumed integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  update agency_wallets
  set total_consumed = total_consumed + consumed,
      updated_at = now()
  where user_id = user_uuid;
end;
$$;