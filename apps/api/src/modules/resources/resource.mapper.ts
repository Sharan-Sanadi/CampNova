import type {
  Resource as ResourceDto,
  ResourceProfile,
} from "@campus-os/shared-types";

type ResourceDoc = {
  _id?: unknown;
  externalId?: string;
  id?: string;
  name: string;
  type: ResourceDto["type"];
  building: string;
  floor: string;
  capacity: number;
  amenities: string[];
  status: ResourceDto["status"];
  utilization: number;
  nextBooking?: string | null;
  trend: number[];
  description: string;
  equipment?: string[];
  accessibility?: ResourceProfile["accessibility"];
  walkMinutes?: number;
  bookingPressure?: ResourceProfile["bookingPressure"];
  conflictRate?: number;
  cancellationRate?: number;
  upcomingBookings?: number;
  maintenance?: ResourceProfile["maintenance"];
  maintenanceNote?: string | null;
  healthScore?: number;
  trendDelta?: number;
  peakWindow?: string;
  lowWindow?: string;
  demandByDay?: ResourceProfile["demandByDay"];
  demandByPart?: ResourceProfile["demandByPart"];
  predictedDemand?: ResourceProfile["predictedDemand"];
};

export function externalIdOf(doc: { externalId?: string; _id?: unknown; id?: unknown }): string {
  return doc.externalId ?? String(doc.id ?? doc._id ?? "");
}

export function toResourceDto(doc: any): ResourceDto {
  return {
    id: externalIdOf(doc),
    name: doc.name,
    type: doc.type,
    building: doc.building,
    floor: doc.floor,
    capacity: doc.capacity,
    amenities: doc.amenities,
    status: doc.status,
    utilization: doc.utilization,
    nextBooking: doc.nextBooking ?? null,
    trend: doc.trend,
    description: doc.description,
  };
}

export function toResourceProfileDto(doc: any): ResourceProfile {
  const base = toResourceDto(doc);
  return {
    ...base,
    equipment: doc.equipment ?? [],
    accessibility: doc.accessibility ?? {
      wheelchair: true,
      hearingLoop: false,
      stepFreeRoute: true,
      note: "Step-free route from the main entrance.",
    },
    walkMinutes: doc.walkMinutes ?? 5,
    bookingPressure: doc.bookingPressure ?? "Moderate",
    conflictRate: doc.conflictRate ?? 0,
    cancellationRate: doc.cancellationRate ?? 0,
    upcomingBookings: doc.upcomingBookings ?? 0,
    maintenance: doc.maintenance ?? "Normal",
    maintenanceNote: doc.maintenanceNote ?? null,
    healthScore: doc.healthScore ?? 80,
    trendDelta: doc.trendDelta ?? 0,
    peakWindow: doc.peakWindow ?? "14:00-17:00",
    lowWindow: doc.lowWindow ?? "08:00-10:00",
    demandByDay: doc.demandByDay ?? [],
    demandByPart: doc.demandByPart ?? [],
    predictedDemand: doc.predictedDemand ?? {
      window: "Tomorrow · 14:00-17:00",
      level: "Moderate",
      note: "Projected from trailing booking demand.",
    },
  };
}
