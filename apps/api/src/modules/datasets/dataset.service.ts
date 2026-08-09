import { extname } from "node:path";

import { env } from "../../config/env.js";
import { Building, DatasetImport, Resource } from "../../db/models.js";
import { getRedis } from "../../db/redis.js";
import { conflict, validation } from "../../shared/errors/AppError.js";
import type { AuthUser } from "../../shared/middleware/auth.js";
import { buildFieldMappings, mappingOverridesFrom } from "./dataset.mapper.js";
import { normalizeRecords } from "./dataset.normalizer.js";
import { parseDatasetFile } from "./dataset.parser.js";
import { getStorageProvider } from "./dataset.storage.js";
import { buildPreview, validateRecords } from "./dataset.validator.js";
import type {
  DatasetFieldMapping,
  DatasetFileType,
  DatasetPreview,
  DatasetTargetField,
  ParsedDataset,
  ValidationIssue,
} from "./dataset.types.js";

const mimeByType: Record<DatasetFileType, string[]> = {
  csv: ["text/csv", "application/csv", "text/plain", "application/vnd.ms-excel", "application/octet-stream"],
  pdf: ["application/pdf", "application/octet-stream"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/octet-stream"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/octet-stream"],
};

const extensionToType: Record<string, DatasetFileType> = {
  ".csv": "csv",
  ".pdf": "pdf",
  ".docx": "docx",
  ".xlsx": "xlsx",
};

function fileSignatureMatches(fileType: DatasetFileType, buffer: Buffer): boolean {
  if (fileType === "pdf") return buffer.subarray(0, 5).toString("utf8") === "%PDF-";
  if (fileType === "docx" || fileType === "xlsx") return buffer[0] === 0x50 && buffer[1] === 0x4b;
  return !buffer.subarray(0, Math.min(buffer.length, 2048)).includes(0);
}

function detectFileType(filename: string, mimeType: string, buffer: Buffer): DatasetFileType {
  const extension = extname(filename).toLowerCase();
  const fileType = extensionToType[extension];
  if (!fileType) throw validation("Unsupported campus dataset file type.");
  if (fileType === "xlsx" && !env.ENABLE_XLSX_IMPORT) {
    throw validation("XLSX ingestion is disabled for this deployment.");
  }
  if (!mimeByType[fileType].includes(mimeType.split(";")[0]!.toLowerCase())) {
    throw validation("File MIME type does not match an allowed campus dataset type.", { mimeType });
  }
  if (!fileSignatureMatches(fileType, buffer)) {
    throw validation("File signature does not match the declared campus dataset type.");
  }
  return fileType;
}

function ensureUploadAllowed(filename: string, mimeType: string, buffer: Buffer): DatasetFileType {
  if (!buffer.length) throw validation("Uploaded campus dataset is empty.");
  const maxBytes = env.MAX_UPLOAD_MB * 1024 * 1024;
  if (buffer.length > maxBytes) throw validation(`Campus dataset exceeds the ${env.MAX_UPLOAD_MB}MB upload limit.`);
  if (/\.(exe|bat|cmd|sh|js|html?|svg|msi|dll)$/i.test(filename)) {
    throw validation("Executable, script, and HTML uploads are not accepted.");
  }
  return detectFileType(filename, mimeType, buffer);
}

function identityFor(resource: { building?: string; name?: string }): string | undefined {
  const building = resource.building?.toLowerCase().replace(/\s+/g, " ").trim();
  const name = resource.name?.toLowerCase().replace(/\s+/g, " ").trim();
  return building && name ? `${building}:${name}` : undefined;
}

async function existingResourceIdentities(campusId: string): Promise<Map<string, string>> {
  const resources = await Resource.find({ campusId, dataMode: env.DATA_MODE === "demo" ? "demo" : "live" })
    .select({ externalId: 1, building: 1, name: 1 })
    .lean();
  return new Map(
    resources
      .map((resource: any) => [identityFor(resource), resource.externalId] as const)
      .filter((item): item is [string, string] => Boolean(item[0] && item[1])),
  );
}

