import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearStoredToolPrefs,
  defaultsWithStoredPrefs,
  FACTORY_DEFAULTS,
  loadStoredToolPrefs,
  parseToolParams,
  PREFS_KEY,
  saveStoredToolPrefs
} from "./tool-params";

const defaults = { ...FACTORY_DEFAULTS };

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

describe("tool prefs storage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function mockStorage(seed?: string): { store: Map<string, string> } {
    const store = new Map<string, string>();
    if (seed) store.set(PREFS_KEY, seed);
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.has(key) ? store.get(key)! : null,
      setItem: (key: string, value: string) => { store.set(key, value); },
      removeItem: (key: string) => { store.delete(key); }
    });
    return { store };
  }

  it("loads only valid charset and color prefs", () => {
    mockStorage(JSON.stringify({ charset: "braille", color: "gray", cols: 200 }));
    expect(loadStoredToolPrefs()).toEqual({ charset: "braille", color: "gray" });
  });

  it("ignores corrupt or invalid stored prefs", () => {
    mockStorage("{not-json");
    expect(loadStoredToolPrefs()).toEqual({});
    mockStorage(JSON.stringify({ charset: "nope", color: "purple" }));
    expect(loadStoredToolPrefs()).toEqual({});
  });

  it("overlays stored prefs onto factory defaults", () => {
    mockStorage(JSON.stringify({ charset: "blocks", color: "original" }));
    expect(defaultsWithStoredPrefs()).toEqual({
      ...FACTORY_DEFAULTS,
      charset: "blocks",
      color: "original"
    });
  });

  it("persists and clears charset/color only", () => {
    const { store } = mockStorage();
    saveStoredToolPrefs({ charset: "minimal", color: "gray" });
    expect(JSON.parse(store.get(PREFS_KEY)!)).toEqual({
      charset: "minimal",
      color: "gray"
    });
    clearStoredToolPrefs();
    expect(store.has(PREFS_KEY)).toBe(false);
  });
});
