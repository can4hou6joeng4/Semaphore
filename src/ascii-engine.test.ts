import { afterEach, describe, it, expect, vi } from "vitest";
import { advanceSample, CHARSETS, coverRect, renderPNG, toHTML } from "./ascii-engine";
import type { ConvertResult } from "./ascii-engine";

/* Build a ConvertResult without touching a canvas — toHTML is pure
   string work, so it can be exercised in plain node.                */
function makeResult(lines: string[], colors?: number[] | null,
                    charset = "standard"): ConvertResult {
  const cols = lines[0].length;
  const rows = lines.length;
  return {
    text: lines.join("\n"),
    lines,
    colors: colors ? new Uint8ClampedArray(colors) : null,
    cols,
    rows,
    charset,
    ms: 0,
    opts: { cols, charset, invert: false, brightness: 0,
            contrast: 0, color: colors ? "original" : "green", cellAspect: 1 / 0.6 }
  };
}

describe("CHARSETS", () => {
  it("every ramp charset has a non-empty ramp running dark to light", () => {
    for (const [key, cs] of Object.entries(CHARSETS)) {
      if (cs.braille) continue;
      expect(cs.ramp, key).toBeTruthy();
      expect(cs.ramp!.length, key).toBeGreaterThan(1);
      // convert() maps luminance 0 to ramp[0], so the darkest cell must
      // be the blank one or dark areas render as ink on a dark theme
      expect(cs.ramp![0], key).toBe(" ");
    }
  });

  it("braille is the only charset without a ramp", () => {
    const noRamp = Object.entries(CHARSETS).filter(([, cs]) => !cs.ramp);
    expect(noRamp.map(([k]) => k)).toEqual(["braille"]);
    expect(CHARSETS.braille.braille).toBe(true);
  });

  it("selects the rendered glyph that represents one output cell", () => {
    expect(advanceSample("braille")).toBe("⣿");
    expect(advanceSample("detailed")).toBe("M");
    expect(advanceSample("unknown")).toBe("M");
  });
});

describe("coverRect", () => {
  it("crops the overflowing axis and keeps the box aspect (object-fit: cover)", () => {
    // 100x100 source into a 200x100 box: full width, middle half of the height
    expect(coverRect(100, 100, 200, 100)).toEqual({ sx: 0, sy: 25, sw: 100, sh: 50 });
  });

  it("crops width when the source is wider than the box", () => {
    // 200x100 into 100x100: full height, middle half of the width
    expect(coverRect(200, 100, 100, 100)).toEqual({ sx: 50, sy: 0, sw: 100, sh: 100 });
  });

  it("centers by default and honours the focal point", () => {
    expect(coverRect(200, 100, 100, 100, 0, 0).sx).toBe(0);
    expect(coverRect(200, 100, 100, 100, 1, 0).sx).toBe(100);
    expect(coverRect(200, 100, 100, 100, null, null).sx).toBe(50);
  });

  it("is a no-op crop when source and box already share an aspect", () => {
    expect(coverRect(80, 40, 160, 80)).toEqual({ sx: 0, sy: 0, sw: 80, sh: 40 });
  });
});

describe("toHTML", () => {
  it("escapes HTML metacharacters in plain (uncolored) output", () => {
    // the `detailed` ramp contains < > and &-adjacent glyphs, so this is
    // the path that keeps ramp characters from becoming markup
    expect(toHTML(makeResult(["<&>"]))).toBe("&lt;&amp;&gt;");
  });

  it("joins rows with newlines in plain output", () => {
    expect(toHTML(makeResult(["ab", "cd"]))).toBe("ab\ncd");
  });

  it("collapses runs of the same quantized color into one span", () => {
    // channels are quantized with & 0xF8, so 255 -> 248 and 250 -> 248:
    // the first two cells must land in a single span
    const html = toHTML(makeResult(["abc"], [255, 0, 0, 250, 0, 0, 0, 255, 0]));
    expect(html).toBe(
      '<span style="color:rgb(248,0,0)">ab</span>' +
      '<span style="color:rgb(0,248,0)">c</span>'
    );
  });

  it("escapes inside colored spans too", () => {
    const html = toHTML(makeResult(["<>"], [0, 0, 0, 0, 0, 0]));
    expect(html).toBe('<span style="color:rgb(0,0,0)">&lt;&gt;</span>');
  });

  it("separates colored rows with a newline and no trailing one", () => {
    const html = toHTML(makeResult(["a", "b"], [1, 1, 1, 1, 1, 1]));
    expect(html.split("\n")).toHaveLength(2);
    expect(html.endsWith("\n")).toBe(false);
  });
});

describe("renderPNG", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sizes braille exports from the fallback glyph advance", async () => {
    const ctx = {
      fillRect: vi.fn(), fillText: vi.fn(), scale: vi.fn(),
      measureText: vi.fn((text: string) => ({ width: text === "⣿" ? 8 : 6 })),
      fillStyle: "", font: "", textBaseline: "top"
    };
    const canvas = {
      width: 0, height: 0,
      getContext: vi.fn(() => ctx),
      toBlob: vi.fn((done: BlobCallback) => done(new Blob(["png"], { type: "image/png" })))
    };
    vi.stubGlobal("document", { createElement: vi.fn(() => canvas) });

    await renderPNG(makeResult(["⣿⣿"], null, "braille"), {
      fontSize: 10, scale: 2, padding: 4
    });

    expect(ctx.measureText).toHaveBeenCalledWith("⣿");
    expect(canvas.width).toBe(48);
    expect(ctx.fillText).toHaveBeenCalledWith("⣿⣿", 4, 4);
  });
});
