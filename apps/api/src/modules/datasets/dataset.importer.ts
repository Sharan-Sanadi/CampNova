import mongoose from "mongoose";

import { env } from "../../config/env.js";
import { Building, Campus, DatasetImport, Resource } from "../../db/models.js";
import { getRedis } from "../../db/redis.js";
import { emitDatasetUpdated } from "../realtime/realtime.service.js";
import type { CanonicalResourceRecord, CommitOptions, CommitResult, DatasetPreview } from "./dataset.types.js";

function slug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function resourceExternalId(campusId: string, building: string, name: string): string {
  return `resource:${campusId}:${slug(building)}:${slug(name)}`;
}

function buildingExternalId(campusId: string, name: string): string {
  return `building:${campusId}:${slug(name)}`;
}

function resourcePayload(record: CanonicalResourceRecord, buildingId: mongoose.Types.ObjectId, datasetImportId: unknown, campusId: string) {
  const resource = record.resource;
  const capacity = resource.capacity ?? 0;
  const utilization = 0;
  return {
    campusId,
    name: resource.name,
    type: resource.type ?? "Classroom",
    building: resource.building,
    buildingId,
    floor: resource.floor ?? "Unspecified",
    capacity,
    amenities: resource.equipment,
    status: "available",
    utilization,
    nextBooking: null,
    trend: [],
    description: `${resource.name} in ${resource.building}.`,
    equipment: resource.equipment,
    accessibility: {
      wheelchair: resource.accessible ?? false,
      hearingLoop: false,
      stepFreeRoute: resource.accessible ?? false,
      note: resource.accessible ? "Marked accessible in source data." : "Accessibility not confirmed in source data.",
    },
    walkMinutes: 5,
    bookingPressure: "Low",
    conflictRate: 0,
    cancellationRate: 0,
    upcomingBookings: 0,
    maintenance: "Normal",
    maintenanceNote: null,
    healthScore: 80,
    trendDelta: 0,
    peakWindow: "14:00-17:00",
    lowWindow: "08:00-10:00",
    demandByDay: [],
    demandByPart: [],
    predictedDemand: {
      window: "Unavailable until bookings or utilization are imported",
      level: "Low",
      note: "Prediction requires booking or utilization history.",
    },
    datasetImportId,
    sourceRowNumber: record.sourceRowNumber,
    dataMode: "live",
    isDemo: false,
    geo: {
      type: "Point",
      coordinates: [77.5946, 12.9716],
    },
  };
}

async function upsertBuilding(
  campusId: string,
  buildingName: string,
  floor: string,
  datasetImportId: unknown,
  rowNumber: number,
  rollbackRecords: unknown[],
) {
  const externalId = buildingExternalId(campusId, buildingName);
  const existing = await Building.findOne({ externalId });
  if (existing) {
    rollbackRecords.push({ model: "Building", externalId, action: "update", before: existing.toObject() });
    const floors = new Set<string>([...((existing.floors as string[]) ?? []), floor].filter(Boolean));
    existing.set({ floors: [...floors], datasetImportId, dataMode: "live", isDemo: false });
    await existing.save();
    return existing;
  }
  rollbackRecords.push({ model: "Building", externalId, action: "create" });
  return Building.create({
    externalId,
    campusId,
    name: buildingName,
    floors: floor ? [floor] : [],
    datasetImportId,
    sourceRowNumber: rowNumber,
    dataMode: "live",
    isDemo: false,
  });
}

