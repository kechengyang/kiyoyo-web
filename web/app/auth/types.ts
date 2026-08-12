export type AuthProvider = "password" | "google" | "facebook";

export type AuthSession = {
  uid: string;
  memberId: string;
  email: string | null;
  emailVerified: boolean;
  providers: AuthProvider[];
  status: "ACTIVE" | "SUSPENDED" | "DELETED";
};

export type AuthMode = "signin" | "signup";

export type AuthErrorCode =
  | "cancelled"
  | "conflict"
  | "credential"
  | "disabled"
  | "emailInUse"
  | "network"
  | "popup"
  | "provider"
  | "rateLimit"
  | "recentLogin"
  | "weakPassword"
  | "unknown";
