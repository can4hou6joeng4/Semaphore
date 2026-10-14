/* ============================================================
   semaphore-ascii — CLI Command Runner
   ============================================================ */

import fs from "node:fs";
import { parseArgs } from "node:util";
import { convert, CHARSETS, ConvertOptions } from "./engine.js";
import { decodeImage, loadImageFile, readStream } from "./image-loader.js";
import { formatTerminal } from "./terminal.js";

const VERSION = "1.0.0";

const HELP_TEXT = `
Semaphore CLI — Zero-upload image to ASCII & Braille art generator

Usage:
  semaphore-ascii <image-file> [options]
  cat photo.png | semaphore-ascii - [options]

Arguments:
  <image-file>             Path to image (PNG, JPEG, GIF), or '-' for stdin

Options:
  -w, --cols <n>           Output width in character columns (default: 80, or auto-fit terminal)
  -c, --charset <name>     Charset preset: standard, detailed, blocks, minimal, binary, braille
                           (default: standard)
  -C, --color <mode>       Color mode: none, green, gray, original/truecolor
                           (default: green in TTY terminal, none when piped)
  -i, --invert             Invert character brightness / contrast
  -b, --brightness <n>     Brightness adjustment (-100..100, default: 0)
  -k, --contrast <n>       Contrast adjustment (-100..100, default: 0)
      --no-dither          Disable Floyd-Steinberg error diffusion in braille mode
  -a, --aspect <n>         Character cell aspect ratio (default: 1.82)
  -o, --output <file>      Save converted output to file instead of stdout
      --json               Output JSON format with structured metadata
  -v, --version            Show version number
  -h, --help               Show this help message

Presets:
  standard                 Classic 10-level 7-bit ASCII: " .:-=+*#%@"
  detailed                 68-level fine-grained grayscale ramp
  blocks                   Solid Unicode block glyphs: " ░▒▓█"
  minimal                  5-level stark contrast
  binary                   Cyberpunk 0/1 binary glyphs
  braille                  2×4 Unicode Braille dot matrix (8x spatial detail)

Examples:
  npx semaphore-ascii logo.png
  npx semaphore-ascii avatar.png --charset braille --color original
  npx semaphore-ascii portrait.jpg -w 120 --charset detailed -o banner.txt
  cat badge.png | npx semaphore-ascii - --charset blocks
`;

export async function runCli(argv: string[] = process.argv.slice(2)): Promise<void> {
  const optionsConfig = {
    cols: { type: "string" as const, short: "w" },
    charset: { type: "string" as const, short: "c" },
    color: { type: "string" as const, short: "C" },
    invert: { type: "boolean" as const, short: "i" },
    brightness: { type: "string" as const, short: "b" },
    contrast: { type: "string" as const, short: "k" },
    dither: { type: "boolean" as const, default: true },
    aspect: { type: "string" as const, short: "a" },
    output: { type: "string" as const, short: "o" },
    json: { type: "boolean" as const },
    version: { type: "boolean" as const, short: "v" },
    help: { type: "boolean" as const, short: "h" }
  };

  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      options: optionsConfig,
      allowPositionals: true
    });
  } catch (err: any) {
    console.error(`Error: ${err.message}\n`);
    console.error("Run with --help for command line usage.");
    process.exit(1);
  }

  const { values, positionals } = parsed;

  if (values.help) {
    console.log(HELP_TEXT);
    return;
  }

  if (values.version) {
    console.log(`semaphore-ascii v${VERSION}`);
    return;
  }

  const inputArg = positionals[0];
  if (!inputArg) {
    console.error("Error: Missing input image path.\n");
    console.error("Usage: semaphore-ascii <image-file> [options]");
    console.error("Try 'semaphore-ascii --help' for full options.");
    process.exit(1);
  }

  // Load raw image
  let rawImage;
  try {
    if (inputArg === "-") {
      const buf = await readStream(process.stdin);
      rawImage = decodeImage(buf);
    } else {
      rawImage = loadImageFile(inputArg);
    }
  } catch (err: any) {
    console.error(`Failed to load image: ${err.message}`);
    process.exit(1);
  }

  // Determine column count:
  // If user specified, clamp 10..300.
  // Otherwise, use terminal stdout columns if available, clamped to 80..120.
  let cols = 80;
  if (values.cols) {
    cols = parseInt(values.cols, 10);
    if (isNaN(cols) || cols < 10) cols = 80;
  } else if (process.stdout.isTTY && process.stdout.columns) {
    cols = Math.min(process.stdout.columns, 100);
  }

  // Color mode:
  // If outputting to file or piped stdout, default to "none" unless explicitly specified.
  let colorMode: "none" | "green" | "gray" | "original" | "truecolor" = "none";
  if (values.color) {
    const c = values.color.toLowerCase();
    if (["none", "green", "gray", "original", "truecolor"].includes(c)) {
      colorMode = c as any;
    }
  } else if (process.stdout.isTTY && !values.output) {
    colorMode = "green"; // Default CRT green for interactive terminal
  }

  const convertOpts: ConvertOptions = {
    cols,
    charset: values.charset || "standard",
    color: colorMode,
    invert: values.invert || false,
    brightness: values.brightness ? parseFloat(values.brightness) : 0,
    contrast: values.contrast ? parseFloat(values.contrast) : 0,
    dither: values.dither !== false,
    cellAspect: values.aspect ? parseFloat(values.aspect) : undefined
  };

  const result = convert(rawImage, convertOpts);

  if (values.json) {
    const jsonOutput = {
      version: VERSION,
      cols: result.cols,
      rows: result.rows,
      charset: result.charset,
      ms: result.ms,
      text: result.text
    };
    console.log(JSON.stringify(jsonOutput, null, 2));
    return;
  }

  if (values.output) {
    // Write plain text to file (strip ANSI colors)
    fs.writeFileSync(values.output, result.text, "utf-8");
    console.log(`Saved ASCII art (${result.cols}x${result.rows}) to ${values.output}`);
    return;
  }

  const terminalOutput = formatTerminal(result, colorMode);
  console.log(terminalOutput);
}
