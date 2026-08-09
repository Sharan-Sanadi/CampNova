import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { clerkPlugin } from "@clerk/fastify";
import Fastify, { type FastifyInstance } from "fastify";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "@fastify/type-provider-zod";

import { corsOrigins, env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { isMongoReady } from "./db/mongoose.js";
import { isRedisReady } from "./db/redis.js";
import { registerBullBoard } from "./jobs/bullboard.js";
import { registerMetrics } from "./shared/http/metrics.js";
import { registerErrorHandler } from "./shared/errors/error-handler.js";
import { registerRateLimit } from "./shared/middleware/rate-limit.js";
import { requireRole } from "./shared/middleware/auth.js";
import { approvalsRoutes } from "./modules/approvals/approvals.routes.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { bookingsRoutes } from "./modules/bookings/bookings.routes.js";
import { copilotRoutes } from "./modules/copilot/copilot.routes.js";
import { dashboardRoutes } from "./modules/dashboard/dashboard.routes.js";
import { datasetsRoutes } from "./modules/datasets/dataset.routes.js";
import { intelligenceRoutes } from "./modules/intelligence/intelligence.routes.js";
import { notificationsRoutes } from "./modules/notifications/notifications.routes.js";
import { resourcesRoutes } from "./modules/resources/resources.routes.js";
import { registerRealtime } from "./modules/realtime/realtime.gateway.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    loggerInstance: logger as any,
    trustProxy: true,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  registerErrorHandler(app as any);
  registerMetrics(app as any);

  await app.register(helmet);
  await app.register(cors, {
    origin: corsOrigins,
    credentials: true,
  });
  await app.register(cookie, { secret: env.COOKIE_SECRET });
  if (env.CLERK_SECRET_KEY && env.CLERK_PUBLISHABLE_KEY) {
    await app.register(clerkPlugin as any, {
      secretKey: env.CLERK_SECRET_KEY,
      publishableKey: env.CLERK_PUBLISHABLE_KEY,
    });
  }
  await registerRateLimit(app as any);
  await app.register(swagger, {
    openapi: {
      info: {
        title: "CampusOS AI API",
        version: "0.1.0",
        description: "Self-hostable campus facility booking and intelligence backend.",
      },
    },
    transform: jsonSchemaTransform,
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });

  app.get("/health", async () => ({ status: "ok" }));
  app.get("/ready", async (_request, reply) => {
    const [mongo, redis] = await Promise.all([isMongoReady(), isRedisReady()]);
    if (!mongo || !redis) {
      return reply.status(503).send({ status: "not_ready", checks: { mongo, redis } });
    }
    return { status: "ready", checks: { mongo, redis } };
  });

  app.addHook("preHandler", async (request, reply) => {
    if (request.url.startsWith("/admin/queues")) {
      await requireRole("CAMPUS_ADMIN")(request as any, reply as any);
    }
  });
  await registerBullBoard(app as any);

  await app.register(
    async (api) => {
      await api.register(authRoutes);
      await api.register(resourcesRoutes);
      await api.register(bookingsRoutes);
      await api.register(approvalsRoutes);
      await api.register(dashboardRoutes);
      await api.register(datasetsRoutes);
      await api.register(intelligenceRoutes);
      await api.register(notificationsRoutes);
      await api.register(copilotRoutes);
    },
    { prefix: "/api/v1" },
  );

  await registerRealtime(app as any);
  return app as any;
}
