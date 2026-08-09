import type { FastifyInstance } from "fastify";
import { createBullBoard } from "@bull-board/api";
// @ts-ignore
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter.js";
import { FastifyAdapter } from "@bull-board/fastify";

import { queues } from "./queues.js";

export async function registerBullBoard(app: FastifyInstance) {
  const serverAdapter = new FastifyAdapter();
  serverAdapter.setBasePath("/admin/queues");
  createBullBoard({
    queues: queues.map((queue) => new BullMQAdapter(queue)),
    serverAdapter,
  });
  await (serverAdapter as any).registerPlugin(app);
}
