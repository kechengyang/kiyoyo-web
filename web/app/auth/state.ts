export type AuthPhase =
  | "loading"
  | "authenticated"
  | "signedOut"
  | "bootstrapError";

export const shouldClearMemberData = (phase: AuthPhase) =>
  phase === "signedOut";
