import { randomUUID } from "node:crypto";

import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { env } from "../../config/env.js";
import { getRedis } from "../../db/redis.js";
import { datasetCommitQueue, datasetProcessQueue } from "../../jobs/queues.js";
import { conflict, notFound, validation } from "../../shared/errors/AppError.js";
import { requireRole } from "../../shared/middleware/auth.js";
import { rollbackDatasetImport } from "./dataset.importer.js";
import {
  applyDatasetMappingOverride,
  buildErrorReportCsv,
  campusDataHealth,
  datasetPreviewDto,
  datasetStatusDto,
  getDatasetImportForUser,
  listDatasetImportsForUser,
  analyzeDatasetImport,
  createDatasetUpload,
} from "./dataset.service.js";
import { datasetTargetFields } from "./dataset.types.js";

const uploadContentTypes = [
  "text/csv",
  "text/plain",
  "application/csv",
  "application/pdf",
  "application/octet-stream",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const activeStatuses = ["UPLOADED", "PROCESSING", "VALIDATING", "READY_FOR_REVIEW", "IMPORTING"];
const mappingBodySchema = z.object({
  mappings: z.array(
    z.object({
      sourceField: z.string().min(1),
      targetField: z.enum(datasetTargetFields),
    }),
  ),
});
const commitBodySchema = z
  .object({
    strategy: z.enum(["MERGE", "APPEND", "REPLACE_DATASET"]).default("MERGE"),
    importValidRecordsOnly: z.boolean().default(true),
  })
  .default({ strategy: "MERGE", importValidRecordsOnly: true });

function headerString(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

async function ensureNoActiveCampusImport(campusId: string, exceptId?: string) {
  const { DatasetImport } = await import("../../db/models.js");
  const active = (await DatasetImport.findOne({
    campusId,
    status: { $in: activeStatuses },
    ...(exceptId ? { _id: { $ne: exceptId } } : {}),
  }).lean()) as any;
  if (active) {
    throw conflict("Another campus data import is currently in progress.", {
      datasetImportId: String(active._id),
      status: active.status,
    });
  }
}

async function acquireImportLock(campusId: string): Promise<{ key: string; token: string }> {
  const key = `dataset:import:${campusId}`;
  const token = randomUUID();
  const acquired = await getRedis().set(key, token, "EX", 30 * 60, "NX");
  if (acquired !== "OK") {
    throw conflict("Another campus data import is currently in progress.");
  }
  return { key, token };
}

export async function datasetsRoutes(app: FastifyInstance) {
  for (const contentType of uploadContentTypes) {
    app.addContentTypeParser(contentType, { parseAs: "buffer", bodyLimit: env.MAX_UPLOAD_MB * 1024 * 1024 }, (_request, body, done) => {
      done(null, body);
    });
  }

  app.get("/admin/datasets/health", { preHandler: requireRole("DEPT_LEAD") }, async (request) => {
    return campusDataHealth(request.user!);
  });

  app.post("/admin/datasets/upload", { preHandler: requireRole("CAMPUS_ADMIN") }, async (request, reply) => {
    const filename = headerString(request.headers["x-filename"]) ?? headerString(request.headers["x-file-name"]);
    if (!filename) throw validation("Upload requires an x-filename header.");
    const body = Buffer.isBuffer(request.body) ? request.body : Buffer.from(String(request.body ?? ""));
    await ensureNoActiveCampusImport(request.user!.campusId);
    await acquireImportLock(request.user!.campusId);
    const dataset = await createDatasetUpload({
      user: request.user!,
      filename,
      mimeType: headerString(request.headers["content-type"]) ?? "application/octet-stream",
      buffer: body,
    });
    await datasetProcessQueue.add("process", { datasetImportId: String(dataset._id) }, { attempts: 2, backoff: { type: "exponential", delay: 1000 } });
    return reply.status(202).send(datasetStatusDto(dataset));
  });

  app.get("/admin/datasets", { preHandler: requireRole("DEPT_LEAD") }, async (request) => {
    const datasets = await listDatasetImportsForUser(request.user!);
    return datasets.map(datasetStatusDto);
  });

  app.get("/admin/datasets/:id", { preHandler: requireRole("DEPT_LEAD") }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const dataset = await getDatasetImportForUser(id, request.user!);
    if (!dataset) throw notFound("Dataset import not found");
    return datasetStatusDto(dataset);
  });

  app.get("/admin/datasets/:id/preview", { preHandler: requireRole("DEPT_LEAD") }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const dataset = await getDatasetImportForUser(id, request.user!);
    if (!dataset) throw notFound("Dataset import not found");
    return datasetPreviewDto(dataset.preview ?? null);
  });

  app.post("/admin/datasets/:id/mapping", { preHandler: requireRole("CAMPUS_ADMIN") }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const body = mappingBodySchema.parse(request.body);
    return datasetPreviewDto(await applyDatasetMappingOverride(id, body.mappings, request.user!));
  });

  app.post("/admin/datasets/:id/validate", { preHandler: requireRole("CAMPUS_ADMIN") }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const dataset = await getDatasetImportForUser(id, request.user!);
    if (!dataset) throw notFound("Dataset import not found");
    return datasetPreviewDto(await analyzeDatasetImport(id));
  });

  app.post("/admin/datasets/:id/commit", { preHandler: requireRole("CAMPUS_ADMIN") }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const body = commitBodySchema.parse(request.body);
    const dataset = await getDatasetImportForUser(id, request.user!);
    if (!dataset) throw notFound("Dataset import not found");
    if (dataset.status !== "READY_FOR_REVIEW") throw validation("Dataset import is not ready to commit.");
    await ensureNoActiveCampusImport(request.user!.campusId, id);
    await acquireImportLock(request.user!.campusId);
    const { DatasetImport } = await import("../../db/models.js");
    await DatasetImport.findByIdAndUpdate(id, { $set: { status: "IMPORTING", importStrategy: body.strategy } });
    await datasetCommitQueue.add("commit", { datasetImportId: id, options: body }, { attempts: 1 });
    return reply.status(202).send({ id, status: "IMPORTING" });
  });

  app.post("/admin/datasets/:id/rollback", { preHandler: requireRole("CAMPUS_ADMIN") }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const dataset = await getDatasetImportForUser(id, request.user!);
    if (!dataset) throw notFound("Dataset import not found");
    await rollbackDatasetImport(id);
    return { id, status: "ROLLED_BACK" };
  });

  app.get("/admin/datasets/:id/errors.csv", { preHandler: requireRole("DEPT_LEAD") }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const csv = await buildErrorReportCsv(id, request.user!);
    if (csv === null) throw notFound("Dataset import not found");
    return reply
      .type("text/csv")
      .header("content-disposition", `attachment; filename="dataset-${id}-errors.csv"`)
      .send(csv);
  });
}
