export const THEME_KEY = "habi:theme";
export const THEME_CHANGED_EVENT = "habi:theme-changed";

export type Theme = "light" | "system" | "dark";
export type ResolvedTheme = "light" | "dark";

export function readTheme(): Theme {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

export function applyTheme(theme: Theme): void {
  try {
    if (theme === "system") {
      localStorage.removeItem(THEME_KEY);
      delete document.documentElement.dataset.theme;
    } else {
      localStorage.setItem(THEME_KEY, theme);
      document.documentElement.dataset.theme = theme;
    }
  } catch {
    // Theme still applies for this session when storage is unavailable.
    if (theme === "system") {
      delete document.documentElement.dataset.theme;
    } else {
      document.documentElement.dataset.theme = theme;
    }
  }
  window.dispatchEvent(new Event(THEME_CHANGED_EVENT));
}

export function resolveTheme(): ResolvedTheme {
  const explicit = document.documentElement.dataset.theme;
  if (explicit === "light" || explicit === "dark") return explicit;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function toggleTheme(): ResolvedTheme {
  const next: ResolvedTheme = resolveTheme() === "dark" ? "light" : "dark";
  applyTheme(next);
  return next;
}
