/**
 * CAMPUSOS AI — MOCK DATA LAYER
 * ------------------------------------------------------------------
 * Every screen reads campus data through the service functions at the
 * bottom of this file (`getResources()`, `getBookings()`, ...).
 * They are currently synchronous and return deterministic fixtures.
 * To go live, replace ONLY the function bodies with real API calls —
 * the exported types and shapes are the contract the UI depends on.
 */

export type ResourceType =
  | "Computer Lab"
  | "Physics Lab"
  | "Chemistry Lab"
  | "Classroom"
  | "Meeting Room"
  | "Seminar Hall"
  | "Auditorium"
  | "Innovation Space"
  | "Sports Facility"
  | "Equipment";

export type ResourceStatus = "available" | "in-use" | "maintenance";

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  building: string;
  floor: string;
  capacity: number;
  amenities: string[];
  status: ResourceStatus;
  utilization: number; // 0-100 weekly
  nextBooking: string | null;
  trend: number[]; // 7 day utilization
  description: string;
}

export type BookingStatus =
  | "draft"
  | "pending"
  | "approved"
  | "confirmed"
  | "rejected"
  | "cancelled"
  | "completed"
  | "conflict";

export interface Booking {
  id: string;
  title: string;
  resourceId: string;
  resourceName: string;
  organiser: string;
  department: string;
  date: string; // ISO date
  start: string; // HH:mm
  end: string; // HH:mm
  attendees: number;
  status: BookingStatus;
  riskLabel: "Low conflict risk" | "Medium conflict risk" | "High conflict risk";
  note: string;
  /* Booking Intelligence (v4) — optional so v3 fixtures stay valid. */
  purpose?: string;
  equipment?: string[];
  createdAt?: string;
  mine?: boolean;
  conflictWith?: string[];
}

export interface CampusInsight {
  id: string;
  severity: "critical" | "attention" | "info";
  category: "Demand" | "Utilization" | "Anomaly" | "Capacity";
  title: string;
  explanation: string;
  evidence: string[];
  recommendation: string;
}

export interface ActivityEvent {
  id: string;
  kind: "booking" | "release" | "approval" | "conflict" | "ai";
  message: string;
  detail: string;
  time: string;
}

export interface NotificationItem {
  id: string;
  category: "Booking" | "Approval" | "Conflict" | "AI insight" | "System";
  title: string;
  body: string;
  time: string;
  unread: boolean;
  actionLabel: string;
  actionTo: string;
}

export interface CampusSettings {
  campus: string;
  timezone: string;
  operatingHoursStart: string;
  operatingHoursEnd: string;
  aiAutonomyEnabled: boolean;
  conflictAlertsEnabled: boolean;
  dailyDigestEnabled: boolean;
  approvalRemindersEnabled: boolean;
  theme: "dark" | "light";
  compactDensity: boolean;
  twoFactorEnabled: boolean;
  activeSessionsCount: number;
}

export const currentSettings: CampusSettings = {
  campus: "NMIT Bengaluru",
  timezone: "Asia/Kolkata (GMT+5:30)",
  operatingHoursStart: "08:00",
  operatingHoursEnd: "20:00",
  aiAutonomyEnabled: false,
  conflictAlertsEnabled: true,
  dailyDigestEnabled: true,
  approvalRemindersEnabled: true,
  theme: "dark",
  compactDensity: false,
  twoFactorEnabled: true,
  activeSessionsCount: 2,
};

export function computeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export const currentUser = {
  name: "Dr. Ananya Rao",
  initials: "AR",
  role: "Operations Lead",
  get campus() {
    return currentSettings.campus;
  },
  set campus(val: string) {
    currentSettings.campus = val;
  },
  email: "ananya.rao@northgate.edu",
};

export const updateUser = (
  patch: Partial<{ name: string; role: string; email: string; campus: string }>,
) => {
  if (patch.name !== undefined && patch.name.trim()) {
    currentUser.name = patch.name.trim();
    currentUser.initials = computeInitials(currentUser.name);
  }
  if (patch.role !== undefined && patch.role.trim()) {
    currentUser.role = patch.role.trim();
  }
  if (patch.email !== undefined && patch.email.trim()) {
    currentUser.email = patch.email.trim();
  }
  if (patch.campus !== undefined && patch.campus.trim()) {
    currentSettings.campus = patch.campus.trim();
  }
  emitCampus();
  return currentUser;
};

