import type { AuthUser } from "../shared/middleware/auth.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
    clerk?: {
      userId: string;
      sessionId: string | null;
      organizationId: string | null;
    };
  }
}
