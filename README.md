# Schedule Viewer

A period-grid schedule viewer: import schedules as text reports or school
PDFs, filter by class / teacher / room, compare two schedules side by side,
with live current-lesson markers and week auto-detection.

The source is split into modular files; **the build output is a single,
self-contained `dist/index.html`** — same delivery model as the original
hand-written single file (kept in `legacy/index.html` for reference).

## Commands

```bash
bun install        # install dependencies
bun run dev        # dev server with HMR (http://localhost:5173)
bun run build      # build the single-file dist/index.html
bun run preview    # serve the built file locally
```

To use the "Online" tab locally, also run `netlify dev` — the Vite dev
server proxies `/api/*` to it (see `vite.config.js`).

## Features

- **Import**: paste/load text reports, convert local PDFs, or fetch grade
  PDFs through a Netlify function (CORS-free proxy with retries)
- **Views**: class / teacher / room filters, A|B group and week toggles,
  side-by-side schedule compare mode
- **Live indicators**: current lesson highlight, current-time line, ISO
  week auto-detection
- **Liquid Glass UI**: drifting aurora light behind translucent frosted
  panels, spring-based animations, dark and light themes
- **Plain themes**: Liquid Glass and the aurora background are separate
  toggles (Settings → Appearance) — plain black & white with or without
  the colorful background
- **Responsive**: two-column desktop layout (sticky filter sidebar +
  wide schedule area) at ≥1024px, mobile layout with bottom-sheet
  selects below that

## Structure

```
index.html            markup only (no inline CSS/JS)
src/main.js           entry: event wiring + initialization
src/constants.js      times, grid geometry, storage keys
src/state.js          shared mutable app state
src/dom.js            DOM references + setStatus helper
src/utils.js          time/week helpers, escaping
src/theme.js          dark/light theme + theme-aware color adjustment
src/selects.js        custom select widget + mobile bottom sheet
src/parse.js          report parsing, class sorting, report generation
src/storage.js        localStorage persistence (data + filters)
src/render.js         filtering + period-grid rendering
src/pdf.js            PDF → SVG → report pipeline (pdf.js, bundled)
src/css/              base / components / schedule / glass / motion /
                      desktop styles (import order = cascade order)
functions/fetch-pdf.js  Netlify function (CORS-free PDF proxy)
netlify.toml          build command (bun run build), publish dir: dist
CLAUDE.md             agent context: gotchas, conventions, verify workflow
```

## Notes

- `pdfjs-dist` and `jszip` are bundled from npm — no CDN `<script>` tags
  in the built file. The **pdf.js worker** is still loaded from the CDN
  (it cannot be inlined into a single HTML file).
- Deploying on Netlify: `netlify.toml` builds with `bun run build` and
  publishes `dist/`, with `/api/*` redirected to the function.
- Made by Chernuga.
