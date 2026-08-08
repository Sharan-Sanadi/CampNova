import * as THREE from "three";
import { BUILDINGS } from "../scenes";
import { campusHealth } from "@/data/campus";

/* ------------------------------------------------------------------ *
 * Spatial layout for the shared CampusOS world.
 * Every value is deterministic and derived from the existing mock
 * campus data — nothing is randomised at render time.
 * ------------------------------------------------------------------ */

export type BlockHealth = "normal" | "demand" | "conflict" | "optimized";

export interface CampusBlock {
  id: string;
  label: string;
  stat: string;
  note: string;
  position: [number, number, number];
  size: [number, number, number];
  /** 0 → 1 utilisation; drives spatial column height. */
  utilization: number;
  energy: number;
  health: BlockHealth;
  order: number;
}

const HEALTH_CYCLE: BlockHealth[] = ["normal", "demand", "optimized", "normal", "conflict"];

export const CAMPUS_BLOCKS: CampusBlock[] = BUILDINGS.map((b, i) => {
  const base = campusHealth.utilization / 100;
  const offset = ((i % 5) - 2) * 0.11;
  const utilization = THREE.MathUtils.clamp(base + offset, 0.18, 0.97);
  return {
    id: b.id,
    label: b.label,
    stat: b.stat,
    note: b.note,
    position: b.position,
    size: b.size,
    utilization,
    energy: THREE.MathUtils.clamp(0.42 + ((i * 7) % 11) / 22, 0.3, 0.95),
    health: HEALTH_CYCLE[i % HEALTH_CYCLE.length]!,
    order: i / Math.max(BUILDINGS.length - 1, 1),
  };
});

export const blockById = (id: string | null) =>
  id ? (CAMPUS_BLOCKS.find((b) => b.id === id) ?? null) : null;

/* --- Booking layer: rooms × hours grid --------------------------------- */

export interface BookingCell {
  room: number;
  hour: number;
  state: "free" | "booked" | "conflict";
}

export const BOOKING_ROOMS = 5;
export const BOOKING_HOURS = 10;

/** Deterministic occupancy pattern; two cells intentionally conflict. */
export const BOOKING_CELLS: BookingCell[] = (() => {
  const out: BookingCell[] = [];
  for (let room = 0; room < BOOKING_ROOMS; room++) {
    for (let hour = 0; hour < BOOKING_HOURS; hour++) {
      const seed = (room * 13 + hour * 7) % 9;
      const state: BookingCell["state"] =
        room === 2 && (hour === 4 || hour === 5) ? "conflict" : seed < 3 ? "booked" : "free";
      out.push({ room, hour, state });
    }
  }
  return out;
})();

/* --- Analytics layer: data landscape ---------------------------------- */

export const TERRAIN_COLS = 26;
export const TERRAIN_ROWS = 14;

/** Smooth deterministic ridge field (time × resource → utilisation). */
export function terrainHeight(col: number, row: number): number {
  const x = col / TERRAIN_COLS;
  const y = row / TERRAIN_ROWS;
  return (
    0.5 +
    0.28 * Math.sin(x * Math.PI * 2.2 + y * 1.6) +
    0.18 * Math.sin(y * Math.PI * 3.1 - x * 2.4) +
    0.1 * Math.sin((x + y) * Math.PI * 5.5)
  );
}

/* --- Intelligence network -------------------------------------------- */

export const NETWORK_NODES = CAMPUS_BLOCKS.map((b) => ({
  id: b.id,
  label: b.label,
  position: new THREE.Vector3(b.position[0], b.size[1] * 0.72, b.position[2]),
}));

export const NETWORK_CENTER = new THREE.Vector3(0, 1.6, 0);
