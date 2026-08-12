import { query } from "../../db.js";
import type { UserStatus } from "./types.js";

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
}) {
  const result = await query(
    `insert into users(external_auth_id,auth_provider,email,nickname,locale)
     values($1,'identity-platform',$2,$3,$4)
     on conflict(external_auth_id) do update set email=excluded.email,updated_at=now()
     returning id,external_auth_id,email,nickname,gender,birth_year,locale,status,created_at`,
    [input.authId, input.email, input.nickname, input.locale],
  );
  return result.rows[0];
}
