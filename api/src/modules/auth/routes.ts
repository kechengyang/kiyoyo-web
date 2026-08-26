import type { FastifyInstance } from "fastify";
import { authenticate } from "./middleware.js";
import { bootstrapSchema } from "./schemas.js";
import { bootstrapUser } from "./service.js";
import type { AuthActor } from "./types.js";

type AuthRouteDependencies = {
  authenticate: typeof authenticate;
  bootstrapUser: (
    actor: AuthActor,
    input: { nickname?: string; locale: "en" | "zh" },
  ) => Promise<Record<string, unknown>>;
};

export function registerAuthRoutes(
  app: FastifyInstance,
  dependencies: AuthRouteDependencies = { authenticate, bootstrapUser },
) {
  app.post(
    "/v1/auth/bootstrap",
    { preHandler: dependencies.authenticate },
    async (request) => {
      const input = bootstrapSchema.parse(request.body ?? {});
      const actor = request.actor!;
      const user = await dependencies.bootstrapUser(actor, input);
      return {
        data: user,
        auth: {
          uid: actor.authId,
          emailVerified: actor.emailVerified,
          phoneNumber: actor.phoneNumber,
          phoneVerified: actor.phoneVerified,
          membershipReady:
            Boolean(actor.email && actor.emailVerified) && actor.phoneVerified,
          providers: actor.providers.map((identity) => identity.provider),
        },
        permissions: { admin: actor.isAdmin },
      };
    },
  );
}
