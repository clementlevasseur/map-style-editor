# Map Style Editor

**▶ Live demo: https://clementlevasseur.github.io/map-style-editor/**

A lightweight web editor for **MapLibre GL** styles (spec v8) with a **live preview**.
Edit the style on the left, see the map update instantly on the right — without the
camera jumping around.

Built to iterate quickly on map styles for apps using MapLibre (web, Android, iOS),
including OpenFreeMap-based and Protomaps/PMTiles-based styles.

## Features

- **Two synced editors**, switchable via tabs, sharing a single source of truth:
  - **UI** — a form-based editor. A searchable layer list (with per-type badges and
    visibility toggles) plus property controls generated from the official MapLibre
    reference: color pickers, sliders for bounded numbers, toggles, and dropdowns.
  - **JSON** — a Monaco code editor with **autocompletion and hover docs for the whole
    style spec**, plus **full spec validation** via the official `validateStyleMin`
    (expressions and filters included), with errors underlined on the right line.
- **Live map preview** powered by `maplibre-gl`; changes are applied with a diff so the
  camera is preserved, and are safely deferred while a large style is still loading.
- **Presets** — a curated list of key-free, CORS-enabled styles (OpenFreeMap, CARTO,
  VersaTiles, MapLibre demo) plus offline starters.
- **Images & patterns** — upload PNG/SVG images used by `*-pattern` / `icon-image`.
  They render live in the preview (via `addImage`) and are stored in the style; the
  **Export** button then bundles `style.json` plus a generated `sprite.png` /
  `sprite.json` into a single zip, ready to host.
- **Fonts** — `text-font` is a dropdown of curated open-source fonts; picking one
  points the style's `glyphs` at the OpenMapTiles server (which serves them) when the
  current one can't, so labels render.
- **Load** a style from a URL, a file, or by pasting JSON; **export** the edited style
  (with images: a zip whose `style.json` references the generated sprite via a
  configurable URL).
- **PMTiles** support (`pmtiles://`) so Protomaps-based styles render.
- Work in progress is auto-saved to `localStorage`; a **Reset** button restores the
  default.

## Development

```bash
npm install
npm run dev      # http://localhost:5173
```

## Build & deploy (GitHub Pages)

```bash
npm run build    # outputs to dist/
npm run preview  # preview the production build
```

Deployment runs automatically through GitHub Actions
(`.github/workflows/deploy.yml`) on every push to `main`. Enable it under
**Settings → Pages → Source: GitHub Actions**.

> `vite.config.ts` sets `base: "/map-style-editor/"`. If the repository has a different
> name, update it (or build with `BASE_PATH=/other-name/ npm run build`), otherwise the
> assets will 404 on Pages.

## Tech stack

Vite, React, TypeScript, `maplibre-gl`, `pmtiles`, `@monaco-editor/react`, and
`@maplibre/maplibre-gl-style-spec` (schema generation + validation).

## Notes

- **CORS**: loading a style/tiles from a URL requires the server to allow cross-origin
  requests (OpenFreeMap does). For PMTiles, the host must also allow range requests.
- No API keys are required for the bundled presets — do not commit any secret.
- Monaco is loaded from a CDN by `@monaco-editor/react`'s default loader, so the app
  needs a connection (it already does, to fetch tiles). The MapLibre schema and
  validator are bundled locally.

## License

[MIT](LICENSE) © Clement Levasseur
