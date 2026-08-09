import type { Server } from "socket.io";
import type { ActivityEvent, Booking, NotificationItem } from "@campus-os/shared-types";

let ioServer: Server | undefined;

export function setRealtimeServer(io: Server): void {
  ioServer = io;
}

export function emitActivity(event: ActivityEvent): void {
  ioServer?.of("/realtime").to("campus").emit("activity", event);
}

export function emitNotification(notification: NotificationItem, userId?: string): void {
  const namespace = ioServer?.of("/realtime");
  if (!namespace) return;
  if (userId) namespace.to(`user:${userId}`).emit("notification", notification);
  namespace.to("role:CAMPUS_ADMIN").emit("notification", notification);
  namespace.to("role:DEPT_LEAD").emit("notification", notification);
}

export function emitBookingStatus(booking: Booking): void {
  ioServer?.of("/realtime").to("campus").emit("booking-status", booking);
}

export function emitDatasetUpdated(payload: {
  campusId: string;
  datasetImportId: string;
  version: number;
  imported: number;
  updated: number;
  skipped: number;
}): void {
  ioServer?.of("/realtime").to("campus").emit("DATASET_UPDATED", payload);
}
