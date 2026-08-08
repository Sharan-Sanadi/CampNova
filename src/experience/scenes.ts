import * as THREE from "three";

/* ------------------------------------------------------------------ *
 * Art-directed camera waypoints.
 * Progress 0 → 1 is the whole landing narrative; the camera is sampled
 * from these named scenes and then critically damped (see CameraRig).
 * ------------------------------------------------------------------ */

export interface Waypoint {
  key: string;
  /** Human label used for the DOM scene indicator. */
  title: string;
  progress: number;
  position: [number, number, number];
  lookAt: [number, number, number];
  fov: number;
}

export const SCENES: Waypoint[] = [
  {
    key: "fragmented",
    title: "Fragmented",
    progress: 0,
    position: [1.5, 9.5, 21],
    lookAt: [0, 1.2, 0],
    fov: 42,
  },
  {
    key: "connect",
    title: "Connect",
    progress: 0.2,
    position: [-11.5, 5.4, 14.5],
    lookAt: [0, 1.4, 0],
    fov: 40,
  },
  {
    key: "intelligence",
    title: "Intelligence",
    progress: 0.4,
    position: [0.5, 4.6, 13.2],
    lookAt: [0, 2.3, 0],
    fov: 36,
  },
  {
    key: "understand",
    title: "Understand",
    progress: 0.54,
    position: [8.2, 4.2, 12.4],
    lookAt: [1.2, 1.9, -0.4],
    fov: 35,
  },
  {
    key: "predict",
    title: "Predict",
    progress: 0.68,
    position: [12.6, 7.4, 12.0],
    lookAt: [2.2, 1.5, -1.2],
    fov: 38,
  },
  {
    key: "act",
    title: "Act",
    progress: 0.84,
    position: [6.4, 3.2, 11.4],
    lookAt: [1.4, 1.4, -0.6],
    fov: 33,
  },
  {
    key: "autonomous",
    title: "One campus",
    progress: 1,
    position: [0, 14.5, 24],
    lookAt: [0, 0.6, 0],
    fov: 44,
  },
];

/** easeInOut for waypoint blending — never linear/robotic. */
function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _la = new THREE.Vector3();
const _lb = new THREE.Vector3();

/** Samples the waypoint spline into reusable vectors (no per-frame allocation). */
export function sampleCamera(
  progress: number,
  outPosition: THREE.Vector3,
  outLookAt: THREE.Vector3,
): number {
  const p = THREE.MathUtils.clamp(progress, 0, 1);
  let i = 0;
  while (i < SCENES.length - 2 && p > SCENES[i + 1]!.progress) i++;
  const from = SCENES[i]!;
  const to = SCENES[i + 1]!;
  const span = Math.max(to.progress - from.progress, 1e-5);
  const t = easeInOut(THREE.MathUtils.clamp((p - from.progress) / span, 0, 1));

  _a.fromArray(from.position);
  _b.fromArray(to.position);
  outPosition.lerpVectors(_a, _b, t);

  _la.fromArray(from.lookAt);
  _lb.fromArray(to.lookAt);
  outLookAt.lerpVectors(_la, _lb, t);

  return THREE.MathUtils.lerp(from.fov, to.fov, t);
}

export function sceneKeyFor(progress: number): string {
  let key = SCENES[0]!.key;
  for (const s of SCENES) if (progress >= s.progress - 0.001) key = s.key;
  return key;
}

/* ------------------------------------------------------------------ *
 * The campus digital twin — one building per real CampusOS system.
 * `fragment` is where the block sits while systems are disconnected;
 * `position` is its final, aligned place in the connected campus.
 * ------------------------------------------------------------------ */

export interface BuildingSpec {
  id: string;
  label: string;
  stat: string;
  note: string;
  position: [number, number, number];
  fragment: [number, number, number];
  size: [number, number, number];
  /** 0 → 1 order in which the system joins the intelligence layer. */
  joinOrder: number;
}

const ring = (i: number, count: number, radius: number): [number, number] => {
  const a = (i / count) * Math.PI * 2 + Math.PI / 8;
  return [Math.cos(a) * radius, Math.sin(a) * radius];
};

const SYSTEMS: Array<Omit<BuildingSpec, "position" | "fragment" | "joinOrder">> = [
  {
    id: "erp",
    label: "ERP",
    stat: "Finance · HR · Assets",
    note: "Synced 2 min ago",
    size: [2.1, 3.4, 2.1],
  },
  {
    id: "lms",
    label: "LMS",
    stat: "1,284 active courses",
    note: "Timetable linked",
    size: [1.8, 4.6, 1.8],
  },
  {
    id: "library",
    label: "Library",
    stat: "68% seat utilisation",
    note: "Peak 14:00–17:00",
    size: [2.4, 2.2, 2.4],
  },
  {
    id: "attendance",
    label: "Attendance",
    stat: "94.2% today",
    note: "Live from readers",
    size: [1.6, 3.0, 1.6],
  },
  {
    id: "bookings",
    label: "Bookings",
    stat: "Computer Lab 05 · 72 seats",
    note: "Available tomorrow",
    size: [2.6, 2.8, 2.0],
  },
  {
    id: "transport",
    label: "Transport",
    stat: "12 routes running",
    note: "2 min avg delay",
    size: [2.0, 1.8, 2.8],
  },
  {
    id: "iot",
    label: "IoT & Sensors",
    stat: "3,410 signals/min",
    note: "All gateways healthy",
    size: [1.5, 2.6, 1.5],
  },
  {
    id: "energy",
    label: "Energy",
    stat: "−11% vs last week",
    note: "HVAC optimised",
    size: [2.2, 3.8, 2.2],
  },
];

export const BUILDINGS: BuildingSpec[] = SYSTEMS.map((s, i) => {
  const [x, z] = ring(i, SYSTEMS.length, 6.6);
  const [fx, fz] = ring(i, SYSTEMS.length, 12.4);
  const drift = ((i % 3) - 1) * 1.4;
  return {
    ...s,
    position: [x, s.size[1] / 2, z],
    fragment: [fx + drift, s.size[1] / 2 + 0.6 + (i % 2) * 0.9, fz - drift * 0.6],
    joinOrder: i / (SYSTEMS.length - 1),
  };
});
