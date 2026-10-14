/* ============================================================
   semaphore-ascii — Pure Conversion Engine
   Matches src/ascii-engine.ts algorithms 1:1.
   ============================================================ */

import { RawImage, Rect, ResampleOptions, sampleGrid } from "./resampler.js";

export interface Charset {
  label: string;
  ramp?: string;
  braille?: boolean;
}

export const CHARSETS: Record<string, Charset> = {
  standard: { label: "standard", ramp: " .:-=+*#%@" },
  detailed: {
    label: "detailed",
    ramp: " .'`^\",:;Il!i~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$"
  },
  blocks:   { label: "blocks",   ramp: " ░▒▓█" },
  minimal:  { label: "minimal",  ramp: " .:*#" },
  binary:   { label: "binary",   ramp: " 01" },
  braille:  { label: "braille",  braille: true }
};

export const DEFAULT_CELL_ASPECT = 1 / 0.55; // Terminal cell h/w (typical mono font line-height)

export interface ConvertOptions extends ResampleOptions {
  cols?: number;
  charset?: string;
  color?: "none" | "green" | "gray" | "original" | "truecolor";
  cellAspect?: number;
  srcRect?: Rect;
  dither?: boolean;
}

export interface ConvertResult {
  text: string;
  lines: string[];
  colors: Uint8ClampedArray | null; // rows * cols * 3
  cols: number;
  rows: number;
  charset: string;
  ms: number;
  opts: Required<ConvertOptions>;
}

/**
 * Floyd–Steinberg in-place error diffusion on a Float32Array luminance grid
 */
export function ditherFS(lum: Float32Array, w: number, h: number): void {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const oldv = lum[i];
      const newv = oldv < 128 ? 0 : 255;
      const err = oldv - newv;
      lum[i] = newv;
      if (x + 1 < w) lum[i + 1] += (err * 7) / 16;
      if (y + 1 < h) {
        if (x > 0) lum[i + w - 1] += (err * 3) / 16;
        lum[i + w] += (err * 5) / 16;
        if (x + 1 < w) lum[i + w + 1] += (err * 1) / 16;
      }
    }
  }
}

/**
 * Converts a decoded RGBA raw image into ASCII or Braille characters.
 */
export function convert(image: RawImage, opts: ConvertOptions = {}): ConvertResult {
  const t0 = performance.now();
  const cols = Math.max(1, Math.round(opts.cols || 80));
  const key = opts.charset && CHARSETS[opts.charset] ? opts.charset : "standard";
  const cs = CHARSETS[key];
  const aspect = opts.cellAspect || DEFAULT_CELL_ASPECT;
  const rect = opts.srcRect || { sx: 0, sy: 0, sw: image.width, sh: image.height };
  const rows = Math.max(1, Math.round((rect.sh / rect.sw) * cols / aspect));
  const colorMode = opts.color || "none";
  const wantColor = colorMode !== "none";

  const lines: string[] = new Array(rows);
  const colors = wantColor ? new Uint8ClampedArray(rows * cols * 3) : null;

  if (cs.braille) {
    // 2x4 subpixels per braille character cell
    const gw = cols * 2;
    const gh = rows * 4;
    const grid = sampleGrid(image, rect, gw, gh, opts);
    if (opts.dither !== false) {
      ditherFS(grid.lum, gw, gh);
    }

    // Braille dot bit mapping (dy in 0..3, dx in 0..1)
    // Dot positions:
    // (0,0)=1, (0,1)=2, (0,2)=4, (0,3)=64
    // (1,0)=8, (1,1)=16, (1,2)=32, (1,3)=128
    const BITS = [
      [0x01, 0x08],
      [0x02, 0x10],
      [0x04, 0x20],
      [0x40, 0x80]
    ];

    for (let r = 0; r < rows; r++) {
      let line = "";
      for (let q = 0; q < cols; q++) {
        let code = 0x2800; // Empty braille blank cell
        let sr = 0, sg = 0, sb = 0;

        for (let dy = 0; dy < 4; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            const gx = q * 2 + dx;
            const gy = r * 4 + dy;
            const gi = gy * gw + gx;
            if (grid.lum[gi] >= 128) {
              code |= BITS[dy][dx];
            }
            sr += grid.rgb[gi * 3];
            sg += grid.rgb[gi * 3 + 1];
            sb += grid.rgb[gi * 3 + 2];
          }
        }

        line += String.fromCharCode(code);

        if (wantColor && colors) {
          const ci = (r * cols + q) * 3;
          if (colorMode === "gray") {
            const avg = (0.2126 * sr + 0.7152 * sg + 0.0722 * sb) / 8;
            colors[ci] = colors[ci + 1] = colors[ci + 2] = avg;
          } else {
            colors[ci] = sr / 8;
            colors[ci + 1] = sg / 8;
            colors[ci + 2] = sb / 8;
          }
        }
      }
      lines[r] = line;
    }
  } else {
    const grid = sampleGrid(image, rect, cols, rows, opts);
    const ramp = cs.ramp!;
    const maxIdx = ramp.length - 1;

    for (let y = 0; y < rows; y++) {
      let line = "";
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        const rampIdx = Math.round((grid.lum[i] / 255) * maxIdx);
        line += ramp[rampIdx];

        if (wantColor && colors) {
          const ci = i * 3;
          if (colorMode === "gray") {
            colors[ci] = colors[ci + 1] = colors[ci + 2] = grid.lum[i];
          } else {
            colors[ci] = grid.rgb[ci];
            colors[ci + 1] = grid.rgb[ci + 1];
            colors[ci + 2] = grid.rgb[ci + 2];
          }
        }
      }
      lines[y] = line;
    }
  }

  return {
    text: lines.join("\n"),
    lines,
    colors,
    cols,
    rows,
    charset: key,
    ms: Math.round(performance.now() - t0),
    opts: {
      cols,
      charset: key,
      invert: !!opts.invert,
      brightness: opts.brightness || 0,
      contrast: opts.contrast || 0,
      color: colorMode,
      cellAspect: aspect,
      srcRect: rect,
      dither: opts.dither !== false
    }
  };
}
