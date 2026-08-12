import {
  applicationDefault,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
  canAccessStore,
  permissionsForRole,
  roleHasPermission,
  type PermissionCode,
  type StaffRole,
} from "../../admin/permissions.js";
import { config } from "../../config.js";
import { query } from "../../db.js";
import type { AuthActor, ProviderIdentity, TrustedIdentity } from "./types.js";
import "./types.js";

if (getApps().length === 0) {
  initializeApp({
    credential: applicationDefault(),
    projectId: config.projectId,
  });
}

const providerNames = {
  "google.com": "GOOGLE",
  "facebook.com": "FACEBOOK",
} as const;

type ActorRow = {
  id: string;
  status: "ACTIVE" | "SUSPENDED" | "DELETED";
  username: string | null;
  staff_status: "ACTIVE" | "REMOVED" | null;
  role: StaffRole | null;
  store_ids: string[] | null;
};

export function trustedProviderIdentities(
  decoded: TrustedIdentity,
): ProviderIdentity[] {
  const identities = decoded.firebase?.identities ?? {};
  const providers = Object.entries(identities).flatMap(([name, subjects]) => {
    const provider = providerNames[name as keyof typeof providerNames];
    if (!provider || !Array.isArray(subjects)) return [];
    return subjects
      .filter((subject): subject is string => typeof subject === "string")
      .map((subject) => ({ provider, subject }));
  });
  return providers.filter(
    (identity, index, all) =>
      all.findIndex(
        (candidate) =>
          candidate.provider === identity.provider &&
          candidate.subject === identity.subject,
      ) === index,
  );
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return reply.code(401).send({
      error: { code: "UNAUTHENTICATED", message: "Sign in required" },
    });
  }

  try {
    const decoded = await getAuth().verifyIdToken(header.slice(7), true);
    const email = decoded.email?.toLowerCase() ?? null;
    const emailVerified = decoded.email_verified === true;
    const result = await query<ActorRow>(
      `select u.id,u.status,sa.username,sa.status as staff_status,r.code as role,
              coalesce(array_agg(ssa.store_id::text) filter(where ssa.store_id is not null),'{}') as store_ids
         from users u
         left join staff_accounts sa on sa.user_id=u.id
         left join roles r on r.id=sa.role_id
         left join staff_store_access ssa on ssa.user_id=sa.user_id
        where u.external_auth_id=$1
        group by u.id,sa.username,sa.status,r.code`,
      [decoded.uid],
    );
    const user = result.rows[0];
    const legacyClaim =
      Boolean(decoded.admin) ||
      Boolean(emailVerified && email && config.adminEmails.has(email));
    const legacyAdmin = legacyClaim && !user?.staff_status;
    const role =
      user?.staff_status === "ACTIVE"
        ? user.role
        : legacyAdmin
          ? "ADMIN"
          : null;
    const staff = role
      ? {
          username:
            user?.username ?? email ?? `admin-${decoded.uid.slice(0, 8)}`,
          role,
          status: "ACTIVE" as const,
          storeIds: role === "ADMIN" ? [] : (user?.store_ids ?? []),
          permissions: permissionsForRole(role),
          legacy: legacyAdmin,
        }
      : null;
    request.actor = {
      authId: decoded.uid,
      email,
      emailVerified,
      authTime: Number(decoded.auth_time ?? 0),
      providers: trustedProviderIdentities(decoded),
      userId: user?.id ?? null,
      status: user?.status ?? null,
      staff,
      isAdmin: role === "ADMIN",
      legacyAdmin,
    };
  } catch {
    return reply.code(401).send({
      error: {
        code: "INVALID_TOKEN",
        message: "Session is invalid or expired",
      },
    });
  }
}

export async function requireVerifiedEmail(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  await requireProfile(request, reply);
  if (reply.sent) return;
  const verificationError = verifiedEmailError(request.actor);
  if (verificationError) {
    return reply.code(403).send({
      error: verificationError,
    });
  }
}

export function verifiedEmailError(actor: AuthActor | undefined) {
  if (actor?.email && actor.emailVerified) return null;
  return {
    code: "EMAIL_VERIFICATION_REQUIRED" as const,
    message: "Verify your email before checking out",
  };
}

export async function requireProfile(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  await authenticate(request, reply);
  if (reply.sent) return;
  if (!request.actor?.userId) {
    return reply.code(409).send({
      error: {
        code: "PROFILE_REQUIRED",
        message: "Call /v1/auth/bootstrap first",
      },
    });
  }
  if (request.actor.status !== "ACTIVE") {
    return reply.code(403).send({
      error: {
        code: "ACCOUNT_DISABLED",
        message: "This account is not active",
      },
    });
  }
}

export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  await requireProfile(request, reply);
  if (reply.sent) return;
  if (!request.actor?.staff || request.actor.staff.role !== "ADMIN") {
    return reply.code(403).send({
      error: {
        code: request.actor?.emailVerified
          ? "FORBIDDEN"
          : "EMAIL_VERIFICATION_REQUIRED",
        message: request.actor?.emailVerified
          ? "Admin access required"
          : "Verify your email before accessing Admin",
      },
    });
  }
}

export async function requireStaff(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  await requireProfile(request, reply);
  if (reply.sent) return;
  if (!request.actor?.staff || request.actor.staff.status !== "ACTIVE") {
    return reply.code(403).send({
      error: {
        code: "STAFF_ACCESS_REQUIRED",
        message: "Active KIYOYO staff access is required",
      },
    });
  }
}

export const requirePermission = (permission: PermissionCode) =>
  async (request: FastifyRequest, reply: FastifyReply) => {
    await requireStaff(request, reply);
    if (reply.sent) return;
    const role = request.actor!.staff!.role;
    if (!roleHasPermission(role, permission)) {
      return reply.code(403).send({
        error: {
          code: "PERMISSION_DENIED",
          message: "Your role does not allow this action",
        },
      });
    }
  };

export async function requireRecentAdminAuth(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!request.actor?.isAdmin) {
    return reply.code(403).send({
      error: { code: "PERMISSION_DENIED", message: "Admin role required" },
    });
  }
  if (Math.floor(Date.now() / 1000) - request.actor.authTime > 5 * 60) {
    return reply.code(412).send({
      error: {
        code: "RECENT_AUTH_REQUIRED",
        message: "Sign in again before changing staff access",
      },
    });
  }
}

export const actorCanAccessStore = (
  request: FastifyRequest,
  storeId: string,
) => {
  const staff = request.actor?.staff;
  return Boolean(staff && canAccessStore(staff.role, staff.storeIds, storeId));
};
