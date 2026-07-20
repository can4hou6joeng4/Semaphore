# semaphore — page authoring contract (BINDING)

Design language: refined CRT terminal. Phosphor green on near-black, JetBrains Mono
everywhere, amber reserved for the primary "open tool" action. Sharp corners (2–3px),
hairline green borders, restrained glow. No emoji. No images except the provided
sample assets. No lorem ipsum — every string is real copy.

## Files & load order

Every page is a sibling of `assets/`:

```
designs/img2ascii/
  index.html  tool.html  usecases.html  faq.html
  assets/terminal.css   assets/shared.js   assets/ascii-engine.js
  assets/sample-portrait.png   (391×344 b/w portrait)
```

Required `<head>` (exact, in this order):

```html
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>…page-specific… — Image to ASCII</title>
<meta name="description" content="…">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/terminal.css">
<style>/* page-specific layout only — tokens from :root, no new colors/fonts */</style>
```

Scripts at the END of `<body>` (defer not needed there), in this order:

```html
<script src="assets/ascii-engine.js"></script>
<script src="assets/shared.js"></script>
<script src="assets/<page>.js"></script>   <!-- only if the page needs one -->
```

## Page skeleton (chrome is INJECTED — never hand-write it)

```html
<body data-page="tool" data-path="~/tool">   <!-- home|tool|usecases|faq  +  ~/main ~/tool ~/usecases ~/faq -->
  <main class="frame">
    <section class="sec" data-screen-label="…">…</section>
    …
    <footer class="site-foot">
      <span>© 2026 image2ascii — plain text is forever</span>
      <nav><a href="usecases.html">usecases</a><a href="faq.html">faq</a><a href="tool.html">open tool</a></nav>
    </footer>
  </main>
  <!-- scripts -->
</body>
```

`shared.js` prepends the sticky header (brand → index.html, nav usecases/faq,
amber `► open tool` CTA) and appends the vim statusbar + CRT overlays.
DO NOT create `.site-head`, `.statusbar`, `.crt-*` yourself.

Subpages (usecases, faq) open with a page-head section:

```html
<section class="sec" data-screen-label="…">
  <div class="kicker"><b>~/usecases</b> · where ascii lives</div>
  <h1 class="h2">…title…</h1>
  <p class="lede" style="margin-top:18px">…</p>
</section>
```

## Component recipes (use these verbatim)

Kicker           `<div class="kicker">[ how_it_works ]</div>` (may include `<b>` for green)
Display title    `<h1 class="display">Turn any image<br>to ASCII <span class="accent">{</span><span class="cursor-blink"></span><span class="accent">}</span></h1>`
Lede             `<p class="lede">… <span class="hl">highlight</span> …</p>`
Buttons          `<a class="btn btn--green btn--lg" href="tool.html">Open the tool</a>`
                 `<a class="btn btn--ghost" href="usecases.html">browse usecases</a>`
                 amber is reserved for the header CTA — do not use `.btn--amber` in page bodies.
Card             `<article class="card"><h3 class="card-title"><span class="p">$</span> runs locally</h3><p>…</p></article>`
Grid             `<div class="grid-3">…cards…</div>`
Terminal window  `<figure class="term"><figcaption class="term-head"><span class="term-title"><span class="p">$</span> cat banner.txt</span><span class="term-dots">– □ ✕</span></figcaption><div class="term-body"><pre class="ascii-pre">…</pre></div></figure>`
FAQ item         `<details class="qa"><summary>…question…</summary><div class="qa-a"><p>…</p></div></details>`
Tag row          `<div class="row"><span class="tag">readme</span><span class="tag--green tag">plain text</span></div>`
Field            `<div class="field"><label class="field-label" for="x">columns <span class="val" id="xv">120</span></label><input type="range" id="x"></div>`
Select           `<div class="selectwrap"><select class="input" id="y">…</select></div>`
Toggle           `<button class="toggle" aria-pressed="false" id="z">invert</button>`
Segmented        `<div class="seg" role="radiogroup" aria-label="color">…<button aria-pressed="true">green</button>…</div>`

Statusbar API (page JS): `Site.setState("converting…", {busy:true})`, `Site.setState("ready")`,
`Site.setRight(["96×54", "charset: blocks", "12ms"])`, `Site.toast("copied ✓")`.

Utilities: `Util.copyText(str)`, `Util.download(name, textOrBlob, mime)`,
`Util.fitPre(pre, cols, {container, max, min})`, `Util.advanceRatio()`.

## Engine quick reference

```js
const img = await AsciiEngine.loadImage("assets/sample-portrait.png");
const res = AsciiEngine.convert(img, { cols: 140, charset: "detailed",
  color: "green", invert: false, brightness: 0, contrast: 0,
  cellAspect: 1 / Util.advanceRatio() });          // match on-screen cell shape
pre.innerHTML = AsciiEngine.toHTML(res);           // colored-safe; escaped
Util.fitPre(pre, res.cols, { container: stage });  // font-size so cols fill width
const blob = await AsciiEngine.renderPNG(res, { fontSize: 12, scale: 2 });
```

Charsets: `standard  detailed  blocks  minimal  binary  braille` (braille = 2×4 dot
cells, Floyd–Steinberg dithered — the sharp one). Ramps are dark→light for dark bg;
`invert` flips. `color`: `"green"` (plain text, phosphor) | `"gray"` | `"original"`.

## Copy voice

- Product name in chrome: "Image to ASCII"; in terminal contexts: `semaphore`.
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

- shared.js injects the header theme toggle, persists to `localStorage("img2ascii-theme")`,
  honors a `?theme=crt|paper` URL param (preview only), and exposes
  `Site.theme.get() / .set(t) / .toggle()`. On change it dispatches a window
  `themechange` CustomEvent with `{detail:{theme}}`.
- Never bake current-theme colors at load time. Export/render code must read colors
  when it runs — `getComputedStyle(document.documentElement).getPropertyValue("--green")`
  etc. — or take an explicit theme option.
- Anything overlaying the PHOTO (which stays dark in both themes) must keep a light
  foreground in paper via a scoped `[data-theme="paper"]` rule built from tokens
  (e.g. `color: var(--panel)`).
- In paper the CRT overlays are hidden and `--glow` collapses to a no-op shadow; do
  not add new hard-coded `text-shadow`/glow outside tokens.

## Hard rules

1. Only tokens from `terminal.css` — no new hex colors, no new fonts, radius ≤ 3px.
2. Page-local `<style>` is for layout of that page only (grids, stage sizing, hero).
3. Every interactive control keyboard-reachable; `aria-pressed`/`aria-current` kept in sync.
4. `data-screen-label` on every top-level section.
5. Canonical HTML: close every tag, double-quote attributes, no self-closing divs.
6. Internal links only to: `index.html`, `tool.html`, `usecases.html`, `faq.html` (+ `#anchors` that exist).
7. ASCII art embedded as literal strings must contain no `<` or `>` characters (HTML safety) — use the engine or safe glyphs.
