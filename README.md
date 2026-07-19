# img2ascii

```text
 _                 ___                  _ _
(_)_ __ ___  __ _|_  )__ _ ___ __ ___ (_) |
| | '  \/ _ \/ _` |/ // _` (_-</ _|_ _|| | |
|_|_|_|_\__, \__, /___\__,_/__/\__|__| |_|_|
        |___/|___/
$ img2ascii portrait.png --charset detailed --color green
```

Turn any image into ASCII art — free, entirely in your browser, no upload, no account.

**Live: [img2ascii.bobochang.cn](https://img2ascii.bobochang.cn)** · [img2ascii.pages.dev](https://img2ascii.pages.dev)

**Pages**

- `index.html` — landing page with a live before/after reveal hero and an auto-playing demo terminal
- `tool.html` — the converter: drop an image, tune charset / columns / brightness / contrast / color, then copy or export as `.txt` or `.png`
- `usecases.html` — what people make with it
- `faq.html` — common questions

Everything runs client-side: the image is drawn to a canvas and sampled pixel-by-pixel; nothing ever leaves the browser.

## Development

```bash
npm install
npm run dev        # dev server
npm run build      # typecheck + production build to dist/
npm run preview    # serve the built site
```

Stack: [Vite](https://vite.dev) + TypeScript, no framework. Styles live in `src/terminal.css` (terminal-green / CRT theme, design tokens documented in `STYLEGUIDE.md`).

## Architecture

- `src/ascii-engine.ts` — the conversion engine (charset ramps incl. braille dithering, luminance sampling, color modes)
- `src/sharecard.ts` — share-card SVG/PNG rendering
- `src/shared.ts` — site-wide chrome: theme toggle, error surface
- `src/landing.ts`, `src/demo.ts`, `src/tool.ts` — per-page behavior
- `src/main-*.ts` — page entries wired in each HTML file

## License

[MIT](LICENSE)
