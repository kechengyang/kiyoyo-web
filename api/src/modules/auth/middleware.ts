import {
  applicationDefault,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import type { FastifyReply, FastifyRequest } from "fastify";
import { config } from "../../config.js";
import { findUserByAuthId } from "./repository.js";
import "./types.js";

if (getApps().length === 0) {
  initializeApp({
    credential: applicationDefault(),
    projectId: config.projectId,
  });
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
    const decoded = await getAuth().verifyIdToken(header.slice(7));
    const email = decoded.email?.toLowerCase() ?? null;
    const user = await findUserByAuthId(decoded.uid);
    const emailVerified = decoded.email_verified === true;
    request.actor = {
      authId: decoded.uid,
      email,
      emailVerified,
      userId: user?.id ?? null,
      status: user?.status ?? null,
      isAdmin:
        Boolean(decoded.admin) ||
        Boolean(emailVerified && email && config.adminEmails.has(email)),
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
  if (!request.actor?.isAdmin) {
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
