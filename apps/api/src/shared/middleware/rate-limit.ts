import type { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";

import { getRedis } from "../../db/redis.js";
import { logger } from "../../config/logger.js";

export async function registerRateLimit(app: FastifyInstance) {
  // Provide a Redis client only when one is reachable; fall back to in-process
  // memory store so startup does not fail when REDIS_URL is misconfigured.
  let redisClient: ReturnType<typeof getRedis> | undefined;
  try {
    redisClient = getRedis();
    await redisClient.ping();
  } catch {
    logger.warn("Redis unreachable — rate limiting will use in-memory store");
    redisClient = undefined;
  }

  await app.register(rateLimit, {
    ...(redisClient ? { redis: redisClient } : {}),
    global: false,
    errorResponseBuilder() {
      return { error: { code: "RATE_LIMITED", message: "Rate limit exceeded" } };
    },
  });
}
