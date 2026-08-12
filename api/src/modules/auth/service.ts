import type { AuthActor } from "./types.js";
import { upsertUser } from "./repository.js";

export async function bootstrapUser(
  actor: AuthActor,
  input: { nickname?: string; locale: "en" | "zh" },
  saveUser = upsertUser,
) {
  const nickname =
    input.nickname ?? actor.email?.split("@")[0] ?? "KIYOYO Member";
  return saveUser({
    authId: actor.authId,
    email: actor.email,
    nickname,
    locale: input.locale,
    emailVerified: actor.emailVerified,
    providers: actor.providers,
  });
}
