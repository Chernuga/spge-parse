# CLAUDE.md

Schedule viewer for school schedules: import text reports or PDFs, view as a
period grid filtered by class/teacher/room, compare two schedules, current-
lesson markers. Liquid-glass UI with plain-theme fallbacks. Built with Bun +
Vite into a **single self-contained `dist/index.html`**.

## Commands

```bash
bun install
bun run dev        # vite dev server (:5173); /api/* proxied to :8888 (netlify dev)
bun run build      # -> dist/index.html (single file, everything inlined)
bun run preview    # serve the built file (defaults :4173, pass --port N)
```

There is **no test suite**. Verify changes by building and driving the real
app: `bun run preview --port 4180` in the background, then a Playwright
script (`chromium.launch({ channel: 'chrome' })` works — Chrome is installed)
that parses a sample report and asserts computed styles / classes. The vision
MCP tools are useful for screenshot QA. Sample report block format: see
`parseReport()` in `src/parse.js` (`Start/End/Day/Subject/Room/Class/Teacher/
Color/Type/Week/Group` key-value blocks separated by blank lines).

## Netlify

`netlify.toml` builds with `bun run build`, publishes `dist/`, functions in
`functions/` (PDF fetch proxy for the Online tab). Redirect `/api/*` ->
`/.netlify/functions/:splat`.

## Architecture

Source is modular ES JS, no framework; the original hand-written single file
is kept at `legacy/index.html` as the behavioral reference.

- `src/main.js` — entry: event wiring, init sequence (order matters —
  theme → storage → custom selects → week detection), settings accordion
- `src/state.js` — single mutable `state` object (what used to be IIFE
  closure vars). Read/write via `state.foo`, never reassign the import.
- `src/dom.js` — all `getElementById` refs + `setStatus()` helper
- `src/constants.js` — bell times, PDF grid geometry (RECT/GRID), keys
- `src/parse.js` — report parsing, class-name sorting (Cyrillic letters)
- `src/storage.js` — localStorage persistence
- `src/render.js` — filtering + period-grid rendering (row planning with
  marker rows; this logic is subtle — change carefully)
- `src/pdf.js` — PDF → SVG → report pipeline (operator-list walker)
- `src/selects.js` — custom select widget; **hidden native selects in the
  HTML are the source of truth** — populate them, then `refreshAllCustomSelects()`
- `src/theme.js` — dark/light + `adjustColorForTheme()` color clamping

CSS load order **is** the cascade (see `src/css/main.css` imports):
`base → components → schedule → glass → motion → desktop`. Later files
override equal-specificity rules; `glass.css` relies on that.

## Modes / persistence (localStorage keys)

- `theme` (`light`/`dark`), `glass` (`on`/`off`), `aurora` (`on`/`off`)
  → body classes `light-mode`, `glass-off`, `aurora-off`
- `schedule_viewer_data` (report + lessons), `schedule_viewer_filter`
  (per-type filter state)
- Glass and aurora are independent toggles; `glass-off` + `aurora-on` =
  solid panels over the drifting background.

## Non-obvious gotchas (learned the hard way)

1. **pdf.js worker must stay on the CDN** (`workerSrc` in `src/pdf.js`).
   The library itself is bundled via `import pdfjsLib from 'pdfjs-dist'`
   (default import — the package is UMD, `import * as ns` breaks it).
   Pin 3.11.174; the PDF grid geometry constants assume these PDFs.
2. **Aurora orbs paint between the canvas and body's background**
   (`z-index: -1` pseudos). `body` must stay `background: transparent` in
   glass mode or the orbs vanish. Canvas colors are set on `html`; light
   mode needs `html:has(body.light-mode)` because `--bg` resolves at
   `:root`, outside `body.light-mode`'s scope. Same pattern for
   `html:has(body.glass-off)`.
3. **`.lesson-card::before` is reserved** for the ▶ current-lesson marker.
   Card sheen/highlights use layered `background-image`, never pseudos.
4. **Current-lesson cards already run `pulse-glow`** — any entrance
   animation must comma-stack it (see `.lesson-card.current-lesson.lg-enter`
   in `motion.css`).
5. **Glass-off mode is var-driven**: `body.glass-off` redefines the
   `--glass-*` variables to opaque values plus a few explicit
   `backdrop-filter: none` overrides. New glass rules should use the vars
   (or add matching `body.glass-off` overrides) so the plain themes work.
6. **`renderVectorBg`/`extractPaths` and friends are intentionally dense**
   (operator-list interpreters). Match the compact local style there;
   don't reformat wholesale.
7. CSS parity with `legacy/index.html` can be checked by comparing the
   normalized rule multiset (old `<style>` block vs concatenated
   `src/css/*.css` except `main.css`).
8. Animations respect `prefers-reduced-motion` (CSS guard in `motion.css`,
   JS guard in the settings accordion) — keep it that way.
9. Desktop layout (≥1024px) is `desktop.css`: sticky sidebar + wide main
   column, wrappers `app-columns/sidebar/main-col` are plain blocks on
   mobile — don't reorder them in `index.html`.

## Conventions

- Commit messages end with
  `Co-Authored-By: Claude Code <noreply@anthropic.com>`; PR bodies end with
  the 🤖 Generated with Claude Code line.
- Deploy target: https://github.com/Chernuga/spge-parse (main).
  `dist/` is gitignored — Netlify builds it.
