import type { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";

import { getRedis } from "../../db/redis.js";

export async function registerRateLimit(app: FastifyInstance) {
  await app.register(rateLimit, {
    redis: getRedis(),
    global: false,
    errorResponseBuilder() {
      return { error: { code: "RATE_LIMITED", message: "Rate limit exceeded" } };
    },
  });
}
