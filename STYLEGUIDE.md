# semaphore — page authoring contract (BINDING)

Design language: refined CRT terminal. Phosphor green on near-black, JetBrains Mono
everywhere, amber reserved for the primary "open tool" action. Sharp corners (2–3px),
hairline green borders, restrained glow. No emoji. No images except the provided
sample assets. No lorem ipsum — every string is real copy.

## Files & load order

Pages live at the repo root; `public/` is copied to the site root verbatim,
so `public/static/x` is served at `/static/x`. Vite's own content-hashed
bundles land in `/assets/` — never put stable-named files there:

```
index.html  tool.html  usecases.html  faq.html  privacy.html  404.html  zh.html
  charsets/braille.html  guides/readme-banner.html
  src/terminal.css   src/shared.ts   src/ascii-engine.ts
  public/static/sample-portrait.webp         (1100×1069 b/w portrait)
  public/static/sample-portrait-thumb.webp   (136×112 home demo thumbnail)
```

`public/_redirects` contains only evidence-backed legacy or shorthand routes.
Keep `/braille` as a permanent redirect to the canonical
`/charsets/braille`; do not add speculative aliases or a catch-all redirect.

Required `<head>` (exact, in this order):

```html
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>…page-specific keyword phrase… — Semaphore</title>
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta property="og:type" content="website">
<meta property="og:title" content="…same as <title>…">
<meta property="og:description" content="…same as description…">
<meta property="og:url" content="https://semaphore.bobochang.cn/…">
<meta property="og:image" content="https://semaphore.bobochang.cn/static/social-card.jpg">
<!-- Key routes may use social-card-tool|braille|zh|readme.jpg instead. -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="…same as <title>…">
<meta name="twitter:description" content="…same as description…">
<meta name="twitter:image" content="https://semaphore.bobochang.cn/static/social-card….jpg">
<meta property="og:site_name" content="Semaphore">
<meta property="og:locale" content="en">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="600">
<meta property="og:image:alt" content="…">
<link rel="canonical" href="https://semaphore.bobochang.cn/…">
<meta name="theme-color" content="#050a06">
<meta name="description" content="…">
<meta name="google-site-verification" content="…"> <!-- home page only -->
<link rel="preload" as="font" type="font/woff2"
      href="/fonts/jetbrains-mono-v2.304-subset.woff2" crossorigin>
<style>/* page-specific layout only — tokens from :root, no new colors/fonts */</style>
```

`404.html` is the deliberate exception: it has `robots=noindex, follow` and no
canonical or `og:url`, because the same document is served for every unknown URL.
It must remain a top-level Vite input so Cloudflare Pages returns a real 404 instead
of its default 200 response with the home page body.

No third-party requests. The font is self-hosted (`@font-face` lives in
`terminal.css`) and there is no in-page analytics, no CDN, no Google Fonts — the
deployed CSP is `connect-src 'none'`, so anything that tries would be blocked
in production but pass locally. Canonical HTML responses also ship
`Cache-Control: no-transform`, which prevents edge features from injecting a
script before CSP has to block it. Do not add one or remove that directive.

`terminal.css` is NOT linked by hand: it is imported by `src/shared.ts`, and
Vite extracts it into a hashed `/assets/*.css` link at build time.

One module script at the END of `<body>` — Vite bundles the rest:

```html
<script type="module" src="/src/main-<page>.ts"></script>
```


## Page skeleton (chrome is INJECTED — never hand-write it)

```html
<body data-page="tool" data-path="~/tool">   <!-- home|tool|usecases|faq|privacy|braille|readme-banner|zh|not-found -->
  <main class="frame">
    <section class="sec" data-screen-label="…"><h2>…</h2>…</section>
    <div class="sec" data-screen-label="…">…layout-only block…</div>
    …
    <footer class="site-foot">
      <span>© 2026 Semaphore — plain text is forever</span>
      <nav><a href="/usecases">usecases</a><a href="/faq">faq</a><a href="/privacy">privacy</a><a href="/tool">open tool</a></nav>
    </footer>
  </main>
  <!-- scripts -->
</body>
```

