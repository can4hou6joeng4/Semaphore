/* ============================================================
   img2ascii — tool page
   The live workbench: source loading (drop / browse / paste /
   samples), parameter panel, rAF-coalesced conversion, fit/zoom
   sizing, exports. Header + statusbar come from shared.ts.
   ============================================================ */

import * as AsciiEngine from "./ascii-engine";
import type { AsciiSource, ConvertResult } from "./ascii-engine";
import * as ShareCard from "./sharecard";
import { Site, Util } from "./shared";

/* --------------------------- dom ----------------------------- */
const $ = (id: string) => document.getElementById(id) as HTMLElement;

interface Els {
  drop: HTMLElement; file: HTMLInputElement;
  srcInfo: HTMLElement; srcThumb: HTMLImageElement; srcMeta: HTMLElement;
  samplePortrait: HTMLElement; samplePlanet: HTMLElement;
  planetThumb: HTMLCanvasElement;
  charset: HTMLSelectElement;
  cols: HTMLInputElement; colsv: HTMLElement;
  bright: HTMLInputElement; brightv: HTMLElement;
  contrast: HTMLInputElement; contrastv: HTMLElement;
  invert: HTMLElement; dither: HTMLElement; reset: HTMLElement;
  seg: HTMLButtonElement[];
  cmdline: HTMLElement;
  zoom: HTMLInputElement; fit: HTMLElement;
  copy: HTMLElement; savetxt: HTMLElement; savepng: HTMLElement;
  sharecard: HTMLElement;
  cardModal: HTMLElement; cardClose: HTMLElement;
  cardPreview: HTMLImageElement; cardCaption: HTMLInputElement;
  cardSvg: HTMLElement; cardPng: HTMLElement;
  cardSeg: HTMLButtonElement[];
  outTitle: HTMLElement; outBody: HTMLElement; out: HTMLElement;
}

let els!: Els;

function cacheEls(): void {
  els = {
    drop: $("drop"), file: $("file") as HTMLInputElement,
    srcInfo: $("srcInfo"), srcThumb: $("srcThumb") as HTMLImageElement, srcMeta: $("srcMeta"),
    samplePortrait: $("samplePortrait"), samplePlanet: $("samplePlanet"),
    planetThumb: $("planetThumb") as HTMLCanvasElement,
    charset: $("charset") as HTMLSelectElement,
    cols: $("cols") as HTMLInputElement, colsv: $("colsv"),
    bright: $("bright") as HTMLInputElement, brightv: $("brightv"),
    contrast: $("contrast") as HTMLInputElement, contrastv: $("contrastv"),
    invert: $("invert"), dither: $("dither"), reset: $("reset"),
    seg: Array.from(document.querySelectorAll<HTMLButtonElement>('.seg[aria-label="color"] button')),
    cmdline: $("cmdline"),
    zoom: $("zoom") as HTMLInputElement, fit: $("fit"),
    copy: $("copy"), savetxt: $("savetxt"), savepng: $("savepng"),
    sharecard: $("sharecard"),
    cardModal: $("cardModal"), cardClose: $("cardClose"),
    cardPreview: $("cardPreview") as HTMLImageElement, cardCaption: $("cardCaption") as HTMLInputElement,
    cardSvg: $("cardSvg"), cardPng: $("cardPng"),
    cardSeg: Array.from(document.querySelectorAll<HTMLButtonElement>('.seg[aria-label="card theme"] button')),
    outTitle: $("outTitle"), outBody: $("outBody"), out: $("out")
  };
}

/* -------------------------- state ----------------------------- */
interface Params {
  charset: string;
  cols: number;
  brightness: number;
  contrast: number;
  invert: boolean;
  dither: boolean;
  color: string;
}

const DEFAULTS: Params = { charset: "detailed", cols: 120, brightness: 0,
                           contrast: 0, invert: false, dither: true, color: "green" };

