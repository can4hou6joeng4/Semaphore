# Changelog

All notable changes to Semaphore are documented in this file.

## Unreleased

### Features

- Add a destination table to `/tool` (README banner, SSH MOTD, comment header, email, avatar, photo, print → charset and column range) consolidating advice that was scattered across five pages, and three FAQ answers for intents the site did not cover: whether there is a CLI (no; jp2a, chafa and ascii-image-converter are named), whether ANSI color is exported (no; PNG keeps color), and how Semaphore differs from other converters (CSP-enforced no-upload, dithered braille, MIT source). A test now compares every `/faq` schema answer to the page text in both directions.
- Give `/tool` real prose (211 → 634 body words) and add the site's first two reference tables, each pinned to its source of truth: the six-charset comparison on the home page (step counts asserted against `CHARSETS`) and the control range/default table on `/tool` (asserted against the page's range inputs and `FACTORY_DEFAULTS`). Three cards explain the mono cell aspect ratio, the mechanism behind "looks right on the site, squashed after pasting".
- Rebuild both guides as real `<ol>` steps tied to their `HowToStep` count, publish `/guides/ssh-motd`'s four existing answers as `FAQPage` schema, add a four-question troubleshooting section to `/guides/readme-banner`, and show an actual banner there instead of a `# paste the ASCII banner here` placeholder.
- Give `/zh` real content instead of a 200-word dead end: the charset table, all ten FAQ answers in Chinese mirrored into `FAQPage` schema, and inbound links from `/tool`, `/faq` and `/usecases`.
- Generate `/llms-full.txt` at build time from `public/llms.txt` plus the readable text of every canonical page in sitemap order (`src/llms-full.ts`, pure string code shared by `vite.config.ts` and the tests). The route previously returned 404; the dev server serves it too.
- Add `speakable` (`h1` + `.lede`) to every page's `WebPage` node, and replace four metaphorical use-case blurbs with concrete charset and column recommendations in the form `ssh-motd` already used.

### SEO and discovery

- Link both guides from every charset page's "where it goes" card and from each other; `/guides/ssh-motd` had three inbound links and `/guides/readme-banner` four, against fifteen for `/tool`. Give `/tool` its own h1 ("Convert an image to ASCII art, live") instead of sharing "Image to ASCII converter" with the home page.
- Shape headings for extraction: `/faq` puts each of its ten questions in an `<h2>` inside the `<summary>` (the page had one h1 and no outline); four mechanism `<h2>`s become the question they answer ("How does image to braille art work?", "Why is nothing uploaded?", "How does the standard ramp map brightness to characters?", "What does each converter control do?"); the `$` and `Q` card prefixes are `aria-hidden`, so they no longer lead every extracted heading in `llms-full.txt` or get read out as "dollar".
- Print a visible byline on every page: the footer now reads `built by bobochang · source · MIT · updated <date>` (`作者 · 源码 · MIT 许可 · 更新于` on `/zh`). `Person` schema was on all 14 pages but the name appeared in prose only on `/privacy`, and a date only there; answer engines read the page, not the graph. The `<time>` value is tested against the page's `dateModified`, which the sitemap test already ties to `lastmod`.
- Describe the app in full on every page that declares it: `/tool` and the six charset pages carried a five-property `WebApplication` stub while the complete node (description, price, feature list, licence, screenshot) lived only on `/`. A test now diffs every declaration against the home page's. The node also gains a `disambiguatingDescription`, because "Semaphore" is a flag code, a concurrency primitive and a CI service before it is this tool.
- State `inLanguage` on every `#webpage` node (only `/zh` had it) and anchor each page's subject to a public entity with `about`/`mentions` carrying Wikipedia IRIs — ASCII art, Braille Patterns, Floyd–Steinberg dithering, Block Elements. `/` and `/faq` gain the `description` the other twelve already had.
- Point `speakable` at the first lede by XPath instead of `cssSelector: [".lede"]`, which matched every section intro (seven on the home page). Add `og:locale:alternate zh_CN` to `/` so the locale pair is declared in both directions.
- Resolve the entity graph on every page, not just the home page: 19 dangling `@id` references across 13 files are removed by inlining lean `WebSite`, `Person` and, where referenced, `WebApplication` stubs under the canonical `@id`s; `author` lands on all 14 `#webpage` nodes; every `WebPage` and `BreadcrumbList` gains an `@id`. The test that forbade a second `WebApplication` on `/tool` was inverted (identical `@id` is the merge instruction in JSON-LD) and is replaced by three that pin the invariant directly.
- Remove two invalid `WebApplication` properties, `privacyPolicy` and `codeRepository`; the repo link moves onto a real `SoftwareSourceCode` node linked back via `targetProduct`.
- Correct the charset nav copy and `llms.txt`: `blocks` is four fills and a space, not "five solid fills"; `binary` is a space, a zero and a one.
- Cite the algorithms the site names: Floyd–Steinberg dithering, the Unicode braille block (U+2800), and Rec. 709 luma weighting, whose coefficients are asserted against the engine source so the citation cannot outlive the code.
- Name the operator on `/privacy` and link the issue tracker as the contact path. Never an email address: Email Obfuscation is on at the zone and a `mailto:` would let Cloudflare inject a script (AGENTS.md trap 16).
- Move `dateModified` and sitemap `lastmod` only on pages whose content changed (2026-09-01 to 2026-09-03), keeping `lastmod` a real per-page signal.

