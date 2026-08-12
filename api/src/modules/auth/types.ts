import type { DecodedIdToken } from "firebase-admin/auth";

export type UserStatus = "ACTIVE" | "SUSPENDED" | "DELETED";
export type AuthProvider = "PASSWORD" | "GOOGLE" | "FACEBOOK";

export type ProviderIdentity = {
  provider: AuthProvider;
  subject: string;
};

export type AuthActor = {
  authId: string;
  email: string | null;
  emailVerified: boolean;
  providers: ProviderIdentity[];
  userId: string | null;
  status: UserStatus | null;
  isAdmin: boolean;
};

export type TrustedIdentity = Pick<
  DecodedIdToken,
  "uid" | "email" | "email_verified" | "firebase"
>;

declare module "fastify" {
  interface FastifyRequest {
    actor?: AuthActor;
  }
}