interface State {
  source: AsciiSource | null;
  name: string;
  imgW: number;
  imgH: number;
  result: ConvertResult | null;
  fit: boolean;
  zoom: number;
}

const state: State = { source: null, name: "", imgW: 0, imgH: 0,
                       result: null, fit: true, zoom: 8 };
let params: Params = Object.assign({}, DEFAULTS);

let pendingFrame = false;
let resizeTimer: number | undefined;
let planet: HTMLCanvasElement | null = null;

let cardTheme = "crt";                 // share-card palette, independent of site theme
let cardUrl: string | null = null;     // objectURL of the current preview
let cardTimer: number | undefined;     // caption debounce
let cardSeq = 0;                       // drops stale async preview renders

const fontsReady: Promise<unknown> = (document.fonts && document.fonts.ready)
  ? document.fonts.ready : Promise.resolve();

const esc = (s: unknown): string => String(s).replace(/[&<>"]/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" } as Record<string, string>)[c]);
const base = (): string => ((state.name || "image").replace(/\.[^.]+$/, "") || "image");
const dims = (src: AsciiSource): { w: number; h: number } =>
  ({ w: (src as HTMLImageElement).naturalWidth || src.width,
     h: (src as HTMLImageElement).naturalHeight || src.height });

/* -------------------- procedural planet ----------------------- */
/* 320×260 offscreen canvas: seeded starfield, left-lit sphere,
   thin ring drawn in two halves so the sphere occludes it.       */
function makePlanet(): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = 320; cv.height = 260;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "rgb(10,15,10)";
  ctx.fillRect(0, 0, 320, 260);

  let seed = 20260717 >>> 0;                       // fixed LCG, stable art
  const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(rnd() * 320), y = Math.floor(rnd() * 260);
    ctx.fillStyle = "rgba(212,255,226," + (0.12 + rnd() * 0.75).toFixed(2) + ")";
    ctx.fillRect(x, y, 1, 1);
  }

  const cx = 128, cy = 117, R = 90;
  strokeRing(ctx, cx, cy, false);                  // far half, behind sphere

  const g = ctx.createRadialGradient(cx - 36, cy - 30, 6, cx, cy, R * 1.02);
  g.addColorStop(0.00, "rgb(240,250,242)");
  g.addColorStop(0.30, "rgb(172,196,178)");
  g.addColorStop(0.60, "rgb(92,112,97)");
  g.addColorStop(0.84, "rgb(36,48,39)");
  g.addColorStop(1.00, "rgb(13,19,14)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();

  strokeRing(ctx, cx, cy, true);                   // near half, in front
  return cv;
}

function strokeRing(ctx: CanvasRenderingContext2D, cx: number, cy: number, front: boolean): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.5);
  ctx.beginPath();
  ctx.rect(-170, front ? 0 : -90, 340, 90);        // keep one half only
  ctx.clip();
  ctx.beginPath();                                 // stroke twice for depth
  ctx.ellipse(0, 0, 145, 32, 0, 0, Math.PI * 2);
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(196,232,206,0.28)";
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 0, 145, 32, 0, 0, Math.PI * 2);
  ctx.lineWidth = 2;
  ctx.strokeStyle = front ? "rgba(236,255,242,0.95)" : "rgba(204,238,214,0.55)";
  ctx.stroke();
  ctx.restore();
}

