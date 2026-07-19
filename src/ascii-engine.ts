/* ============================================================
   img2ascii — conversion engine (100% client-side)

   Exports:
     CHARSETS                      preset map (ramps dark→light)
     convert(source, opts)         -> result
     toHTML(result)                -> string for <pre>.innerHTML
     renderPNG(result, opts)       -> Promise<Blob>
     coverRect(iw,ih,bw,bh,px,py)  -> {sx,sy,sw,sh}  (object-fit:cover)
     loadImage(src)                -> Promise<HTMLImageElement>
     fileToImage(file)             -> Promise<HTMLImageElement>

   convert() opts:
     cols        20..300            (default 120)
     charset     key of CHARSETS    (default "standard")
     invert      boolean            (default false)
     brightness  -100..100          (default 0)
     contrast    -100..100          (default 0)
     color       "green"|"gray"|"original"  (default "green")
     cellAspect  displayed cell h/w (default 1/0.6 for mono @ lh 1)
     srcRect     {sx,sy,sw,sh} crop of the source (default full)
     dither      boolean, braille only (default true)

   result:
     { text, lines[], colors|null, cols, rows, ms, charset, opts }
     colors = Uint8ClampedArray rows*cols*3 when color != "green"
   ============================================================ */

export type AsciiSource = HTMLImageElement | HTMLCanvasElement | HTMLVideoElement;

export interface Charset {
  label: string;
  ramp?: string;
  braille?: boolean;
}

export interface SrcRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

export interface ConvertOptions {
  cols?: number;
  charset?: string | null;
  invert?: boolean;
  brightness?: number;
  contrast?: number;
  color?: string;
  cellAspect?: number;
  srcRect?: SrcRect;
  dither?: boolean;
}

export interface ConvertResult {
  text: string;
  lines: string[];
  colors: Uint8ClampedArray | null;
  cols: number;
  rows: number;
  charset: string;
  ms: number;
  opts: {
    cols: number;
    charset: string;
    invert: boolean;
    brightness: number;
    contrast: number;
    color: string;
    cellAspect: number;
  };
}

export interface RenderPNGOptions {
  fontSize?: number;
  scale?: number;
  padding?: number;
  bg?: string;
  fg?: string;
  font?: string;
}

export const CHARSETS: Record<string, Charset> = {
  standard: { label: "standard",  ramp: " .:-=+*#%@" },
  detailed: { label: "detailed",  ramp: " .'`^\",:;Il!i~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$" },
  blocks:   { label: "blocks",    ramp: " ░▒▓█" },
  minimal:  { label: "minimal",   ramp: " .:*#" },
  binary:   { label: "binary",    ramp: " 01" },
  braille:  { label: "braille",   braille: true }
};

const DEFAULT_ASPECT = 1 / 0.6; // mono cell h/w at line-height 1

export const VERSION = "1.0.0";

/* ------------------------- helpers -------------------------- */
function srcSize(source: AsciiSource): { w: number; h: number } {
  const s = source as HTMLImageElement & HTMLVideoElement;
  return {
    w: s.naturalWidth || s.videoWidth || source.width,
    h: s.naturalHeight || s.videoHeight || source.height
  };
}

function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : v > hi ? hi : v; }

function escapeHTML(s: string): string {
  return s.replace(/[&<>]/g, function (c) {
    return c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;";
  });
}

interface Grid {
  lum: Float32Array;
  rgb: Uint8ClampedArray;
  w: number;
  h: number;
}

/* luminance grid at an exact pixel resolution, with
   brightness / contrast / invert applied                       */
function sampleGrid(source: AsciiSource, rect: SrcRect, gw: number, gh: number, o: ConvertOptions): Grid {
  const cv = document.createElement("canvas");
  cv.width = gw; cv.height = gh;
  const ctx = cv.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, gw, gh);
  const data = ctx.getImageData(0, 0, gw, gh).data;

  const n = gw * gh;
  const lum = new Float32Array(n);
  const rgb = new Uint8ClampedArray(n * 3);

  const b = (o.brightness || 0) * 1.28;                    // -128..128
  const c255 = (o.contrast || 0) * 2.55;                   // -255..255
  const cf = (259 * (c255 + 255)) / (255 * (259 - c255));  // contrast factor
  function adj(v: number): number { return clamp(cf * (v + b - 128) + 128, 0, 255); }

  for (let i = 0; i < n; i++) {
    let r = data[i * 4], g = data[i * 4 + 1], bl = data[i * 4 + 2];
    r = adj(r); g = adj(g); bl = adj(bl);
    let L = 0.2126 * r + 0.7152 * g + 0.0722 * bl;
    if (o.invert) { L = 255 - L; r = 255 - r; g = 255 - g; bl = 255 - bl; }
    lum[i] = L;
    rgb[i * 3] = r; rgb[i * 3 + 1] = g; rgb[i * 3 + 2] = bl;
  }
  return { lum: lum, rgb: rgb, w: gw, h: gh };
}

