/* ============================================================
   img2ascii — landing page script
   hero: ONE wide photograph cover-fills the whole stage; the
   photo layer and its ascii conversion are both full-bleed and
   pixel-registered, and the draggable curtain wipes between
   them. Plus the live charset showcase. Chrome (header /
   statusbar / CRT overlays) is injected by shared.ts;
   conversion comes from ascii-engine.ts.
   ============================================================ */

import * as AsciiEngine from "./ascii-engine";
import { Site, Util } from "./shared";

const stage = document.getElementById("baStage") as HTMLElement;
const asciiPane = document.getElementById("baAsciiPane") as HTMLElement;
const heroPre = document.getElementById("heroAscii") as HTMLElement;
const handle = document.getElementById("baHandle") as HTMLElement;
const labelBefore = document.querySelector(".ba-label--before") as HTMLElement;
const labelAfter = document.querySelector(".ba-label--after") as HTMLElement;
const showPres = Array.prototype.slice.call(
  document.querySelectorAll("#charsetGrid .ascii-pre[data-charset]")) as HTMLElement[];

let portrait: HTMLImageElement | null = null;
let pos = 50; // divider position, 0–100 (rests at the mock's center split)

/* --------------------- divider (curtain) --------------------- */
/* dragging only moves the clip boundary — pane content is pinned
   at the fixed 50/50 composition and never rescales              */
function setPos(next: number): void {
  pos = Math.min(100, Math.max(0, next));
  stage.style.setProperty("--ba-pos", pos.toFixed(2));
  handle.setAttribute("aria-valuenow", String(Math.round(pos)));
  /* a label only makes sense while its layer is showing */
  labelBefore.style.opacity = pos < 9 ? "0" : "";
  labelAfter.style.opacity = pos > 91 ? "0" : "";
}

function posFromPointer(e: PointerEvent): number {
  const box = stage.getBoundingClientRect();
  if (box.width === 0) return pos;
  return ((e.clientX - box.left) / box.width) * 100;
}

let dragging = false;
let userTouched = false;

