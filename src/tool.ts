/* ============================================================
   semaphore — tool page
   The live workbench: source loading (drop / browse / paste /
   samples), parameter panel, rAF-coalesced conversion, fit/zoom
   sizing, exports. Header + statusbar come from shared.ts.
   ============================================================ */

import * as AsciiEngine from "./ascii-engine";
import type { AsciiSource, ConvertResult } from "./ascii-engine";
import * as ShareCard from "./sharecard";
import { Site, Util } from "./shared";
import {
  clearStoredToolPrefs,
  defaultsWithStoredPrefs,
  FACTORY_DEFAULTS,
  parseToolParams,
  saveStoredToolPrefs
} from "./tool-params";
import type { ToolParams } from "./tool-params";

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
  copy: HTMLButtonElement; savetxt: HTMLButtonElement; savepng: HTMLButtonElement;
  sharecard: HTMLButtonElement;
  cardModal: HTMLElement; cardClose: HTMLElement;
  cardPreview: HTMLImageElement; cardCaption: HTMLInputElement;
  cardSvg: HTMLButtonElement; cardPng: HTMLButtonElement;
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
    copy: $("copy") as HTMLButtonElement,
    savetxt: $("savetxt") as HTMLButtonElement,
    savepng: $("savepng") as HTMLButtonElement,
    sharecard: $("sharecard") as HTMLButtonElement,
    cardModal: $("cardModal"), cardClose: $("cardClose"),
    cardPreview: $("cardPreview") as HTMLImageElement, cardCaption: $("cardCaption") as HTMLInputElement,
    cardSvg: $("cardSvg") as HTMLButtonElement, cardPng: $("cardPng") as HTMLButtonElement,
    cardSeg: Array.from(document.querySelectorAll<HTMLButtonElement>('.seg[aria-label="card theme"] button')),
    outTitle: $("outTitle"), outBody: $("outBody"), out: $("out")
  };
}

/* -------------------------- state ----------------------------- */
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
let params: ToolParams = Object.assign({}, FACTORY_DEFAULTS);

function persistToolPrefs(): void {
  saveStoredToolPrefs({ charset: params.charset, color: params.color });
}

let pendingFrame = false;
let resizeTimer: number | undefined;
let planet: HTMLCanvasElement | null = null;
let sourceSeq = 0;                       // latest source intent wins across async loads
let sourceIntentPending = false;         // queued old conversions cannot unlock a new load

let cardTheme = "crt";                 // share-card palette, independent of site theme
let cardUrl: string | null = null;     // objectURL of the current preview
let cardTimer: number | undefined;     // caption debounce
let cardSeq = 0;                       // drops stale async preview renders
let cardPreviewBusy = false;
let pngExportSeq = 0;
let cardDownloadSeq = 0;
const PNG_EXPORT_STATE = "rendering png…";
const CARD_PREVIEW_STATE = "rendering card preview…";
const CARD_DOWNLOAD_STATE = "rendering card download…";
const CARD_PREVIEW_PLACEHOLDER =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

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
function beginSourceIntent(): number {
  const cardWasOpen = !els.cardModal.classList.contains("hidden");
  closeCard();
  sourceIntentPending = true;
  setExports(false);
  if (cardWasOpen) els.drop.focus();
  return ++sourceSeq;
}

function loadFile(file: File | null | undefined): void {
  if (!file) return;
  if (!/^image\//.test(file.type || "")) { Site.toast("not an image ✕"); return; }
  const seq = beginSourceIntent();
  Site.setState("decoding…", { busy: true });
  AsciiEngine.fileToImage(file).then(
    (img) => setSource(img, file.name || "pasted.png", seq),
    () => {
      if (seq !== sourceSeq) return;
      sourceIntentPending = false;
      Site.setState("ready");
      setExports(!!state.result);
      Site.toast("could not decode image ✕");
    }
  );
}

function loadPortrait(atBoot: boolean): void {
  const seq = beginSourceIntent();
  Site.setState("loading sample…", { busy: true });
  AsciiEngine.loadImage("/static/sample-portrait.webp").then(
    (img) => setSource(img, "portrait.webp", seq),
    () => {
      if (seq !== sourceSeq) return;
      sourceIntentPending = false;
      if (atBoot) {
        els.srcThumb.classList.add("is-unavailable");
        els.srcThumb.alt = "";
        els.srcMeta.textContent = "default sample unavailable";
      }
      Site.setState(atBoot ? "no source" : "ready");
      setExports(!!state.result);
      if (!atBoot) Site.toast("sample failed to load ✕");
    }
  );
}

/* The panel thumbnail is drawn from the DECODED source, never from
   its object URL — fileToImage revokes that the moment it loads.
   Downscaling also stops a 600 KB photo from backing a 110px img. */
const THUMB_MAX = 240;

function thumbDataURL(source: AsciiSource, w: number, h: number): string {
  const scale = Math.min(1, THUMB_MAX / Math.max(w, h));
  const cv = document.createElement("canvas");
  cv.width = Math.max(1, Math.round(w * scale));
  cv.height = Math.max(1, Math.round(h * scale));
  const ctx = cv.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, cv.width, cv.height);
  return cv.toDataURL("image/webp", 0.85);   // falls back to png where unsupported
}

