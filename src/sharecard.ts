/* ============================================================
   semaphore — share card renderer
   Frames an AsciiEngine result as a polished share image:
   header (mark + product name + args), the art block, footer
   (file/dims + caption). ONE layout drives TWO outputs: a
   standalone SVG string and a 2× PNG blob drawn on canvas.

   Exports:
     svg(result, opts)     -> string          (DOM-free)
     pngBlob(result, opts) -> Promise<Blob>   (needs canvas)

   opts:
     theme    "crt" | "paper"   (default "crt")
     caption  string            (default "made with semaphore.bobochang.cn")
     filename string            (default "image")
     fontSize number, art px    (default 11)

   The palettes below are the canonical share-card colors,
   frozen by design — intentionally independent of the live CSS
   tokens so exported cards look identical everywhere.
   ============================================================ */

import type { ConvertResult } from "./ascii-engine";

export interface ShareCardOptions {
  theme?: string;
  caption?: string | null;
  filename?: string;
  fontSize?: number;
}

interface Palette {
  bg: string;
  ink: string;
  green: string;
  faint: string;
  line: string;
}

/* ------------------------- constants ------------------------- */
const PALETTES: Record<string, Palette> = {
  crt:   { bg: "#0C120D", ink: "#B9D6C2", green: "#47F07D",
           faint: "#6E8B78", line: "#2C4634" },
  paper: { bg: "#F2EDE0", ink: "#2A2921", green: "#2E6B45",
           faint: "#8B8578", line: "#C1BAA9" }
};

const FAMILY = '"JetBrains Mono", "Menlo", "Consolas", monospace';      // canvas
const FAMILY_SVG = "'JetBrains Mono', 'Menlo', 'Consolas', monospace";  // xml attr

const PAD = 32;          // outer padding
const HEAD_H = 28;       // header row height (mark square)
const GAP_HEAD = 20;     // header → art
const GAP_FOOT = 18;     // art → footer
const FOOT_H = 14;       // footer row height (11px text)
const MIN_CONTENT = 460; // minimum content width
const ADVANCE = 0.6;     // mono char advance, em
const ASCENT = 0.8;      // alphabetic baseline offset, em
const FOOT_FONT_SIZE = 11;
const FOOT_GAP = 24;
const FOOT_ADVANCE = ADVANCE * FOOT_FONT_SIZE;
const ELLIPSIS = "…";

/* -------------------------- helpers -------------------------- */
function esc(s: unknown): string {
  return String(s).replace(/[&<>]/g, function (c) {
    return c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;";
  });
}

function num(v: number): number { return Math.round(v * 100) / 100; }

/* SVG and canvas share fixed mono coordinates, so footer fitting must also
   be renderer-independent. Non-ASCII glyphs get a conservative two-cell
   budget; that prevents fallback CJK/emoji from colliding with the other
   footer label even when the primary font is unavailable. */
function textUnits(text: string): number {
  return Array.from(text).reduce(function (sum, char) {
    const cp = char.codePointAt(0) || 0;
    return sum + (cp <= 0x7f || char === ELLIPSIS ? 1 : 2);
  }, 0);
}

function textWidth(text: string): number {
  return textUnits(text) * FOOT_ADVANCE;
}

function fitMonoText(text: string, maxWidth: number): string {
  const maxUnits = Math.floor(Math.max(0, maxWidth) / FOOT_ADVANCE);
  if (textUnits(text) <= maxUnits) return text;
  if (maxUnits < 1) return "";

  let out = "";
  let used = 1; // reserve the final ellipsis
  for (const char of Array.from(text)) {
    const units = textUnits(char);
    if (used + units > maxUnits) break;
    out += char;
    used += units;
  }
  return out + ELLIPSIS;
}

function fitFileLabel(filename: string, suffix: string, maxWidth: number): string {
  const full = filename + suffix;
  if (textWidth(full) <= maxWidth) return full;
  const fittedName = fitMonoText(filename, maxWidth - textWidth(suffix));
  return fittedName ? fittedName + suffix : fitMonoText(full, maxWidth);
}

interface Layout {
  pal: Palette;
  caption: string;
  fs: number;
  adv: number;
  artW: number;
  fitBraille: boolean;
  w: number;
  h: number;
  artX: number;
  artY: number;
  headCY: number;
  footBase: number;
  meta: string;
  fileLabel: string;
}

