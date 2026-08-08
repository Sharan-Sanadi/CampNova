/**
 * 3D palette derived directly from the CampusOS design tokens in styles.css.
 * These hex values are exact sRGB conversions of the existing oklch tokens —
 * the WebGL layer must never introduce colors outside the brand system.
 */
export interface ScenePalette {
  background: string;
  ground: string;
  building: string;
  buildingTop: string;
  accent: string;
  core: string;
  fog: string;
  particle: string;
}

/** dark: --background / --surface / --primary / --foreground */
export const DARK_PALETTE: ScenePalette = {
  background: "#0b0e11",
  ground: "#0d1013",
  building: "#141a20",
  buildingTop: "#2b353e",
  accent: "#25a2e8",
  core: "#25a2e8",
  fog: "#0b0e11",
  particle: "#8fc6ea",
};

/** light: --background / --surface / --primary / --foreground */
export const LIGHT_PALETTE: ScenePalette = {
  background: "#fdfdfe",
  ground: "#f1f3f6",
  building: "#dde3ea",
  buildingTop: "#f4f7fa",
  accent: "#006fc2",
  core: "#006fc2",
  fog: "#fdfdfe",
  particle: "#4a86b8",
};

export function paletteForTheme(isDark: boolean): ScenePalette {
  return isDark ? DARK_PALETTE : LIGHT_PALETTE;
}
