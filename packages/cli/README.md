# semaphore-ascii

> Instant in-terminal and programmatic image-to-ASCII / Unicode Braille art converter with 2×4 subpixel dithering and zero data upload.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Zero Upload](https://img.shields.io/badge/Privacy-Zero--Upload-success.svg)](https://semaphore.bobochang.cn)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-green.svg)](https://nodejs.org)

**semaphore-ascii** is the official command-line tool and Node.js engine behind [Semaphore](https://semaphore.bobochang.cn). It brings instant client-side image-to-ASCII conversion directly into your terminal, scripts, CI/CD pipelines, and GitHub Actions.

---

## Features

- **2×4 Unicode Braille Dithering**: Maps each character cell into an 8-dot Braille subgrid (`U+2800..U+28FF`) with Floyd–Steinberg error diffusion for photorealistic detail even on narrow terminal widths.
- **6 Presets**: `standard` (10-level ASCII), `detailed` (68-level grayscale ramp), `blocks` (`░▒▓█`), `minimal`, `binary` (`01`), and `braille`.
- **TrueColor ANSI Output**: Preserves full 24-bit RGB or CRT phosphor green terminal aesthetics.
- **Pure JavaScript & Zero Native Toolchains**: Uses lightweight pure-JS decoders for PNG, JPEG, and GIF. Installs in seconds without `node-gyp`, Cairo, or Python requirements.
- **Pipe-Friendly**: Seamlessly reads from files or standard input (`cat photo.png | semaphore-ascii -`).
- **Programmatic API**: Full TypeScript definitions for integrating conversion into your own Node.js or web services.

---

## Quick Start (CLI)

Run directly with `npx` (no installation required):

```bash
# Convert an image using auto-detected terminal width
npx semaphore-ascii logo.png

# High-detail 2×4 Braille with TrueColor
npx semaphore-ascii avatar.png --charset braille --color original

# Read from pipeline and save to text file
cat banner.png | npx semaphore-ascii - -w 120 -c detailed -o banner.txt
```

Or install globally:

```bash
npm install -g semaphore-ascii

semaphore-ascii photo.jpg -w 100 --color green
```

---

## CLI Options

```text
Usage:
  semaphore-ascii <image-file> [options]
  cat photo.png | semaphore-ascii - [options]

Arguments:
  <image-file>             Path to image (PNG, JPEG, GIF), or '-' for stdin

Options:
  -w, --cols <n>           Output width in character columns (default: terminal width or 80)
  -c, --charset <name>     Charset preset: standard, detailed, blocks, minimal, binary, braille
                           (default: standard)
  -C, --color <mode>       Color mode: none, green, gray, original/truecolor
                           (default: green in TTY terminal, none when piped)
  -i, --invert             Invert character brightness
  -b, --brightness <n>     Brightness adjustment (-100..100, default: 0)
  -k, --contrast <n>       Contrast adjustment (-100..100, default: 0)
      --no-dither          Disable Floyd-Steinberg error diffusion in braille mode
  -a, --aspect <n>         Character cell aspect ratio (default: 1.82)
  -o, --output <file>      Save converted output to file instead of stdout
      --json               Output JSON format with structured metadata
  -v, --version            Show version number
  -h, --help               Show help manual
```

---

## Programmatic API (Node.js / TypeScript)

You can import `semaphore-ascii` into any Node.js project:

```typescript
import fs from "node:fs";
import { convert, decodeImage, CHARSETS } from "semaphore-ascii";

// 1. Read and decode an image buffer (PNG, JPEG, or GIF)
const buffer = fs.readFileSync("./avatar.png");
const rawImage = decodeImage(buffer);

// 2. Convert to ASCII / Braille
const result = convert(rawImage, {
  cols: 80,
  charset: "braille",
  color: "original",
  invert: false,
  brightness: 0,
  contrast: 10
});

console.log(result.text);  // Plain string output
console.log(result.lines); // Array of lines
console.log(result.cols, result.rows, result.ms);
```

---

## Web Version

Prefer a graphical in-browser experience with real-time parameter sliders and live preview?
Visit **[https://semaphore.bobochang.cn](https://semaphore.bobochang.cn)**.

---

## License

[MIT](LICENSE) © [bobochang](https://bobochang.cn)