`shared.ts` prepends the sticky header (brand → `/`, nav usecases/faq,
amber `► open tool` CTA) and appends the vim statusbar + CRT overlays.
DO NOT create `.site-head`, `.statusbar`, `.crt-*` yourself.

Use `section` only for a thematic block with a visible heading. A heading-free
`section` needs a specific `aria-label` only when it is a useful named landmark,
such as the converter workspace. Pure layout wrappers, grids and thin CTA blocks
use `div`; do not add hidden headings just to satisfy a validator.

Subpages (usecases, faq, privacy, charset guides) open with a page-head section:

```html
<section class="sec" data-screen-label="…">
  <div class="kicker"><b>~/usecases</b> · where ascii lives</div>
  <h1 class="h2">…title…</h1>
  <p class="lede" style="margin-top:18px">…</p>
</section>
```

## Component recipes (use these verbatim)

Kicker           `<div class="kicker">[ how_it_works ]</div>` (may include `<b>` for green)
Display title    `<h1 class="display">Image to<br>ASCII<br>converter <span class="accent">{</span><span class="cursor-blink"></span><span class="accent">}</span></h1>`
Lede             `<p class="lede">… <span class="hl">highlight</span> …</p>`
Buttons          `<a class="btn btn--green btn--lg" href="/tool">Open the tool</a>`
                 `<a class="btn btn--ghost" href="/usecases">browse usecases</a>`
                 amber is reserved for the header CTA — do not use `.btn--amber` in page bodies.
Disabled command `<button class="btn btn--ghost" type="button" disabled>copy text</button>`
                 commands that cannot run against the current rendered result use the native
                 `disabled` property. Keep exports disabled while a source is decoding or a
                 conversion is pending, then enable them only after that result renders. If a
                 replacement source fails before changing the result, restore the still-valid
                 commands. Runtime code toggles the property, never a visual-only class.
Card             `<article class="card"><h3 class="card-title"><span class="p">$</span> runs locally</h3><p>…</p></article>`
                 choose the heading tag from the document outline: `h2` for a top-level
                 card under the page `h1`, `h3` for a card inside an `h2` section.
Grid             `<div class="grid-3">…cards…</div>`
Terminal window  `<figure class="term"><figcaption class="term-head"><span class="term-title"><span class="p">$</span> cat banner.txt</span><span class="term-dots">– □ ✕</span></figcaption><div class="term-body"><pre class="ascii-pre">…</pre></div></figure>`
FAQ item         `<details class="qa"><summary>…question…</summary><div class="qa-a"><p>…</p></div></details>`
Tag row          `<div class="row"><span class="tag">readme</span><span class="tag--green tag">plain text</span></div>`
Field            `<div class="field"><label class="field-label" for="x">columns <span class="val" id="xv">120</span></label><input type="range" id="x"></div>`
Custom button    `<div role="button" tabindex="0" aria-labelledby="label hint">…</div>`
                 every visible text node inside the control belongs in its accessible
                 name. Do not replace visible wording with an unrelated `aria-label`,
                 which breaks label-in-name voice navigation.
Slider           `<button role="slider" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50">…</button>`
                 follows the ARIA keyboard contract: Left/Down decrease, Right/Up
                 increase, Home selects the minimum and End selects the maximum.
                 Keep `aria-valuenow` synchronized with every pointer and key change.
                 A pointer press on either the thumb or track moves focus to the
                 slider so arrow-key adjustment continues from the selected value.
                 During the automatic intro sweep, any valid slider key also transfers
                 control to the user before changing the value; the sweep must not
                 overwrite a keyboard adjustment.
Select           `<div class="selectwrap"><select class="input" id="y">…</select></div>`
Toggle           `<button class="toggle" aria-pressed="false" id="z">invert</button>`
                 a toggle that cannot apply under the current params takes
                 `aria-disabled="true"` — never the `disabled` property, which drops the
                 control out of the tab order so a keyboard user never learns it exists.
                 The click handler must return early on it; the stored value stays put.
