# Semaphore Agent Guide

This file is the shared source of truth for any AI agent working on this repo
(Claude Code, Codex, etc.). `CLAUDE.md` is a symlink to this file. Put machine-specific
or personal overrides in `AGENTS.local.md` / `CLAUDE.local.md`; both are gitignored.

## Project

Semaphore is a static, client-side image-to-ASCII converter: four hand-written HTML
pages, a TypeScript conversion engine, and a Vite build that ships to Cloudflare Pages.
There is no backend, no database, no accounts, and no telemetry. The privacy claim is
the product, so anything that could send bytes off the device is a correctness bug, not
a preference.

## Product Direction

Semaphore turns a picture into characters that can travel anywhere plain text goes —
terminals, code comments, READMEs, chat windows. It is not an image editor, not a
general converter, and not a place to add an account system.

### What Semaphore Should Do

- Convert locally, instantly, with live parameters — the feedback loop is the feature.
- Keep every export path plain: text to the clipboard, `.txt`, `.png`, share card.
- Stay one page-load with no runtime dependencies, so it works on a bad connection.

### What Semaphore Should Not Do

- Upload anything, anywhere, for any reason — including "just for analytics".
- Add a third-party request. No CDN, no font host, no error reporter.
- Grow a framework. Vanilla DOM and TypeScript strict is the whole stack.

## Repository Map

Only the entries whose role is not obvious from the filename:

- `STYLEGUIDE.md` — the **binding** page authoring contract: design tokens, the exact
  required `<head>`, component recipes, copy voice, hard rules. Read it before touching
  markup or CSS. When you change a pattern in code, change it there in the same commit,
  or the next author will reintroduce what you just fixed.
- `src/shared.ts` — injects the header, vim statusbar and CRT overlays into every page,
  and owns the theme. Pages must never hand-write that chrome.
- `src/ascii-engine.ts` — the conversion engine. `convert()` and `renderPNG()` need a
  real `<canvas>`; `coverRect()`, `toHTML()` and `CHARSETS` are pure.
- `src/sharecard.ts` — one layout, two renderers (SVG string and canvas PNG). `layout()`
  is the shared math; if you change one renderer without the other they drift.
- `public/_headers` — Cloudflare Pages response headers. Caching policy and the CSP.
- `public/static/` — stable-named assets (samples, share card). `public/fonts/` — the
  self-hosted font subset. Neither may move under `/assets/` (see Traps).
- `docs/images/` — README assets only, never served by the site.

## Working Rules

- `npm run build` runs `tsc --noEmit` first — a type error fails the build, by design.
- Internal links are extensionless (`/tool`, not `tool.html`). Cloudflare 308-redirects
  the `.html` form, which costs a round trip and points links at a non-canonical URL.
- Every user-visible string is real copy in English. No lorem ipsum, no emoji on the
  site itself (the README is allowed one).
- Keep the existing code voice: `function` declarations, explicit return types, comment
  blocks that explain *why* a non-obvious thing is done, not what the line does.

## Traps

Things a fresh read of the code will not reveal:

1. **`/assets/` belongs to Vite.** Vite writes content-hashed bundles there, which is
   why `/assets/*` can be cached `immutable` for a year. Stable-named files must live in
   `/static/` or `/fonts/`, or that caching rule becomes wrong. This used to collide:
   `public/assets/` and Vite's output were the same URL prefix.
2. **`_headers` path prefixes must not overlap.** When two rules match one URL,
   Cloudflare sends the header twice and which one wins is ambiguous. `/assets/*`,
   `/fonts/*` and `/static/*` are deliberately disjoint.
3. **The `.seg` selected state is styled off the ARIA attribute** —
   `terminal.css` has `.seg button[aria-checked="true"]`. Change the ARIA attribute and
   the visual selection silently disappears. The seg controls are radiogroups:
   `role="radio"` + `aria-checked` + roving `tabindex`, never `aria-pressed`.
   `wireRadioGroup()` / `syncRadioGroup()` in `tool.ts` maintain both.
4. **`fileToImage()` revokes its object URL as soon as the bitmap decodes.** Never read
   `img.src` afterwards — it points at a dead blob. `tool.ts` builds the panel thumbnail
   by drawing the decoded image into a small canvas instead.
5. **The font subset is exactly the glyphs the site uses.** If you add a new character
   to the UI, re-subset the font or it falls back to a system face mid-render. The old
   Google Fonts `latin` subset never covered `░▒▓█` or box drawing, so those silently
   fell back for months.
6. **JetBrains Mono has no braille glyphs (0/256).** Braille output always renders in a
   system fallback. This is expected — do not chase it as a bug.
7. **Production CSP is `connect-src 'none'`.** A `fetch()` you add will pass locally
   (vite dev does not apply `_headers`) and fail in production. That is the point.
8. **`Util.advanceRatio()` is measured once and cached** after `document.fonts.ready`.
   The landing page and demo re-render on `fonts.loadingdone` because a late webfont
   changes mono metrics and de-registers the before/after hero.

## Verification

```bash
npm test           # vitest — pure logic only
npm run build      # tsc --noEmit + vite build
```

`convert()` and `renderPNG()` need a canvas, so they are not unit-tested. Verify anything
canvas- or CSP-dependent in a real browser. To reproduce the deployed environment locally,
serve `dist/` with the real `public/_headers` applied and check for zero CSP violations
and zero JS errors — the site records uncaught errors into `document.documentElement`'s
`data-js-errors` attribute, and sets `data-chrome="ready"` once `shared.ts` has injected
the page chrome, so both are greppable from a headless DOM dump.
