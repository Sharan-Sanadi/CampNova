/** Spatial state tones — derived from the CampusOS status token family. */
export interface ToneSet {
  demand: string;
  conflict: string;
  alert: string;
  optimized: string;
}

export const TONES: { dark: ToneSet; light: ToneSet } = {
  dark: { demand: "#3fb0f0", conflict: "#e0a33c", alert: "#e06c4f", optimized: "#3fbf95" },
  light: { demand: "#0f7fca", conflict: "#b7791f", alert: "#c0523a", optimized: "#1c8f6c" },
};

export const tonesForTheme = (isDark: boolean): ToneSet => (isDark ? TONES.dark : TONES.light);
