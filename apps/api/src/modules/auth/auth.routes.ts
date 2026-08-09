import type { FastifyInstance } from "fastify";

import { requireAuth } from "../../shared/middleware/auth.js";
import { toPublicUser } from "./auth.service.js";

export async function authRoutes(app: FastifyInstance) {
  app.get(
    "/auth/me",
    {
      preHandler: requireAuth,
      schema: { tags: ["Auth"] },
    },
    async (request) => {
      return {
        user: toPublicUser({
          _id: request.user!.mongoId,
          clerkUserId: request.user!.clerkUserId,
          email: request.user!.email,
          name: request.user!.name,
          role: request.user!.role,
          department: request.user!.department,
          avatarUrl: null,
        }),
      };
    },
  );
}
