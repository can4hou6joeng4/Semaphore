# Semaphore Agent Guide

This file is the shared source of truth for any AI agent working on this repo
(Claude Code, Codex, etc.). `CLAUDE.md` is a symlink to this file. Put machine-specific
or personal overrides in `AGENTS.local.md` / `CLAUDE.local.md`; both are gitignored.

## Project

Semaphore is a static, client-side image-to-ASCII converter: thirteen hand-written
canonical HTML pages plus `404.html`, a TypeScript conversion engine, and a Vite build that ships to
Cloudflare Pages. There is no backend, no database, no accounts, and **no client-side
telemetry**. The privacy claim is the product, so anything that could send *user content*
(especially image bytes) off the device is a correctness bug, not a preference.

Edge HTTP request counts in the Cloudflare dashboard are fine — they are server logs of
static file hits, not a script running in the visitor's tab. Do **not** add a Cloudflare
Web Analytics (or any other) beacon: it needs `connect-src` holes and would falsify the
`connect-src 'none'` guarantee.

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
- Add a third-party request. No CDN, no font host, no error reporter, no in-page
  analytics beacon (Cloudflare Web Analytics included).
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
- `src/main-<page>.ts` — the only script a page loads. Each one is a two-to-four line
  manifest: `terminal.css`, `shared`, then the page's behavior module (`landing` + `demo`
  for the home page, `tool` for the converter). Page logic belongs in the module, not here.
- `src/terminal.css` — the single stylesheet for every page, imported by the entries
  (not linked from HTML). Vite extracts it to a hashed `/assets/*.css`.
- `src/tool-params.ts` — the boot-state contract for the converter: `FACTORY_DEFAULTS`,
  URL-query parsing with clamping, and the `localStorage` prefs. Pure, so it is the part
  of `tool.ts` that unit tests can reach.
- `src/seo.test.ts` — not a unit test. It imports the HTML pages, `_headers`, `robots.txt`,
  `sitemap.xml` and several `.ts` sources as raw text and asserts the STYLEGUIDE contract
  against them. It is the enforcement arm of `STYLEGUIDE.md` and will fail on markup and
  copy changes as readily as on logic ones — read the failing assertion before "fixing"
  either side.
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

## Adding or renaming a page

A page is not one file. Each of these is asserted somewhere, so skipping one shows up as
a test failure or a silently unshipped page rather than a visible mistake:

1. `<page>.html` at the repo root (or one level down, like `charsets/braille.html`), with
   the exact `<head>` from `STYLEGUIDE.md` and `<body data-page="…" data-path="…">`.
2. A `rollupOptions.input` entry in `vite.config.ts` — **without it the page is simply
   not built**, and nothing else fails.
3. `src/main-<page>.ts`, loaded as the single module script at the end of `<body>`.
4. A no-transform `Cache-Control` rule in `public/_headers`, keeping the prefix disjoint
   from `/assets/*`, `/fonts/*` and `/static/*` (see Traps 1 and 2).
5. `public/sitemap.xml` and `public/llms.txt`.
6. The `pages` array in `src/seo.test.ts` — that array drives the whole head/canonical/
   sitemap/headers contract, so registering there is what actually enforces steps 1–5.

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
9. **Tool prefs in `localStorage` are charset + color only** (`semaphore-tool-prefs`).
   URL query params still win on boot. Reset clears storage and returns to factory
   defaults. Never store image bytes or filenames there — privacy copy depends on it.
10. **`robots.txt` is fully repo-owned now — keep Cloudflare out of it.** Managed
    robots.txt was turned off (`is_robots_txt_managed: false`) along with
    `ai_bots_protection`, because the two switches are INDEPENDENT: disabling
    enforcement alone left nine blanket `Disallow: /` rules for AI user-agents in the
    served file. The `Content-Signal` line is therefore declared in
    `public/robots.txt` and pinned by a test. Re-enabling managed robots.txt would
    prepend a second `User-agent: *` group and silently restore those Disallow rules.
