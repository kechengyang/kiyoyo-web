alter table users
  add column email_verified_at timestamptz,
  add column last_login_at timestamptz;

create table user_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  provider text not null check (provider in ('PASSWORD','GOOGLE','FACEBOOK')),
  provider_subject text not null,
  linked_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unlinked_at timestamptz
);

create unique index user_identities_active_user_provider_unique
  on user_identities(user_id,provider)
  where unlinked_at is null;

create unique index user_identities_active_provider_subject_unique
  on user_identities(provider,provider_subject)
  where unlinked_at is null;

create index user_identities_user_idx
  on user_identities(user_id,linked_at);