### Performance

- Drop `no-transform` from the 14 canonical HTML routes. Cloudflare honours it by disabling compression, so every page shipped uncompressed while `/404`, the one route without a `_headers` rule, was brotli: 178 KB → 54 KB across the routes, home page 27 KB → 7.8 KB, all on the LCP critical path.
- Delete the zone's Web Analytics (RUM) site. The first rationale for removing `no-transform` was wrong: CSP blocks the beacon from loading, but `no-transform` was what stopped the edge from injecting the `<script>` tag at all, so every visitor got a console error and `faq.html`'s "no analytics script" claim was false in the served HTML. Only deleting the RUM site stopped it; `curl` without a browser `User-Agent` and `Accept: text/html` is a false negative. The invariant (no `no-transform`, no RUM site, no `mailto:`) is AGENTS.md trap 16, pinned by tests where a source-text test can reach it.
- Step the `#charset` select up to 16px on coarse-pointer screens under 960px so iOS Safari stops zooming the viewport on focus.

### Fixes

- Localise the injected chrome on `/zh`: nav labels, the `► open tool` CTA, the statusbar's initial state and the header's aria-labels follow `<html lang>`, so the one Chinese page no longer gets an English header and statusbar. Hrefs and theme names are unchanged.
- Label the six hand-set panels on `/usecases` directly under each figure instead of in a disclaimer three screens below; a test pins note count to panel count.
- Hide the home page's decorative `{}` brace spans from assistive tech (they were announced as "left brace right brace"), and keep the leading space in `.ramp` cells so `llms-full.txt` does not misquote a charset whose darkest step is a space.
- Fix `schemaTypes()` in the SEO test helper: an array `@type` returned `[]`, silently making every type assertion on such a node vacuous.
- Remove the `.steps` CSS rule that shipped with the reference tables and was never used, and rewrite its `STYLEGUIDE.md` recipe to document the card grid the guides actually use.
- Print the full 68-character `detailed` ramp in the comparison table on `/` and `/zh`; the cell had shown 54 characters beside a "68", and the test only pinned the count. It now asserts the escaped ramp string itself. Braille is labelled `9 tones · 256 patterns` since the column is about tone.
- Say exactly what "offline" means on `/`, `/faq` and in `llms.txt`: an open tab keeps converting with the network off, a reload needs a connection (there is no service worker). `llms.txt` also stops narrowing the accepted formats to four when the tool decodes whatever the browser's `<img>` can, and `/tool` no longer describes the ramp lookup as a nearest-ink search.
- Head the four `/guides/readme-banner` answer cards with the questions their `FAQPage` schema names instead of fragments, complete the first `/guides/ssh-motd` question the same way, and add a test that compares every guide heading to its schema `Question.name`. The SSH guide now warns that `wc -L` counts bytes on macOS/BSD, and expands MOTD once.
- Cite Rec. 709 on `/charsets/binary`, the one other charset page that states the luma weighting.

### Documentation

- Correct `docs/growth-launch.md`: two of the three "mergeable" awesome-list targets are dormant repos; IndexNow, Bing verification and Wikidata are staged as single owner actions. Record the 2026-09-03 IndexNow POST (13 URLs, HTTP 200) and the `90dy/awesome-ascii#4` link fix.
- Draft the braille / Floyd–Steinberg technical article in `docs/article-braille-dithering.md`, every claim verified against `src/ascii-engine.ts`. Three image placeholders remain; publishing is the owner's call.
- Refresh `AGENTS.md` against the current tree: add `src/charset-page.ts`, `public/_redirects`, the commit-prefix convention, and the wrangler command that serves `dist/` with `_headers` applied.

### Maintenance

- Remove the unused `AsciiEngine.VERSION` export and its synchronization test; the
  value had no runtime consumer and was tree-shaken out of every build.
