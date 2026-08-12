import {
  applicationDefault,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import type { FastifyReply, FastifyRequest } from "fastify";
import { config } from "../../config.js";
import { findUserByAuthId } from "./repository.js";
import type { ProviderIdentity, TrustedIdentity } from "./types.js";
import "./types.js";

if (getApps().length === 0) {
  initializeApp({
    credential: applicationDefault(),
    projectId: config.projectId,
  });
}

const providerNames = {
  password: "PASSWORD",
  email: "PASSWORD",
  "google.com": "GOOGLE",
  "facebook.com": "FACEBOOK",
} as const;

export function trustedProviderIdentities(
  decoded: TrustedIdentity,
): ProviderIdentity[] {
  const identities = decoded.firebase?.identities ?? {};
  const providers = Object.entries(identities).flatMap(([name, subjects]) => {
    const provider = providerNames[name as keyof typeof providerNames];
    if (!provider || !Array.isArray(subjects)) return [];
    return subjects
      .filter((subject): subject is string => typeof subject === "string")
      .map((subject) => ({
        provider,
        subject: provider === "PASSWORD" ? subject.toLowerCase() : subject,
      }));
  });
  const signInProvider =
    providerNames[
      decoded.firebase?.sign_in_provider as keyof typeof providerNames
    ];
  if (
    signInProvider &&
    !providers.some((identity) => identity.provider === signInProvider)
  ) {
    providers.push({
      provider: signInProvider,
      subject:
        signInProvider === "PASSWORD"
          ? (decoded.email?.toLowerCase() ?? decoded.uid)
          : decoded.uid,
    });
  }
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
    const decoded = await getAuth().verifyIdToken(header.slice(7));
    const email = decoded.email?.toLowerCase() ?? null;
    const user = await findUserByAuthId(decoded.uid);
    const emailVerified = decoded.email_verified === true;
    request.actor = {
      authId: decoded.uid,
      email,
      emailVerified,
      providers: trustedProviderIdentities(decoded),
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

export async function requireVerifiedEmail(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  await requireProfile(request, reply);
  if (reply.sent) return;
  if (!request.actor?.email || !request.actor.emailVerified) {
    return reply.code(403).send({
      error: {
        code: "EMAIL_VERIFICATION_REQUIRED",
        message: "Verify your email before checking out",
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
