import type { StyleSpecification } from "maplibre-gl";
import { derivePalette, type Scheme } from "./color";
import { applyPaletteToLayers } from "./paletteApply";

/* eslint-disable @typescript-eslint/no-explicit-any */
const sl = (l: any) => String(l["source-layer"] || "").toLowerCase();
const lid = (l: any) => String(l.id || "").toLowerCase();

export interface Category {
  key: string;
  label: string;
  match: (l: any) => boolean;
}

// Heuristic layer → category mapping (OpenMapTiles vocabulary).
export const CATEGORIES: Category[] = [
  { key: "water", label: "Water", match: (l) => /water|ocean|sea/.test(sl(l)) || /\b(water|ocean|sea|river|lake|waterway)\b/.test(lid(l)) },
  { key: "land", label: "Land & parks", match: (l) => /landuse|landcover|park|golf|wood|grass|sand|wetland|cemetery/.test(sl(l)) || /(landuse|landcover|park|forest|wood|grass|green)/.test(lid(l)) },
  { key: "buildings", label: "Buildings", match: (l) => /building/.test(sl(l)) || /building/.test(lid(l)) },
  { key: "roads", label: "Roads", match: (l) => l.type !== "symbol" && (/transportation|aeroway/.test(sl(l)) || /(road|highway|street|bridge|tunnel|aeroway)/.test(lid(l))) && !/(rail|transit|ferry|tram|subway)/.test(lid(l)) },
  { key: "transit", label: "Transit & rail", match: (l) => l.type !== "symbol" && /(rail|transit|ferry|tram|subway|aerialway)/.test(lid(l)) },
  { key: "poi", label: "POIs", match: (l) => /poi/.test(sl(l)) || /poi/.test(lid(l)) },
  { key: "place-labels", label: "Place labels", match: (l) => l.type === "symbol" && (/place/.test(sl(l)) || /(place|country|state|city|town|village|continent|capital|suburb)/.test(lid(l))) },
  { key: "street-labels", label: "Street labels", match: (l) => l.type === "symbol" && (/transportation_name/.test(sl(l)) || (/(road|street|highway)/.test(lid(l)) && /(name|label)/.test(lid(l)))) },
  { key: "boundaries", label: "Boundaries", match: (l) => /boundary|admin/.test(sl(l)) || /(boundary|admin|border)/.test(lid(l)) },
  { key: "terrain", label: "Terrain / hillshade", match: (l) => l.type === "hillshade" || /hillshade|contour|terrain/.test(sl(l)) || /hillshade|contour|terrain/.test(lid(l)) },
];

export function categoryStats(layers: any[], cat: Category): { total: number; visible: number } {
  let total = 0;
  let visible = 0;
  for (const l of layers) {
    if (!cat.match(l)) continue;
    total++;
    if (l.layout?.visibility !== "none") visible++;
  }
  return { total, visible };
}

function setVisibility(layers: any[], cat: Category, visible: boolean): void {
  for (const l of layers) {
    if (!cat.match(l)) continue;
    l.layout = { ...(l.layout || {}), visibility: visible ? "visible" : "none" };
  }
}

export function toggleCategory(style: StyleSpecification, key: string, visible: boolean): StyleSpecification {
  const next = structuredClone(style) as any;
  const cat = CATEGORIES.find((c) => c.key === key);
  if (cat) setVisibility(next.layers || [], cat, visible);
  return next;
}

export interface Preset {
  key: string;
  label: string;
  hidden: string[];
  base: string;
  dark: boolean;
  scheme?: Scheme;
}

export const PRESETS: Preset[] = [
  { key: "navigation", label: "Navigation", hidden: ["terrain"], base: "#5a83c0", dark: false },
  { key: "minimal", label: "Minimal", hidden: ["buildings", "roads", "transit", "poi", "place-labels", "street-labels", "boundaries", "terrain"], base: "#8aa0c0", dark: false },
  { key: "dataviz", label: "Data-viz", hidden: ["buildings", "poi", "street-labels", "transit", "terrain"], base: "#8d96a3", dark: false },
  { key: "outdoor", label: "Outdoor", hidden: ["transit", "poi", "boundaries"], base: "#6fae6f", dark: false },
  { key: "dark", label: "Dark", hidden: [], base: "#3b6fe2", dark: true },
];

export type Density = "minimal" | "balanced" | "detailed";
const DENSITY_HIDE: Record<Density, string[]> = {
  minimal: ["poi", "street-labels", "transit", "buildings"],
  balanced: ["poi", "street-labels"],
  detailed: [],
};

/** Declutter the map: hide the noisier categories; "detailed" shows everything. */
export function setDensity(style: StyleSpecification, level: Density): StyleSpecification {
  const next = structuredClone(style) as any;
  const layers = next.layers || [];
  const hide = DENSITY_HIDE[level];
  for (const cat of CATEGORIES) {
    if (hide.includes(cat.key)) setVisibility(layers, cat, false);
    else if (level === "detailed") setVisibility(layers, cat, true);
  }
  return next;
}

export function applyPreset(style: StyleSpecification, preset: Preset): StyleSpecification {
  const next = structuredClone(style) as any;
  const layers = next.layers || [];
  for (const cat of CATEGORIES) setVisibility(layers, cat, !preset.hidden.includes(cat.key));
  applyPaletteToLayers(layers, derivePalette(preset.base, preset.dark, preset.scheme ?? "mono"));
  return next;
}
