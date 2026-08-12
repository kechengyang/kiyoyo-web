import type { FastifyInstance } from "fastify";
import { getAuth } from "firebase-admin/auth";
import { z } from "zod";
import { pool, query } from "../db.js";
import {
  requirePermission,
  requireRecentAdminAuth,
} from "../modules/auth/middleware.js";
import {
  isValidUsername,
  normalizeUsername,
  staffIdentityAlias,
  type StaffRole,
} from "./permissions.js";

const passwordSchema = z
  .string()
  .min(12)
  .max(128)
  .refine((value) => /[a-z]/.test(value), "Password needs a lowercase letter")
  .refine((value) => /[A-Z]/.test(value), "Password needs an uppercase letter")
  .refine((value) => /[0-9]/.test(value), "Password needs a number")
  .refine((value) => /[^A-Za-z0-9]/.test(value), "Password needs a symbol");

const roleScopeSchema = z
  .object({
    role: z.enum(["ADMIN", "OPERATOR"]),
    store_ids: z.array(z.string().uuid()).max(50).default([]),
  })
  .superRefine((value, context) => {
    if (value.role === "ADMIN" && value.store_ids.length) {
      context.addIssue({ code: "custom", path: ["store_ids"], message: "Admin cannot have store scope" });
    }
    if (value.role === "OPERATOR" && !value.store_ids.length) {
      context.addIssue({ code: "custom", path: ["store_ids"], message: "Operator needs at least one store" });
    }
  });

const uniqueStoreIds = (storeIds: string[]) => [...new Set(storeIds)];

async function assertStores(client: { query: typeof query }, role: StaffRole, storeIds: string[]) {
  if (role === "ADMIN") return [];
  const unique = uniqueStoreIds(storeIds).sort();
  const result = await client.query(
    "select id::text from stores where id=any($1::uuid[]) and status<>'INACTIVE' order by id",
    [unique],
  );
  if (result.rowCount !== unique.length) {
    const error = new Error("ROLE_SCOPE_INVALID");
    error.name = "ROLE_SCOPE_INVALID";
    throw error;
  }
  return unique;
}

const accessPreHandler = (permission: "access.create" | "access.update" | "access.remove" | "access.password_set") => [
  requirePermission(permission),
  requireRecentAdminAuth,
];