/* shared layout math — every metric both renderers agree on   */
function layout(result: ConvertResult, opts?: ShareCardOptions): Layout {
  const o = opts || {};
  const fs = Number(o.fontSize) > 0 ? Number(o.fontSize) : 11;
  const adv = ADVANCE * fs;
  const artW = result.cols * adv;
  const artH = result.rows * fs;
  const contentW = Math.max(artW, MIN_CONTENT);
  const filename = o.filename ? String(o.filename) : "image";
  const caption = o.caption == null ? "made with semaphore.bobochang.cn" : String(o.caption);
  const fileSuffix = " — " + result.cols + "×" + result.rows;
  const fileLabel = fitFileLabel(filename, fileSuffix,
    contentW - (caption ? FOOT_GAP : 0));
  const fittedCaption = fitMonoText(caption,
    contentW - textWidth(fileLabel) - (caption ? FOOT_GAP : 0));
  return {
    pal: (o.theme && PALETTES[o.theme]) || PALETTES.crt,
    caption: fittedCaption,
    fs: fs,
    adv: adv,
    artW: artW,
    fitBraille: result.charset === "braille",
    w: Math.ceil(contentW + PAD * 2),
    h: Math.ceil(PAD + HEAD_H + GAP_HEAD + artH + GAP_FOOT + FOOT_H + PAD),
    artX: PAD + Math.max(0, (contentW - artW) / 2),
    artY: PAD + HEAD_H + GAP_HEAD,
    headCY: PAD + HEAD_H / 2,
    footBase: PAD + HEAD_H + GAP_HEAD + artH + GAP_FOOT + Math.round(FOOT_FONT_SIZE * ASCENT),
    meta: "--charset " + result.charset + " --cols " + result.cols,
    fileLabel: fileLabel
  };
}

/* JetBrains Mono has no braille glyphs. Keep the system fallback inside the
   same fixed cells in both renderers instead of letting it overrun the card. */
function svgTextFit(width: number): string {
  return ' textLength="' + num(width) + '" lengthAdjust="spacingAndGlyphs"';
}

interface Run {
  start: number;
  text: string;
  rgb: string;
}

/* same-color runs of one row, quantized like AsciiEngine.toHTML
   (channel & 0xF8); only called when result.colors exists       */
function rowRuns(result: ConvertResult, r: number): Run[] {
  const runs: Run[] = [];
  const line = result.lines[r];
  const cols = result.cols;
  const colors = result.colors!;
  let x = 0;
  while (x < cols) {
    const ci = (r * cols + x) * 3;
    const cr = colors[ci] & 0xF8;
    const cg = colors[ci + 1] & 0xF8;
    const cb = colors[ci + 2] & 0xF8;
    let end = x + 1;
    while (end < cols) {
      const cj = (r * cols + end) * 3;
      if ((colors[cj] & 0xF8) !== cr ||
          (colors[cj + 1] & 0xF8) !== cg ||
          (colors[cj + 2] & 0xF8) !== cb) break;
      end++;
    }
    runs.push({ start: x, text: line.slice(x, end),
                rgb: "rgb(" + cr + "," + cg + "," + cb + ")" });
    x = end;
  }
  return runs;
}

/* ---------------------------- SVG ----------------------------- */
export function svg(result: ConvertResult, opts?: ShareCardOptions): string {
  const L = layout(result, opts);
  const p = L.pal;
  let r: number, i: number;
  let s = "";

  s += '<svg xmlns="http://www.w3.org/2000/svg" width="' + L.w + '" height="' + L.h +
       '" viewBox="0 0 ' + L.w + " " + L.h + '" role="img" aria-label="ascii art share card">';

  /* plate + outer frame */
  s += '<rect x="0" y="0" width="' + L.w + '" height="' + L.h + '" fill="' + p.bg + '"></rect>';
  s += '<rect x="0.75" y="0.75" width="' + (L.w - 1.5) + '" height="' + (L.h - 1.5) +
       '" fill="none" stroke="' + p.line + '" stroke-width="1.5"></rect>';

  /* header mark: 28px square, 1px border */
  s += '<rect x="' + (PAD + 0.5) + '" y="' + (PAD + 0.5) +
       '" width="27" height="27" fill="none" stroke="' + p.line + '" stroke-width="1"></rect>';

  s += '<g font-family="' + FAMILY_SVG + '">';

  s += '<text x="' + (PAD + 14) + '" y="' + num(L.headCY) +
       '" text-anchor="middle" dominant-baseline="central" font-size="13" fill="' +
       p.green + '">▚</text>';
  s += '<text x="' + (PAD + 38) + '" y="' + num(L.headCY) +
       '" dominant-baseline="central" font-size="15" font-weight="700" fill="' +
       p.ink + '">semaphore</text>';
  s += '<text x="' + (L.w - PAD) + '" y="' + num(L.headCY) +
       '" text-anchor="end" dominant-baseline="central" font-size="11" fill="' +
       p.faint + '">' + esc(L.meta) + "</text>";

  /* art block — one <text> per row, alphabetic baseline         */
  s += '<g font-size="' + L.fs + '" fill="' + p.green +
       '" text-rendering="optimizeSpeed" style="font-variant-ligatures:none">';
  for (r = 0; r < result.rows; r++) {
    const base = num(L.artY + r * L.fs + L.fs * ASCENT);
    if (!result.colors) {
      s += '<text x="' + num(L.artX) + '" y="' + base + '" xml:space="preserve"' +
           (L.fitBraille ? svgTextFit(L.artW) : "") + '>' +
           esc(result.lines[r]) + "</text>";
    } else {
      const runs = rowRuns(result, r);
      s += '<text y="' + base + '" xml:space="preserve"' +
           (L.fitBraille ? ' x="' + num(L.artX) + '"' + svgTextFit(L.artW) : "") + '>';
      for (i = 0; i < runs.length; i++) {
        s += '<tspan' + (L.fitBraille ? "" : ' x="' +
             num(L.artX + runs[i].start * L.adv) + '"') + ' fill="' +
             runs[i].rgb + '">' + esc(runs[i].text) + "</tspan>";
      }
      s += "</text>";
    }
  }
  s += "</g>";

  /* footer */
  s += '<text x="' + PAD + '" y="' + num(L.footBase) + '" font-size="' +
       FOOT_FONT_SIZE + '" fill="' +
       p.faint + '">' + esc(L.fileLabel) + "</text>";
  s += '<text x="' + (L.w - PAD) + '" y="' + num(L.footBase) +
       '" text-anchor="end" font-size="' + FOOT_FONT_SIZE + '" fill="' + p.green + '">' +
       esc(L.caption) + "</text>";

  s += "</g></svg>";
  return s;
}

