import { logger } from "../../config/logger.js";
import { commitDatasetImport } from "./dataset.importer.js";
import { analyzeDatasetImport } from "./dataset.service.js";
import type { CommitOptions } from "./dataset.types.js";

export async function processDatasetJob(job: { data: { datasetImportId: string } }) {
  logger.info({ datasetImportId: job.data.datasetImportId }, "processing campus dataset");
  await analyzeDatasetImport(job.data.datasetImportId);
}

export async function commitDatasetJob(job: { data: { datasetImportId: string; options: CommitOptions } }) {
  logger.info({ datasetImportId: job.data.datasetImportId }, "committing campus dataset");
  await commitDatasetImport(job.data.datasetImportId, job.data.options);
}
