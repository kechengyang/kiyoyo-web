import { getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import type { FastifyReply, FastifyRequest } from "fastify";
import { config } from "./config.js";
import { pool, query } from "./db.js";
import {
  canAccessStore,
  normalizeUsername,
  permissionsForRole,
  roleHasPermission,
  type PermissionCode,
  type StaffRole,
} from "./admin/permissions.js";

if (getApps().length === 0) {
  initializeApp({ credential: applicationDefault(), projectId: config.projectId });
}

export type StaffActor = {
  username: string;
  role: StaffRole;
  status: "ACTIVE" | "REMOVED";
  storeIds: string[];
  permissions: PermissionCode[];
  legacy: boolean;
};

export type RequestActor = {
  authId: string;
  email: string | null;
  emailVerified: boolean;
  authTime: number;
  userId: string | null;
  status: "ACTIVE" | "SUSPENDED" | "DELETED" | null;
  staff: StaffActor | null;
  isAdmin: boolean;
  legacyAdmin: boolean;
};

declare module "fastify" {
  interface FastifyRequest {
    actor?: RequestActor;
  }
}

type ActorRow = {
  id: string;
  status: "ACTIVE" | "SUSPENDED" | "DELETED";
  username: string | null;
  staff_status: "ACTIVE" | "REMOVED" | null;
  role: StaffRole | null;
  store_ids: string[] | null;
};

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return reply.code(401).send({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } });
  }

  try {
    const decoded = await getAuth().verifyIdToken(header.slice(7), true);
    const email = decoded.email?.toLowerCase() ?? null;
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
    const row = result.rows[0];
    const legacyClaim = Boolean(decoded.admin) || Boolean(email && config.adminEmails.has(email));
    const legacyAdmin = legacyClaim && !row?.staff_status;
    const role = row?.staff_status === "ACTIVE" ? row.role : legacyAdmin ? "ADMIN" : null;
    const staff = role
      ? {
          username: row?.username ?? email ?? `admin-${decoded.uid.slice(0, 8)}`,
          role,
          status: "ACTIVE" as const,
          storeIds: role === "ADMIN" ? [] : (row?.store_ids ?? []),
          permissions: permissionsForRole(role),
          legacy: legacyAdmin,
        }
      : null;
    request.actor = {
      authId: decoded.uid,
      email,
      emailVerified: decoded.email_verified === true,
      authTime: Number(decoded.auth_time ?? 0),
      userId: row?.id ?? null,
      status: row?.status ?? null,
      staff,
      isAdmin: role === "ADMIN",
      legacyAdmin,
    };
  } catch {
    return reply.code(401).send({ error: { code: "INVALID_TOKEN", message: "Session is invalid or expired" } });
  }
}

export async function requireProfile(request: FastifyRequest, reply: FastifyReply) {
  await authenticate(request, reply);
  if (reply.sent) return;
  if (!request.actor?.userId) {
    return reply.code(409).send({ error: { code: "PROFILE_REQUIRED", message: "Call /v1/auth/bootstrap first" } });
  }
  if (request.actor.status !== "ACTIVE") {
    return reply.code(403).send({ error: { code: "ACCOUNT_DISABLED", message: "This account is not active" } });
  }
}

export async function requireStaff(request: FastifyRequest, reply: FastifyReply) {
  await requireProfile(request, reply);
  if (reply.sent) return;
  if (!request.actor?.staff || request.actor.staff.status !== "ACTIVE") {
    return reply.code(403).send({
      error: { code: "STAFF_ACCESS_REQUIRED", message: "Active KIYOYO staff access is required" },
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
        error: { code: "PERMISSION_DENIED", message: "Your role does not allow this action" },
      });
    }
  };

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  await requireStaff(request, reply);
  if (reply.sent) return;
  if (request.actor!.staff!.role !== "ADMIN") {
    return reply.code(403).send({
      error: { code: "PERMISSION_DENIED", message: "Admin role required" },
    });
  }
}

export async function requireRecentAdminAuth(request: FastifyRequest, reply: FastifyReply) {
  if (!request.actor?.isAdmin) {
    return reply.code(403).send({ error: { code: "PERMISSION_DENIED", message: "Admin role required" } });
  }
  if (Math.floor(Date.now() / 1000) - request.actor.authTime > 5 * 60) {
    return reply.code(412).send({
      error: { code: "RECENT_AUTH_REQUIRED", message: "Sign in again before changing staff access" },
    });
  }
}

export const actorCanAccessStore = (request: FastifyRequest, storeId: string) => {
  const staff = request.actor?.staff;
  return Boolean(staff && canAccessStore(staff.role, staff.storeIds, storeId));
};

export async function ensureLegacyAdmin(userId: string, email: string | null, authId: string) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const current = await client.query("select 1 from staff_accounts where user_id=$1", [userId]);
    if (current.rowCount) {
      await client.query("commit");
      return;
    }
    const base = normalizeUsername(email?.split("@")[0] ?? `admin-${authId.slice(0, 8)}`)
      .replace(/[^a-z0-9._-]/g, "-")
      .slice(0, 32);
    const collision = await client.query("select 1 from staff_accounts where lower(username)=lower($1)", [base]);
    const username = collision.rowCount ? `${base}-${authId.slice(0, 6).toLowerCase()}` : base;
    const inserted = await client.query(
      `insert into staff_accounts(user_id,username,role_id,created_by,updated_by)
       select $1,$2,id,$1,$1 from roles where code='ADMIN'
       on conflict(user_id) do nothing returning user_id`,
      [userId, username],
    );
    if (inserted.rowCount) {
      await client.query(
        "insert into staff_access_periods(user_id,started_by) values($1,$1)",
        [userId],
      );
      await client.query(
        `insert into audit_logs(actor_id,action,entity_type,entity_id,metadata_redacted_json)
         values($1,'LEGACY_ADMIN_BACKFILLED','staff_account',$2,$3)`,
        [userId, userId, { username }],
      );
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
