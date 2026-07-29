export interface ToolParams {
  charset: string;
  cols: number;
  brightness: number;
  contrast: number;
  invert: boolean;
  dither: boolean;
  color: string;
}

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
