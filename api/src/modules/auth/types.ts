import type { DecodedIdToken } from "firebase-admin/auth";
import type { PermissionCode, StaffRole } from "../../admin/permissions.js";

export type UserStatus = "ACTIVE" | "SUSPENDED" | "DELETED";
export type AuthProvider = "PASSWORD" | "GOOGLE";

export type ProviderIdentity = {
  provider: AuthProvider;
  subject: string;
};

export type StaffActor = {
  username: string;
  role: StaffRole;
  status: "ACTIVE" | "REMOVED";
  storeIds: string[];
  permissions: PermissionCode[];
  legacy: boolean;
};

export type AuthActor = {
  authId: string;
  email: string | null;
  emailVerified: boolean;
  authTime: number;
  providers: ProviderIdentity[];
  userId: string | null;
  status: UserStatus | null;
  staff: StaffActor | null;
  isAdmin: boolean;
  legacyAdmin: boolean;
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