/* ---------------------- source loading ------------------------ */
function loadFile(file: File | null | undefined): void {
  if (!file) return;
  if (!/^image\//.test(file.type || "")) { Site.toast("not an image ✕"); return; }
  Site.setState("decoding…", { busy: true });
  AsciiEngine.fileToImage(file).then(
    (img) => setSource(img, file.name || "pasted.png"),
    () => { Site.setState("ready"); Site.toast("could not decode image ✕"); }
  );
}

function loadPortrait(atBoot: boolean): void {
  Site.setState("loading sample…", { busy: true });
  AsciiEngine.loadImage("/assets/sample-portrait.png").then(
    (img) => setSource(img, "portrait.png"),
    () => {
      Site.setState(atBoot ? "no source" : "ready");
      if (!atBoot) Site.toast("sample failed to load ✕");
    }
  );
}

function setSource(source: AsciiSource, name: string): void {
  fontsReady.then(() => {                          // mono metrics first
    state.source = source;
    state.name = name;
    const d = dims(source);
    state.imgW = d.w; state.imgH = d.h;
    els.srcThumb.src = (source as HTMLCanvasElement).toDataURL
      ? (source as HTMLCanvasElement).toDataURL("image/png")
      : (source as HTMLImageElement).src;
    els.srcMeta.textContent = name + " — " + d.w + "×" + d.h;
    els.srcInfo.classList.remove("hidden");
    updateCmdline();
    requestConvert();
  });
}

/* ------------------------ conversion -------------------------- */
/* Param changes coalesce into a single pending tick; the tick
   reads the latest params, so nothing ever queues. rAF is the
   fast path, with a timeout fallback for throttled/背景 tabs
   where rAF can stall indefinitely.                             */
function requestConvert(): void {
  if (!state.source || pendingFrame) return;
  pendingFrame = true;
  Site.setState("converting…", { busy: true });
  let fired = false;
  const run = () => {
    if (fired) return;
    fired = true;
    pendingFrame = false;
    runConvert();
  };
  requestAnimationFrame(run);
  setTimeout(run, 90);
}

function runConvert(): void {
  if (!state.source) return;
  try {
    const res = AsciiEngine.convert(state.source, {
      cols: params.cols,
      charset: params.charset,
      invert: params.invert,
      brightness: params.brightness,
      contrast: params.contrast,
      color: params.color,
      dither: params.dither,
      cellAspect: 1 / Util.advanceRatio()
    });
    state.result = res;
    renderResult(res);
  } catch (err) {
    Site.setState("convert failed");
    Site.toast("conversion error ✕");
  }
}

function renderResult(res: ConvertResult): void {
  els.out.classList.remove("is-empty");
  els.out.classList.toggle("is-plain", params.color !== "green");
  if (params.color === "green") {
    els.out.textContent = res.text;
  } else {
    els.out.innerHTML = AsciiEngine.toHTML(res);
  }
  applySizing();
  els.outTitle.innerHTML = '<span class="p">$</span> ~/output/' + esc(base()) +
    ".txt — " + res.cols + "×" + res.rows + " — " + res.ms + "ms";
  updateCmdline();
  setExports(true);
  Site.setState("ready");
  Site.setRight([res.cols + "×" + res.rows, "charset: " + res.charset, res.ms + "ms"]);
}

function applySizing(): void {
  if (!state.result) return;
  if (state.fit) {
    Util.fitPre(els.out, state.result.cols, { container: els.outBody, padding: 16 });
  } else {
    els.out.style.fontSize = state.zoom + "px";
    els.out.style.lineHeight = "1";
  }
}

/* ------------------------- readouts --------------------------- */
function updateCmdline(): void {
  els.cmdline.textContent = "$ img2ascii" +
    (state.name ? " " + state.name : "") +
    " --charset " + params.charset +
    " --cols " + params.cols +
    " --color " + params.color +
    (params.invert ? " --invert" : "");
}

function setExports(on: boolean): void {
  [els.copy, els.savetxt, els.sharecard, els.savepng].forEach((b) =>
    b.classList.toggle("is-disabled", !on));
}

function syncUI(): void {
  els.charset.value = params.charset;
  els.cols.value = String(params.cols);          els.colsv.textContent = String(params.cols);
  els.bright.value = String(params.brightness);  els.brightv.textContent = String(params.brightness);
  els.contrast.value = String(params.contrast);  els.contrastv.textContent = String(params.contrast);
  els.invert.setAttribute("aria-pressed", String(params.invert));
  els.dither.setAttribute("aria-pressed", String(params.dither));
  els.seg.forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.color === params.color)));
  updateCmdline();
}