Segmented        `<div class="seg" role="radiogroup" aria-label="color">…<button role="radio" aria-checked="true" tabindex="0">green</button>…</div>`
                 a radiogroup's children are radios, NOT toggles: `aria-checked` (never
                 `aria-pressed`) plus a roving `tabindex` so the group is one tab stop.
                 `wireRadioGroup()` / `syncRadioGroup()` in `tool.ts` do both.

Statusbar API (page JS): `Site.setState("converting…", {busy:true})`, `Site.setState("ready")`,
`Site.setRight(["96×54", "charset: blocks", "12ms"])`, `Site.toast("copied ✓")`.
The visual statusbar is not one atomic live region: only the state segment and each toast
use `role="status"`. Right-side dimensions and timing remain visible without triggering
another full status announcement on every conversion.
Right-side metrics are ordered dimensions, charset, then timing. Narrow chrome drops timing
first and charset only when needed; a toast temporarily replaces metrics, and at 360px or
below it also replaces the ready-state segment. Keep the full toast text in its live region
while ensuring the shared header and statusbar never hard-clip or create horizontal scroll.
Below 480px long kickers may wrap. At 360px the visual brand wordmark yields to the
accessible brand mark, and buttons may wrap their label rather than widening the document.
Tool pages may remember last-used charset and color in `localStorage` (`semaphore-tool-prefs`);
URL query params always win on boot, and Reset clears those prefs. Never store image bytes.
While a replacement source is decoding or waiting on fonts, parameter changes may update
their controls and command line but must not queue the old source or replace the owning
`loading…` / `decoding…` state with `converting…`.
The tool reserves its default portrait metadata and thumbnail dimensions in the initial
HTML so the asynchronous boot conversion cannot reveal a new block and shift the controls.
The source preview keeps its intrinsic aspect ratio with auto width and height while fitting
the rail's 110px height cap; a generated data-URI thumbnail must never be stretched by the
rail's generic image width constraint.
On desktop the workbench has a viewport-bounded height: the labelled, focusable source rail
and output viewport own any vertical overflow. The output viewport reserves a stable
scrollbar gutter so fit sizing does not create a one-frame horizontal scrollbar when ASCII
content first becomes vertically scrollable. At `960px` and below the grid returns to
natural page flow. A failed boot sample keeps the file-info geometry reserved, replaces the
metadata with an unavailable state, and must not leave stale portrait information exposed.

Utilities: `Util.copyText(str)`, `Util.download(name, textOrBlob, mime)`,
`Util.fitPre(pre, cols, {container, max, min, sample})`, `Util.advanceRatio(sample)`.
Copy commands show success only when `Util.copyText()` resolves; handle rejection with a
specific failure toast rather than reporting a copy that did not happen.
Live fit and regular PNG exports preserve the current charset's natural glyph width. Use
`AsciiEngine.advanceSample(charset)` as the single representative cell: Braille measures
the system fallback, while covered charsets use `M`. The same measured advance must set
`convert().cellAspect`, live fit, and regular PNG canvas width; otherwise the output can
fit without clipping while still being stretched. Do not squeeze live or regular PNG glyphs.
The tool's `fit width` mode may reduce dense mobile output to 1px because the output is
exposed as one labelled image; turning fit off restores the user-controlled zoom.
Share-card footer labels keep the card geometry fixed: the file/dimensions label stays on
the left, the caption stays right-aligned, and the shared SVG/PNG layout preserves a 24px
gap by deterministically ellipsizing overflow. Never let the two footer labels overlap.
JetBrains Mono has no Braille glyphs, so share-card Braille rows must fit the system
fallback back into the renderer's fixed 0.6em cells: SVG uses `textLength` /
`lengthAdjust`, and PNG applies the equivalent horizontal canvas scaling. When Braille
row count comes from the wider fallback advance, scale the card art font and line step
together so its source aspect and fixed plate geometry remain stable. Other charsets keep
their native text path.

## Engine quick reference

