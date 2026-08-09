import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { connectMongo } from "./db/mongoose.js";
import { scheduleRecurringJobs, startWorkers } from "./jobs/queues.js";

await connectMongo();

const app = await buildApp();
await app.listen({ host: env.HOST, port: env.PORT });
logger.info({ host: env.HOST, port: env.PORT }, "CampusOS API listening");

let workers: any[] = [];
try {
  await scheduleRecurringJobs();
  workers = startWorkers();
} catch (err) {
  logger.error({ err }, "Background queue workers initialization failed or deferred");
}

const close = async () => {
  await Promise.allSettled(workers.map((worker) => worker.close()));
  await app.close();
};

process.on("SIGINT", () => void close().then(() => process.exit(0)));
process.on("SIGTERM", () => void close().then(() => process.exit(0)));

