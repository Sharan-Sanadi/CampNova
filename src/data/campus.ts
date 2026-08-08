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

export const currentUser = {
  name: "Dr. Ananya Rao",
  initials: "AR",
  role: "Operations Lead",
  campus: "Northgate Campus",
  email: "ananya.rao@northgate.edu",
};

const RESOURCES: Resource[] = [
  {
    id: "computer-lab-04",
    name: "Computer Lab 04",
    type: "Computer Lab",
    building: "Engineering Block",
    floor: "Level 2",
    capacity: 72,
    amenities: ["Projector", "Air conditioning", "72 desktop systems", "Dual display"],
    status: "available",
    utilization: 68,
    nextBooking: "Today · 14:00",
    trend: [54, 61, 66, 72, 70, 63, 68],
    description:
      "High-density instructional lab used for programming coursework, workshops and assessments.",
  },
  {
    id: "computer-lab-05",
    name: "Computer Lab 05",
    type: "Computer Lab",
    building: "Engineering Block",
    floor: "Level 2",
    capacity: 70,
    amenities: ["Projector", "Air conditioning", "70 desktop systems"],
    status: "available",
    utilization: 41,
    nextBooking: "Tomorrow · 09:30",
    trend: [38, 42, 40, 45, 39, 36, 41],
    description:
      "Overflow instructional lab with identical hardware to Lab 04 and consistently spare capacity.",
  },
  {
    id: "computer-lab-03",
    name: "Computer Lab 03",
    type: "Computer Lab",
    building: "Engineering Block",
    floor: "Level 1",
    capacity: 60,
    amenities: ["Projector", "60 desktop systems"],
    status: "in-use",
    utilization: 84,
    nextBooking: "Today · 16:00",
    trend: [79, 82, 88, 86, 84, 80, 84],
    description: "Most-requested lab on campus; scheduling pressure is persistently high.",
  },
  {
    id: "physics-lab-01",
    name: "Physics Lab 01",
    type: "Physics Lab",
    building: "Science Wing",
    floor: "Level 3",
    capacity: 40,
    amenities: ["Fume hood", "Lab benches", "Safety station"],
    status: "available",
    utilization: 52,
    nextBooking: "Tomorrow · 11:00",
    trend: [48, 50, 55, 53, 51, 49, 52],
    description: "Practical laboratory for mechanics and optics coursework.",
  },
  {
    id: "seminar-hall-a",
    name: "Seminar Hall A",
    type: "Auditorium",
    building: "Central Block",
    floor: "Ground",
    capacity: 220,
    amenities: ["Stage", "PA system", "Projector", "Live streaming"],
    status: "available",
    utilization: 34,
    nextBooking: "Fri · 10:00",
    trend: [30, 28, 36, 33, 31, 29, 34],
    description: "Primary venue for guest lectures, symposia and departmental events.",
  },
  {
    id: "meeting-room-201",
    name: "Meeting Room 201",
    type: "Meeting Room",
    building: "Administration",
    floor: "Level 2",
    capacity: 14,
    amenities: ["Video conferencing", "Whiteboard", "Display"],
    status: "in-use",
    utilization: 76,
    nextBooking: "Today · 12:30",
    trend: [72, 78, 74, 80, 77, 70, 76],
    description: "Faculty and committee meeting room with conferencing hardware.",
  },
  {
    id: "classroom-112",
    name: "Classroom 112",
    type: "Classroom",
    building: "Humanities Block",
    floor: "Level 1",
    capacity: 65,
    amenities: ["Projector", "Smart board"],
    status: "available",
    utilization: 58,
    nextBooking: "Today · 15:00",
    trend: [55, 57, 60, 62, 56, 54, 58],
    description: "General-purpose lecture room in the humanities teaching cluster.",
  },
  {
    id: "indoor-arena",
    name: "Indoor Sports Arena",
    type: "Sports Facility",
    building: "Sports Complex",
    floor: "Ground",
    capacity: 300,
    amenities: ["Courts", "Changing rooms", "Scoreboard"],
    status: "maintenance",
    utilization: 22,
    nextBooking: null,
    trend: [40, 38, 30, 24, 20, 18, 22],
    description: "Multi-court arena; flooring maintenance in progress until Thursday.",
  },
  {
    id: "innovation-lab",
    name: "Innovation Lab",
    type: "Innovation Space",
    building: "Innovation Hub",
    floor: "Level 3",
    capacity: 64,
    amenities: ["Projector", "Air conditioning", "Movable furniture", "Prototyping kit", "Laptops"],
    status: "available",
    utilization: 47,
    nextBooking: "Tomorrow · 16:00",
    trend: [40, 44, 49, 52, 46, 42, 47],
    description:
      "Flexible maker and workshop space with reconfigurable furniture and prototyping equipment.",
  },
  {
    id: "chemistry-lab-02",
    name: "Chemistry Lab 02",
    type: "Chemistry Lab",
    building: "Science Wing",
    floor: "Level 2",
    capacity: 36,
    amenities: ["Fume hood", "Lab benches", "Safety station", "Air conditioning"],
    status: "available",
    utilization: 44,
    nextBooking: "Thu · 09:00",
    trend: [39, 43, 47, 45, 42, 40, 44],
    description: "Wet laboratory for organic chemistry practicals with full extraction coverage.",
  },
  {
    id: "seminar-room-b2",
    name: "Seminar Room B2",
    type: "Seminar Hall",
    building: "Central Block",
    floor: "Level 1",
    capacity: 90,
    amenities: ["Projector", "PA system", "Air conditioning", "Tiered seating"],
    status: "available",
    utilization: 51,
    nextBooking: "Today · 17:00",
    trend: [46, 49, 55, 53, 50, 44, 51],
    description: "Tiered seminar room used for departmental sessions and guest talks.",
  },
  {
    id: "meeting-room-104",
    name: "Meeting Room 104",
    type: "Meeting Room",
    building: "Administration",
    floor: "Level 1",
    capacity: 10,
    amenities: ["Video conferencing", "Whiteboard", "Acoustic treatment"],
    status: "available",
    utilization: 38,
    nextBooking: "Tomorrow · 10:00",
    trend: [33, 36, 41, 39, 37, 32, 38],
    description: "Quiet acoustically treated meeting room for small groups and interviews.",
  },
  {
    id: "classroom-208",
    name: "Classroom 208",
    type: "Classroom",
    building: "Humanities Block",
    floor: "Level 2",
    capacity: 45,
    amenities: ["Projector", "Smart board", "Air conditioning"],
    status: "available",
    utilization: 62,
    nextBooking: "Today · 13:00",
    trend: [58, 60, 66, 64, 61, 57, 62],
    description: "Mid-size teaching room in the humanities cluster with smart board support.",
  },
  {
    id: "av-equipment-cart",
    name: "Mobile AV Kit 02",
    type: "Equipment",
    building: "Central Block",
    floor: "Store · Ground",
    capacity: 1,
    amenities: ["4K projector", "PA system", "Wireless mics", "Streaming encoder"],
    status: "in-use",
    utilization: 71,
    nextBooking: "Today · 16:30",
    trend: [64, 70, 76, 73, 69, 66, 71],
    description: "Portable audio-visual kit issued for events in rooms without fixed AV.",
  },
];

