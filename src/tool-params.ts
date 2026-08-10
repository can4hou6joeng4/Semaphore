export interface ToolParams {
  charset: string;
  cols: number;
  brightness: number;
  contrast: number;
  invert: boolean;
  dither: boolean;
  color: string;
}

export const PREFS_KEY = "semaphore-tool-prefs";

export const FACTORY_DEFAULTS: ToolParams = {
  charset: "detailed",
  cols: 120,
  brightness: 0,
  contrast: 0,
  invert: false,
  dither: true,
  color: "green"
};

const CHARSETS = new Set(["standard", "detailed", "blocks", "minimal", "binary", "braille"]);
const COLORS = new Set(["green", "gray", "original"]);

function numberParam(query: URLSearchParams, key: string,
                     fallback: number, min: number, max: number, step = 1): number {
  const raw = query.get(key);
  if (raw == null || raw.trim() === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  const clamped = Math.min(max, Math.max(min, value));
  return min + Math.round((clamped - min) / step) * step;
}

function booleanParam(query: URLSearchParams, key: string, fallback: boolean): boolean {
  const raw = query.get(key);
  if (raw == null) return fallback;
  if (raw === "1" || raw === "true") return true;
  if (raw === "0" || raw === "false") return false;
  return fallback;
}

/** Last-used charset and color only — never image bytes. */
export function loadStoredToolPrefs(): Partial<Pick<ToolParams, "charset" | "color">> {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw) as { charset?: unknown; color?: unknown };
    const out: Partial<Pick<ToolParams, "charset" | "color">> = {};
    if (typeof data.charset === "string" && CHARSETS.has(data.charset)) {
      out.charset = data.charset;
    }
    if (typeof data.color === "string" && COLORS.has(data.color)) {
      out.color = data.color;
    }
    return out;
  } catch (_) {
    return {};
  }
}

export function saveStoredToolPrefs(prefs: Pick<ToolParams, "charset" | "color">): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({
      charset: prefs.charset,
      color: prefs.color
    }));
  } catch (_) { /* private mode / quota */ }
}

export function clearStoredToolPrefs(): void {
  try {
    localStorage.removeItem(PREFS_KEY);
  } catch (_) { /* noop */ }
}

/** Factory defaults overlaid with last-used charset/color from localStorage. */
export function defaultsWithStoredPrefs(factory: ToolParams = FACTORY_DEFAULTS): ToolParams {
  const stored = loadStoredToolPrefs();
  return {
    ...factory,
    charset: stored.charset || factory.charset,
    color: stored.color || factory.color
  };
}

export function parseToolParams(search: string, defaults: ToolParams): ToolParams {
  const query = new URLSearchParams(search);
  const charset = query.get("charset");
  const color = query.get("color");
  return {
    charset: charset && CHARSETS.has(charset) ? charset : defaults.charset,
    cols: numberParam(query, "cols", defaults.cols, 40, 240, 2),
    brightness: numberParam(query, "brightness", defaults.brightness, -100, 100),
    contrast: numberParam(query, "contrast", defaults.contrast, -100, 100),
    invert: booleanParam(query, "invert", defaults.invert),
    dither: booleanParam(query, "dither", defaults.dither),
    color: color && COLORS.has(color) ? color : defaults.color
  };
}
