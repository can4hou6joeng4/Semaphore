# Changelog

All notable changes to Semaphore are documented in this file.

## Unreleased

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
- Sync `AsciiEngine.VERSION` with package `1.1.0`.
- Keep the statusbar readable on narrow viewports (metric priority + toast handling).

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