const BOOKINGS: Booking[] = [
  {
    id: "BK-2481",
    title: "AI Workshop — Applied LLMs",
    resourceId: "computer-lab-04",
    resourceName: "Computer Lab 04",
    organiser: "AI Club",
    department: "Computer Science",
    date: "2026-08-09",
    start: "14:00",
    end: "16:00",
    attendees: 72,
    status: "pending",
    riskLabel: "Low conflict risk",
    note: "Requires all desktop systems and projector for a hands-on session.",
  },
  {
    id: "BK-2478",
    title: "Faculty Coordination Meeting",
    resourceId: "meeting-room-201",
    resourceName: "Meeting Room 201",
    organiser: "Dr. Meera Nair",
    department: "Administration",
    date: "2026-08-08",
    start: "12:30",
    end: "13:30",
    attendees: 12,
    status: "approved",
    riskLabel: "Low conflict risk",
    note: "Monthly departmental coordination review.",
  },
  {
    id: "BK-2475",
    title: "Data Structures Lab Session",
    resourceId: "computer-lab-03",
    resourceName: "Computer Lab 03",
    organiser: "Prof. Karthik Iyer",
    department: "Computer Science",
    date: "2026-08-08",
    start: "14:00",
    end: "16:00",
    attendees: 58,
    status: "conflict",
    riskLabel: "High conflict risk",
    note: "Overlaps with the Robotics Club practice slot in the same lab.",
  },
  {
    id: "BK-2474",
    title: "Robotics Club Practice",
    resourceId: "computer-lab-03",
    resourceName: "Computer Lab 03",
    organiser: "Robotics Club",
    department: "Student Activities",
    date: "2026-08-08",
    start: "14:00",
    end: "16:00",
    attendees: 24,
    status: "conflict",
    riskLabel: "High conflict risk",
    note: "Recurring weekly practice slot booked three weeks ago.",
  },
  {
    id: "BK-2470",
    title: "Guest Lecture — Quantum Computing",
    resourceId: "seminar-hall-a",
    resourceName: "Seminar Hall A",
    organiser: "Physics Department",
    department: "Physics",
    date: "2026-08-14",
    start: "10:00",
    end: "12:00",
    attendees: 180,
    status: "approved",
    riskLabel: "Low conflict risk",
    note: "External speaker; live streaming requested.",
  },
  {
    id: "BK-2468",
    title: "Optics Practical — Batch B",
    resourceId: "physics-lab-01",
    resourceName: "Physics Lab 01",
    organiser: "Dr. Sanjay Bose",
    department: "Physics",
    date: "2026-08-09",
    start: "11:00",
    end: "13:00",
    attendees: 36,
    status: "approved",
    riskLabel: "Low conflict risk",
    note: "Standard weekly practical for second-year batch B.",
  },
  {
    id: "BK-2463",
    title: "Cultural Committee Rehearsal",
    resourceId: "indoor-arena",
    resourceName: "Indoor Sports Arena",
    organiser: "Cultural Committee",
    department: "Student Activities",
    date: "2026-08-11",
    start: "17:00",
    end: "20:00",
    attendees: 140,
    status: "rejected",
    riskLabel: "Medium conflict risk",
    note: "Declined — arena flooring maintenance runs through Thursday.",
  },
  {
    id: "BK-2459",
    title: "Placement Aptitude Test",
    resourceId: "classroom-112",
    resourceName: "Classroom 112",
    organiser: "Placement Cell",
    department: "Career Services",
    date: "2026-08-08",
    start: "15:00",
    end: "17:00",
    attendees: 60,
    status: "approved",
    riskLabel: "Low conflict risk",
    note: "Invigilators assigned; no equipment required.",
  },
  {
    id: "BK-2455",
    title: "Alumni Mixer Setup",
    resourceId: "seminar-hall-a",
    resourceName: "Seminar Hall A",
    organiser: "Alumni Office",
    department: "Outreach",
    date: "2026-08-16",
    start: "16:30",
    end: "19:00",
    attendees: 120,
    status: "pending",
    riskLabel: "Medium conflict risk",
    note: "Setup window overlaps with the hall's cleaning schedule.",
  },
  {
    id: "BK-2450",
    title: "Design Thinking Elective",
    resourceId: "computer-lab-05",
    resourceName: "Computer Lab 05",
    organiser: "Prof. Leila Haddad",
    department: "Design",
    date: "2026-08-09",
    start: "09:30",
    end: "11:00",
    attendees: 40,
    status: "cancelled",
    riskLabel: "Low conflict risk",
    note: "Cancelled by organiser — merged with the Thursday cohort.",
  },
];