export async function commitDatasetImport(
  datasetImportId: string,
  options: CommitOptions = { strategy: "MERGE", importValidRecordsOnly: true },
): Promise<CommitResult> {
  const dataset = await DatasetImport.findById(datasetImportId);
  if (!dataset) throw new Error("Dataset import not found");
  if (!["READY_FOR_REVIEW", "IMPORTING"].includes(dataset.status)) {
    throw new Error("Dataset import is not ready to commit");
  }

  const preview = dataset.preview as DatasetPreview | null;
  if (!preview) throw new Error("Dataset preview has not been generated");
  const validRecords = preview.records.filter((record) => !record.issues.some((issue) => issue.severity === "ERROR"));
  if (!validRecords.length) throw new Error("No valid records are available to import");

  dataset.status = "IMPORTING";
  dataset.importStrategy = options.strategy;
  await dataset.save();

  const rollbackRecords: unknown[] = [];
  let importedCount = 0;
  let updatedCount = 0;
  let skippedCount = preview.records.length - validRecords.length;

  try {
    if (options.strategy === "REPLACE_DATASET") {
    const existingResources = await Resource.find({
      campusId: dataset.campusId,
      dataMode: "live",
      datasetImportId: { $ne: null },
    }).lean();
    rollbackRecords.push(
      ...existingResources.map((resource) => ({
        model: "Resource",
        externalId: resource.externalId,
        action: "restore-after-replace",
        before: resource,
      })),
    );
    await Resource.deleteMany({ campusId: dataset.campusId, dataMode: "live", datasetImportId: { $ne: null } });
    }

    for (let i = 0; i < validRecords.length; i += env.IMPORT_BATCH_SIZE) {
    const batch = validRecords.slice(i, i + env.IMPORT_BATCH_SIZE);
    for (const record of batch) {
      const buildingName = record.resource.building!;
      const resourceName = record.resource.name!;
      const floor = record.resource.floor ?? "Unspecified";
      const building = await upsertBuilding(dataset.campusId, buildingName, floor, dataset._id, record.sourceRowNumber, rollbackRecords);
      const externalId = resourceExternalId(dataset.campusId, buildingName, resourceName);
      const existing = await Resource.findOne({ externalId });
      if (existing && options.strategy === "APPEND") {
        skippedCount += 1;
        continue;
      }

      const payload = resourcePayload(record, building._id, dataset._id, dataset.campusId);
      if (existing) {
        rollbackRecords.push({ model: "Resource", externalId, action: "update", before: existing.toObject() });
        existing.set({ ...payload, externalId });
        await existing.save();
        updatedCount += 1;
      } else {
        rollbackRecords.push({ model: "Resource", externalId, action: "create" });
        await Resource.create({ ...payload, externalId });
        importedCount += 1;
      }
    }
    }

    const latestCampus = await Campus.findOneAndUpdate(
    { externalId: dataset.campusId },
    {
      $setOnInsert: {
        externalId: dataset.campusId,
        code: dataset.campusId,
        timezone: env.CAMPUS_TIMEZONE,
      },
      $set: {
        name: env.DEFAULT_CAMPUS_NAME,
        dataMode: "production",
        onboardingComplete: true,
        lastDatasetImportId: dataset._id,
      },
      $inc: { datasetVersion: 1 },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

    const status = preview.errors > 0 ? "PARTIAL" : "COMPLETED";
    dataset.status = status;
    dataset.importedCount = importedCount;
    dataset.updatedCount = updatedCount;
    dataset.skippedCount = skippedCount;
    dataset.errorCount = preview.errors;
    dataset.warningCount = preview.warnings;
    dataset.qualityScore = preview.qualityScore;
    dataset.intelligenceReadiness = preview.intelligenceReadiness;
    dataset.rollbackRecords = rollbackRecords;
    dataset.version = latestCampus.datasetVersion;
    dataset.completedAt = new Date();
    await dataset.save();

    emitDatasetUpdated({
    campusId: dataset.campusId,
    datasetImportId: String(dataset._id),
    version: dataset.version,
    imported: importedCount,
    updated: updatedCount,
    skipped: skippedCount,
    });

    return { importedCount, updatedCount, skippedCount, errorCount: preview.errors, status, version: dataset.version };
  } catch (error) {
    dataset.status = "FAILED";
    dataset.failedAt = new Date();
    dataset.failedStage = "IMPORTING";
    dataset.errorSummary = error instanceof Error ? error.message : "Dataset import failed";
    await dataset.save();
    throw error;
  } finally {
    await getRedis().del(`dataset:import:${dataset.campusId}`).catch(() => undefined);
  }
}

export async function rollbackDatasetImport(datasetImportId: string): Promise<void> {
  const dataset = await DatasetImport.findById(datasetImportId);
  if (!dataset) throw new Error("Dataset import not found");
  if (!["COMPLETED", "PARTIAL"].includes(dataset.status)) {
    throw new Error("Only completed or partial imports can be rolled back");
  }

  const rollbackRecords = [...((dataset.rollbackRecords as any[]) ?? [])].reverse();
  for (const record of rollbackRecords) {
    if (record.model === "Resource") {
      if (record.action === "create") await Resource.deleteOne({ externalId: record.externalId });
      else if (record.before) await Resource.replaceOne({ externalId: record.externalId }, record.before, { upsert: true });
    }
    if (record.model === "Building") {
      if (record.action === "create") await Building.deleteOne({ externalId: record.externalId });
      else if (record.before) await Building.replaceOne({ externalId: record.externalId }, record.before, { upsert: true });
    }
  }

  dataset.status = "ROLLED_BACK";
  dataset.rolledBackAt = new Date();
  await dataset.save();
}
