// @ts-ignore
import Redlock, { type Lock } from "redlock";

import { getRedis } from "../../db/redis.js";

let redlock: Redlock | undefined;

export function getRedlock(): Redlock {
  if (!redlock) {
    redlock = new Redlock([getRedis()], {
      retryCount: 8,
      retryDelay: 80,
      retryJitter: 40,
      automaticExtensionThreshold: 500,
    });
  }
  return redlock;
}

export async function withResourceDateLock<T>(
  resourceId: string,
  date: string,
  fn: (lock: Lock) => Promise<T>,
): Promise<T> {
  const key = `lock:resource:${resourceId}:${date}`;
  const lock = await getRedlock().acquire([key], 8_000);
  try {
    return await fn(lock);
  } finally {
    await lock.release().catch(() => undefined);
  }
}