const INSIGHTS: CampusInsight[] = [
  {
    id: "IN-01",
    severity: "critical",
    category: "Demand",
    title: "Computer lab demand spike",
    explanation:
      "Computer lab demand is 28% above the weekly baseline, concentrated between 14:00 and 17:00.",
    evidence: [
      "Lab 03 utilization at 84% (baseline 66%)",
      "9 overlapping requests in the 14:00–17:00 window",
      "2 unresolved conflicts in the last 24 hours",
    ],
    recommendation: "Shift two low-priority sessions from Lab 03 to Lab 05.",
  },
  {
    id: "IN-02",
    severity: "attention",
    category: "Utilization",
    title: "Seminar Hall A underutilised",
    explanation:
      "Seminar Hall A has run at 34% utilization for three consecutive weeks while classrooms are oversubscribed.",
    evidence: [
      "Average 2.1 bookings per weekday",
      "Classroom cluster at 61% average utilization",
      "No recurring reservations after 16:00",
    ],
    recommendation: "Open the hall for large-cohort lectures on Tuesday and Thursday afternoons.",
  },
  {
    id: "IN-03",
    severity: "attention",
    category: "Anomaly",
    title: "Unusual cancellation pattern",
    explanation:
      "Design department cancellations are up 3x this fortnight, all for morning slots in Engineering Block.",
    evidence: [
      "6 cancellations vs. 2 typical",
      "All within 24 hours of the slot",
      "Same organiser cohort",
    ],
    recommendation: "Flag the cohort for schedule review and release held slots automatically.",
  },
  {
    id: "IN-04",
    severity: "info",
    category: "Capacity",
    title: "Capacity headroom in Science Wing",
    explanation:
      "Science Wing has 480 unbooked seat-hours next week — enough to absorb the engineering overflow.",
    evidence: ["Physics Lab 01 at 52%", "Two rooms unbooked after 15:00"],
    recommendation: "Route overflow theory sessions to Science Wing Level 3.",
  },
];

