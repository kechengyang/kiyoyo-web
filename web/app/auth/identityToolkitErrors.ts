const firebaseCodes: Record<string, string> = {
  CREDENTIAL_TOO_OLD_LOGIN_AGAIN: "auth/requires-recent-login",
  EMAIL_EXISTS: "auth/email-already-in-use",
  FEDERATED_USER_ID_ALREADY_LINKED: "auth/credential-already-in-use",
  OPERATION_NOT_ALLOWED: "auth/operation-not-allowed",
  TOKEN_EXPIRED: "auth/user-token-expired",
  USER_DISABLED: "auth/user-disabled",
  WEAK_PASSWORD: "auth/weak-password",
};

export function identityToolkitFirebaseCode(message: unknown) {
  const toolkitCode = String(message ?? "").split(/[\s:]/, 1)[0];
  return firebaseCodes[toolkitCode] ?? "auth/internal-error";
}