11. **Most of the suite asserts on source *text*, not behavior.** `seo.test.ts` pulls
    HTML, `_headers`, `sitemap.xml`, the READMEs and several `.ts` files in via `?raw`
    and matches patterns against them. Renaming a variable or rewording a sentence can
    turn a test red without any behavior changing — and that is the intent, since it is
    how the STYLEGUIDE and the privacy copy stay true. Update the assertion deliberately.
12. **`sitemap.xml` `lastmod` is derived per page and cross-checked against the page.**
    `seo.test.ts` asserts every entry carries a well-formed date that *equals the
    `dateModified` that page publishes in its own JSON-LD*, so the two sources of
    freshness cannot disagree. Changing a page's date means changing both, in the same
    commit. (An earlier form of this test pinned every entry to one literal date and
    required the count to match `pages.length` — that mandated a uniform `lastmod`,
    which is the canonical signal to a crawler that `lastmod` is unreliable.)
13. **`*.css?raw` returns an empty string under vitest** (Vite 8), so `seo.test.ts` reads
    `terminal.css` with `readFileSync` instead. A `?raw` CSS import will silently assert
    against nothing rather than fail.
14. **Test files are type-checked by `npm run build`.** `tsconfig.json` has no `exclude`
    and includes all of `src`, so a `*.test.ts` type error fails the build. Node APIs used
    from tests need a declaration in `src/node-shim.d.ts` — production sources stay
    DOM-only. (The comment in that file claiming tests are excluded is out of date.)
15. **The 64-hex `.txt` file in `public/` is the IndexNow key — do not delete it.**
    `public/88829be3…c080825.txt` looks like stray build junk and is not. IndexNow
    requires a key file whose *filename* and *contents* are the same key, served from
    the site root, as proof you control the domain; Bing, Yandex and Seznam re-verify
    it on every submission. It is the one deliberate exception to trap 1's "stable-named
    files live in `/static/` or `/fonts/`" rule, because the protocol fixes its location.
    It has no `_headers` rule of its own and falls to `/*`, which is correct. Deleting or
    renaming it silently breaks URL submission to those engines — nothing fails loudly,
    and no test covers it. Submission history is in `docs/growth-launch.md`.

## Growth / launch handoff

Post-deploy distribution (Search Console, Cloudflare AI crawl, Show HN, V2EX,
awesome-list PRs) is **not** encoded in the app. Use the full agent prompt in
[`docs/handoff-prompts.md`](docs/handoff-prompts.md); checklist copy lives in
[`docs/growth-launch.md`](docs/growth-launch.md). Never satisfy growth by adding
in-page analytics or weakening `connect-src 'none'`.

## Verification

```bash
npm install                                          # Node 22 is what CI uses
npm run dev                                          # vite dev server
npm test                                             # vitest run
npx vitest run src/tool-params.test.ts               # a single file
npx vitest run -t "publishes every canonical page"   # a single test by name
npm run typecheck                                    # tsc --noEmit on its own
npm run build                                        # tsc --noEmit + vite build to dist/
npm run preview                                      # serve the built dist/
```

Pull requests run `npm test` then `npm run build` (`.github/workflows/ci.yml`). A push to
`main` touching anything outside `**/*.md`, `docs/**`, `LICENSE` and `.github/**` runs the
same two commands and then deploys `dist/` to Cloudflare Pages. There is no staging
environment, so green CI is the only gate before production.

`convert()` and `renderPNG()` need a canvas, so they are not unit-tested. Verify anything
canvas- or CSP-dependent in a real browser. To reproduce the deployed environment locally,
serve `dist/` with the real `public/_headers` applied and check for zero CSP violations
and zero JS errors — the site records uncaught errors into `document.documentElement`'s
`data-js-errors` attribute, and sets `data-chrome="ready"` once `shared.ts` has injected
the page chrome, so both are greppable from a headless DOM dump.
