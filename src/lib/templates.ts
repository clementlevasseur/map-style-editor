import { FALLBACK_STYLE } from "./defaultStyle";

export interface StyleTemplate {
  id: string;
  label: string;
  /** Group shown as an <optgroup> in the picker. */
  group: string;
  /** Remote style fetched on selection… */
  url?: string;
  /** …or an inline style object (always available, offline). */
  inline?: object;
}

const MINIMAL_STYLE = {
  version: 8,
  name: "Minimal",
  sources: {},
  layers: [{ id: "background", type: "background", paint: { "background-color": "#f0f0f0" } }],
};

// All entries are verified live: HTTP 200, CORS `*`, and they actually render with
// NO API key. Tile sources checked too (OpenMapTiles' GitHub styles were excluded —
// they embed a restricted MapTiler demo key that fails off-origin).
export const TEMPLATES: StyleTemplate[] = [
  // OpenFreeMap — OSM vector, no key (used by routka)
  { id: "ofm-liberty", group: "OpenFreeMap", label: "Liberty", url: "https://tiles.openfreemap.org/styles/liberty" },
  { id: "ofm-bright", group: "OpenFreeMap", label: "Bright", url: "https://tiles.openfreemap.org/styles/bright" },
  { id: "ofm-positron", group: "OpenFreeMap", label: "Positron", url: "https://tiles.openfreemap.org/styles/positron" },
  { id: "ofm-dark", group: "OpenFreeMap", label: "Dark", url: "https://tiles.openfreemap.org/styles/dark" },

  // CARTO basemaps — free, no key
  { id: "carto-voyager", group: "CARTO", label: "Voyager", url: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json" },
  { id: "carto-positron", group: "CARTO", label: "Positron", url: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json" },
  { id: "carto-dark", group: "CARTO", label: "Dark Matter", url: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json" },
  { id: "carto-voyager-nl", group: "CARTO", label: "Voyager (no labels)", url: "https://basemaps.cartocdn.com/gl/voyager-nolabels-gl-style/style.json" },
  { id: "carto-positron-nl", group: "CARTO", label: "Positron (no labels)", url: "https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json" },
  { id: "carto-dark-nl", group: "CARTO", label: "Dark Matter (no labels)", url: "https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json" },

  // VersaTiles — free, no key
  { id: "vt-colorful", group: "VersaTiles", label: "Colorful", url: "https://tiles.versatiles.org/assets/styles/colorful/style.json" },
  { id: "vt-eclipse", group: "VersaTiles", label: "Eclipse", url: "https://tiles.versatiles.org/assets/styles/eclipse/style.json" },
  { id: "vt-graybeard", group: "VersaTiles", label: "Graybeard", url: "https://tiles.versatiles.org/assets/styles/graybeard/style.json" },
  { id: "vt-neutrino", group: "VersaTiles", label: "Neutrino", url: "https://tiles.versatiles.org/assets/styles/neutrino/style.json" },
  { id: "vt-shadow", group: "VersaTiles", label: "Shadow", url: "https://tiles.versatiles.org/assets/styles/shadow/style.json" },

  // MapLibre official demo (low-detail world, good for testing)
  { id: "maplibre-demo", group: "MapLibre", label: "Demo tiles (world)", url: "https://demotiles.maplibre.org/style.json" },

  // Inline starters (work offline)
  { id: "blank-vector", group: "Starters", label: "Vector starter (OFM)", inline: FALLBACK_STYLE },
  { id: "minimal", group: "Starters", label: "Minimal (solid background)", inline: MINIMAL_STYLE },
];

/** Templates grouped by provider, preserving order. */
export function templatesByGroup(): { group: string; items: StyleTemplate[] }[] {
  const groups: { group: string; items: StyleTemplate[] }[] = [];
  for (const t of TEMPLATES) {
    let g = groups.find((x) => x.group === t.group);
    if (!g) {
      g = { group: t.group, items: [] };
      groups.push(g);
    }
    g.items.push(t);
  }
  return groups;
}
