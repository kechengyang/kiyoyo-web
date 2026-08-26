import { FirebaseError } from "firebase/app";
import type { AuthErrorCode } from "./types";

export function authErrorCode(error: unknown): AuthErrorCode {
  if (!(error instanceof FirebaseError)) return "unknown";
  const codes: Record<string, AuthErrorCode> = {
    "auth/account-exists-with-different-credential": "conflict",
    "auth/credential-already-in-use": "conflict",
    "auth/phone-number-already-exists": "phoneInUse",
    "auth/email-already-in-use": "emailInUse",
    "auth/invalid-credential": "credential",
    "auth/invalid-login-credentials": "credential",
    "auth/user-disabled": "disabled",
    "auth/network-request-failed": "network",
    "auth/operation-not-allowed": "provider",
    "auth/invalid-phone-number": "phoneInvalid",
    "auth/missing-phone-number": "phoneInvalid",
    "auth/invalid-verification-code": "codeInvalid",
    "auth/code-expired": "codeInvalid",
    "auth/captcha-check-failed": "captcha",
    "auth/missing-app-credential": "captcha",
    "auth/quota-exceeded": "rateLimit",
    "auth/popup-blocked": "popup",
    "auth/popup-closed-by-user": "cancelled",
    "auth/requires-recent-login": "recentLogin",
    "auth/too-many-requests": "rateLimit",
    "auth/weak-password": "weakPassword",
  };
  return codes[error.code] ?? "unknown";
}
