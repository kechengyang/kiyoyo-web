import { FirebaseError } from "firebase/app";
import type { AuthErrorCode } from "./types";

export function authErrorCode(error: unknown): AuthErrorCode {
  if (!(error instanceof FirebaseError)) return "unknown";
  const codes: Record<string, AuthErrorCode> = {
    "auth/account-exists-with-different-credential": "conflict",
    "auth/credential-already-in-use": "conflict",
    "auth/email-already-in-use": "emailInUse",
    "auth/invalid-credential": "credential",
    "auth/invalid-login-credentials": "credential",
    "auth/user-disabled": "disabled",
    "auth/network-request-failed": "network",
    "auth/operation-not-allowed": "provider",
    "auth/popup-blocked": "popup",
    "auth/popup-closed-by-user": "cancelled",
    "auth/too-many-requests": "rateLimit",
    "auth/weak-password": "weakPassword",
  };
  return codes[error.code] ?? "unknown";
}
