import type { DatasetFieldMapping, DatasetTargetField, RawRecord } from "./dataset.types.js";

const exactSynonyms: Record<Exclude<DatasetTargetField, "IGNORE">, string[]> = {
  "resource.name": ["resource name", "room name", "room", "facility", "space", "resource", "lab", "venue"],
  "resource.capacity": ["capacity", "seats", "seat count", "max occupancy", "occupancy", "attendees"],
  "building.name": ["building", "building name", "block", "location", "campus building"],
  "resource.floor": ["floor", "level", "storey"],
  "resource.equipment": ["equipment", "amenities", "features", "facilities", "av", "technology"],
  "resource.type": ["type", "room type", "resource type", "facility type", "category"],
  "resource.accessibility": ["accessibility", "accessible", "wheelchair", "step free", "step-free"],
  department: ["department", "dept", "owner", "school", "faculty"],
  "availability.start": ["available from", "start", "start time", "opens", "open from"],
  "availability.end": ["available to", "end", "end time", "closes", "open until"],
};

function normalizeHeader(value: string): string {
  return value
    .toLowerCase()
    .replace(/[_\-./]+/g, " ")
    .replace(/[^\p{L}\p{N} ]+/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function inferMapping(header: string): DatasetFieldMapping {
  const normalized = normalizeHeader(header);
  for (const [targetField, synonyms] of Object.entries(exactSynonyms)) {
    if (synonyms.includes(normalized)) {
      return {
        sourceField: header,
        targetField: targetField as DatasetTargetField,
        confidence: 0.96,
        reviewRequired: false,
      };
    }
  }

  for (const [targetField, synonyms] of Object.entries(exactSynonyms)) {
    const match = synonyms.find((synonym) => normalized.includes(synonym) || synonym.includes(normalized));
    if (match) {
      return {
        sourceField: header,
        targetField: targetField as DatasetTargetField,
        confidence: normalized.length <= 3 ? 0.62 : 0.78,
        reviewRequired: normalized.length <= 3,
      };
    }
  }

  return { sourceField: header, targetField: "IGNORE", confidence: 0, reviewRequired: true };
}

export function buildFieldMappings(
  records: RawRecord[],
  overrides: Partial<Record<string, DatasetTargetField>> = {},
): DatasetFieldMapping[] {
  const headers = new Set<string>();
  for (const record of records) {
    Object.keys(record.values).forEach((header) => headers.add(header));
  }

  const mappings = [...headers].map((header) => {
    const override = overrides[header];
    if (override) {
      return {
        sourceField: header,
        targetField: override,
        confidence: 1,
        reviewRequired: false,
      } satisfies DatasetFieldMapping;
    }
    return inferMapping(header);
  });

  const targetCounts = new Map<DatasetTargetField, number>();
  for (const mapping of mappings) {
    if (mapping.targetField === "IGNORE") continue;
    targetCounts.set(mapping.targetField, (targetCounts.get(mapping.targetField) ?? 0) + 1);
  }

  return mappings.map((mapping) => ({
    ...mapping,
    reviewRequired: mapping.reviewRequired || (targetCounts.get(mapping.targetField) ?? 0) > 1,
  }));
}

export function mappingOverridesFrom(mappings: DatasetFieldMapping[]): Partial<Record<string, DatasetTargetField>> {
  return Object.fromEntries(mappings.map((mapping) => [mapping.sourceField, mapping.targetField]));
}
