alter table products
  add column if not exists size_prices_json jsonb not null default '{}'::jsonb;

alter table products
  add constraint products_size_prices_object
  check (jsonb_typeof(size_prices_json) = 'object');
