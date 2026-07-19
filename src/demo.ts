/* ============================================================
   img2ascii — landing "live demo" loop
   An auto-playing miniature of the tool flow: a ghost cursor
   drags portrait.png into a dropzone, then the REAL engine's
   cached conversions are replayed charset by charset, forever.

   - converts lazily on first play, one cached result per charset
   - plays only while ≥35% visible and the tab is foreground
   - prefers-reduced-motion: renders the final frame statically
   - if the sample image fails to load, the section is hidden
   ============================================================ */

import * as AsciiEngine from "./ascii-engine";
import type { ConvertResult } from "./ascii-engine";
import { Site, Util } from "./shared";

// module bodies cannot early-return, so the whole page script runs
// inside main() — logic is otherwise identical to the original
function main(): void {
  const section = document.getElementById("demoSection");
  const stage   = document.getElementById("demoStage");
  const term    = document.getElementById("demoTerm");
  const chip    = document.getElementById("demoChip");
  const drop    = document.getElementById("demoDrop");
  const cmd     = document.getElementById("demoCmd");
  const out     = document.getElementById("demoOut");
  const pre     = document.getElementById("demoPre");
  const status  = document.getElementById("demoStatus");
  const cursor  = document.getElementById("demoCursor");
  if (!section || !stage || !term || !chip || !drop || !cmd ||
      !out || !pre || !status || !cursor) return;

  /* --------------------------- constants ----------------------- */
  const COLS = 56;
  const CHARSETS = ["detailed", "blocks", "braille"];
  const CMD_BASE = "$ img2ascii portrait.png --charset ";
  const TYPE_CMD = "img2ascii portrait.png --charset detailed";
  const TYPE_CONVERT = "converting ░░▒▒▓▓██";
  const DROP_IDLE = "[ drop here ]";
  const DROP_DONE = "portrait.png ✓";

  /* every beat of the loop, in ms */
  const DUR = {
    rest:     700,               // settle before the cursor sets off
    glide:    800,               // cursor travel to the chip (transition 750ms)
    lift:     300,               // chip hover-lift beat
    press:    220,               // cursor pressed before the drag
    drag:     900,               // chip + cursor travel to the dropzone
    dropFade: 240,               // chip fades/scales into the zone
    flash:    300,               // dropzone flash after the drop
    typing:   500,               // "converting ░░▒▒▓▓██"
    reveal:   [700, 400, 400],   // row reveal: detailed / blocks / braille
    hold:     [1400, 1400, 1700],
    fade:     350,               // whole stage fades out
    relaunch: 420                // dark beat before the loop restarts
  };

  const reducedMq = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ----------------------------- state ------------------------- */
  let portrait: HTMLImageElement | null = null;  // once loaded
  let results: Record<string, ConvertResult> | null = null; // cached conversions
  let lastLines: string[] | null = null; // rows currently on screen, for rolling re-reveal
  const timers: number[] = [];           // every pending setTimeout handle
  let playing = false;
  let inView = false;
  let ready = false;
  let staticShown = false;

  function wait(ms: number, fn: () => void): void { timers.push(window.setTimeout(fn, ms)); }

  function clearTimers(): void {
    while (timers.length) window.clearTimeout(timers.pop());
  }

  /* --------------------------- geometry ------------------------ */
  function centerOf(el: HTMLElement): { x: number; y: number } {
    const s = stage!.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height / 2 };
  }

  function moveCursor(x: number, y: number, instant?: boolean): void {
    const t = "translate(" + Math.round(x) + "px," + Math.round(y) + "px)";
    if (instant) {
      cursor!.style.transition = "none";
      cursor!.style.transform = t;
      void cursor!.offsetWidth;
      cursor!.style.transition = "";
      return;
    }
    cursor!.style.transform = t;
  }

  /* -------------------------- conversion ----------------------- */
  /* lazy: first play converts once per charset, then only replays */
  function ensureResults(): void {
    if (results) return;
    const aspect = 1 / Util.advanceRatio();
    results = {};
    CHARSETS.forEach(function (key) {
      results![key] = AsciiEngine.convert(portrait!, {
        cols: COLS, charset: key, color: "green", cellAspect: aspect
      });
    });
    fit();
  }

  function fit(): void {
    if (!results) return;
    const rows = results.detailed.rows;
    const maxFs = Math.max(3, Math.floor(out!.clientHeight / rows));
    Util.fitPre(pre!, COLS, { container: out, padding: 0, max: maxFs });
  }

  function statusFor(res: ConvertResult): string {
    return res.cols + "×" + res.rows + " — " + res.ms + "ms — " + res.charset;
  }

  /* progressive row reveal from a CACHED result. The pre always
     holds `rows` lines (old rows or blanks fill the tail) so the
     centered block never jumps — it redraws like a terminal.     */
  function reveal(res: ConvertResult, dur: number, done?: () => void): void {
    const lines = res.lines;
    const rows = lines.length;
    const tail = (lastLines && lastLines.length === rows) ? lastLines : null;
    const t0 = performance.now();
    (function tick() {
      const k = Math.min(rows, Math.ceil((performance.now() - t0) / dur * rows));
      if (k > 0) {
        const head = lines.slice(0, k);
        pre!.textContent =
          (tail ? head.concat(tail.slice(k)) : head.concat(new Array<string>(rows - k)))
            .join("\n");
      }
      if (k < rows) { wait(33, tick); return; }
      lastLines = lines;
      if (done) done();
    })();
  }

  function typeText(el: HTMLElement, base: string, txt: string, dur: number, done?: (() => void) | null): void {
    const n = txt.length;
    const t0 = performance.now();
    (function tick() {
      const k = Math.min(n, Math.ceil((performance.now() - t0) / dur * n));
      el.textContent = base + txt.slice(0, k);
      if (k < n) { wait(34, tick); return; }
      if (done) done();
    })();
  }

  /* ---------------------------- the loop ------------------------ */
  function resetScene(): void {
    chip!.style.transition = "none";
    cursor!.style.transition = "none";
    chip!.classList.remove("is-hover", "is-held", "is-dropped");
    chip!.style.transform = "";
    cursor!.classList.remove("is-down");
    drop!.classList.remove("is-drag", "is-flash");
    drop!.textContent = DROP_IDLE;
    cmd!.textContent = "$";
    status!.textContent = "";
    pre!.textContent = "";
    lastLines = null;
    void chip!.offsetWidth; // flush so the reset does not animate
    chip!.style.transition = "";
    cursor!.style.transition = "";
    stage!.classList.remove("is-fade");
  }

  function cycle(): void {
    if (!playing) return;
    ensureResults();
    resetScene();
    stage!.classList.add("is-live");
    fit();
    const chipC = centerOf(chip!);
    const dropC = centerOf(drop!);
    moveCursor(stage!.clientWidth * 0.66, stage!.clientHeight * 0.72, true);

    /* 1 — glide to the file chip, chip lifts */
    wait(DUR.rest, function () {
      moveCursor(chipC.x + 6, chipC.y + 4);
      wait(DUR.glide, function () {
        chip!.classList.add("is-hover");
        wait(DUR.lift, function () {
          /* 2 — press, then drag the chip to the dropzone */
          cursor!.classList.add("is-down");
          wait(DUR.press, function () {
            chip!.classList.remove("is-hover");
            chip!.classList.add("is-held");
            drop!.classList.add("is-drag");
            const dx = dropC.x - chipC.x;
            const dy = dropC.y - chipC.y;
            chip!.style.transform =
              "translate(" + Math.round(dx) + "px," + Math.round(dy) + "px)";
            moveCursor(dropC.x + 6, dropC.y + 4);
            typeText(cmd!, "$ ", TYPE_CMD, DUR.drag - 200, null);
            wait(DUR.drag, function () { release(dx, dy); });
          });
        });
      });
    });
  }

  /* 3 — release: chip melts into the zone, zone flashes */
  function release(dx: number, dy: number): void {
    cursor!.classList.remove("is-down");
    chip!.classList.remove("is-held");
    chip!.classList.add("is-dropped"); // 240ms fade + scale(.8)
    chip!.style.transform =
      "translate(" + Math.round(dx) + "px," + Math.round(dy) + "px) scale(.8)";
    drop!.classList.remove("is-drag");
    drop!.classList.add("is-flash");
    drop!.textContent = DROP_DONE;
    wait(DUR.flash, function () { drop!.classList.remove("is-flash"); });
    typeText(cmd!, CMD_BASE + "detailed  ", TYPE_CONVERT, DUR.typing, null);
    const parked = centerOf(chip!); // chip now sits on the dropzone
    moveCursor(parked.x - 34, parked.y + 48); // drift out of the way
    wait(Math.max(DUR.typing, DUR.dropFade) + 80, function () { step(0); });
  }

  /* 4/5/6 — reveal the real cached conversions, hold, advance */
  function step(i: number): void {
    const key = CHARSETS[i];
    const res = results![key];
    cmd!.textContent = CMD_BASE + key;
    reveal(res, DUR.reveal[i], function () {
      status!.textContent = statusFor(res);
      wait(DUR.hold[i], function () {
        if (i + 1 < CHARSETS.length) { step(i + 1); return; }
        /* 7 — fade everything, then loop */
        stage!.classList.add("is-fade");
        wait(DUR.fade + DUR.relaunch, cycle);
      });
    });
  }

  /* --------------------- reduced-motion still ------------------- */
  function renderStatic(): void {
    ensureResults();
    resetScene();
    stage!.classList.remove("is-live", "is-fade");
    cursor!.style.display = "none";
    const res = results!.detailed;
    cmd!.textContent = CMD_BASE + "detailed";
    fit();
    pre!.textContent = res.text;
    lastLines = res.lines;
    status!.textContent = statusFor(res);
    staticShown = true;
  }

  /* ------------------------ play control ------------------------ */
  function stop(): void {
    playing = false;
    clearTimers();
  }

  function sync(): void {
    if (!ready) return;
    if (reducedMq.matches) {
      if (playing) stop();
      if (!staticShown) renderStatic();
      return;
    }
    const shouldPlay = inView && !document.hidden;
    if (shouldPlay && !playing) {
      playing = true;
      cycle();
    } else if (!shouldPlay && playing) {
      stop();
    }
  }

  function onReducedChange(): void {
    if (!reducedMq.matches) {
      cursor!.style.display = "";
      staticShown = false;
    }
    sync();
  }

  function observe(): void {
    if (!("IntersectionObserver" in window)) {
      inView = true;
      sync();
      return;
    }
    const io = new IntersectionObserver(function (entries) {
      const e = entries[entries.length - 1];
      inView = e.isIntersecting && e.intersectionRatio >= 0.35;
      sync();
    }, { threshold: [0, 0.35, 0.75] });
    io.observe(term!);
  }

  /* --------------------------- resize --------------------------- */
  let resizeTimer: number | undefined;
  window.addEventListener("resize", function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      if (results) fit(); // conversions are size-independent, just refit
    }, 160);
  });

  /* ---------------------------- boot ---------------------------- */
  function domReady(): Promise<void> {
    return new Promise(function (resolve) {
      if (document.readyState !== "loading") {
        resolve();
      } else {
        document.addEventListener("DOMContentLoaded", function () { resolve(); }, { once: true });
      }
    });
  }

  Promise.all([document.fonts.ready, domReady()])
    .then(function () { return AsciiEngine.loadImage("/assets/sample-portrait.png"); })
    .then(function (img) {
      portrait = img;
      ready = true;
      document.addEventListener("visibilitychange", sync);
      if (reducedMq.addEventListener) {
        reducedMq.addEventListener("change", onReducedChange);
      } else if (reducedMq.addListener) {
        reducedMq.addListener(onReducedChange);
      }
      observe();
      sync();
    })
    .catch(function () {
      section!.classList.add("hidden"); // never show a broken stage
    });
}

main();

export {};