/* -------------------------- wiring ---------------------------- */
function wireSource(): void {
  const openPicker = () => els.file.click();
  els.drop.addEventListener("click", openPicker);
  els.drop.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPicker(); }
  });
  els.drop.addEventListener("dragover", (e) => {
    e.preventDefault();
    els.drop.classList.add("is-drag");
  });
  els.drop.addEventListener("dragleave", () => els.drop.classList.remove("is-drag"));
  els.drop.addEventListener("drop", (e) => {
    e.preventDefault();
    els.drop.classList.remove("is-drag");
    loadFile(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]);
  });
  els.file.addEventListener("change", () => {
    loadFile(els.file.files && els.file.files[0]);
    els.file.value = "";
  });
  document.addEventListener("paste", (e) => {
    const dt = e.clipboardData;
    if (!dt) return;
    let file: File | null = null;
    for (const item of dt.items || []) {
      if (item.kind === "file" && /^image\//.test(item.type)) { file = item.getAsFile(); break; }
    }
    if (!file && dt.files && dt.files.length) file = dt.files[0];
    if (file) { e.preventDefault(); loadFile(file); }
  });

  els.samplePortrait.addEventListener("click", () => loadPortrait(false));
  els.samplePlanet.addEventListener("click", () => setSource(planet!, "planet.png"));
}

function wireParams(): void {
  const bindRange = (input: HTMLInputElement, valEl: HTMLElement, key: "cols" | "brightness" | "contrast") => {
    input.addEventListener("input", () => {
      valEl.textContent = input.value;
      params[key] = Number(input.value);
      updateCmdline();
      requestConvert();
    });
  };
  bindRange(els.cols, els.colsv, "cols");
  bindRange(els.bright, els.brightv, "brightness");
  bindRange(els.contrast, els.contrastv, "contrast");

  els.charset.addEventListener("change", () => {
    params.charset = els.charset.value;
    updateCmdline();
    requestConvert();
  });

  const bindToggle = (btn: HTMLElement, key: "invert" | "dither") => {
    btn.addEventListener("click", () => {
      params[key] = !params[key];
      btn.setAttribute("aria-pressed", String(params[key]));
      updateCmdline();
      requestConvert();
    });
  };
  bindToggle(els.invert, "invert");
  bindToggle(els.dither, "dither");

  els.seg.forEach((btn) => btn.addEventListener("click", () => {
    if (params.color === btn.dataset.color) return;
    params.color = btn.dataset.color!;
    els.seg.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    updateCmdline();
    requestConvert();
  }));

  els.reset.addEventListener("click", () => {
    params = Object.assign({}, DEFAULTS);
    syncUI();
    requestConvert();
    Site.toast("params reset ✓");
  });
}

function wireActions(): void {
  els.fit.addEventListener("click", () => {
    state.fit = !state.fit;
    els.fit.setAttribute("aria-pressed", String(state.fit));
    els.zoom.disabled = state.fit;
    applySizing();
  });

  els.zoom.addEventListener("input", () => {
    state.zoom = Number(els.zoom.value);
    if (!state.fit) applySizing();
  });

  els.copy.addEventListener("click", () => {
    if (!state.result) return;
    Util.copyText(state.result.text).then(() => Site.toast("copied to clipboard ✓"));
  });

  els.savetxt.addEventListener("click", () => {
    if (!state.result) return;
    Util.download(base() + "-ascii.txt", state.result.text);
    Site.toast(base() + "-ascii.txt saved ✓");
  });

  els.savepng.addEventListener("click", () => {
    if (!state.result) return;
    Site.setState("rendering png…", { busy: true });
    const cs = getComputedStyle(document.documentElement);   // theme-aware at click time
    AsciiEngine.renderPNG(state.result, {
      fontSize: 12, scale: 2,
      bg: cs.getPropertyValue("--bg-deep").trim() || "#0d120d",
      fg: cs.getPropertyValue("--green").trim() || "#4dff7c"
    }).then(
      (blob) => {
        Util.download(base() + "-ascii.png", blob, "image/png");
        Site.toast(base() + "-ascii.png saved ✓");
        Site.setState("ready");
      },
      () => {
        Site.setState("ready");
        Site.toast("png render failed ✕");
      }
    );
  });

  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => { if (state.fit) applySizing(); }, 140);
  });
}