```js
const img = await AsciiEngine.loadImage("/static/sample-portrait.webp");
const charset = "detailed";
const sample = AsciiEngine.advanceSample(charset);
const res = AsciiEngine.convert(img, { cols: 140, charset,
  color: "green", invert: false, brightness: 0, contrast: 0,
  cellAspect: 1 / Util.advanceRatio(sample) });    // match rendered cell shape
pre.innerHTML = AsciiEngine.toHTML(res);           // colored-safe; escaped
Util.fitPre(pre, res.cols, { container: stage,
  sample });                                       // real glyph advance fills width
const blob = await AsciiEngine.renderPNG(res, { fontSize: 12, scale: 2 });
```

Charsets: `standard  detailed  blocks  minimal  binary  braille` (braille = 2×4 dot
cells, Floyd–Steinberg dithered — the sharp one). Ramps are dark→light for dark bg;
`invert` flips. `color`: `"green"` (plain text, phosphor) | `"gray"` | `"original"`.

## Copy voice

- Product name everywhere in chrome and copy: "Semaphore"; in terminal contexts the
  lowercase `semaphore` is the command name. "image to ascii" may appear as a keyword
  phrase inside a `<title>`/description, never as the product name.
- English. Terminal-laconic. Sentence case for headings, lowercase for kickers/labels
  (`[ how_it_works ]`, `~/usecases`). Prompts use `$`. It's fine to end a hero line
  with a blinking cursor.
- Core facts (do not contradict): conversion runs 100% client-side, nothing is uploaded;
  free; export = copy text / download .txt / render .png; 6 charsets incl. braille;
  color modes green/gray/original; works on png · jpg · webp · gif (first frame).

## Themes

Two themes live on `html[data-theme]`: **`crt`** (default, phosphor dark) and **`paper`**
(print/typewriter light). All tokens are overridden by `[data-theme="paper"]` in
terminal.css, so components that use tokens theme themselves for free.

- shared.ts injects the header theme toggle, persists to `localStorage("semaphore-theme")`,
  honors a `?theme=crt|paper` URL param (preview only), and exposes
  `Site.theme.get() / .set(t) / .toggle()`. On change it dispatches a window
  `themechange` CustomEvent with `{detail:{theme}}`.
- Never bake current-theme colors at load time. Export/render code must read colors
  when it runs — `getComputedStyle(document.documentElement).getPropertyValue("--green")`
  etc. — or take an explicit theme option.
- Anything overlaying the PHOTO (which stays dark in both themes) must keep a light
  foreground in paper via a scoped `[data-theme="paper"]` rule built from tokens
  (e.g. `color: var(--panel)`).
- Normal text and filled-button labels must retain at least 4.5:1 contrast in both
  themes. Validate the paper palette through `?theme=paper`; do not assume a dark-theme
  token remains readable after its light-theme override.
- In paper the CRT overlays are hidden and `--glow` collapses to a no-op shadow; do
  not add new hard-coded `text-shadow`/glow outside tokens.

## Hard rules

1. Only tokens from `terminal.css` — no new hex colors, no new fonts, radius ≤ 3px.
2. Page-local `<style>` is for layout of that page only (grids, stage sizing, hero).
3. Every interactive control keyboard-reachable; `aria-pressed`/`aria-current` kept in sync.
4. `data-screen-label` on every top-level content block (`section` or `div`). Every
   `section` contains its own visible heading or has a specific `aria-label` when it
   is intentionally exposed as a named landmark.
5. Canonical HTML: close every tag, double-quote attributes, no self-closing divs.
6. Internal links use extensionless roots — `/`, `/tool`, `/usecases`, `/faq`,
   `/charsets/braille` (+ `#anchors`
   that exist). Never link `*.html`: Cloudflare Pages 308-redirects those, costing a
   round trip and pointing internal links at a non-canonical URL. Tool preset links may
   append validated query parameters, for example `/tool?charset=braille`.
7. ASCII art embedded as literal strings must contain no `<` or `>` characters (HTML safety) — use the engine or safe glyphs.
