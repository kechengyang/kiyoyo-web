import type { AuthActor } from "./types.js";
import { upsertUser } from "./repository.js";
import { normalizeUsername } from "../../admin/permissions.js";
import { pool } from "../../db.js";

export async function bootstrapUser(
  actor: AuthActor,
  input: { nickname?: string; locale: "en" | "zh" },
  saveUser = upsertUser,
) {
  const nickname =
    input.nickname ?? actor.email?.split("@")[0] ?? "KIYOYO Member";
  const user = await saveUser({
    authId: actor.authId,
    email: actor.email,
    nickname,
    locale: input.locale,
    emailVerified: actor.emailVerified,
    providers: actor.providers,
  });
  if (actor.legacyAdmin && typeof user.id === "string") {
    await ensureLegacyAdmin(user.id, actor.email, actor.authId);
  }
  return user;
}

export async function ensureLegacyAdmin(
  userId: string,
  email: string | null,
  authId: string,
) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const current = await client.query(
      "select 1 from staff_accounts where user_id=$1",
      [userId],
    );
    if (current.rowCount) {
      await client.query("commit");
      return;
    }
    const base = normalizeUsername(
      email?.split("@")[0] ?? `admin-${authId.slice(0, 8)}`,
    )
      .replace(/[^a-z0-9._-]/g, "-")
      .slice(0, 32);
    const collision = await client.query(
      "select 1 from staff_accounts where lower(username)=lower($1)",
      [base],
    );
    const username = collision.rowCount
      ? `${base}-${authId.slice(0, 6).toLowerCase()}`
      : base;
    const inserted = await client.query(
      `insert into staff_accounts(user_id,username,role_id,created_by,updated_by)
       select $1,$2,id,$1,$1 from roles where code='ADMIN'
       on conflict(user_id) do nothing returning user_id`,
      [userId, username],
    );
    if (inserted.rowCount) {
      await client.query(
        "insert into staff_access_periods(user_id,started_by) values($1,$1)",
        [userId],
      );
      await client.query(
        `insert into audit_logs(actor_id,action,entity_type,entity_id,metadata_redacted_json)
         values($1,'LEGACY_ADMIN_BACKFILLED','staff_account',$2,$3)`,
        [userId, userId, { username }],
      );
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
