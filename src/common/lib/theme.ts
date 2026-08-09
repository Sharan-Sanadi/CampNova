/**
 * CampusOS theme layer — light/dark are two modes of the SAME token set.
 * Tokens live in src/styles.css (`:root` = light, `.dark` = dark).
 */

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "campusos-theme";

/** Inline script injected before hydration so there is no theme flash. */
export const themeBootstrapScript = `(function(){try{var k='${THEME_STORAGE_KEY}';var s=localStorage.getItem(k);var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var t=s==='light'||s==='dark'?s:(d?'dark':'dark');document.documentElement.classList.toggle('dark',t==='dark');}catch(e){document.documentElement.classList.add('dark');}})();`;

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* storage unavailable — theme stays for this session only */
  }
}

export function readTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}
