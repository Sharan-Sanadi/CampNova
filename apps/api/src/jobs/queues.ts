import { Queue, Worker } from "bullmq";

import { getRedis } from "../db/redis.js";
import { logger } from "../config/logger.js";
import { commitDatasetJob, processDatasetJob } from "../modules/datasets/dataset.worker.js";

// ── Lazy queue registry ─────────────────────────────────────────────────────
// Queues are NOT created at module load time so that importing this file does
// NOT open Redis connections. They are created on first call only.
type QueueMap = {
  utilization: Queue;
  anomalyDetection: Queue;
  bookingExpiry: Queue;
  notificationDigest: Queue;
  datasetProcess: Queue;
  datasetCommit: Queue;
};

let _queueMap: QueueMap | null = null;

function getQueueMap(): QueueMap {
  if (!_queueMap) {
    const conn = getRedis();
    _queueMap = {
      utilization:        new Queue("utilization",         { connection: conn }),
      anomalyDetection:   new Queue("anomaly-detection",   { connection: conn }),
      bookingExpiry:      new Queue("booking-expiry",      { connection: conn }),
      notificationDigest: new Queue("notification-digest", { connection: conn }),
      datasetProcess:     new Queue("dataset-process",     { connection: conn }),
      datasetCommit:      new Queue("dataset-commit",      { connection: conn }),
    };
  }
  return _queueMap;
}

// Named getters — safe, no index access
export const getUtilizationQueue    = () => getQueueMap().utilization;
export const getAnomalyQueue        = () => getQueueMap().anomalyDetection;
export const getBookingExpiryQueue  = () => getQueueMap().bookingExpiry;
export const getDigestQueue         = () => getQueueMap().notificationDigest;
export const getDatasetProcessQueue = () => getQueueMap().datasetProcess;
export const getDatasetCommitQueue  = () => getQueueMap().datasetCommit;

// Used by bullboard (lazy)
export function getAllQueues(): Queue[] {
  const m = getQueueMap();
  return [
    m.utilization,
    m.anomalyDetection,
    m.bookingExpiry,
    m.notificationDigest,
    m.datasetProcess,
    m.datasetCommit,
  ];
}

export function startWorkers() {
  const conn = getRedis();
  return [
    new Worker(
      "utilization",
      async () => { logger.info("utilization recomputation job completed"); },
      { connection: conn },
    ),
    new Worker(
      "anomaly-detection",
      async () => { logger.info("anomaly sweep job completed"); },
      { connection: conn },
    ),
    new Worker(
      "booking-expiry",
      async () => { logger.info("booking expiry sweep job completed"); },
      { connection: conn },
    ),
    new Worker(
      "notification-digest",
      async () => { logger.info("notification digest job completed"); },
      { connection: conn },
    ),
    new Worker("dataset-process", processDatasetJob, { connection: conn, concurrency: 2 }),
    new Worker("dataset-commit",  commitDatasetJob,  { connection: conn, concurrency: 1 }),
  ];
}

export async function scheduleRecurringJobs() {
  const m = getQueueMap();
  await m.utilization.upsertJobScheduler(        "nightly-utilization",  { pattern: "0 2 * * *" },     { name: "recompute" });
  await m.anomalyDetection.upsertJobScheduler(   "nightly-anomaly-sweep",{ pattern: "15 2 * * *" },    { name: "sweep" });
  await m.bookingExpiry.upsertJobScheduler(      "booking-auto-expiry",  { every: 5 * 60 * 1000 },    { name: "expire-drafts" });
  await m.notificationDigest.upsertJobScheduler( "notification-digest",  { pattern: "0 8 * * 1-5" },  { name: "digest" });
}
