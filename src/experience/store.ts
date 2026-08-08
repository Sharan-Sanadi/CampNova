import { create } from "zustand";

export type QualityTier = "high" | "medium" | "low" | "mobile";

export interface HoveredBuilding {
  id: string;
  label: string;
  stat: string;
  note: string;
  /** screen-space position in px, for the DOM label overlay */
  x: number;
  y: number;
}

/**
 * Scroll progress is written every frame / on every scroll tick, so it must NOT
 * live in React state. It is a module-level mutable box read inside useFrame.
 */
export const scrollProgress = { target: 0, value: 0 };

/** Brief, transition-only chromatic aberration + bloom energy (0 → 1). */
export const transitionEnergy = { value: 0 };

interface ExperienceState {
  qualityTier: QualityTier;
  reducedMotion: boolean;
  webglAvailable: boolean;
  ready: boolean;
  loadProgress: number;
  activeScene: string;
  hovered: HoveredBuilding | null;
  setQualityTier: (t: QualityTier) => void;
  setReducedMotion: (v: boolean) => void;
  setWebglAvailable: (v: boolean) => void;
  setReady: (v: boolean) => void;
  setLoadProgress: (v: number) => void;
  setActiveScene: (s: string) => void;
  setHovered: (h: HoveredBuilding | null) => void;
}

export const useExperience = create<ExperienceState>((set) => ({
  qualityTier: "high",
  reducedMotion: false,
  webglAvailable: true,
  ready: false,
  loadProgress: 0,
  activeScene: "fragmented",
  hovered: null,
  setQualityTier: (qualityTier) => set({ qualityTier }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setWebglAvailable: (webglAvailable) => set({ webglAvailable }),
  setReady: (ready) => set({ ready }),
  setLoadProgress: (loadProgress) => set({ loadProgress }),
  setActiveScene: (activeScene) =>
    set((s) => (s.activeScene === activeScene ? s : { activeScene })),
  setHovered: (hovered) => set({ hovered }),
}));

/** Particle budgets per tier (see brief: GPU-driven, vertex-shader displaced). */
export const PARTICLE_BUDGET: Record<QualityTier, number> = {
  high: 2600,
  medium: 1200,
  low: 700,
  mobile: 420,
};

export function detectQualityTier(): QualityTier {
  if (typeof window === "undefined") return "medium";
  const ua = navigator.userAgent;
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || window.innerWidth < 768;
  if (isMobile) return "mobile";
  const cores = navigator.hardwareConcurrency ?? 4;
  const dpr = window.devicePixelRatio ?? 1;
  if (cores <= 4) return "low";
  if (cores <= 8 || dpr > 2.2) return "medium";
  return "high";
}

export function detectWebgl(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl2") ??
      canvas.getContext("webgl") ??
      canvas.getContext("experimental-webgl"),
    );
  } catch {
    return false;
  }
}