/* ------------------------ share card -------------------------- */
const cardOpts = (): ShareCard.ShareCardOptions =>
  ({ theme: cardTheme, caption: els.cardCaption.value,
     filename: state.name || "image" });

function renderCard(): void {
  if (!state.result) return;
  const seq = ++cardSeq;
  Site.setState("rendering card…", { busy: true });
  ShareCard.pngBlob(state.result, cardOpts()).then(
    (blob) => {
      if (seq !== cardSeq) return;                 // a newer render superseded us
      const url = URL.createObjectURL(blob);
      if (cardUrl) URL.revokeObjectURL(cardUrl);
      cardUrl = url;
      els.cardPreview.src = url;
      Site.setState("ready");
    },
    () => {
      if (seq !== cardSeq) return;
      Site.setState("ready");
      Site.toast("card render failed ✕");
    }
  );
}

function openCard(): void {
  if (!state.result) return;
  cardTheme = Site.theme.get();                    // seg defaults to site theme
  els.cardSeg.forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.ctheme === cardTheme)));
  els.cardModal.classList.remove("hidden");
  els.cardClose.focus();
  renderCard();
}

function closeCard(): void {
  if (els.cardModal.classList.contains("hidden")) return;
  els.cardModal.classList.add("hidden");
  clearTimeout(cardTimer);
  if (cardUrl) { URL.revokeObjectURL(cardUrl); cardUrl = null; }
  els.cardPreview.removeAttribute("src");
  els.sharecard.focus();
}

function wireShareCard(): void {
  els.sharecard.addEventListener("click", openCard);
  els.cardClose.addEventListener("click", closeCard);
  els.cardModal.addEventListener("click", (e) => {
    if (e.target === els.cardModal) closeCard();   // backdrop only, not the panel
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeCard();
  });

  els.cardSeg.forEach((btn) => btn.addEventListener("click", () => {
    if (cardTheme === btn.dataset.ctheme) return;
    cardTheme = btn.dataset.ctheme!;
    els.cardSeg.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    renderCard();
  }));

  els.cardCaption.addEventListener("input", () => {
    clearTimeout(cardTimer);
    cardTimer = window.setTimeout(renderCard, 300);
  });

  els.cardSvg.addEventListener("click", () => {
    if (!state.result) return;
    Util.download(base() + "-card.svg", ShareCard.svg(state.result, cardOpts()),
                  "image/svg+xml");
    Site.toast(base() + "-card.svg saved ✓");
  });

  els.cardPng.addEventListener("click", () => {
    if (!state.result) return;
    Site.setState("rendering card…", { busy: true });
    ShareCard.pngBlob(state.result, cardOpts()).then(
      (blob) => {
        Util.download(base() + "-card.png", blob, "image/png");
        Site.toast(base() + "-card.png saved ✓");
        Site.setState("ready");
      },
      () => {
        Site.setState("ready");
        Site.toast("card render failed ✕");
      }
    );
  });
}

/* --------------------------- boot ----------------------------- */
function boot(): void {
  cacheEls();
  planet = makePlanet();
  els.planetThumb.getContext("2d")!
    .drawImage(planet, 0, 0, els.planetThumb.width, els.planetThumb.height);
  wireSource();
  wireParams();
  wireActions();
  wireShareCard();
  syncUI();
  setExports(false);
  loadPortrait(true);      // setSource gates on document.fonts.ready
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}

export {};
