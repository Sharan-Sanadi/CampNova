import type { ResourceType } from "@campus-os/shared-types";

export const datasetTargetFields = [
  "IGNORE",
  "resource.name",
  "resource.capacity",
  "building.name",
  "resource.floor",
  "resource.equipment",
  "resource.type",
  "resource.accessibility",
  "department",
  "availability.start",
  "availability.end",
] as const;

export type DatasetTargetField = (typeof datasetTargetFields)[number];
export type DatasetFileType = "csv" | "pdf" | "docx" | "xlsx";
export type ValidationSeverity = "ERROR" | "WARNING" | "INFO";
export type ImportStrategy = "MERGE" | "APPEND" | "REPLACE_DATASET";

export type RawRecord = {
  rowNumber: number;
  values: Record<string, string>;
};

export type DatasetFieldMapping = {
  sourceField: string;
  targetField: DatasetTargetField;
  confidence: number;
  reviewRequired: boolean;
};

export type ValidationIssue = {
  severity: ValidationSeverity;
  rowNumber?: number;
  field?: string;
  value?: string | number | boolean | null | undefined;
  code: string;
  message: string;
};

export type CanonicalResourceRecord = {
  sourceRowNumber: number;
  source: Record<string, string>;
  unmapped: Record<string, string>;
  resource: {
    name?: string;
    building?: string;
    type?: ResourceType;
    floor?: string;
    capacity?: number;
    equipment: string[];
    accessible?: boolean;
    department?: string;
    availabilityStart?: string;
    availabilityEnd?: string;
  };
  issues: ValidationIssue[];
};

export type DuplicateRecord = {
  rowNumber: number;
  identity: string;
  action: "UPDATE_EXISTING" | "SKIP" | "CREATE_NEW";
  existingResourceId?: string;
};

export type QualityBreakdown = {
  completeness: number;
  validity: number;
  mapping: number;
  duplicates: number;
};

export type DatasetPreview = {
  recordCount: number;
  resources: number;
  buildings: number;
  departments: number;
  schedules: number;
  warnings: number;
  errors: number;
  unknownColumns: string[];
  potentialDuplicates: DuplicateRecord[];
  mappings: DatasetFieldMapping[];
  records: CanonicalResourceRecord[];
  qualityScore: number;
  qualityBreakdown: QualityBreakdown;
  intelligenceReadiness: number;
  readiness: {
    resources: boolean;
    buildings: boolean;
    availability: boolean;
    historicalUtilization: boolean;
    bookings: boolean;
  };
  errorReport: ValidationIssue[];
};

export type ParsedDataset = {
  parser: string;
  rawRecords: RawRecord[];
  warnings: string[];
};

export type CommitOptions = {
  strategy: ImportStrategy;
  importValidRecordsOnly: boolean;
};

export type CommitResult = {
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  status: "COMPLETED" | "PARTIAL";
  version: number;
};
