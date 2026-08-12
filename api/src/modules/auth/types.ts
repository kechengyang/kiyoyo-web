import type { DecodedIdToken } from "firebase-admin/auth";

export type UserStatus = "ACTIVE" | "SUSPENDED" | "DELETED";

export type AuthActor = {
  authId: string;
  email: string | null;
  emailVerified: boolean;
  userId: string | null;
  status: UserStatus | null;
  isAdmin: boolean;
};

export type TrustedIdentity = Pick<
  DecodedIdToken,
  "uid" | "email" | "email_verified"
>;

declare module "fastify" {
  interface FastifyRequest {
    actor?: AuthActor;
  }
}
