import { Queue, Worker } from "bullmq";

import { getRedis } from "../db/redis.js";
import { logger } from "../config/logger.js";
import { commitDatasetJob, processDatasetJob } from "../modules/datasets/dataset.worker.js";

const connection = () => getRedis();

export const utilizationQueue = new Queue("utilization", { connection: connection() });
export const anomalyQueue = new Queue("anomaly-detection", { connection: connection() });
export const bookingExpiryQueue = new Queue("booking-expiry", { connection: connection() });
export const digestQueue = new Queue("notification-digest", { connection: connection() });
export const datasetProcessQueue = new Queue("dataset-process", { connection: connection() });
export const datasetCommitQueue = new Queue("dataset-commit", { connection: connection() });

export const queues = [
  utilizationQueue,
  anomalyQueue,
  bookingExpiryQueue,
  digestQueue,
  datasetProcessQueue,
  datasetCommitQueue,
];

export function startWorkers() {
  const workers = [
    new Worker(
      "utilization",
      async () => {
        logger.info("utilization recomputation job completed");
      },
      { connection: connection() },
    ),
    new Worker(
      "anomaly-detection",
      async () => {
        logger.info("anomaly sweep job completed");
      },
      { connection: connection() },
    ),
    new Worker(
      "booking-expiry",
      async () => {
        logger.info("booking expiry sweep job completed");
      },
      { connection: connection() },
    ),
    new Worker(
      "notification-digest",
      async () => {
        logger.info("notification digest job completed");
      },
      { connection: connection() },
    ),
    new Worker("dataset-process", processDatasetJob, { connection: connection(), concurrency: 2 }),
    new Worker("dataset-commit", commitDatasetJob, { connection: connection(), concurrency: 1 }),
  ];
  return workers;
}

export async function scheduleRecurringJobs() {
  await utilizationQueue.upsertJobScheduler("nightly-utilization", { pattern: "0 2 * * *" }, { name: "recompute" });
  await anomalyQueue.upsertJobScheduler("nightly-anomaly-sweep", { pattern: "15 2 * * *" }, { name: "sweep" });
  await bookingExpiryQueue.upsertJobScheduler("booking-auto-expiry", { every: 5 * 60 * 1000 }, { name: "expire-drafts" });
  await digestQueue.upsertJobScheduler("notification-digest", { pattern: "0 8 * * 1-5" }, { name: "digest" });
}