function issueCounts(preview: DatasetPreview): { warnings: string[]; warningCount: number; errorCount: number } {
  const warningMessages = preview.records
    .flatMap((record) => record.issues)
    .filter((issue) => issue.severity === "WARNING")
    .map((issue) => issue.message);
  return {
    warnings: [...new Set(warningMessages)].slice(0, 20),
    warningCount: preview.warnings,
    errorCount: preview.errors,
  };
}

export async function createDatasetUpload(input: {
  user: AuthUser;
  filename: string;
  mimeType: string;
  buffer: Buffer;
}) {
  const fileType = ensureUploadAllowed(input.filename, input.mimeType, input.buffer);
  const storage = getStorageProvider();
  const stored = await storage.put(input.buffer, input.filename, fileType);
  const existing = (await DatasetImport.findOne({
    campusId: input.user.campusId,
    checksum: stored.checksum,
    status: { $in: ["READY_FOR_REVIEW", "IMPORTING", "COMPLETED", "PARTIAL"] },
  }).lean()) as any;
  if (existing) {
    throw conflict("This dataset appears to have already been imported.", {
      datasetImportId: String(existing._id),
      status: existing.status,
    });
  }

  return DatasetImport.create({
    campusId: input.user.campusId,
    uploadedBy: input.user.mongoId,
    originalFilename: input.filename,
    storedObjectKey: stored.objectKey,
    fileType,
    fileSize: stored.size,
    status: "UPLOADED",
    sourceType: "upload",
    parser: `${fileType}:pending`,
    checksum: stored.checksum,
    version: 1,
  });
}

export async function analyzeDatasetImport(datasetImportId: string): Promise<DatasetPreview> {
  const dataset = await DatasetImport.findById(datasetImportId);
  if (!dataset) throw new Error("Dataset import not found");
  dataset.status = "PROCESSING";
  dataset.failedAt = null;
  dataset.failedStage = null;
  dataset.errorSummary = null;
  await dataset.save();

  try {
    const storage = getStorageProvider();
    const absolutePath = storage.resolvePath(dataset.storedObjectKey);
    const buffer = await storage.get(dataset.storedObjectKey);
    const parsed = await parseDatasetFile(absolutePath, buffer, dataset.fileType as DatasetFileType);
    dataset.status = "VALIDATING";
    dataset.parser = parsed.parser;
    await dataset.save();
    const preview = await buildDatasetPreview(dataset.campusId, parsed, dataset.mapping as DatasetFieldMapping[] | null);
    const counts = issueCounts(preview);

    dataset.status = "READY_FOR_REVIEW";
    dataset.recordCount = preview.recordCount;
    dataset.warningCount = counts.warningCount;
    dataset.errorCount = counts.errorCount;
    dataset.warnings = [...new Set([...parsed.warnings, ...counts.warnings])];
    dataset.mapping = preview.mappings;
    dataset.preview = preview;
    dataset.qualityScore = preview.qualityScore;
    dataset.intelligenceReadiness = preview.intelligenceReadiness;
    await dataset.save();
    await getRedis().del(`dataset:import:${dataset.campusId}`).catch(() => undefined);
    return preview;
  } catch (error) {
    dataset.status = "FAILED";
    dataset.failedAt = new Date();
    dataset.failedStage = "PROCESSING";
    dataset.errorSummary = error instanceof Error ? error.message : "Dataset processing failed";
    await dataset.save();
    await getRedis().del(`dataset:import:${dataset.campusId}`).catch(() => undefined);
    throw error;
  }
}

async function buildDatasetPreview(
  campusId: string,
  parsed: ParsedDataset,
  existingMappings: DatasetFieldMapping[] | null,
): Promise<DatasetPreview> {
  const overrides = existingMappings ? mappingOverridesFrom(existingMappings) : {};
  const mappings = buildFieldMappings(parsed.rawRecords, overrides);
  const normalized = normalizeRecords(parsed.rawRecords, mappings);
  const existing = await existingResourceIdentities(campusId);
  const validated = validateRecords(normalized, existing);
  return buildPreview(validated.records, mappings, validated.duplicates, validated.issues);
}

