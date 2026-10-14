/* ============================================================
   semaphore-ascii — Multi-format Pure JS Image Decoder
   Supports PNG, JPEG, and GIF with zero native compile requirements.
   ============================================================ */

import fs from "node:fs";
import { PNG } from "pngjs";
import jpeg from "jpeg-js";
import { GifReader } from "omggif";
import { RawImage } from "./resampler.js";

/**
 * Detects image format from buffer magic numbers.
 */
export function detectFormat(buf: Buffer): "png" | "jpeg" | "gif" | "unknown" {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return "png";
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "jpeg";
  }
  if (buf.length >= 6 && buf.subarray(0, 3).toString("ascii") === "GIF") {
    return "gif";
  }
  return "unknown";
}

/**
 * Decodes a raw image buffer into an RGBA RawImage.
 */
export function decodeImage(buf: Buffer): RawImage {
  const fmt = detectFormat(buf);

  if (fmt === "png") {
    const png = PNG.sync.read(buf);
    return {
      width: png.width,
      height: png.height,
      data: png.data
    };
  }

  if (fmt === "jpeg") {
    const jpg = jpeg.decode(buf, { useTArray: true });
    return {
      width: jpg.width,
      height: jpg.height,
      data: jpg.data
    };
  }

  if (fmt === "gif") {
    const reader = new GifReader(buf);
    const width = reader.width;
    const height = reader.height;
    const data = new Uint8ClampedArray(width * height * 4);
    reader.decodeAndBlitFrameRGBA(0, data);
    return { width, height, data };
  }

  throw new Error(
    "Unsupported or unrecognizable image format. Supported formats: PNG, JPEG, GIF."
  );
}

/**
 * Reads and decodes an image from disk.
 */
export function loadImageFile(filePath: string): RawImage {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const buf = fs.readFileSync(filePath);
  return decodeImage(buf);
}

/**
 * Reads all bytes from a Readable stream (e.g. process.stdin).
 */
export async function readStream(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}