const ACTIVITY: ActivityEvent[] = [
  {
    id: "AC-1",
    kind: "conflict",
    message: "Conflict detected in Computer Lab 03",
    detail: "Two requests overlap at 14:00–16:00",
    time: "4 min ago",
  },
  {
    id: "AC-2",
    kind: "ai",
    message: "CampusOS generated a rebalancing recommendation",
    detail: "Move Robotics Club practice to Lab 05",
    time: "6 min ago",
  },
  {
    id: "AC-3",
    kind: "approval",
    message: "Approval requested by AI Club",
    detail: "Computer Lab 04 · Tomorrow 14:00–16:00",
    time: "22 min ago",
  },
  {
    id: "AC-4",
    kind: "booking",
    message: "Booking confirmed for Placement Cell",
    detail: "Classroom 112 · Today 15:00–17:00",
    time: "48 min ago",
  },
  {
    id: "AC-5",
    kind: "release",
    message: "Resource released early",
    detail: "Computer Lab 05 freed 40 minutes ahead of schedule",
    time: "1 hr ago",
  },
  {
    id: "AC-6",
    kind: "booking",
    message: "Recurring reservation updated",
    detail: "Physics Lab 01 · Batch B practical",
    time: "2 hr ago",
  },
];

const NOTIFICATIONS: NotificationItem[] = [
  {
    id: "NT-1",
    category: "Conflict",
    title: "CampusOS detected a scheduling conflict",
    body: "Computer Lab 03 has two overlapping requests at 14:00–16:00.",
    time: "4 min ago",
    unread: true,
    actionLabel: "Review conflict",
    actionTo: "/bookings/BK-2475",
  },
  {
    id: "NT-2",
    category: "Approval",
    title: "AI Club requested Computer Lab 04",
    body: "Tomorrow · 14:00–16:00 · 72 attendees. Assessed as low conflict risk.",
    time: "22 min ago",
    unread: true,
    actionLabel: "Open approval",
    actionTo: "/approvals",
  },
  {
    id: "NT-3",
    category: "AI insight",
    title: "Lab demand is 28% above baseline",
    body: "CampusOS recommends shifting two low-priority sessions to Lab 05.",
    time: "1 hr ago",
    unread: true,
    actionLabel: "View insight",
    actionTo: "/intelligence",
  },
  {
    id: "NT-4",
    category: "Booking",
    title: "Placement Aptitude Test confirmed",
    body: "Classroom 112 · Today 15:00–17:00.",
    time: "48 min ago",
    unread: false,
    actionLabel: "View booking",
    actionTo: "/bookings/BK-2459",
  },
  {
    id: "NT-5",
    category: "System",
    title: "Sports Arena under maintenance",
    body: "Flooring maintenance runs until Thursday; bookings are suspended.",
    time: "Yesterday",
    unread: false,
    actionLabel: "View resource",
    actionTo: "/resources/indoor-arena",
  },
];

export const todaySchedule = [
  { time: "10:00", title: "AI Workshop briefing", place: "Computer Lab 04", tone: "info" as const },
  { time: "12:30", title: "Faculty Meeting", place: "Meeting Room 201", tone: "default" as const },
  {
    time: "14:00",
    title: "Data Structures Lab Session",
    place: "Computer Lab 03",
    tone: "critical" as const,
  },
  { time: "15:00", title: "Placement Aptitude Test", place: "Classroom 112", tone: "default" as const },
  { time: "16:30", title: "Club Event — Robotics", place: "Computer Lab 03", tone: "warning" as const },
];

export const utilizationSeries = [
  { day: "Mon", utilization: 61, bookings: 42 },
  { day: "Tue", utilization: 68, bookings: 51 },
  { day: "Wed", utilization: 74, bookings: 57 },
  { day: "Thu", utilization: 72, bookings: 55 },
  { day: "Fri", utilization: 66, bookings: 47 },
  { day: "Sat", utilization: 38, bookings: 19 },
  { day: "Sun", utilization: 21, bookings: 9 },
];

export const peakDemandSeries = [
  { hour: "08", demand: 18 },
  { hour: "10", demand: 46 },
  { hour: "12", demand: 52 },
  { hour: "14", demand: 88 },
  { hour: "15", demand: 94 },
  { hour: "16", demand: 81 },
  { hour: "17", demand: 63 },
  { hour: "19", demand: 27 },
];

export const conflictSeries = [
  { week: "W1", conflicts: 9, resolved: 7 },
  { week: "W2", conflicts: 12, resolved: 10 },
  { week: "W3", conflicts: 7, resolved: 7 },
  { week: "W4", conflicts: 11, resolved: 9 },
  { week: "W5", conflicts: 6, resolved: 6 },
];

export const campusHealth = {
  score: 87,
  utilization: 72,
  bookingPressure: 64,
  conflictRate: 3.1,
  pendingActions: 6,
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
const emitCampus = () => {
  campusVersion += 1;
  listeners.forEach((fn) => fn());
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
