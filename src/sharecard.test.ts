import { afterEach, describe, it, expect, vi } from "vitest";
import { pngBlob, svg } from "./sharecard";
import type { ConvertResult } from "./ascii-engine";

/* svg() is documented as DOM-free, so the whole layout + escaping
   path is testable in plain node — no canvas, no jsdom.            */
function makeResult(lines: string[], colors?: number[] | null,
                    charset = "blocks", cellAspect = 1 / 0.6): ConvertResult {
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
            contrast: 0, color: colors ? "original" : "green", cellAspect }
  };
}

describe("ShareCard.svg", () => {
  it("sizes the plate from the shared layout math", () => {
    // fs 11 -> adv 6.6; artW = 10*6.6 = 66, below MIN_CONTENT (460),
    // so width = 460 + 2*PAD(32) = 524.
    // height = PAD 32 + HEAD 28 + GAP 20 + art 2*11 + GAP 18 + FOOT 14 + PAD 32
    const out = svg(makeResult(["0123456789", "0123456789"]));
    expect(out).toContain('width="524"');
    expect(out).toContain('height="166"');
    expect(out).toContain('viewBox="0 0 524 166"');
  });

  it("grows past the minimum once the art is wider", () => {
    const wide = svg(makeResult([" ".repeat(100)]));
    // artW = 100 * 6.6 = 660 -> 660 + 64 = 724
    expect(wide).toContain('width="724"');
  });

  it("stamps the conversion parameters into the header", () => {
    expect(svg(makeResult(["abcd"]))).toContain("--charset blocks --cols 4");
  });

  it("uses the canonical caption unless one is supplied", () => {
    expect(svg(makeResult(["ab"]))).toContain("made with semaphore.bobochang.cn");
    expect(svg(makeResult(["ab"], null), { caption: "hello" })).toContain(">hello<");
  });

  it("keeps narrow-card footer labels separated at the caption limit", () => {
    const caption = "private local image to ascii conversion by Semaphore 2026 ex";
    const out = svg(makeResult(Array.from({ length: 23 }, () => "#".repeat(40))), {
      caption,
      filename: "portrait.webp"
    });

    expect(out).toContain('width="524"');
    expect(out).toContain(">portrait.webp — 40×23</text>");
    expect(out).not.toContain(">" + caption + "</text>");
    expect(out).toContain(">private local image to ascii conversion by…</text>");

    // Footer text uses the renderer's fixed 6.6px mono advance. The fitted
    // caption must start at least 24px after the left label ends.
    const fileEnd = 32 + 23 * 6.6; // em dash and multiplication sign use two units
    const captionStart = 492 - 43 * 6.6;
    expect(captionStart - fileEnd).toBeGreaterThanOrEqual(24);
  });

  it("keeps a legal long caption intact when the art already makes room", () => {
    const caption = "private local image to ascii conversion by Semaphore 2026 ex";
    const out = svg(makeResult(["#".repeat(100)]), {
      caption,
      filename: "portrait.webp"
    });

    expect(out).toContain(">" + caption + "</text>");
  });

  it("escapes XML metacharacters in caption, filename and art", () => {
    const out = svg(makeResult(["<&>"]), {
      caption: "a & b <c>",
      filename: "<script>.png"
    });
    expect(out).toContain("a &amp; b &lt;c&gt;");
    expect(out).toContain("&lt;script&gt;.png");
    expect(out).toContain("&lt;&amp;&gt;");
    expect(out).not.toContain("<script>");
  });

  it("keeps leading and trailing spaces in art rows", () => {
    // ASCII art is mostly spaces — losing them would shear every row
    expect(svg(makeResult(["  ab  "]))).toContain('xml:space="preserve"');
  });

  it("emits one tspan per same-color run when the result is colored", () => {
    // 255 and 250 both quantize to 248, so cells 0-1 share a run
    const out = svg(makeResult(["abc"], [255, 0, 0, 250, 0, 0, 0, 255, 0]));
    const tspans = out.match(/<tspan /g) || [];
    expect(tspans).toHaveLength(2);
    expect(out).toContain('fill="rgb(248,0,0)"');
    expect(out).toContain('fill="rgb(0,248,0)"');
  });

  it("fits braille rows to the card cell geometry without changing other charsets", () => {
    const braille = svg(makeResult(["⣿".repeat(120)], null, "braille"));
    const detailed = svg(makeResult(["M".repeat(120)]));

    expect(braille).toContain('textLength="792" lengthAdjust="spacingAndGlyphs"');
    expect(detailed).not.toContain("textLength=");
  });

  it("keeps the card geometry stable when natural braille advance adds rows", () => {
    const rows = Array.from({ length: 80 }, () => "⣿".repeat(120));
    const out = svg(makeResult(rows, null, "braille", 1 / 0.684));

    expect(out).toContain('width="856"');
    expect(out).toContain('height="916"');
    expect(out).toContain('<g font-size="9.65"');
    expect(out).toContain('textLength="792" lengthAdjust="spacingAndGlyphs"');
  });

  it("fits a colored braille row once while preserving its runs", () => {
    const out = svg(makeResult(["⣿⣿⣿"],
      [255, 0, 0, 250, 0, 0, 0, 255, 0], "braille"));

    expect(out).toContain('textLength="19.8" lengthAdjust="spacingAndGlyphs"');
    expect(out.match(/textLength=/g)).toHaveLength(1);
    expect(out.match(/<tspan /g)).toHaveLength(2);
  });

  it("falls back to the crt palette for an unknown theme", () => {
    expect(svg(makeResult(["ab"]), { theme: "nope" })).toContain("#0C120D");
    expect(svg(makeResult(["ab"]), { theme: "paper" })).toContain("#F2EDE0");
  });

  it("produces a single balanced svg root", () => {
    const out = svg(makeResult(["ab", "cd"]));
    expect(out.startsWith("<svg ")).toBe(true);
    expect(out.endsWith("</svg>")).toBe(true);
    expect(out.match(/<svg /g)).toHaveLength(1);
  });
});

describe("ShareCard.pngBlob", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("horizontally fits braille fallback glyphs to their assigned cells", async () => {
    const ctx = {
      fillRect: vi.fn(), strokeRect: vi.fn(), fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 15 })),
      save: vi.fn(), restore: vi.fn(), translate: vi.fn(), scale: vi.fn(),
      fillStyle: "", strokeStyle: "", lineWidth: 0,
      textAlign: "left", textBaseline: "alphabetic", font: ""
    };
    const canvas = {
      width: 0, height: 0,
      getContext: vi.fn(() => ctx),
      toBlob: vi.fn((done: BlobCallback) => done(new Blob(["png"], { type: "image/png" })))
    };
    vi.stubGlobal("document", {
      fonts: { ready: Promise.resolve() },
      createElement: vi.fn(() => canvas)
    });

    await pngBlob(makeResult(["⣿⣿"], null, "braille"));

    expect(ctx.translate).toHaveBeenCalledWith(255.4, 88.8);
    expect(ctx.scale).toHaveBeenCalledWith(13.2 / 15, 1);
    expect(ctx.fillText).toHaveBeenCalledWith("⣿⣿", 0, 0);
  });
});