export async function applyDatasetMappingOverride(
  datasetImportId: string,
  mappings: { sourceField: string; targetField: DatasetTargetField }[],
  user: AuthUser,
): Promise<DatasetPreview> {
  const dataset = await DatasetImport.findById(datasetImportId);
  if (!dataset) throw validation("Dataset import not found");
  if (dataset.campusId !== user.campusId) throw validation("Dataset import does not belong to this campus.");
  const current = ((dataset.mapping as DatasetFieldMapping[] | null) ?? []).map((mapping) => ({ ...mapping }));
  const bySource = new Map(current.map((mapping) => [mapping.sourceField, mapping]));
  for (const override of mappings) {
    bySource.set(override.sourceField, {
      sourceField: override.sourceField,
      targetField: override.targetField,
      confidence: 1,
      reviewRequired: false,
    });
  }
  dataset.mapping = [...bySource.values()];
  await dataset.save();
  return analyzeDatasetImport(datasetImportId);
}

export async function getDatasetImportForUser(datasetImportId: string, user: AuthUser) {
  const dataset = (await DatasetImport.findById(datasetImportId).lean()) as any;
  if (!dataset || dataset.campusId !== user.campusId) return null;
  return dataset;
}

export async function listDatasetImportsForUser(user: AuthUser) {
  return DatasetImport.find({ campusId: user.campusId }).sort({ createdAt: -1 }).limit(50).lean();
}

export function datasetStatusDto(dataset: any) {
  return {
    id: String(dataset._id),
    status: dataset.status,
    filename: dataset.originalFilename,
    fileType: dataset.fileType,
    fileSize: dataset.fileSize,
    recordCount: dataset.recordCount,
    created: dataset.importedCount,
    updated: dataset.updatedCount,
    skipped: dataset.skippedCount,
    warnings: dataset.warningCount,
    errors: dataset.errorCount,
    qualityScore: dataset.qualityScore,
    intelligenceReadiness: dataset.intelligenceReadiness,
    version: dataset.version,
    uploadedAt: dataset.uploadedAt,
    completedAt: dataset.completedAt,
    checksum: dataset.checksum,
  };
}

export function datasetPreviewDto(preview: DatasetPreview | null) {
  if (!preview) return null;
  return {
    ...preview,
    records: preview.records.slice(0, 100),
  };
}

export async function buildErrorReportCsv(datasetImportId: string, user: AuthUser): Promise<string | null> {
  const dataset = (await getDatasetImportForUser(datasetImportId, user)) as any;
  if (!dataset) return null;
  const preview = dataset.preview as DatasetPreview | null;
  if (!preview) return "row,field,value,errorCode,message\n";
  const issues = preview.records.flatMap((record) => record.issues);
  const rows = issues.map(csvIssue);
  return ["row,field,value,errorCode,message", ...rows].join("\n");
}

function csvValue(value: unknown): string {
  const text = String(value ?? "");
  const sanitized = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${sanitized.replace(/"/g, '""')}"`;
}

function csvIssue(issue: ValidationIssue): string {
  return [
    issue.rowNumber ?? "",
    issue.field ?? "",
    issue.value ?? "",
    issue.code,
    issue.message,
  ].map(csvValue).join(",");
}

export async function campusDataHealth(user: AuthUser) {
  const latest = (await DatasetImport.findOne({
    campusId: user.campusId,
    status: { $in: ["COMPLETED", "PARTIAL"] },
  })
    .sort({ completedAt: -1 })
    .lean()) as any;
  const [resources, buildings] = await Promise.all([
    Resource.countDocuments({ campusId: user.campusId, dataMode: env.DATA_MODE === "demo" ? "demo" : "live" }),
    Building.countDocuments({ campusId: user.campusId, dataMode: env.DATA_MODE === "demo" ? "demo" : "live" }),
  ]);

  return {
    campusId: user.campusId,
    dataMode: env.DATA_MODE === "demo" ? "demo" : "production",
    configured: Boolean(latest || resources || buildings),
    message: latest || resources || buildings ? null : "Campus data has not been configured yet.",
    latest: latest ? datasetStatusDto(latest) : null,
    records: resources,
    buildings,
    qualityScore: latest?.qualityScore ?? null,
    intelligenceReadiness: latest?.intelligenceReadiness ?? null,
  };
}