stage.addEventListener("pointerdown", function (e) {
  if (e.pointerType === "mouse" && e.button !== 0) return;
  dragging = true;
  userTouched = true;
  try { stage.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
  e.preventDefault();
  if (handle.contains(e.target as Node)) handle.focus({ preventScroll: true });
  setPos(posFromPointer(e));
});

stage.addEventListener("pointermove", function (e) {
  if (dragging) setPos(posFromPointer(e));
});

(["pointerup", "pointercancel", "lostpointercapture"] as const).forEach(function (type) {
  stage.addEventListener(type, function () { dragging = false; });
});

handle.addEventListener("keydown", function (e) {
  if (e.key === "ArrowLeft") {
    setPos(pos - 2);
    e.preventDefault();
  } else if (e.key === "ArrowRight") {
    setPos(pos + 2);
    e.preventDefault();
  } else if (e.key === "Home") {
    setPos(50);
    e.preventDefault();
  }
});

/* ----------------------- conversions ------------------------ */
/* ONE composed scene (dark field + portrait, face just right of
   the stage center) is drawn to the photo canvas; the ascii layer
   converts that same canvas — so the two layers register
   pixel-for-pixel and the divider wipes photo ⇄ ascii            */
const heroCanvas = document.getElementById("heroPhoto") as HTMLCanvasElement;
let hero: HTMLImageElement | null = null; // wide plate for the before/after stage

function composeScene(w: number, h: number): HTMLCanvasElement {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  heroCanvas.width = Math.round(w * dpr);
  heroCanvas.height = Math.round(h * dpr);
  const ctx = heroCanvas.getContext("2d")!;
  ctx.scale(dpr, dpr);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  /* one wide photograph (1760×854 — the stage's own aspect) simply
     cover-fills the whole stage; the curtain wipes photo ⇄ ascii
     across it with no pane seating and no synthetic dark field    */
  const r = AsciiEngine.coverRect(
    hero!.naturalWidth, hero!.naturalHeight, w, h, 0.5, 0.42);
  ctx.drawImage(hero!, r.sx, r.sy, r.sw, r.sh, 0, 0, w, h);
  return heroCanvas;
}

function renderHero(): void {
  if (!hero || stage.style.display === "none") return;
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  if (w < 40 || h < 40) return;

  const scene = composeScene(w, h);
  const cols = Math.min(400, Math.max(120, Math.round(w / 5.2)));
  const res = AsciiEngine.convert(scene, {
    cols: cols,
    charset: "detailed",
    color: "green",
    brightness: 2,
    contrast: 12,
    cellAspect: 1 / Util.advanceRatio()
  });
  heroPre.textContent = res.text;
  Util.fitPre(heroPre, res.cols, { container: asciiPane, padding: 0 });
  Site.setRight([res.cols + "×" + res.rows, "charset: detailed", res.ms + "ms"]);
}

function renderShowcase(): void {
  if (!portrait) return;
  showPres.forEach(function (pre) {
    const body = pre.parentElement; // .term-body — 16px padding each side
    if (!body) return;
    const innerW = body.clientWidth - 32;
    const innerH = body.clientHeight - 32;
    if (innerW < 40 || innerH < 40) return;

    const rect = AsciiEngine.coverRect(
      portrait!.naturalWidth, portrait!.naturalHeight, innerW, innerH, 0.74, 0.30);
    const res = AsciiEngine.convert(portrait!, {
      cols: 62,
      charset: pre.getAttribute("data-charset"),
      color: "green",
      cellAspect: 1 / Util.advanceRatio(),
      srcRect: rect
    });
    pre.textContent = res.text;
    Util.fitPre(pre, res.cols, { container: body, padding: 16 });
  });
}

function renderAll(): void {
  renderHero();
  renderShowcase();
}

/* --------------------- failure fallback --------------------- */
function degrade(): void {
  stage.style.display = "none"; // never a broken hero
  showPres.forEach(function (pre) {
    pre.classList.add("is-plain");
    pre.style.fontSize = "12px";
    pre.textContent = "sample image unavailable";
  });
}

/* one-time intro sweep: pull the ascii curtain out and back once
   so the conversion effect is visible without interaction        */
let introPlayed = false;
function introSweep(): void {
  if (introPlayed || userTouched) return;
  introPlayed = true;
  if (window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let t0: number | null = null;
  const DUR = 2100;
  function easeInOut(t: number): number { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function frame(ts: number): void {
    if (userTouched) return; // the visitor took over
    if (t0 === null) t0 = ts;
    const p = Math.min(1, (ts - t0) / DUR);
    const tri = p < 0.5 ? easeInOut(p * 2) : easeInOut((1 - p) * 2); // 0→1→0
    setPos(50 - 16 * tri);
    if (p < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* ---------------------------- boot --------------------------- */
function domReady(): Promise<void> {
  return new Promise(function (resolve) {
    if (document.readyState !== "loading") {
      resolve();
    } else {
      document.addEventListener("DOMContentLoaded", function () { resolve(); }, { once: true });
    }
  });
}

let resizeTimer: number | undefined;
window.addEventListener("resize", function () {
  clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(renderAll, 150);
});

(async function init() {
  // mono metrics must be final (and chrome injected) before first fit
  await Promise.all([document.fonts.ready, domReady()]);
  Site.setState("converting…", { busy: true });
  try {
    const loaded = await Promise.all([
      AsciiEngine.loadImage("/assets/sample-hero.png"),
      AsciiEngine.loadImage("/assets/sample-portrait.png")
    ]);
    hero = loaded[0];
    portrait = loaded[1];
    renderAll();
    setTimeout(introSweep, 750);
  } catch (_) {
    degrade();
  }
  Site.setState("ready");
})();

export {};
