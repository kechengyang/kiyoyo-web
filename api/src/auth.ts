import { cert, getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import type { FastifyReply, FastifyRequest } from "fastify";
import { config } from "./config.js";
import { query } from "./db.js";

if (getApps().length === 0) {
  initializeApp({ credential: applicationDefault(), projectId: config.projectId });
}

declare module "fastify" {
  interface FastifyRequest {
    actor?: {
      authId: string;
      email: string | null;
      userId: string | null;
      isAdmin: boolean;
    };
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return reply.code(401).send({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } });
  }

  try {
    const decoded = await getAuth().verifyIdToken(header.slice(7));
    const email = decoded.email?.toLowerCase() ?? null;
    const result = await query<{ id: string }>("select id from users where external_auth_id = $1", [decoded.uid]);
    request.actor = {
      authId: decoded.uid,
      email,
      userId: result.rows[0]?.id ?? null,
      isAdmin: Boolean(decoded.admin) || Boolean(email && config.adminEmails.has(email)),
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
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  await requireProfile(request, reply);
  if (reply.sent) return;
  if (!request.actor?.isAdmin) {
    return reply.code(403).send({ error: { code: "FORBIDDEN", message: "Admin access required" } });
  }
}