/* Floyd–Steinberg in place on a Float32Array luminance grid    */
function ditherFS(lum: Float32Array, w: number, h: number): void {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const oldv = lum[i];
      const newv = oldv < 128 ? 0 : 255;
      const err = oldv - newv;
      lum[i] = newv;
      if (x + 1 < w)            lum[i + 1]     += err * 7 / 16;
      if (y + 1 < h) {
        if (x > 0)              lum[i + w - 1] += err * 3 / 16;
                                lum[i + w]     += err * 5 / 16;
        if (x + 1 < w)          lum[i + w + 1] += err * 1 / 16;
      }
    }
  }
}

/* --------------------------- convert ------------------------ */
export function convert(source: AsciiSource, opts?: ConvertOptions): ConvertResult {
  const t0 = performance.now();
  const o = opts || {};
  const cols = clamp(Math.round(o.cols || 120), 20, 300);
  const key = o.charset && CHARSETS[o.charset] ? o.charset : "standard";
  const cs = CHARSETS[key];
  const aspect = o.cellAspect || DEFAULT_ASPECT;
  const size = srcSize(source);
  const rect = o.srcRect || { sx: 0, sy: 0, sw: size.w, sh: size.h };
  const rows = Math.max(1, Math.round((rect.sh / rect.sw) * cols / aspect));
  const wantColor = o.color === "original" || o.color === "gray";

  const lines: string[] = new Array(rows);
  const colors = wantColor ? new Uint8ClampedArray(rows * cols * 3) : null;

  if (cs.braille) {
    const gw = cols * 2, gh = rows * 4;
    const grid = sampleGrid(source, rect, gw, gh, o);
    if (o.dither !== false) ditherFS(grid.lum, gw, gh);
    // braille dot bit layout (x,y): col0 y0..2 = 1,2,4 · col1 y0..2 = 8,16,32
    //                               col0 y3 = 64      · col1 y3 = 128
    const BITS = [[0x01, 0x08], [0x02, 0x10], [0x04, 0x20], [0x40, 0x80]];
    for (let r = 0; r < rows; r++) {
      let line = "";
      for (let q = 0; q < cols; q++) {
        let code = 0x2800;
        let sr = 0, sg = 0, sb = 0;
        for (let dy = 0; dy < 4; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            const gx = q * 2 + dx, gy = r * 4 + dy;
            const gi = gy * gw + gx;
            if (grid.lum[gi] >= 128) code |= BITS[dy][dx];
            sr += grid.rgb[gi * 3]; sg += grid.rgb[gi * 3 + 1]; sb += grid.rgb[gi * 3 + 2];
          }
        }
        line += String.fromCharCode(code);
        if (wantColor) {
          const ci = (r * cols + q) * 3;
          if (o.color === "gray") {
            const avg = (0.2126 * sr + 0.7152 * sg + 0.0722 * sb) / 8;
            colors![ci] = colors![ci + 1] = colors![ci + 2] = avg;
          } else {
            colors![ci] = sr / 8; colors![ci + 1] = sg / 8; colors![ci + 2] = sb / 8;
          }
        }
      }
      lines[r] = line;
    }
  } else {
    const g2 = sampleGrid(source, rect, cols, rows, o);
    const ramp = cs.ramp!;
    const maxIdx = ramp.length - 1;
    for (let y = 0; y < rows; y++) {
      let ln = "";
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        ln += ramp[Math.round(g2.lum[i] / 255 * maxIdx)];
        if (wantColor) {
          const c3 = i * 3;
          if (o.color === "gray") {
            colors![c3] = colors![c3 + 1] = colors![c3 + 2] = g2.lum[i];
          } else {
            colors![c3] = g2.rgb[c3]; colors![c3 + 1] = g2.rgb[c3 + 1]; colors![c3 + 2] = g2.rgb[c3 + 2];
          }
        }
      }
      lines[y] = ln;
    }
  }

  return {
    text: lines.join("\n"),
    lines: lines,
    colors: colors,
    cols: cols,
    rows: rows,
    charset: key,
    ms: Math.round(performance.now() - t0),
    opts: { cols: cols, charset: key, invert: !!o.invert, brightness: o.brightness || 0,
            contrast: o.contrast || 0, color: o.color || "green", cellAspect: aspect }
  };
}

