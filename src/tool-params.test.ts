import { describe, expect, it } from "vitest";
import { parseToolParams } from "./tool-params";

const defaults = {
  charset: "detailed",
  cols: 120,
  brightness: 0,
  contrast: 0,
  invert: false,
  dither: true,
  color: "green"
};

describe("parseToolParams", () => {
  it("applies a valid braille preset", () => {
    expect(parseToolParams("?charset=braille", defaults)).toEqual({
      ...defaults,
      charset: "braille"
    });
  });

  it("accepts the complete supported parameter set", () => {
    expect(parseToolParams(
      "?charset=blocks&cols=180&brightness=12&contrast=-8&invert=1&dither=false&color=original",
      defaults
    )).toEqual({
      charset: "blocks",
      cols: 180,
      brightness: 12,
      contrast: -8,
      invert: true,
      dither: false,
      color: "original"
    });
  });

  it("rejects unknown enumerations and malformed booleans", () => {
    expect(parseToolParams(
      "?charset=script&color=purple&invert=yes&dither=no",
      defaults
    )).toEqual(defaults);
  });

  it("clamps finite numeric values and ignores non-numbers", () => {
    expect(parseToolParams(
      "?cols=999&brightness=-900&contrast=nope",
      defaults
    )).toEqual({ ...defaults, cols: 240, brightness: -100 });
  });

  it("aligns columns with the range control step", () => {
    expect(parseToolParams("?cols=181", defaults).cols).toBe(182);
  });
});
