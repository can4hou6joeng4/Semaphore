/* ============================================================
   semaphore-ascii — High-quality 2D area-averaging image resampler
   Mathematically equivalent to HTML5 Canvas high-quality downsampling.
   Zero native dependencies.
   ============================================================ */

export interface RawImage {
  width: number;
  height: number;
  data: Uint8Array | Uint8ClampedArray; // RGBA 4 bytes per pixel
}

export interface Rect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

export interface ResampleOptions {
  brightness?: number; // -100..100
  contrast?: number;   // -100..100
  invert?: boolean;
}

export interface SampledGrid {
  lum: Float32Array;      // Rec. 709 luminance values [0..255]
  rgb: Uint8ClampedArray; // Packed RGB values (len = w * h * 3)
  w: number;
  h: number;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/**
 * Resamples a sub-rectangle of an RGBA image to a target resolution (gw, gh)
 * using area-averaging (box filter), and applies contrast, brightness, and inversion.
 */
export function sampleGrid(
  img: RawImage,
  rect: Rect,
  gw: number,
  gh: number,
  opts: ResampleOptions = {}
): SampledGrid {
  const { width: sw_orig, height: sh_orig, data } = img;
  const sx = clamp(rect.sx, 0, sw_orig);
  const sy = clamp(rect.sy, 0, sh_orig);
  const sw = clamp(rect.sw, 1, sw_orig - sx);
  const sh = clamp(rect.sh, 1, sh_orig - sy);

  const n = gw * gh;
  const lum = new Float32Array(n);
  const rgb = new Uint8ClampedArray(n * 3);

  const b = (opts.brightness || 0) * 1.28;                    // -128..128
  const c255 = (opts.contrast || 0) * 2.55;                   // -255..255
  const cf = (259 * (c255 + 255)) / (255 * (259 - c255));  // contrast factor
  function adj(v: number): number {
    return clamp(cf * (v + b - 128) + 128, 0, 255);
  }

  const scaleX = sw / gw;
  const scaleY = sh / gh;

  for (let dy = 0; dy < gh; dy++) {
    const y0 = sy + dy * scaleY;
    const y1 = sy + (dy + 1) * scaleY;
    const iyMin = Math.floor(y0);
    const iyMax = Math.min(sh_orig - 1, Math.ceil(y1) - 1);

    for (let dx = 0; dx < gw; dx++) {
      const x0 = sx + dx * scaleX;
      const x1 = sx + (dx + 1) * scaleX;
      const ixMin = Math.floor(x0);
      const ixMax = Math.min(sw_orig - 1, Math.ceil(x1) - 1);

      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let totalWeight = 0;

      for (let iy = iyMin; iy <= iyMax; iy++) {
        const wy = Math.min(iy + 1, y1) - Math.max(iy, y0);
        if (wy <= 0) continue;
        const rowOffset = iy * sw_orig;

        for (let ix = ixMin; ix <= ixMax; ix++) {
          const wx = Math.min(ix + 1, x1) - Math.max(ix, x0);
          if (wx <= 0) continue;
          const weight = wx * wy;

          const pIdx = (rowOffset + ix) * 4;
          const alpha = data[pIdx + 3] / 255;
          // Alpha-blend against black background if transparent
          sumR += data[pIdx] * alpha * weight;
          sumG += data[pIdx + 1] * alpha * weight;
          sumB += data[pIdx + 2] * alpha * weight;
          totalWeight += weight;
        }
      }

      const invW = totalWeight > 0 ? 1 / totalWeight : 1;
      let r = adj(sumR * invW);
      let g = adj(sumG * invW);
      let bl = adj(sumB * invW);

      // Rec. 709 luminance formula (matches browser conversion engine)
      let L = 0.2126 * r + 0.7152 * g + 0.0722 * bl;
      if (opts.invert) {
        L = 255 - L;
        r = 255 - r;
        g = 255 - g;
        bl = 255 - bl;
      }

      const cellIdx = dy * gw + dx;
      lum[cellIdx] = L;
      rgb[cellIdx * 3] = r;
      rgb[cellIdx * 3 + 1] = g;
      rgb[cellIdx * 3 + 2] = bl;
    }
  }

  return { lum, rgb, w: gw, h: gh };
}
