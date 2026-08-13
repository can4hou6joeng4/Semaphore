/* ============================================================
   charset-page — one entry behind every /charsets/* landing page.

   The five ramp pages differ only in which charset they demo, so the
   charset is read from `body[data-charset]` rather than hard-coded per
   page. Braille keeps its own entry (main-braille.ts): it has to guard
   against the system fallback advance, which none of the ramps need
   because JetBrains Mono covers every glyph they use.
   ============================================================ */
import * as AsciiEngine from "./ascii-engine";
import { Site, Util } from "./shared";

const output = document.getElementById("charsetDemo") as HTMLPreElement | null;
const stage = document.getElementById("charsetStage") as HTMLElement | null;
const charset = document.body.getAttribute("data-charset") || "standard";
const SAMPLE = AsciiEngine.advanceSample(charset);

let demoSize: { cols: number; rows: number } | null = null;

function fitDemo(): void {
  if (!output || !stage || !demoSize) return;
  const heightLimit = (stage.clientHeight - 32) / demoSize.rows;
  Util.fitPre(output, demoSize.cols, {
    container: stage,
    min: 3,
    max: Math.max(3, Math.min(13, heightLimit)),
    sample: SAMPLE
  });
}

async function renderDemo(): Promise<void> {
  if (!output || !stage) return;
  try {
    Site.setState("rendering " + charset + "…", { busy: true });
    const image = await AsciiEngine.loadImage("/static/sample-portrait.webp");
    const result = AsciiEngine.convert(image, {
      cols: 96,
      charset: charset,
      color: "green",
      invert: false,
      brightness: 0,
      contrast: 8,
      cellAspect: 1 / Util.advanceRatio(SAMPLE)
    });
    demoSize = { cols: result.cols, rows: result.rows };
    output.textContent = result.text;
    output.setAttribute("aria-label",
      charset + " ascii portrait — " + result.cols + " columns by " + result.rows + " rows");
    fitDemo();
    Site.setState("ready");
    Site.setRight([result.cols + "×" + result.rows, "charset: " + charset, result.ms + "ms"]);
  } catch (_) {
    output.textContent = "preview unavailable — open the tool to render your own image";
    output.setAttribute("aria-label", charset + " ascii preview unavailable");
    Site.setState("preview unavailable");
  }
}

Promise.resolve(document.fonts && document.fonts.ready).then(renderDemo);
window.addEventListener("resize", function () {
  fitDemo();
});