function setSource(source: AsciiSource, name: string, seq: number): void {
  fontsReady.then(() => {                          // mono metrics first
    if (seq !== sourceSeq) return;
    state.source = source;
    state.name = name;
    const d = dims(source);
    state.imgW = d.w; state.imgH = d.h;
    els.srcThumb.classList.remove("is-unavailable");
    els.srcThumb.alt = "loaded source preview";
    els.srcThumb.width = d.w;
    els.srcThumb.height = d.h;
    els.srcThumb.src = thumbDataURL(source, d.w, d.h);
    els.srcMeta.textContent = name + " — " + d.w + "×" + d.h;
    els.srcInfo.classList.remove("hidden");
    updateCmdline();
    sourceIntentPending = false;
    requestConvert();
  });
}

/* ------------------------ conversion -------------------------- */
/* Param changes coalesce into a single pending tick; the tick
   reads the latest params, so nothing ever queues. rAF is the
   fast path, with a timeout fallback for throttled/background
   tabs where rAF can stall indefinitely.                        */
function requestConvert(): void {
  if (!state.source || sourceIntentPending) return;
  setExports(false);
  if (pendingFrame) return;
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
  if (!state.source || sourceIntentPending) return;
  try {
    const res = AsciiEngine.convert(state.source, {
      cols: params.cols,
      charset: params.charset,
      invert: params.invert,
      brightness: params.brightness,
      contrast: params.contrast,
      color: params.color,
      dither: params.dither,
      cellAspect: 1 / Util.advanceRatio(
        AsciiEngine.advanceSample(params.charset))
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
  /* The visual <pre> stays out of the accessibility tree so Chrome cannot
     expose every glyph. Its focusable scroll viewport carries the concise,
     current description without becoming another live region. */
  els.outBody.setAttribute("aria-label",
    "ASCII output viewport — " + res.cols + " columns by " + res.rows +
    " rows, charset " + res.charset);
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
    Util.fitPre(els.out, state.result.cols, {
      container: els.outBody,
      padding: 16,
      min: 1,
      sample: AsciiEngine.advanceSample(state.result.charset)
    });
  } else {
    els.out.style.fontSize = state.zoom + "px";
    els.out.style.lineHeight = "1";
  }
}

/* ------------------------- readouts --------------------------- */
function updateCmdline(): void {
  els.cmdline.textContent = "$ semaphore" +
    (state.name ? " " + state.name : "") +
    " --charset " + params.charset +
    " --cols " + params.cols +
    " --color " + params.color +
    (params.invert ? " --invert" : "") +
    /* only surfaced where it does something — see syncDither() */
    (ditherApplies() && !params.dither ? " --no-dither" : "");
}

function setExports(on: boolean): void {
  [els.copy, els.savetxt, els.sharecard, els.savepng, els.cardSvg, els.cardPng].forEach((button) => {
    button.disabled = !on;
  });
}

function syncUI(): void {
  els.charset.value = params.charset;
  els.cols.value = String(params.cols);          els.colsv.textContent = String(params.cols);
  els.bright.value = String(params.brightness);  els.brightv.textContent = String(params.brightness);
  els.contrast.value = String(params.contrast);  els.contrastv.textContent = String(params.contrast);
  els.invert.setAttribute("aria-pressed", String(params.invert));
  els.dither.setAttribute("aria-pressed", String(params.dither));
  syncDither();
  syncRadioGroup(els.seg, (b) => b.dataset.color === params.color);
  updateCmdline();
}

/* ---------------------- dither availability ------------------- */
/* Dithering only runs in the braille branch of the engine — on a
   ramp charset every cell is already one of N grey levels, so
   error diffusion to pure black/white would just destroy the ramp.
   The toggle used to stay live on every charset and quietly do
   nothing, which reads as a broken control.                      */
function ditherApplies(): boolean {
  const cs = AsciiEngine.CHARSETS[params.charset];
  return !!(cs && cs.braille);
}

/* aria-disabled rather than the disabled property: a disabled
   button drops out of the tab order entirely, so a keyboard user
   never learns the control exists. This way it stays reachable and
   announces itself as unavailable, and the stored preference is
   preserved for when braille comes back.                         */
function syncDither(): void {
  const on = ditherApplies();
  els.dither.setAttribute("aria-disabled", String(!on));
  els.dither.title = on ? "" : "dithering only applies to the braille charset";
}

/* --------------------- radiogroup plumbing -------------------- */
/* The .seg controls are single-choice, so they are real ARIA
   radiogroups: role=radio + aria-checked (NOT aria-pressed, which
   means "toggle" and makes a radiogroup announce zero options),
   arrow-key navigation, and a roving tabindex so each group is one
   tab stop rather than N.                                        */
function syncRadioGroup(buttons: HTMLButtonElement[],
                        isOn: (b: HTMLButtonElement) => boolean): void {
  buttons.forEach((b) => {
    const on = isOn(b);
    b.setAttribute("aria-checked", String(on));
    b.tabIndex = on ? 0 : -1;
  });
}

function wireRadioGroup(buttons: HTMLButtonElement[],
                        pick: (btn: HTMLButtonElement) => void): void {
  const choose = (btn: HTMLButtonElement) => {
    if (btn.getAttribute("aria-checked") !== "true") pick(btn);
  };
  buttons.forEach((btn, i) => {
    btn.addEventListener("click", () => choose(btn));
    btn.addEventListener("keydown", (e) => {
      const dir = (e.key === "ArrowRight" || e.key === "ArrowDown") ? 1
                : (e.key === "ArrowLeft" || e.key === "ArrowUp") ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      const next = buttons[(i + dir + buttons.length) % buttons.length];
      next.focus();
      choose(next);
    });
  });
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
  els.samplePlanet.addEventListener("click", () => {
    setSource(planet!, "planet.png", beginSourceIntent());
  });
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
    persistToolPrefs();
    syncDither();
    updateCmdline();
    requestConvert();
  });

  const bindToggle = (btn: HTMLElement, key: "invert" | "dither") => {
    btn.addEventListener("click", () => {
      if (btn.getAttribute("aria-disabled") === "true") return;
      params[key] = !params[key];
      btn.setAttribute("aria-pressed", String(params[key]));
      updateCmdline();
      requestConvert();
    });
  };
  bindToggle(els.invert, "invert");
  bindToggle(els.dither, "dither");

  wireRadioGroup(els.seg, (btn) => {
    params.color = btn.dataset.color!;
    persistToolPrefs();
    syncRadioGroup(els.seg, (b) => b === btn);
    updateCmdline();
    requestConvert();
  });

  els.reset.addEventListener("click", () => {
    clearStoredToolPrefs();
    params = Object.assign({}, FACTORY_DEFAULTS);
    if (location.search) history.replaceState(null, "", location.pathname);
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
    Util.copyText(state.result.text).then(
      () => Site.toast("copied to clipboard ✓"),
      () => Site.toast("clipboard copy failed ✕")
    );
  });

  els.savetxt.addEventListener("click", () => {
    if (!state.result) return;
    Util.download(base() + "-ascii.txt", state.result.text);
    Site.toast(base() + "-ascii.txt saved ✓");
  });

  els.savepng.addEventListener("click", () => {
    const result = state.result;
    if (!result) return;
    const filename = base() + "-ascii.png";
    const seq = ++pngExportSeq;
    Site.setState(PNG_EXPORT_STATE, { busy: true });
    const cs = getComputedStyle(document.documentElement);   // theme-aware at click time
    AsciiEngine.renderPNG(result, {
      fontSize: 12, scale: 2,
      bg: cs.getPropertyValue("--bg-deep").trim() || "#0d120d",
      fg: cs.getPropertyValue("--green").trim() || "#4dff7c"
    }).then(
      (blob) => {
        Util.download(filename, blob, "image/png");
        Site.toast(filename + " saved ✓");
        if (seq === pngExportSeq) finishOwnedState(PNG_EXPORT_STATE);
      },
      () => {
        if (seq === pngExportSeq) finishOwnedState(PNG_EXPORT_STATE);
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

function finishOwnedState(expected: string): void {
  // Late async work must not clear a newer task's status.
  const status = document.querySelector("[data-sb-state]");
  if (status && status.textContent === expected) Site.setState("ready");
}

function finishCardPreview(): void {
  cardPreviewBusy = false;
  els.cardPreview.setAttribute("aria-busy", "false");
  finishOwnedState(CARD_PREVIEW_STATE);
}

function renderCard(): void {
  if (!state.result) return;
  const seq = ++cardSeq;
  cardPreviewBusy = true;
  els.cardPreview.setAttribute("aria-busy", "true");
  Site.setState(CARD_PREVIEW_STATE, { busy: true });
  ShareCard.pngBlob(state.result, cardOpts()).then(
    (blob) => {
      if (seq !== cardSeq) return;                 // a newer render superseded us
      const url = URL.createObjectURL(blob);
      if (cardUrl) URL.revokeObjectURL(cardUrl);
      cardUrl = url;
      els.cardPreview.src = url;
      finishCardPreview();
    },
    () => {
      if (seq !== cardSeq) return;
      finishCardPreview();
      Site.toast("card render failed ✕");
    }
  );
}

/* aria-modal alone does not stop Tab from walking out of the panel
   into the page behind it — the dialog has to hold focus itself.  */
function modalFocusables(): HTMLElement[] {
  return Array.from(els.cardModal.querySelectorAll<HTMLElement>(
    "button, input, select, textarea, a[href]"
  )).filter((n) => n.tabIndex >= 0 && !(n as HTMLInputElement).disabled);
}

function onCardKeydown(e: KeyboardEvent): void {
  if (e.key === "Escape") { closeCard(); return; }
  if (e.key !== "Tab") return;
  const list = modalFocusables();
  if (!list.length) return;
  const first = list[0];
  const last = list[list.length - 1];
  const inside = els.cardModal.contains(document.activeElement);
  if (e.shiftKey && (!inside || document.activeElement === first)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && (!inside || document.activeElement === last)) {
    e.preventDefault();
    first.focus();
  }
}

function openCard(): void {
  if (!state.result) return;
  cardTheme = Site.theme.get();                    // seg defaults to site theme
  syncRadioGroup(els.cardSeg, (b) => b.dataset.ctheme === cardTheme);
  els.cardModal.classList.remove("hidden");
  document.addEventListener("keydown", onCardKeydown);
  els.cardClose.focus();
  renderCard();
}

function closeCard(): void {
  if (els.cardModal.classList.contains("hidden")) return;
  els.cardModal.classList.add("hidden");
  document.removeEventListener("keydown", onCardKeydown);
  clearTimeout(cardTimer);
  cardSeq++;                            // ignore a render that resolves after close
  if (cardPreviewBusy) finishCardPreview();
  if (cardUrl) { URL.revokeObjectURL(cardUrl); cardUrl = null; }
  els.cardPreview.src = CARD_PREVIEW_PLACEHOLDER;
  els.sharecard.focus();
}

function wireShareCard(): void {
  els.sharecard.addEventListener("click", openCard);
  els.cardClose.addEventListener("click", closeCard);
  els.cardModal.addEventListener("click", (e) => {
    if (e.target === els.cardModal) closeCard();   // backdrop only, not the panel
  });

  wireRadioGroup(els.cardSeg, (btn) => {
    cardTheme = btn.dataset.ctheme!;
    syncRadioGroup(els.cardSeg, (b) => b === btn);
    renderCard();
  });

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
    const result = state.result;
    if (!result) return;
    const opts = cardOpts();
    const filename = base() + "-card.png";
    const seq = ++cardDownloadSeq;
    Site.setState(CARD_DOWNLOAD_STATE, { busy: true });
    ShareCard.pngBlob(result, opts).then(
      (blob) => {
        Util.download(filename, blob, "image/png");
        Site.toast(filename + " saved ✓");
        if (seq === cardDownloadSeq) finishOwnedState(CARD_DOWNLOAD_STATE);
      },
      () => {
        if (seq === cardDownloadSeq) finishOwnedState(CARD_DOWNLOAD_STATE);
        Site.toast("card render failed ✕");
      }
    );
  });
}

/* --------------------------- boot ----------------------------- */
function boot(): void {
  cacheEls();
  /* URL query wins over last-used prefs; prefs only fill missing keys. */
  params = parseToolParams(location.search, defaultsWithStoredPrefs(FACTORY_DEFAULTS));
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
