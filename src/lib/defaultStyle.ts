/** A small starter style (OpenFreeMap Liberty) shown on first launch. */
export const DEFAULT_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

/**
 * Minimal inline fallback so the app always shows *something* even offline /
 * before any remote style is fetched. Uses OpenFreeMap vector tiles.
 */
export const FALLBACK_STYLE = {
  version: 8,
  name: "Blank starter",
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  sources: {
    openmaptiles: {
      type: "vector",
      url: "https://tiles.openfreemap.org/planet",
    },
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#e8e8e8" },
    },
    {
      id: "water",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "water",
      paint: { "fill-color": "#a0c8f0" },
    },
    {
      id: "roads",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      paint: { "line-color": "#ffffff", "line-width": 1.2 },
    },
  ],
} as const;