- Add the `.tbl` and `.guide-steps` recipes to `STYLEGUIDE.md`. `.tbl` sets `min-width: 560px`, which makes the `tabindex` on `.table-wrap` load-bearing for keyboard scrolling below ~600px; a test pins it.
- Pin two font-subset traps by test: no `U+2212 MINUS` in copy (use the ASCII hyphen), and no literal braille ramp outside engine output, since JetBrains Mono ships 0 of 256 braille glyphs.

## 1.2.0 - 2026-08-13

### Features

- Add landing pages for the five remaining charsets (`/charsets/standard`, `/detailed`, `/blocks`, `/minimal`, `/binary`), sharing one entry that reads the charset from `body[data-charset]`.
- Remember last-used tool charset and color in `localStorage` (URL params still win).
- Add README banner guide (`/guides/readme-banner`) with HowTo structured data.
- Add Chinese intro page (`/zh`) with hreflang alternates from the home page.

### SEO and discovery

- Consolidate the entity graph: `/tool` now references the site-wide `#webapp` instead of declaring a second `WebApplication`, and content pages reference `#website` by `@id` rather than repeating an anonymous copy.
- Declare the operator as a `Person` node, referenced as `publisher` and `author`.
- Derive sitemap `lastmod` per page and assert it equals that page's own `dateModified` — the previous test pinned every entry to one literal date, which made accurate dates a test failure.
- Align three `FAQPage` answers verbatim with the visible copy.
- Add `twitter:image:alt` and `max-image-preview:large` site-wide; `/guides/*` now uses `og:type=article`.
- Cross-link all six charset pages, and give every page a static link back to `/`.
- Add explicit Twitter title/description/image tags on every canonical page.
- Publish `sameAs` / language hints on home WebSite and WebApplication schema.
- Refresh sitemap `lastmod` dates and include new routes; tighten HTML cache headers for `/zh` and the guide.
- Compress the default social card; add page-specific OG previews for tool, braille, zh, and README guide.
- Document growth launch and awesome-list drafts under `docs/`.

### Performance

- Preload the hero image and start its fetch before awaiting `document.fonts.ready`, removing two serial round trips from LCP. The early promise claims its own rejection so a failed fetch is not reported to the `data-js-errors` collector.
- Reserve the injected sticky header's height in CSS and release it when `data-chrome="ready"` lands, removing a 61px layout shift.

### Fixes

- Correct the documented `detailed` ramp length from 70 to 68 in both READMEs and `llms.txt`, and derive the number from the engine in a test.
- Drop the unsupported claim that every example on `/usecases` came out of the engine; those panels are hand-drawn.
- Add a `noscript` explanation to every page.
- Align engine column clamp with the product range (40–240).
- Assert `AsciiEngine.VERSION` equals the `package.json` version in the test suite. The two were hand-synced with nothing checking them. Note the constant is currently an unused export — nothing imports it, so it is tree-shaken out of every built chunk and is not stamped onto share cards.
- Keep the statusbar readable on narrow viewports (metric priority + toast handling).

**Full changelog:** [v1.1.0...v1.2.0](https://github.com/can4hou6joeng4/Semaphore/compare/v1.1.0...v1.2.0)

## 1.1.0 - 2026-08-04

### Features

- Add a dedicated image-to-Braille guide with a one-click high-detail preset.
- Add complete Open Graph metadata, structured data, sitemap discovery, and canonical routes across the site.
- Enforce local-only conversion in production with a restrictive CSP, self-hosted fonts, and no third-party runtime requests.
- Add privacy, FAQ, use-case, and real 404 pages with consistent terminal navigation.

### Fixes

- Fix the tool thumbnail lifecycle after object URL revocation and harden canvas rendering.
- Fix radio-group semantics, disabled dither controls, dialog focus handling, contrast, and narrow-screen overflow.
- Fix stable asset caching, canonical links, structured data, social previews, and production cache headers.

### Performance

- Convert stable image assets to WebP and ship a 15 KB JetBrains Mono subset locally.
- Separate Vite's immutable bundles from stable public assets and remove unnecessary third-party connections.

### Testing

- Add 53 unit and SEO contract tests, strict type checking, pull-request CI, and verified Cloudflare Pages deployment.

### Documentation

- Rewrite the English and Chinese READMEs with a real animated demo, privacy guarantees, Braille guidance, and contributor documentation.
- Document the local-only architecture, CSP guarantees, maintenance workflow, and edge-metrics boundary.

**Full changelog:** [v1.0.1...v1.1.0](https://github.com/can4hou6joeng4/Semaphore/compare/v1.0.1...v1.1.0)
