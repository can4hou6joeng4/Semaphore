import "./terminal.css";
import * as AsciiEngine from "./ascii-engine";
import { Site, Util } from "./shared";

const output = document.getElementById("brailleDemo") as HTMLPreElement;
const stage = document.getElementById("brailleStage") as HTMLElement;
const BRAILLE_SAMPLE = AsciiEngine.advanceSample("braille");
let demoSize: { cols: number; rows: number } | null = null;

function fitDemo(): void {
  if (!demoSize) return;
  const heightLimit = (stage.clientHeight - 32) / demoSize.rows;
  Util.fitPre(output, demoSize.cols, {
    container: stage,
    min: 3,
    max: Math.max(3, Math.min(11, heightLimit)),
    sample: BRAILLE_SAMPLE
  });
  /* Keep a rendered-width guard for fallback differences that appear after
     measurement (for example an OS font swap during the same page load). */
  const availableWidth = stage.clientWidth - 32;
  if (output.scrollWidth > availableWidth) {
    const currentSize = parseFloat(getComputedStyle(output).fontSize);
    const fittedSize = Math.max(3, currentSize * availableWidth / output.scrollWidth);
    output.style.fontSize = fittedSize + "px";
  }
}

async function renderDemo(): Promise<void> {
  try {
    Site.setState("rendering braille…", { busy: true });
    const image = await AsciiEngine.loadImage("/static/sample-portrait.webp");
    const result = AsciiEngine.convert(image, {
      cols: 86,
      charset: "braille",
      color: "green",
      invert: false,
      brightness: 4,
      contrast: 12,
      dither: true,
      cellAspect: 1 / Util.advanceRatio(BRAILLE_SAMPLE)
    });
    demoSize = { cols: result.cols, rows: result.rows };
    output.textContent = result.text;
    output.setAttribute("aria-label",
      "braille ascii portrait — " + result.cols + " columns by " + result.rows + " rows");
    fitDemo();
    Site.setState("ready");
    Site.setRight([result.cols + "×" + result.rows, "charset: braille", result.ms + "ms"]);
  } catch (_) {
    output.textContent = "braille preview unavailable — open the tool to render your image";
    output.setAttribute("aria-label", "braille ascii preview unavailable");
    Site.setState("preview unavailable");
  }
}

Promise.resolve(document.fonts && document.fonts.ready).then(renderDemo);
window.addEventListener("resize", function () {
  fitDemo();
});
