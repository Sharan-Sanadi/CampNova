import IORedisModule, { type Redis } from "ioredis";

import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

const RedisCtor: any = (IORedisModule as any).default || IORedisModule;

let redis: Redis | undefined;

export function getRedis(): Redis {
  if (!redis) {
    const client = new RedisCtor(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    client.on("error", (error: any) => logger.error({ err: error }, "redis error"));
    redis = client;
  }
  return redis!;
}

export function setRedisForTests(client: Redis | undefined): void {
  redis = client;
}

export async function closeRedis(): Promise<void> {
  if (!redis) return;
  await redis.quit();
  redis = undefined;
}

export async function isRedisReady(): Promise<boolean> {
  try {
    return (await getRedis().ping()) === "PONG";
  } catch {
    return false;
  }
}
