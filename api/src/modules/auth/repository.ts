import { pool, query } from "../../db.js";
import type { ProviderIdentity, UserStatus } from "./types.js";

export async function findUserByAuthId(authId: string) {
  const result = await query<{ id: string; status: UserStatus }>(
    "select id,status from users where external_auth_id = $1",
    [authId],
  );
  return result.rows[0] ?? null;
}

export async function upsertUser(input: {
  authId: string;
  email: string | null;
  nickname: string;
  locale: "en" | "zh";
  emailVerified: boolean;
  providers: ProviderIdentity[];
}) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await client.query(
      `insert into users(external_auth_id,auth_provider,email,nickname,locale,email_verified_at,last_login_at)
       values($1,'identity-platform',$2,$3,$4,case when $5 then now() else null end,now())
       on conflict(external_auth_id) do update set
         email=excluded.email,
         email_verified_at=case when $5 then coalesce(users.email_verified_at,now()) else null end,
         last_login_at=now(),
         updated_at=now()
       returning id,external_auth_id,email,nickname,gender,birth_year,locale,status,
         email_verified_at,last_login_at,created_at`,
      [
        input.authId,
        input.email,
        input.nickname,
        input.locale,
        input.emailVerified,
      ],
    );
    const user = result.rows[0];
    const providerNames = input.providers.map((identity) => identity.provider);
    await client.query(
      `update user_identities set unlinked_at=now()
       where user_id=$1 and unlinked_at is null and not(provider=any($2::text[]))`,
      [user.id, providerNames],
    );
    for (const identity of input.providers) {
      await client.query(
        `update user_identities set unlinked_at=now()
         where user_id=$1 and provider=$2 and provider_subject<>$3 and unlinked_at is null`,
        [user.id, identity.provider, identity.subject],
      );
      const identityResult = await client.query(
        `insert into user_identities(user_id,provider,provider_subject)
         values($1,$2,$3)
         on conflict(provider,provider_subject) where unlinked_at is null
         do update set last_seen_at=now()
         where user_identities.user_id=excluded.user_id
         returning user_id`,
        [user.id, identity.provider, identity.subject],
      );
      if (!identityResult.rowCount) {
        throw new Error("IDENTITY_ALREADY_LINKED_TO_ANOTHER_USER");
      }
    }
    await client.query("commit");
    return user;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function listActiveProviders(userId: string) {
  const result = await query<{ provider: ProviderIdentity["provider"] }>(
    `select provider from user_identities
     where user_id=$1 and unlinked_at is null order by linked_at`,
    [userId],
  );
  return result.rows.map((row) => row.provider);
}
