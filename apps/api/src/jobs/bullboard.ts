import type { FastifyInstance } from "fastify";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { FastifyAdapter } from "@bull-board/fastify";

import { getAllQueues } from "./queues.js";
import { logger } from "../config/logger.js";

export async function registerBullBoard(app: FastifyInstance) {
  const serverAdapter = new FastifyAdapter();
  serverAdapter.setBasePath("/admin/queues");

  // getAllQueues() opens Redis lazily — guard so a missing REDIS_URL at boot
  // does not prevent the rest of the app from starting.
  let queues: ReturnType<typeof getAllQueues> = [];
  try {
    queues = getAllQueues();
  } catch (err) {
    logger.warn({ err }, "BullBoard: could not initialise queues — Redis may be unavailable");
  }

  createBullBoard({
    queues: queues.map((queue) => new BullMQAdapter(queue)),
    serverAdapter,
  });
  await (serverAdapter as any).registerPlugin(app);
}

