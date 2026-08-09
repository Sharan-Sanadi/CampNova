import type { Booking as BookingDto } from "@campus-os/shared-types";

type BookingDoc = {
  _id?: unknown;
  externalId?: string;
  id?: string;
  title: string;
  resourceId: string;
  resourceName: string;
  organiserId?: unknown;
  organiser: string;
  department: string;
  date: string;
  start: string;
  end: string;
  attendees: number;
  status: BookingDto["status"];
  riskLabel: BookingDto["riskLabel"];
  note: string;
  purpose?: string;
  equipment?: string[];
  createdAt?: Date | string;
  conflictWith?: string[];
};

export function bookingExternalId(doc: { externalId?: string; _id?: unknown; id?: unknown }): string {
  return doc.externalId ?? String(doc.id ?? doc._id ?? "");
}

export function toBookingDto(doc: any, currentUserId?: string): BookingDto {
  const organiserId = doc.organiserId ? String(doc.organiserId) : undefined;
  return {
    id: bookingExternalId(doc),
    title: doc.title,
    resourceId: doc.resourceId,
    resourceName: doc.resourceName,
    organiser: doc.organiser,
    department: doc.department,
    date: doc.date,
    start: doc.start,
    end: doc.end,
    attendees: doc.attendees,
    status: doc.status,
    riskLabel: doc.riskLabel,
    note: doc.note,
    ...(doc.purpose === undefined ? {} : { purpose: doc.purpose }),
    ...(doc.equipment === undefined ? {} : { equipment: doc.equipment }),
    ...(doc.createdAt === undefined
      ? {}
      : { createdAt: typeof doc.createdAt === "string" ? doc.createdAt : doc.createdAt.toISOString() }),
    ...(currentUserId === undefined ? {} : { mine: organiserId === currentUserId }),
    ...(doc.conflictWith === undefined ? {} : { conflictWith: doc.conflictWith }),
  };
}
