export type AuthProvider = "password" | "google";

export type AuthSession = {
  uid: string;
  memberId: string;
  email: string | null;
  emailVerified: boolean;
  phoneNumber: string | null;
  phoneVerified: boolean;
  membershipReady: boolean;
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
  | "phoneInvalid"
  | "phoneInUse"
  | "codeInvalid"
  | "captcha"
  | "rateLimit"
  | "recentLogin"
  | "weakPassword"
  | "unknown";
