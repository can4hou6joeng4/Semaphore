/* ============================================================
   semaphore-ascii — Terminal & ANSI Color Formatter
   Supports Plain text, Phosphor CRT Green, Grayscale, and TrueColor RGB.
   Coalesces adjacent matching colors for minimal output overhead.
   ============================================================ */

import { ConvertResult } from "./engine.js";

// Semaphore's signature phosphor green color
const CRT_GREEN = "\x1b[38;2;48;224;96m";
const RESET = "\x1b[0m";

/**
 * Formats a ConvertResult into ANSI-escaped or plain text suitable for terminal printing.
 */
export function formatTerminal(
  result: ConvertResult,
  colorMode: "none" | "green" | "gray" | "original" | "truecolor" = "none"
): string {
  if (colorMode === "none" || !result.colors) {
    return result.text;
  }

  if (colorMode === "green") {
    return `${CRT_GREEN}${result.text}${RESET}`;
  }

  const { lines, colors, cols, rows } = result;
  const outLines: string[] = [];

  for (let r = 0; r < rows; r++) {
    const line = lines[r];
    let rowOut = "";
    let activeKey = -1;

    for (let c = 0; c < cols; c++) {
      const idx = (r * cols + c) * 3;
      // Quantize slightly (top 5 bits) to merge imperceptible micro-variations
      const red = colors[idx] & 0xf8;
      const green = colors[idx + 1] & 0xf8;
      const blue = colors[idx + 2] & 0xf8;
      const key = (red << 16) | (green << 8) | blue;

      if (key !== activeKey) {
        rowOut += `\x1b[38;2;${red};${green};${blue}m`;
        activeKey = key;
      }
      rowOut += line[c];
    }

    rowOut += RESET;
    outLines.push(rowOut);
  }

  return outLines.join("\n");
}