function fillSizedText(ctx: CanvasRenderingContext2D, text: string,
                       x: number, y: number, width: number): void {
  const measured = ctx.measureText(text).width;
  if (!measured || Math.abs(measured - width) < 0.01) {
    ctx.fillText(text, x, y);
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(width / measured, 1);
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function fillSizedRuns(ctx: CanvasRenderingContext2D, runs: Run[],
                       x: number, y: number, width: number): void {
  const widths = runs.map((run) => ctx.measureText(run.text).width);
  const measured = widths.reduce((sum, runWidth) => sum + runWidth, 0);
  if (!measured) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(width / measured, 1);
  let offset = 0;
  runs.forEach((run, i) => {
    ctx.fillStyle = run.rgb;
    ctx.fillText(run.text, offset, 0);
    offset += widths[i];
  });
  ctx.restore();
}

/* ---------------------------- PNG ----------------------------- */
export function pngBlob(result: ConvertResult, opts?: ShareCardOptions): Promise<Blob> {
  const L = layout(result, opts);
  const p = L.pal;
  const SCALE = 2;
  const fontsReady: Promise<unknown> = (typeof document !== "undefined" && document.fonts && document.fonts.ready)
    ? document.fonts.ready.catch(function () { /* draw anyway */ })
    : Promise.resolve();

  return Promise.resolve(fontsReady).then(function () {
    const cv = document.createElement("canvas");
    cv.width = L.w * SCALE;
    cv.height = L.h * SCALE;
    const ctx = cv.getContext("2d")!;
    ctx.scale(SCALE, SCALE);
    if ("textRendering" in ctx) (ctx as CanvasRenderingContext2D & { textRendering: string }).textRendering = "optimizeSpeed"; // no ligatures

    /* plate + outer frame + header square */
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, L.w, L.h);
    ctx.strokeStyle = p.line;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0.75, 0.75, L.w - 1.5, L.h - 1.5);
    ctx.lineWidth = 1;
    ctx.strokeRect(PAD + 0.5, PAD + 0.5, 27, 27);

    /* header */
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "13px " + FAMILY;
    ctx.fillStyle = p.green;
    ctx.fillText("▚", PAD + 14, L.headCY);

    ctx.textAlign = "left";
    ctx.font = "700 15px " + FAMILY;
    ctx.fillStyle = p.ink;
    ctx.fillText("semaphore", PAD + 38, L.headCY);

    ctx.textAlign = "right";
    ctx.font = FOOT_FONT_SIZE + "px " + FAMILY;
    ctx.fillStyle = p.faint;
    ctx.fillText(L.meta, L.w - PAD, L.headCY);

    /* art block — alphabetic baseline, same math as the SVG */
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.font = L.fs + "px " + FAMILY;
    for (let r = 0; r < result.rows; r++) {
      const base = L.artY + r * L.fs + L.fs * ASCENT;
      if (!result.colors) {
        ctx.fillStyle = p.green;
        if (L.fitBraille) fillSizedText(ctx, result.lines[r], L.artX, base, L.artW);
        else ctx.fillText(result.lines[r], L.artX, base);
      } else {
        const runs = rowRuns(result, r);
        if (L.fitBraille) {
          fillSizedRuns(ctx, runs, L.artX, base, L.artW);
        } else {
          for (let i = 0; i < runs.length; i++) {
            ctx.fillStyle = runs[i].rgb;
            const x = L.artX + runs[i].start * L.adv;
            ctx.fillText(runs[i].text, x, base);
          }
        }
      }
    }

    /* footer */
    ctx.font = FOOT_FONT_SIZE + "px " + FAMILY;
    ctx.fillStyle = p.faint;
    ctx.fillText(L.fileLabel, PAD, L.footBase);
    ctx.textAlign = "right";
    ctx.fillStyle = p.green;
    ctx.fillText(L.caption, L.w - PAD, L.footBase);

    return new Promise<Blob>(function (resolve, reject) {
      cv.toBlob(function (blob) {
        if (blob) resolve(blob);
        else reject(new Error("share card: toBlob failed"));
      }, "image/png");
    });
  });
}
