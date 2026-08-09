/**
 * Application-wide constants.
 */

/** Application metadata */
export const APP_NAME = "CampusOS AI" as const;
export const APP_DESCRIPTION = "Intelligence layer for the autonomous campus" as const;

/** Layout breakpoints (px) */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

/** Animation durations (ms) — matches CSS tokens */
export const DURATION = {
  fast: 150,
  base: 220,
  slow: 320,
} as const;
