alter table users
  add column phone_e164 text,
  add column phone_verified_at timestamptz,
  add constraint users_phone_e164_format_check
    check (phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  add constraint users_phone_verification_consistency_check
    check ((phone_e164 is null) = (phone_verified_at is null));

create unique index users_phone_e164_unique
  on users(phone_e164)
  where phone_e164 is not null;
