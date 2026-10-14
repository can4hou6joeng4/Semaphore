import test from "node:test";
import assert from "node:assert/strict";
import { convert, CHARSETS, ditherFS } from "../dist/engine.js";
import { sampleGrid } from "../dist/resampler.js";
import { detectFormat } from "../dist/image-loader.js";
import { formatTerminal } from "../dist/terminal.js";

test("detectFormat detects PNG, JPEG, and GIF magic bytes", () => {
  const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(detectFormat(pngHeader), "png");

  const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
  assert.equal(detectFormat(jpegHeader), "jpeg");

  const gifHeader = Buffer.from("GIF89a...");
  assert.equal(detectFormat(gifHeader), "gif");

  const unknown = Buffer.from("RIFF....WEBP");
  assert.equal(detectFormat(unknown), "unknown");
});

test("ditherFS performs 2D error diffusion", () => {
  const lum = new Float32Array([100, 150, 200, 50]);
  ditherFS(lum, 2, 2);
  // Each pixel must be quantized to 0 or 255
  for (const v of lum) {
    assert.ok(v === 0 || v === 255);
  }
});

test("convert transforms raw image into standard ASCII", () => {
  // Create a 4x4 mock black & white image
  const w = 4, h = 4;
  const data = new Uint8ClampedArray(w * h * 4);
  // Fill with a horizontal gradient
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const val = Math.round((x / (w - 1)) * 255);
      data[idx] = val;     // R
      data[idx + 1] = val; // G
      data[idx + 2] = val; // B
      data[idx + 3] = 255; // A
    }
  }

  const rawImage = { width: w, height: h, data };
  const res = convert(rawImage, { cols: 4, charset: "standard", cellAspect: 1.0 });

  assert.equal(res.cols, 4);
  assert.equal(res.charset, "standard");
  assert.equal(res.lines.length, res.rows);
  assert.ok(res.text.length > 0);
});

test("convert transforms raw image into Braille matrix", () => {
  const w = 4, h = 8;
  const data = new Uint8ClampedArray(w * h * 4);
  data.fill(255); // Solid white

  const rawImage = { width: w, height: h, data };
  const res = convert(rawImage, { cols: 2, charset: "braille", cellAspect: 1.0 });

  assert.equal(res.cols, 2);
  assert.equal(res.charset, "braille");
  // In solid white, braille dots should all be active: U+28FF == "⣿"
  assert.ok(res.lines[0].includes("⣿"));
});

test("formatTerminal handles ANSI colors and plain text", () => {
  const mockResult = {
    text: "TEST",
    lines: ["TEST"],
    colors: new Uint8ClampedArray([255, 0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 0]),
    cols: 4,
    rows: 1,
    charset: "standard",
    ms: 5,
    opts: {}
  };

  const plain = formatTerminal(mockResult, "none");
  assert.equal(plain, "TEST");

  const green = formatTerminal(mockResult, "green");
  assert.ok(green.includes("\x1b[38;2;48;224;96m"));

  const truecolor = formatTerminal(mockResult, "truecolor");
  assert.ok(truecolor.includes("\x1b[38;2;"));
});