/* --------------------------- toHTML ------------------------- */
/* colored: consecutive same-quantized-color chars share a span */
export function toHTML(result: ConvertResult): string {
  if (!result.colors) return escapeHTML(result.text);
  let out = "";
  const cols = result.cols;
  for (let r = 0; r < result.rows; r++) {
    const line = result.lines[r];
    let run = "", runKey = -1, runCol = "";
    for (let x = 0; x < cols; x++) {
      const ci = (r * cols + x) * 3;
      const cr = result.colors[ci] & 0xF8, cg = result.colors[ci + 1] & 0xF8, cb = result.colors[ci + 2] & 0xF8;
      const k = (cr << 16) | (cg << 8) | cb;
      if (k !== runKey) {
        if (run) out += '<span style="color:rgb(' + runCol + ')">' + escapeHTML(run) + "</span>";
        run = ""; runKey = k; runCol = cr + "," + cg + "," + cb;
      }
      run += line[x];
    }
    if (run) out += '<span style="color:rgb(' + runCol + ')">' + escapeHTML(run) + "</span>";
    if (r < result.rows - 1) out += "\n";
  }
  return out;
}

/* -------------------------- renderPNG ----------------------- */
export function renderPNG(result: ConvertResult, opts?: RenderPNGOptions): Promise<Blob> {
  const o = opts || {};
  const fs = o.fontSize || 12;
  const scale = o.scale || 2;
  const pad = o.padding != null ? o.padding : 32;
  const bg = o.bg || "#0d120d";
  const fg = o.fg || "#4dff7c";
  const family = o.font || '"JetBrains Mono", ui-monospace, Menlo, monospace';
  const fontStr = fs + "px " + family;

  const cv = document.createElement("canvas");
  let ctx = cv.getContext("2d")!;
  ctx.font = fontStr;
  const adv = ctx.measureText("M").width;

  cv.width = Math.ceil((result.cols * adv + pad * 2) * scale);
  cv.height = Math.ceil((result.rows * fs + pad * 2) * scale);
  ctx = cv.getContext("2d")!;
  ctx.scale(scale, scale);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, cv.width / scale, cv.height / scale);
  ctx.font = fontStr;
  ctx.textBaseline = "top";

  for (let r = 0; r < result.rows; r++) {
    const y = pad + r * fs;
    if (!result.colors) {
      ctx.fillStyle = fg;
      ctx.fillText(result.lines[r], pad, y);
    } else {
      // group same-color runs, position each run by column index
      const line = result.lines[r];
      let x = 0;
      while (x < result.cols) {
        const ci = (r * result.cols + x) * 3;
        const cr = result.colors[ci] & 0xF8, cg = result.colors[ci + 1] & 0xF8, cb = result.colors[ci + 2] & 0xF8;
        let end = x + 1;
        while (end < result.cols) {
          const cj = (r * result.cols + end) * 3;
          if ((result.colors[cj] & 0xF8) !== cr || (result.colors[cj + 1] & 0xF8) !== cg ||
              (result.colors[cj + 2] & 0xF8) !== cb) break;
          end++;
        }
        ctx.fillStyle = "rgb(" + cr + "," + cg + "," + cb + ")";
        ctx.fillText(line.slice(x, end), pad + x * adv, y);
        x = end;
      }
    }
  }
  return new Promise(function (resolve, reject) {
    cv.toBlob(function (blob) {
      blob ? resolve(blob) : reject(new Error("toBlob failed"));
    }, "image/png");
  });
}

/* ------------------------- geometry ------------------------- */
export function coverRect(iw: number, ih: number, bw: number, bh: number, px?: number | null, py?: number | null): SrcRect {
  px = px == null ? 0.5 : px;
  py = py == null ? 0.5 : py;
  const scale = Math.max(bw / iw, bh / ih);
  const sw = bw / scale, sh = bh / scale;
  return {
    sx: (iw - sw) * px,
    sy: (ih - sh) * py,
    sw: sw,
    sh: sh
  };
}

/* -------------------------- loaders ------------------------- */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise(function (resolve, reject) {
    const img = new Image();
    img.onload = function () { resolve(img); };
    img.onerror = function () { reject(new Error("failed to load " + src)); };
    img.src = src;
  });
}

export function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise(function (resolve, reject) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = function () { resolve(img); };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      reject(new Error("unsupported image file"));
    };
    img.src = url;
  });
}
