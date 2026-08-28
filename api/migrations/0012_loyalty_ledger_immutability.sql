create function protect_loyalty_transaction_ledger()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' and old.is_test then
    return old;
  end if;

  raise exception 'loyalty transaction ledger is immutable'
    using errcode = '55000';
end;
$$;

create trigger loyalty_transactions_immutable
before update or delete on loyalty_transactions
for each row execute function protect_loyalty_transaction_ledger();
