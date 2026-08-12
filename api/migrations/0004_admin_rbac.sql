create table roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in ('ADMIN','OPERATOR')),
  name_en text not null,
  name_zh text not null,
  system boolean not null default true,
  created_at timestamptz not null default now()
);

insert into roles(code,name_en,name_zh) values
  ('ADMIN','Admin','管理员'),
  ('OPERATOR','Operator','门店运营')
on conflict(code) do update set name_en=excluded.name_en,name_zh=excluded.name_zh;

create table staff_accounts (
  user_id uuid primary key references users(id) on delete restrict,
  username text not null,
  role_id uuid not null references roles(id) on delete restrict,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','REMOVED')),
  access_started_at timestamptz not null default now(),
  access_ended_at timestamptz,
  access_end_reason text,
  created_by uuid references users(id),
  updated_by uuid references users(id),
  removed_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status='ACTIVE' and access_ended_at is null and access_end_reason is null and removed_by is null)
    or (status='REMOVED' and access_ended_at is not null and access_end_reason is not null and removed_by is not null)
  )
);

create unique index staff_accounts_username_unique on staff_accounts(lower(username));
create index staff_accounts_role_status_idx on staff_accounts(role_id,status);

create table staff_store_access (
  user_id uuid not null references staff_accounts(user_id) on delete restrict,
  store_id uuid not null references stores(id) on delete restrict,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  primary key(user_id,store_id)
);

create index staff_store_access_store_idx on staff_store_access(store_id,user_id);

create table staff_access_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references staff_accounts(user_id) on delete restrict,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  end_reason text,
  started_by uuid references users(id),
  ended_by uuid references users(id),
  created_at timestamptz not null default now(),
  check (
    (ended_at is null and end_reason is null and ended_by is null)
    or (ended_at is not null and end_reason is not null and ended_by is not null)
  )
);

create unique index staff_access_periods_one_active
  on staff_access_periods(user_id) where ended_at is null;
create index staff_access_periods_history_idx
  on staff_access_periods(user_id,started_at desc);
