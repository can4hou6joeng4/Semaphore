# Changelog

All notable changes to Semaphore are documented in this file.

## Unreleased

### Features

- Remember last-used tool charset and color in `localStorage` (URL params still win).
- Add README banner guide (`/guides/readme-banner`) with HowTo structured data.
- Add Chinese intro page (`/zh`) with hreflang alternates from the home page.

### SEO and discovery

- Add explicit Twitter title/description/image tags on every canonical page.
- Publish `sameAs` / language hints on home WebSite and WebApplication schema.
- Refresh sitemap `lastmod` dates and include new routes; tighten HTML cache headers for `/zh` and the guide.
- Compress the default social card; document growth launch and awesome-list drafts under `docs/`.

### Fixes

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
