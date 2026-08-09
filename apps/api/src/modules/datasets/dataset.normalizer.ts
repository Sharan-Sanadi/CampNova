import { resourceTypes, type ResourceType } from "@campus-os/shared-types";

import type {
  CanonicalResourceRecord,
  DatasetFieldMapping,
  DatasetTargetField,
  RawRecord,
  ValidationIssue,
} from "./dataset.types.js";

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function parseCapacity(value: string): { value?: number; issue?: ValidationIssue } {
  const cleaned = clean(value);
  if (!cleaned) return {};
  const match = cleaned.match(/-?\d+/);
  if (!match) {
    return {
      issue: {
        severity: "ERROR",
        field: "resource.capacity",
        value,
        code: "INVALID_CAPACITY",
        message: `Capacity could not be interpreted from '${value}'.`,
      },
    };
  }
  const capacity = Number(match[0]);
  if (capacity < 0) {
    return {
      issue: {
        severity: "ERROR",
        field: "resource.capacity",
        value,
        code: "NEGATIVE_CAPACITY",
        message: "Capacity cannot be negative.",
      },
    };
  }
  if (cleaned !== String(capacity)) {
    return {
      value: capacity,
      issue: {
        severity: "INFO",
        field: "resource.capacity",
        value,
        code: "CAPACITY_NORMALIZED",
        message: `Capacity interpreted from '${value}'.`,
      },
    };
  }
  return { value: capacity };
}

function parseBoolean(value: string): boolean | undefined {
  const normalized = clean(value).toLowerCase();
  if (!normalized) return undefined;
  if (["yes", "y", "true", "1", "accessible", "wheelchair", "step free", "step-free"].includes(normalized)) return true;
  if (["no", "n", "false", "0", "not accessible", "none"].includes(normalized)) return false;
  return undefined;
}

function splitList(value: string): string[] {
  return clean(value)
    .split(/[;,|/]+/)
    .map((item) => clean(item))
    .filter(Boolean);
}

function normalizeType(value: string, name: string): { value: ResourceType; issue?: ValidationIssue } {
  const source = clean(value || name).toLowerCase();
  const direct = resourceTypes.find((type) => type.toLowerCase() === source);
  if (direct) return { value: direct };

  const inferred =
    source.includes("computer") || source.includes("pc")
      ? "Computer Lab"
      : source.includes("physics")
        ? "Physics Lab"
        : source.includes("chem")
          ? "Chemistry Lab"
          : source.includes("meeting")
            ? "Meeting Room"
            : source.includes("seminar")
              ? "Seminar Hall"
              : source.includes("auditorium")
                ? "Auditorium"
                : source.includes("innovation") || source.includes("maker")
                  ? "Innovation Space"
                  : source.includes("sport") || source.includes("arena") || source.includes("court")
                    ? "Sports Facility"
                    : source.includes("kit") || source.includes("equipment")
                      ? "Equipment"
                      : "Classroom";

  return {
    value: inferred,
    issue: {
      severity: value ? "WARNING" : "INFO",
      field: "resource.type",
      value: value || null,
      code: value ? "TYPE_INFERRED" : "TYPE_DEFAULTED",
      message: value
        ? `Resource type '${value}' was normalized to '${inferred}'.`
        : `Resource type was not provided; '${inferred}' was inferred from the resource name.`,
    },
  };
}

export function normalizeRecords(records: RawRecord[], mappings: DatasetFieldMapping[]): CanonicalResourceRecord[] {
  const targetBySource = new Map<string, DatasetTargetField>();
  for (const mapping of mappings) targetBySource.set(mapping.sourceField, mapping.targetField);

  return records.map((record) => {
    const canonical: CanonicalResourceRecord = {
      sourceRowNumber: record.rowNumber,
      source: record.values,
      unmapped: {},
      resource: { equipment: [] },
      issues: [],
    };
    let typeSource = "";

    for (const [sourceField, rawValue] of Object.entries(record.values)) {
      const value = clean(rawValue);
      const target = targetBySource.get(sourceField) ?? "IGNORE";
      if (target === "IGNORE") {
        if (value) canonical.unmapped[sourceField] = value;
        continue;
      }

      if (target === "resource.name") canonical.resource.name = value;
      else if (target === "building.name") canonical.resource.building = value;
      else if (target === "resource.floor") canonical.resource.floor = value || "Unspecified";
      else if (target === "resource.equipment") canonical.resource.equipment.push(...splitList(value));
      else if (target === "resource.accessibility") {
        const parsedBool = parseBoolean(value);
        if (parsedBool !== undefined) canonical.resource.accessible = parsedBool;
      }
      else if (target === "department") canonical.resource.department = value;
      else if (target === "availability.start") canonical.resource.availabilityStart = value;
      else if (target === "availability.end") canonical.resource.availabilityEnd = value;
      else if (target === "resource.type") typeSource = value;
      else if (target === "resource.capacity") {
        const parsed = parseCapacity(value);
        if (parsed.value !== undefined) canonical.resource.capacity = parsed.value;
        if (parsed.issue) canonical.issues.push({ ...parsed.issue, rowNumber: record.rowNumber });
      }
    }

    const normalizedType = normalizeType(typeSource, canonical.resource.name ?? "");
    canonical.resource.type = normalizedType.value;
    if (normalizedType.issue) canonical.issues.push({ ...normalizedType.issue, rowNumber: record.rowNumber });

    canonical.resource.equipment = [...new Set(canonical.resource.equipment)];
    canonical.resource.floor = canonical.resource.floor || "Unspecified";

    return canonical;
  });
}