export function registerAdminAccessRoutes(app: FastifyInstance) {
  app.get(
    "/v1/admin/access/users",
    { preHandler: requirePermission("access.read") },
    async (request) => {
      const input = z
        .object({
          query: z.string().trim().max(100).optional(),
          role: z.enum(["ADMIN", "OPERATOR"]).optional(),
          status: z.enum(["ACTIVE", "REMOVED"]).optional(),
          store_id: z.string().uuid().optional(),
        })
        .parse(request.query);
      const term = input.query ? `%${input.query}%` : null;
      const result = await query(
        `select sa.user_id,sa.username,u.nickname,r.code as role,sa.status,
                sa.access_started_at,sa.access_ended_at,sa.access_end_reason,
                sa.created_at,sa.updated_at,
                coalesce(jsonb_agg(distinct jsonb_build_object('id',s.id,'code',s.code,'name',s.name,'area',s.area))
                  filter(where s.id is not null),'[]'::jsonb) as stores,
                coalesce((
                  select jsonb_agg(jsonb_build_object(
                    'id',sap.id,'started_at',sap.started_at,'ended_at',sap.ended_at,
                    'end_reason',sap.end_reason,'started_by',starter.nickname,'ended_by',ender.nickname
                  ) order by sap.started_at desc)
                  from staff_access_periods sap
                  left join users starter on starter.id=sap.started_by
                  left join users ender on ender.id=sap.ended_by
                  where sap.user_id=sa.user_id
                ),'[]'::jsonb) as access_periods
           from staff_accounts sa
           join users u on u.id=sa.user_id
           join roles r on r.id=sa.role_id
           left join staff_store_access ssa on ssa.user_id=sa.user_id
           left join stores s on s.id=ssa.store_id
          where ($1::text is null or sa.username ilike $1 or u.nickname ilike $1)
            and ($2::text is null or r.code=$2)
            and ($3::text is null or sa.status=$3)
            and ($4::uuid is null or exists(
              select 1 from staff_store_access scoped where scoped.user_id=sa.user_id and scoped.store_id=$4
            ))
          group by sa.user_id,u.nickname,r.code
          order by (sa.status='ACTIVE') desc,sa.updated_at desc`,
        [term, input.role ?? null, input.status ?? null, input.store_id ?? null],
      );
      return { data: result.rows };
    },
  );

  app.post(
    "/v1/admin/access/users",
    { preHandler: accessPreHandler("access.create") },
    async (request, reply) => {
      const input = roleScopeSchema
        .extend({
          username: z.string().trim().min(3).max(40),
          display_name: z.string().trim().min(1).max(80),
          password: passwordSchema,
          password_confirm: z.string(),
        })
        .superRefine((value, context) => {
          if (!isValidUsername(value.username)) {
            context.addIssue({ code: "custom", path: ["username"], message: "Use letters, numbers, dots, dashes or underscores" });
          }
          if (value.password !== value.password_confirm) {
            context.addIssue({ code: "custom", path: ["password_confirm"], message: "Passwords do not match" });
          }
        })
        .parse(request.body);
      const username = normalizeUsername(input.username);
      const alias = staffIdentityAlias(username);
      const existing = await query("select 1 from staff_accounts where lower(username)=lower($1)", [username]);
      if (existing.rowCount) {
        return reply.code(409).send({ error: { code: "USERNAME_EXISTS", message: "That username is already in use" } });
      }

      let identity: Awaited<ReturnType<ReturnType<typeof getAuth>["createUser"]>> | null = null;
      try {
        identity = await getAuth().createUser({
          email: alias,
          emailVerified: true,
          password: input.password,
          displayName: input.display_name,
        });
        const client = await pool.connect();
        try {
          await client.query("begin");
          const storeIds = await assertStores(client as { query: typeof query }, input.role, input.store_ids);
          const member = await client.query(
            `insert into users(external_auth_id,auth_provider,email,nickname,locale)
             values($1,'identity-platform',null,$2,'en') returning id`,
            [identity.uid, input.display_name],
          );
          const userId = member.rows[0].id;
          await client.query(
            `insert into staff_accounts(user_id,username,role_id,created_by,updated_by)
             select $1,$2,id,$3,$3 from roles where code=$4`,
            [userId, username, request.actor!.userId, input.role],
          );
          await client.query(
            "insert into staff_access_periods(user_id,started_by) values($1,$2)",
            [userId, request.actor!.userId],
          );
          for (const storeId of storeIds) {
            await client.query(
              "insert into staff_store_access(user_id,store_id,created_by) values($1,$2,$3)",
              [userId, storeId, request.actor!.userId],
            );
          }
          await client.query(
            `insert into audit_logs(actor_id,action,entity_type,entity_id,request_id,metadata_redacted_json)
             values($1,'STAFF_USER_CREATED','staff_account',$2,$3,$4)`,
            [request.actor!.userId, userId, request.id, { username, role: input.role, store_ids: storeIds }],
          );
          await client.query("commit");
          return reply.code(201).send({ data: { user_id: userId, username, role: input.role, store_ids: storeIds, status: "ACTIVE" } });
        } catch (error) {
          await client.query("rollback");
          throw error;
        } finally {
          client.release();
        }
      } catch (error: unknown) {
        if (identity) await getAuth().deleteUser(identity.uid).catch(() => undefined);
        if (error instanceof Error && error.name === "ROLE_SCOPE_INVALID") {
          return reply.code(409).send({ error: { code: "ROLE_SCOPE_INVALID", message: "Choose active stores for this Operator" } });
        }
        const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
        if (code.includes("email-already-exists")) {
          return reply.code(409).send({ error: { code: "USERNAME_EXISTS", message: "That username is already in use" } });
        }
        throw error;
      }
    },
  );

  app.patch(
    "/v1/admin/access/users/:userId",
    { preHandler: accessPreHandler("access.update") },
    async (request, reply) => {
      const { userId } = z.object({ userId: z.string().uuid() }).parse(request.params);
      const input = roleScopeSchema.extend({ restore: z.boolean().default(false) }).parse(request.body);
      if (userId === request.actor!.userId && input.role !== "ADMIN") {
        return reply.code(409).send({ error: { code: "SELF_ACCESS_CHANGE_FORBIDDEN", message: "You cannot change your own Admin role" } });
      }
      const client = await pool.connect();
      try {
        await client.query("begin");
        const currentResult = await client.query(
          `select sa.user_id,sa.username,sa.status,r.code as role
             from staff_accounts sa join roles r on r.id=sa.role_id
            where sa.user_id=$1 for update of sa`,
          [userId],
        );
        const current = currentResult.rows[0];
        if (!current) {
          await client.query("rollback");
          return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Staff account not found" } });
        }
        const currentStores = await client.query(
          "select store_id::text from staff_store_access where user_id=$1 order by store_id",
          [userId],
        );
        current.store_ids = currentStores.rows.map((row) => row.store_id);
        if (current.role === "ADMIN" && input.role !== "ADMIN" && current.status === "ACTIVE") {
          const admins = await client.query(
            `select sa.user_id from staff_accounts sa join roles r on r.id=sa.role_id
              where r.code='ADMIN' and sa.status='ACTIVE' for update of sa`,
          );
          if ((admins.rowCount ?? 0) <= 1) {
            await client.query("rollback");
            return reply.code(409).send({ error: { code: "LAST_ADMIN_REQUIRED", message: "At least one active Admin is required" } });
          }
        }
        const storeIds = await assertStores(client as { query: typeof query }, input.role, input.store_ids);
        if (current.status === "REMOVED" && !input.restore) {
          await client.query("rollback");
          return reply.code(409).send({ error: { code: "RESTORE_REQUIRED", message: "Restore access before editing this account" } });
        }
        await client.query(
          `update staff_accounts set role_id=(select id from roles where code=$2),
             status='ACTIVE',access_started_at=case when status='REMOVED' then now() else access_started_at end,
             access_ended_at=null,access_end_reason=null,removed_by=null,updated_by=$3,updated_at=now()
           where user_id=$1`,
          [userId, input.role, request.actor!.userId],
        );
        if (current.status === "REMOVED") {
          await client.query(
            "insert into staff_access_periods(user_id,started_by) values($1,$2)",
            [userId, request.actor!.userId],
          );
        }
        await client.query("delete from staff_store_access where user_id=$1", [userId]);
        for (const storeId of storeIds) {
          await client.query(
            "insert into staff_store_access(user_id,store_id,created_by) values($1,$2,$3)",
            [userId, storeId, request.actor!.userId],
          );
        }
        const metadata = { before: { role: current.role, store_ids: current.store_ids }, after: { role: input.role, store_ids: storeIds } };
        if (current.status === "REMOVED") {
          await client.query(
            `insert into audit_logs(actor_id,action,entity_type,entity_id,request_id,metadata_redacted_json)
             values($1,'STAFF_ACCESS_RESTORED','staff_account',$2,$3,$4)`,
            [request.actor!.userId, userId, request.id, metadata],
          );
        }
        if (current.role !== input.role) {
          await client.query(
            `insert into audit_logs(actor_id,action,entity_type,entity_id,request_id,metadata_redacted_json)
             values($1,'STAFF_ROLE_CHANGED','staff_account',$2,$3,$4)`,
            [request.actor!.userId, userId, request.id, metadata],
          );
        }
        if (JSON.stringify(current.store_ids) !== JSON.stringify(storeIds.slice().sort())) {
          await client.query(
            `insert into audit_logs(actor_id,action,entity_type,entity_id,request_id,metadata_redacted_json)
             values($1,'STAFF_STORE_SCOPE_CHANGED','staff_account',$2,$3,$4)`,
            [request.actor!.userId, userId, request.id, metadata],
          );
        }
        await client.query("commit");
        return { data: { user_id: userId, role: input.role, store_ids: storeIds, status: "ACTIVE" } };
      } catch (error) {
        await client.query("rollback");
        if (error instanceof Error && error.name === "ROLE_SCOPE_INVALID") {
          return reply.code(409).send({ error: { code: "ROLE_SCOPE_INVALID", message: "Choose active stores for this Operator" } });
        }
        throw error;
      } finally {
        client.release();
      }
    },
  );

  app.delete(
    "/v1/admin/access/users/:userId",
    { preHandler: accessPreHandler("access.remove") },
    async (request, reply) => {
      const { userId } = z.object({ userId: z.string().uuid() }).parse(request.params);
      const { reason } = z.object({ reason: z.string().trim().min(3).max(240) }).parse(request.body);
      if (userId === request.actor!.userId) {
        return reply.code(409).send({ error: { code: "SELF_ACCESS_CHANGE_FORBIDDEN", message: "You cannot remove your own access" } });
      }
      const client = await pool.connect();
      let authId: string | null = null;
      try {
        await client.query("begin");
        const targetResult = await client.query(
          `select sa.status,r.code as role,u.external_auth_id from staff_accounts sa
             join roles r on r.id=sa.role_id join users u on u.id=sa.user_id
            where sa.user_id=$1 for update of sa`,
          [userId],
        );
        const target = targetResult.rows[0];
        if (!target) {
          await client.query("rollback");
          return reply.code(404).send({ error: { code: "NOT_FOUND", message: "Staff account not found" } });
        }
        if (target.status === "REMOVED") {
          await client.query("rollback");
          return reply.code(409).send({ error: { code: "ACCESS_ALREADY_REMOVED", message: "Staff access is already removed" } });
        }
        if (target.role === "ADMIN") {
          const admins = await client.query(
            `select sa.user_id from staff_accounts sa join roles r on r.id=sa.role_id
              where r.code='ADMIN' and sa.status='ACTIVE' for update of sa`,
          );
          if ((admins.rowCount ?? 0) <= 1) {
            await client.query("rollback");
            return reply.code(409).send({ error: { code: "LAST_ADMIN_REQUIRED", message: "At least one active Admin is required" } });
          }
        }
        await client.query(
          `update staff_accounts set status='REMOVED',access_ended_at=now(),access_end_reason=$2,
             removed_by=$3,updated_by=$3,updated_at=now() where user_id=$1`,
          [userId, reason, request.actor!.userId],
        );
        await client.query(
          `update staff_access_periods set ended_at=now(),end_reason=$2,ended_by=$3
            where user_id=$1 and ended_at is null`,
          [userId, reason, request.actor!.userId],
        );
        await client.query(
          `insert into audit_logs(actor_id,action,entity_type,entity_id,request_id,metadata_redacted_json)
           values($1,'STAFF_ACCESS_REMOVED','staff_account',$2,$3,$4)`,
          [request.actor!.userId, userId, request.id, { reason }],
        );
        authId = target.external_auth_id;
        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw error;
      } finally {
        client.release();
      }
      if (authId) await getAuth().revokeRefreshTokens(authId);
      return reply.code(204).send();
    },
  );

  app.post(
    "/v1/admin/users/:userId/password",
    { preHandler: accessPreHandler("access.password_set") },
    async (request, reply) => {
      const { userId } = z.object({ userId: z.string().uuid() }).parse(request.params);
      const input = z
        .object({ password: passwordSchema, password_confirm: z.string(), reason: z.string().trim().min(3).max(240) })
        .superRefine((value, context) => {
          if (value.password !== value.password_confirm) {
            context.addIssue({ code: "custom", path: ["password_confirm"], message: "Passwords do not match" });
          }
        })
        .parse(request.body);
      const target = await query<{ external_auth_id: string }>("select external_auth_id from users where id=$1", [userId]);
      if (!target.rowCount) {
        return reply.code(404).send({ error: { code: "NOT_FOUND", message: "User not found" } });
      }
      const authId = target.rows[0].external_auth_id;
      await getAuth().updateUser(authId, { password: input.password });
      await getAuth().revokeRefreshTokens(authId);
      await query(
        `insert into audit_logs(actor_id,action,entity_type,entity_id,request_id,metadata_redacted_json)
         values($1,'USER_PASSWORD_SET_BY_ADMIN','user',$2,$3,$4)`,
        [request.actor!.userId, userId, request.id, { reason: input.reason, sessions_revoked: true }],
      );
      return { data: { user_id: userId, sessions_revoked: true } };
    },
  );

  app.get(
    "/v1/admin/audit-logs",
    { preHandler: requirePermission("audit.read") },
    async (request) => {
      const input = z.object({ limit: z.coerce.number().int().min(1).max(200).default(100) }).parse(request.query);
      const result = await query(
        `select al.id,al.action,al.entity_type,al.entity_id,al.store_id,al.request_id,
                al.metadata_redacted_json,al.created_at,u.nickname as actor_name,sa.username as actor_username
           from audit_logs al left join users u on u.id=al.actor_id
           left join staff_accounts sa on sa.user_id=al.actor_id
          order by al.created_at desc limit $1`,
        [input.limit],
      );
      return { data: result.rows };
    },
  );
}
