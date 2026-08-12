import type { FastifyInstance } from "fastify";
import { authenticate } from "./middleware.js";
import { bootstrapSchema } from "./schemas.js";
import { bootstrapUser } from "./service.js";

export function registerAuthRoutes(app: FastifyInstance) {
  app.post(
    "/v1/auth/bootstrap",
    { preHandler: authenticate },
    async (request) => {
      const input = bootstrapSchema.parse(request.body ?? {});
      const actor = request.actor!;
      const user = await bootstrapUser(actor, input);
      return {
        data: user,
        auth: {
          uid: actor.authId,
          emailVerified: actor.emailVerified,
          providers: actor.providers.map((identity) => identity.provider),
        },
        permissions: { admin: actor.isAdmin },
      };
    },
  );
}
