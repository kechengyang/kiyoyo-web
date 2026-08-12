export type AuthProvider = "password" | "google" | "facebook";

export type AuthSession = {
  id: string;
  email: string;
  provider: AuthProvider;
};

export type AuthMode = "signin" | "signup";
