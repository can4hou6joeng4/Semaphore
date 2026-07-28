# Contributing

Thanks for looking. Semaphore is small on purpose, so the bar is mostly "does it
still work with no backend and no third-party requests".

## Getting set up

```bash
npm install
npm run dev        # dev server, extensionless routes work here too
npm test           # vitest, pure logic only
npm run build      # tsc --noEmit + vite build
npm run preview    # serve the built dist/
```

## The two documents that bind

- **[STYLEGUIDE.md](STYLEGUIDE.md)** — the page authoring contract. Design tokens,
  the required `<head>`, component recipes, copy voice. Read it before touching
  markup or CSS.
- **[SECURITY.md](SECURITY.md)** — how to report a vulnerability privately.

## Hard constraints

These are what the product *is*, not preferences:

1. **Nothing is uploaded.** Conversion, rendering and export happen on the device.
   Production ships `connect-src 'none'`, so a `fetch()` will pass locally and fail
   in production. Don't add one.
2. **No third-party requests.** No CDN, no in-page analytics beacon, no webfont host.
   The font is a self-hosted subset in `public/fonts/`. Edge request counts in the
   Cloudflare dashboard are operator-side only — never open `connect-src` for a beacon.
3. **No framework.** Vanilla DOM and TypeScript strict.
4. **Internal links are extensionless** — `/tool`, not `tool.html`.

## Testing

`convert()` and `renderPNG()` need a real `<canvas>`, so unit tests cover the pure
parts: geometry, charset invariants, HTML escaping and run-merging, share-card
layout. Anything canvas-dependent should be verified in a browser and described in
the PR.

## Commits

Conventional-ish prefixes, in English or Chinese: `feat:`, `fix:`, `perf:`,
`chore:`, `docs:`. One logical change per commit.