const RESOURCES: Resource[] = [];
const BOOKINGS: Booking[] = [];
const INSIGHTS: CampusInsight[] = [];
const ACTIVITY: ActivityEvent[] = [];
const NOTIFICATIONS: NotificationItem[] = [];

export const todaySchedule: { time: string; title: string; place: string; tone: "info" | "critical" | "warning" | "default" }[] = [];
export const utilizationSeries: { day: string; utilization: number; bookings: number }[] = [];
export const peakDemandSeries: { hour: string; demand: number }[] = [];
export const conflictSeries: { week: string; conflicts: number; resolved: number }[] = [];
export const campusHealth = {
  score: 0,
  utilization: 0,
  bookingPressure: 0,
  conflictRate: 0,
  pendingActions: 0,
};

/* ------------------------------------------------------------------ */
/* SERVICE LAYER — replace these bodies with real API calls            */
/* ------------------------------------------------------------------ */

/* Reactive store: modules subscribe so Booking Intelligence, the dashboard,
   notifications and Resource Intelligence all read one shared state. */
let campusVersion = 0;
const listeners = new Set<() => void>();

export const subscribeCampus = (fn: () => void): (() => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
export const getCampusVersion = (): number => campusVersion;
export const emitCampus = () => {
  campusVersion += 1;
  listeners.forEach((fn) => fn());
};

export const upsertResource = (resource: Resource): Resource => {
  const i = RESOURCES.findIndex((r) => r.id === resource.id);
  if (i >= 0) RESOURCES[i] = resource;
  else RESOURCES.unshift(resource);
  emitCampus();
  return resource;
};

export const upsertBooking = (booking: Booking): Booking => {
  const i = BOOKINGS.findIndex((b) => b.id === booking.id);
  if (i >= 0) BOOKINGS[i] = booking;
  else BOOKINGS.unshift(booking);
  emitCampus();
  return booking;
};

export const patchBooking = (id: string, patch: Partial<Booking>): Booking | undefined => {
  const i = BOOKINGS.findIndex((b) => b.id === id);
  if (i < 0) return undefined;
  const next = { ...BOOKINGS[i]!, ...patch } as Booking;
  BOOKINGS[i] = next;
  emitCampus();
  return next;
};

export const pushActivityEvent = (event: ActivityEvent) => {
  ACTIVITY.unshift(event);
  emitCampus();
};

export const pushNotification = (item: NotificationItem) => {
  NOTIFICATIONS.unshift(item);
  emitCampus();
};

export const getResources = (): Resource[] => RESOURCES;
export const getResource = (id: string): Resource | undefined =>
  RESOURCES.find((r) => r.id === id);
export const getBookings = (): Booking[] => BOOKINGS;
export const getBooking = (id: string): Booking | undefined =>
  BOOKINGS.find((b) => b.id === id);
export const getBookingsForResource = (resourceId: string): Booking[] =>
  BOOKINGS.filter((b) => b.resourceId === resourceId);
export const getInsights = (): CampusInsight[] => INSIGHTS;
export const getActivity = (): ActivityEvent[] => ACTIVITY;
export const getNotifications = (): NotificationItem[] => NOTIFICATIONS;
export const getSettings = (): CampusSettings => currentSettings;

export const updateSettings = (patch: Partial<CampusSettings>): CampusSettings => {
  Object.assign(currentSettings, patch);
  emitCampus();
  return currentSettings;
};

export const getPendingApprovals = (): Booking[] =>
  BOOKINGS.filter((b) => b.status === "pending");

export const pulseMetrics = [
  {
    label: "Resource utilization",
    value: "72%",
    trend: "+4.2%",
    direction: "up" as const,
    meaning: "Above the 68% seasonal baseline",
  },
  {
    label: "Active bookings",
    value: "148",
    trend: "+12",
    direction: "up" as const,
    meaning: "Across 34 bookable resources",
  },
  {
    label: "Conflicts detected",
    value: "2",
    trend: "-3",
    direction: "down" as const,
    meaning: "Both in Engineering Block labs",
  },
  {
    label: "Pending approvals",
    value: "6",
    trend: "+2",
    direction: "up" as const,
    meaning: "2 waiting more than 24 hours",
  },
];
