import { create } from "zustand";

/* ------------------------------------------------------------------ *
 * Spatial OS state — one store for the SHARED CampusOS 3D world.
 * The active module drives which layer of the world is foregrounded.
 * High-frequency values (pointer, energy) are module-level boxes so
 * they never trigger a React re-render.
 * ------------------------------------------------------------------ */

export type SpatialModule =
  | "dashboard"
  | "copilot"
  | "resources"
  | "resource-detail"
  | "bookings"
  | "booking-detail"
  | "intelligence"
  | "analytics"
  | "activity"
  | "notifications"
  | "generic";

export type CampusMode = "live" | "predict" | "energy" | "resources" | "movement" | "alerts";

export type IntelligenceState =
  "idle" | "listening" | "thinking" | "searching" | "responding" | "action";

/** Pointer in normalised device coords, for parallax + picking. */
export const pointer = { x: 0, y: 0 };
/** Short-lived transition energy (0 → 1) used by bloom / scan sweeps. */
export const spatialEnergy = { value: 0 };

interface SpatialState {
  activeModule: SpatialModule;
  campusMode: CampusMode;
  intelligenceState: IntelligenceState;
  selectedBuilding: string | null;
  selectedResource: string | null;
  hoveredObject: string | null;
  predictionMode: boolean;
  bookingConflict: boolean;
  enabled: boolean;
  setActiveModule: (m: SpatialModule) => void;
  setCampusMode: (m: CampusMode) => void;
  setIntelligenceState: (s: IntelligenceState) => void;
  setSelectedBuilding: (id: string | null) => void;
  setSelectedResource: (id: string | null) => void;
  setHoveredObject: (id: string | null) => void;
  setPredictionMode: (v: boolean) => void;
  setBookingConflict: (v: boolean) => void;
  setEnabled: (v: boolean) => void;
}

const same = <T>(a: T, b: T) => a === b;

export const useSpatial = create<SpatialState>((set) => ({
  activeModule: "generic",
  campusMode: "live",
  intelligenceState: "idle",
  selectedBuilding: null,
  selectedResource: null,
  hoveredObject: null,
  predictionMode: false,
  bookingConflict: false,
  enabled: true,
  setActiveModule: (activeModule) =>
    set((s) => {
      if (same(s.activeModule, activeModule)) return s;
      spatialEnergy.value = 1;
      return { activeModule };
    }),
  setCampusMode: (campusMode) =>
    set((s) => {
      if (same(s.campusMode, campusMode)) return s;
      spatialEnergy.value = 1;
      return { campusMode, predictionMode: campusMode === "predict" };
    }),
  setIntelligenceState: (intelligenceState) =>
    set((s) => (same(s.intelligenceState, intelligenceState) ? s : { intelligenceState })),
  setSelectedBuilding: (selectedBuilding) =>
    set((s) => (same(s.selectedBuilding, selectedBuilding) ? s : { selectedBuilding })),
  setSelectedResource: (selectedResource) =>
    set((s) => (same(s.selectedResource, selectedResource) ? s : { selectedResource })),
  setHoveredObject: (hoveredObject) =>
    set((s) => (same(s.hoveredObject, hoveredObject) ? s : { hoveredObject })),
  setPredictionMode: (predictionMode) => set({ predictionMode }),
  setBookingConflict: (bookingConflict) => set({ bookingConflict }),
  setEnabled: (enabled) => set({ enabled }),
}));

/** Maps a router pathname onto the spatial module — no route edits needed. */
export function moduleForPath(pathname: string): SpatialModule {
  if (pathname.startsWith("/dashboard")) return "dashboard";
  if (pathname.startsWith("/copilot")) return "copilot";
  if (/^\/resources\/[^/]+/.test(pathname)) return "resource-detail";
  if (pathname.startsWith("/resources")) return "resources";
  if (/^\/bookings\/[^/]+/.test(pathname)) return "booking-detail";
  if (pathname.startsWith("/bookings")) return "bookings";
  if (pathname.startsWith("/intelligence")) return "intelligence";
  if (pathname.startsWith("/analytics")) return "analytics";
  if (pathname.startsWith("/activity")) return "activity";
  if (pathname.startsWith("/notifications")) return "notifications";
  return "generic";
}
