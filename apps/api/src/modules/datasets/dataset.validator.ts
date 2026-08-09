import type {
  CanonicalResourceRecord,
  DatasetFieldMapping,
  DatasetPreview,
  DuplicateRecord,
  QualityBreakdown,
  ValidationIssue,
} from "./dataset.types.js";

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function identityFor(record: CanonicalResourceRecord): string | undefined {
  const building = record.resource.building?.toLowerCase().replace(/\s+/g, " ").trim();
  const name = record.resource.name?.toLowerCase().replace(/\s+/g, " ").trim();
  return building && name ? `${building}:${name}` : undefined;
}

export function validateRecords(
  records: CanonicalResourceRecord[],
  existingIdentities: Map<string, string> = new Map(),
): { records: CanonicalResourceRecord[]; duplicates: DuplicateRecord[]; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];
  const duplicates: DuplicateRecord[] = [];
  const seen = new Map<string, number>();

  for (const record of records) {
    const rowIssues: ValidationIssue[] = [];
    if (!record.resource.name) {
      rowIssues.push({
        severity: "ERROR",
        rowNumber: record.sourceRowNumber,
        field: "resource.name",
        value: null,
        code: "MISSING_RESOURCE_NAME",
        message: "Resource name is required.",
      });
    }
    if (!record.resource.building) {
      rowIssues.push({
        severity: "ERROR",
        rowNumber: record.sourceRowNumber,
        field: "building.name",
        value: null,
        code: "MISSING_BUILDING",
        message: "Building name is required.",
      });
    }
    if (record.resource.capacity === undefined) {
      record.resource.capacity = 0;
      rowIssues.push({
        severity: "WARNING",
        rowNumber: record.sourceRowNumber,
        field: "resource.capacity",
        value: null,
        code: "MISSING_CAPACITY",
        message: "Capacity was not provided; stored as 0 until the campus admin supplies a value.",
      });
    }
    if (record.resource.availabilityStart && !/^\d{1,2}:\d{2}$/.test(record.resource.availabilityStart)) {
      rowIssues.push({
        severity: "ERROR",
        rowNumber: record.sourceRowNumber,
        field: "availability.start",
        value: record.resource.availabilityStart,
        code: "INVALID_START_TIME",
        message: "Availability start must use HH:mm format.",
      });
    }
    if (record.resource.availabilityEnd && !/^\d{1,2}:\d{2}$/.test(record.resource.availabilityEnd)) {
      rowIssues.push({
        severity: "ERROR",
        rowNumber: record.sourceRowNumber,
        field: "availability.end",
        value: record.resource.availabilityEnd,
        code: "INVALID_END_TIME",
        message: "Availability end must use HH:mm format.",
      });
    }

    const identity = identityFor(record);
    if (identity) {
      const firstRow = seen.get(identity);
      if (firstRow) {
        const issue = {
          severity: "WARNING" as const,
          rowNumber: record.sourceRowNumber,
          field: "resource.name",
          value: record.resource.name,
          code: "DUPLICATE_IN_FILE",
          message: `Potential duplicate of row ${firstRow}.`,
        };
        rowIssues.push(issue);
        duplicates.push({ rowNumber: record.sourceRowNumber, identity, action: "SKIP" });
      } else {
        seen.set(identity, record.sourceRowNumber);
      }
      const existingResourceId = existingIdentities.get(identity);
      if (existingResourceId) {
        rowIssues.push({
          severity: "WARNING",
          rowNumber: record.sourceRowNumber,
          field: "resource.name",
          value: record.resource.name,
          code: "DUPLICATE_EXISTING_RESOURCE",
          message: "A resource with this building and name already exists; merge will update it.",
        });
        duplicates.push({
          rowNumber: record.sourceRowNumber,
          identity,
          action: "UPDATE_EXISTING",
          existingResourceId,
        });
      }
    }

    record.issues.push(...rowIssues);
    issues.push(...record.issues);
  }

  return { records, duplicates, issues };
}

function qualityBreakdown(
  records: CanonicalResourceRecord[],
  issues: ValidationIssue[],
  mappings: DatasetFieldMapping[],
  duplicates: DuplicateRecord[],
): QualityBreakdown {
  const total = Math.max(records.length, 1);
  const complete = records.filter((record) => record.resource.name && record.resource.building).length;
  const errors = issues.filter((issue) => issue.severity === "ERROR").length;
  const mapped = mappings.filter((mapping) => mapping.targetField !== "IGNORE").length;
  return {
    completeness: clampScore((complete / total) * 100),
    validity: clampScore(100 - (errors / total) * 30),
    mapping: clampScore((mapped / Math.max(mappings.length, 1)) * 100),
    duplicates: clampScore(100 - (duplicates.length / total) * 20),
  };
}

export function buildPreview(
  records: CanonicalResourceRecord[],
  mappings: DatasetFieldMapping[],
  duplicates: DuplicateRecord[],
  issues: ValidationIssue[],
): DatasetPreview {
  const warnings = issues.filter((issue) => issue.severity === "WARNING").length;
  const errors = issues.filter((issue) => issue.severity === "ERROR").length;
  const buildings = new Set(records.map((record) => record.resource.building).filter(Boolean));
  const departments = new Set(records.map((record) => record.resource.department).filter(Boolean));
  const unknownColumns = mappings.filter((mapping) => mapping.targetField === "IGNORE").map((mapping) => mapping.sourceField);
  const breakdown = qualityBreakdown(records, issues, mappings, duplicates);
  const qualityScore = clampScore(
    breakdown.completeness * 0.3 +
      breakdown.validity * 0.35 +
      breakdown.mapping * 0.2 +
      breakdown.duplicates * 0.15 -
      warnings * 0.5,
  );
  const readiness = {
    resources: records.some((record) => record.resource.name),
    buildings: buildings.size > 0,
    availability: records.some((record) => record.resource.availabilityStart || record.resource.availabilityEnd),
    historicalUtilization: false,
    bookings: false,
  };
  const readinessScore = clampScore(
    (readiness.resources ? 35 : 0) +
      (readiness.buildings ? 25 : 0) +
      (readiness.availability ? 20 : 0) +
      (readiness.bookings ? 10 : 0) +
      (readiness.historicalUtilization ? 10 : 0),
  );

  return {
    recordCount: records.length,
    resources: records.filter((record) => record.resource.name).length,
    buildings: buildings.size,
    departments: departments.size,
    schedules: records.filter((record) => record.resource.availabilityStart || record.resource.availabilityEnd).length,
    warnings,
    errors,
    unknownColumns,
    potentialDuplicates: duplicates,
    mappings,
    records,
    qualityScore,
    qualityBreakdown: breakdown,
    intelligenceReadiness: readinessScore,
    readiness,
    errorReport: issues.filter((issue) => issue.severity === "ERROR"),
  };
}
