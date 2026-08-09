import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { requireAuth } from "../../shared/middleware/auth.js";
import { runCopilot } from "./copilot.service.js";

const querySchema = z.object({
  query: z.string().min(1),
  sessionId: z.string().optional(),
});

export async function copilotRoutes(app: FastifyInstance) {
  app.post(
    "/copilot/query",
    {
      preHandler: requireAuth,
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
      schema: { tags: ["Copilot"], body: querySchema },
    },
    async (request) => {
      const body = querySchema.parse(request.body);
      return runCopilot(body.query, request.user!, body.sessionId);
    },
  );
}
