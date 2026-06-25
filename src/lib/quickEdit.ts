import type { StyleSpecification } from "maplibre-gl";
import { FONTS, GLYPHS_URL, shouldSwitchGlyphs } from "./fonts";
import { adjustColor, derivePalette } from "./color";
import { applyPaletteToLayers } from "./paletteApply";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Lightweight, rule-based "quick edit": parse a short instruction (a color / font /
// number + a target role) and apply it to the style. No AI — relies on the
// OpenMapTiles layer vocabulary (source-layer) so role detection is reliable.

export interface QuickEditResult {
  style?: StyleSpecification;
  summary?: string;
  error?: string;
}

export type RoleKey = "background" | "water" | "roads" | "land" | "buildings" | "labels" | "boundaries";

const NAMED_COLORS: Record<string, string> = {
  white: "#ffffff", black: "#000000", grey: "#888888", gray: "#888888",
  "light grey": "#d6d9de", "light gray": "#d6d9de", "dark grey": "#3a3f47", "dark gray": "#3a3f47",
  red: "#e23b3b", green: "#3aa655", blue: "#3b6fe2", yellow: "#f2c14e",
  orange: "#e8833a", purple: "#8a5cd1", pink: "#e26ca5", brown: "#8a5a3b",
  teal: "#0a7e8c", navy: "#1f3a5f", beige: "#e8dcc0", cream: "#f4efe2",
  sand: "#dcc9a6", gold: "#d4af37", silver: "#c0c4cc",
};

function detectColor(cmd: string): string | null {
  const hex = cmd.match(/#([0-9a-f]{3}|[0-9a-f]{6})\b/i);
  if (hex) return hex[0];
  for (const name of Object.keys(NAMED_COLORS).sort((a, b) => b.length - a.length)) {
    if (cmd.includes(name)) return NAMED_COLORS[name];
  }
  return null;
}

const FAMILIES = ["Metropolis", "Open Sans", "Noto Sans", "Roboto", "Lato", "PT Sans", "Source Sans Pro"];
function detectFont(cmd: string): string | null {
  const exact = FONTS.find((f) => cmd.includes(f.toLowerCase()));
  if (exact) return exact;
  const fam = FAMILIES.find((f) => cmd.includes(f.toLowerCase()));
  if (!fam) return null;
  const weight = /\bbold\b/.test(cmd) ? "Bold"
    : /\bitalic\b/.test(cmd) ? "Italic"
    : /\blight\b/.test(cmd) ? "Light"
    : /\bmedium\b/.test(cmd) ? "Medium"
    : /\bblack\b/.test(cmd) ? "Black"
    : /\bsemi/.test(cmd) ? "Semi Bold"
    : "Regular";
  return FONTS.find((f) => f === `${fam} ${weight}`) || FONTS.find((f) => f.startsWith(fam)) || null;
}

const sl = (l: any) => String(l["source-layer"] || "").toLowerCase();
const lid = (l: any) => String(l.id || "").toLowerCase();

const ROLE_KEYWORDS: [RoleKey, RegExp][] = [
  ["water", /\b(water|eau|mer|sea|ocean|oc[eé]an|river|rivi[eè]re|lac|lake)\b/],
  ["roads", /\b(road|roads|route|routes|rue|rues|street|streets|highway|voirie|voie)\b/],
  ["buildings", /\b(building|buildings|b[aâ]timent|batiment|immeuble)\b/],
  ["land", /\b(land|terre|sol|landuse|landcover|park|parc|forest|for[eê]t|grass|herbe|green|vert|v[eé]g[eé]tation)\b/],
  ["labels", /\b(label|labels|texte|text|libell[eé])\b/],
  ["boundaries", /\b(boundary|boundaries|fronti[eè]re|border|admin)\b/],
  ["background", /\b(background|fond|map|carte)\b/],
];

function detectRole(cmd: string): RoleKey | null {
  for (const [role, re] of ROLE_KEYWORDS) if (re.test(cmd)) return role;
  return null;
}

const ROLE_MATCH: Record<"water" | "roads" | "land" | "buildings" | "boundaries", (l: any) => boolean> = {
  water: (l) => /water|ocean|sea/.test(sl(l)) || /\b(water|ocean|sea|river|lake)\b/.test(lid(l)),
  roads: (l) => /transportation/.test(sl(l)) || /(road|highway|street|rail|transit|path|bridge|tunnel)/.test(lid(l)),
  land: (l) => /(landuse|landcover|park|golf|wood|grass)/.test(sl(l)) || /(land|park|forest|wood|grass|green)/.test(lid(l)),
  buildings: (l) => /building/.test(sl(l)) || /building/.test(lid(l)),
  boundaries: (l) => /boundary|admin/.test(sl(l)) || /(boundary|admin|border)/.test(lid(l)),
};

const COLOR_PROP: Record<string, string> = {
  fill: "fill-color", line: "line-color", background: "background-color",
  circle: "circle-color", "fill-extrusion": "fill-extrusion-color",
};
const OPACITY_PROP: Record<string, string> = {
  fill: "fill-opacity", line: "line-opacity", background: "background-opacity",
  circle: "circle-opacity", symbol: "text-opacity", "fill-extrusion": "fill-extrusion-opacity",
};

/** Does this layer belong to the given role? */
export function matchLayer(role: RoleKey, l: any): boolean {
  if (role === "background") return l.type === "background";
  if (role === "labels") return l.type === "symbol";
  if (l.type === "symbol") return false;
  const m = (ROLE_MATCH as any)[role];
  return m ? m(l) : false;
}

/** Apply a color to all layers of a role (mutates `layers`). Returns the count. */
export function colorRole(layers: any[], role: RoleKey, color: string): number {
  let count = 0;
  for (const l of layers) {
    if (!matchLayer(role, l)) continue;
    if (role === "roads" && /(casing|outline)/.test(lid(l))) continue; // keep road casings
    const prop = role === "labels" ? "text-color" : COLOR_PROP[l.type];
    if (!prop) continue;
    l.paint = { ...(l.paint || {}), [prop]: color };
    count++;
  }
  return count;
}

/** Adjust (lighten/darken/saturate) the current color of a role (mutates). Returns count. */
function adjustRole(layers: any[], role: RoleKey, dl: number, ds: number): number {
  let count = 0;
  for (const l of layers) {
    if (!matchLayer(role, l)) continue;
    if (role === "roads" && /(casing|outline)/.test(lid(l))) continue;
    const prop = role === "labels" ? "text-color" : COLOR_PROP[l.type];
    const cur = prop && l.paint?.[prop];
    if (typeof cur !== "string") continue;
    l.paint = { ...(l.paint || {}), [prop]: adjustColor(cur, dl, ds) };
    count++;
  }
  return count;
}

/** Read the most representative color of a role (most frequent plain-string value). */
export function readRoleColor(layers: any[], role: RoleKey): string | undefined {
  const counts = new Map<string, number>();
  for (const l of layers) {
    if (!matchLayer(role, l)) continue;
    if (role === "roads" && /(casing|outline)/.test(lid(l))) continue;
    const prop = role === "labels" ? "text-color" : COLOR_PROP[l.type];
    const v = prop && l.paint?.[prop];
    if (typeof v === "string") counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let best: string | undefined;
  let max = 0;
  for (const [c, n] of counts) if (n > max) { max = n; best = c; }
  return best;
}

export function runQuickEdit(style: StyleSpecification, raw: string): QuickEditResult {
  const cmd = raw.trim().toLowerCase();
  if (!cmd) return {};

  const next = structuredClone(style) as any;
  const layers: any[] = next.layers || [];
  const role = detectRole(cmd);
  const numMatch = cmd.match(/(\d+(?:\.\d+)?)/);
  const num = numMatch ? parseFloat(numMatch[1]) : undefined;
  const hide = /\b(hide|masquer|masque|cache|cacher)\b/.test(cmd);
  const show = /\b(show|afficher|affiche|montrer|montre)\b/.test(cmd);

  // VISIBILITY
  if (hide || show) {
    if (!role) return { error: 'Which target? e.g. "hide buildings", "show water".' };
    let c = 0;
    for (const l of layers) if (matchLayer(role, l)) { l.layout = { ...(l.layout || {}), visibility: hide ? "none" : "visible" }; c++; }
    if (!c) return { error: `No "${role}" layers found.` };
    return { style: next, summary: `${hide ? "Hid" : "Showed"} ${c} ${role} layer${c > 1 ? "s" : ""}.` };
  }

  // OPACITY
  if (/\b(opacity|opacit[eé])\b/.test(cmd) && num !== undefined) {
    if (!role) return { error: 'Which target? e.g. "water opacity 0.5".' };
    const v = Math.max(0, Math.min(1, num));
    let c = 0;
    for (const l of layers) if (matchLayer(role, l)) { const prop = OPACITY_PROP[l.type]; if (!prop) continue; l.paint = { ...(l.paint || {}), [prop]: v }; c++; }
    if (!c) return { error: `No "${role}" layers found.` };
    return { style: next, summary: `Set ${role} opacity to ${v} on ${c} layer${c > 1 ? "s" : ""}.` };
  }

  // WIDTH (line layers)
  if (/\b(width|[eé]paisseur|thick|thin)\b/.test(cmd) && num !== undefined) {
    const r = role ?? "roads";
    let c = 0;
    for (const l of layers) if (matchLayer(r, l) && l.type === "line") { l.paint = { ...(l.paint || {}), "line-width": num }; c++; }
    if (!c) return { error: `No "${r}" line layers found.` };
    return { style: next, summary: `Set ${r} width to ${num} on ${c} layer${c > 1 ? "s" : ""}.` };
  }

  // TEXT SIZE (labels)
  if (/\b(size|taille)\b/.test(cmd) && num !== undefined) {
    let c = 0;
    for (const l of layers) if (l.type === "symbol") { l.layout = { ...(l.layout || {}), "text-size": num }; c++; }
    if (!c) return { error: "No label layers found." };
    return { style: next, summary: `Set label size to ${num} on ${c} layer${c > 1 ? "s" : ""}.` };
  }

  // THEME dark / light
  if (/\btheme\b/.test(cmd)) {
    const wantDark = /\b(dark|sombre|nuit)\b/.test(cmd);
    const wantLight = /\b(light|clair|jour)\b/.test(cmd);
    if (wantDark || wantLight) {
      const base = readRoleColor(layers, "background") || "#3b6fe2";
      const pal = derivePalette(base, wantDark);
      const c = applyPaletteToLayers(layers, pal);
      return { style: next, summary: `Applied ${wantDark ? "dark" : "light"} theme to ${c} layer${c > 1 ? "s" : ""}.` };
    }
  }

  // RELATIVE ADJUST (lighten / darken / saturate / desaturate)
  const lighten = /\b(lighten|lighter|[eé]claircir)\b/.test(cmd);
  const darken = /\b(darken|darker|assombrir)\b/.test(cmd);
  const desaturate = /\b(desaturate|d[eé]saturer|desaturer)\b/.test(cmd);
  const saturate = !desaturate && /\b(saturate|saturer)\b/.test(cmd);
  if (lighten || darken || saturate || desaturate) {
    const dl = lighten ? 0.1 : darken ? -0.1 : 0;
    const ds = saturate ? 0.15 : desaturate ? -0.15 : 0;
    const roles: RoleKey[] = role ? [role] : ["background", "land", "water", "roads", "buildings"];
    let c = 0;
    for (const r of roles) c += adjustRole(layers, r, dl, ds);
    if (!c) return { error: "No colored layers found to adjust." };
    return { style: next, summary: `Adjusted ${role ?? "map"} on ${c} layer${c > 1 ? "s" : ""}.` };
  }

  // LANGUAGE — rewrite text-field on label layers to a given name:<lang>
  if (/\b(language|lang|langue)\b/.test(cmd)) {
    const LANGS: Record<string, string> = {
      en: "en", english: "en", anglais: "en",
      fr: "fr", french: "fr", francais: "fr", "français": "fr",
      de: "de", german: "de", allemand: "de",
      es: "es", spanish: "es", espagnol: "es",
      it: "it", italian: "it", italien: "it",
      pt: "pt", ru: "ru", zh: "zh", ja: "ja", ar: "ar", nl: "nl",
      local: "", "défaut": "", default: "", natif: "",
    };
    let code: string | null = null;
    for (const k of Object.keys(LANGS).sort((a, b) => b.length - a.length)) {
      if (new RegExp(`\\b${k}\\b`).test(cmd)) { code = LANGS[k]; break; }
    }
    if (code !== null) {
      const tf = code ? ["coalesce", ["get", `name:${code}`], ["get", "name"]] : ["get", "name"];
      let c = 0;
      for (const l of layers) {
        if (l.type === "symbol" && l.layout && "text-field" in l.layout) {
          l.layout = { ...l.layout, "text-field": tf };
          c++;
        }
      }
      if (!c) return { error: "No label layers found." };
      return { style: next, summary: `Labels set to ${code || "local"} on ${c} layer${c > 1 ? "s" : ""}.` };
    }
  }

  // FONT
  const font = detectFont(cmd);
  const color = detectColor(cmd);
  const wantsFont = /\b(font|police|typo|typeface)\b/.test(cmd);
  if (font && (wantsFont || (!color && num === undefined))) {
    let c = 0;
    for (const l of layers) if (l.type === "symbol") { l.layout = { ...(l.layout || {}), "text-font": [font] }; c++; }
    if (!c) return { error: "No text layers to set the font on." };
    if (shouldSwitchGlyphs(next.glyphs)) next.glyphs = GLYPHS_URL;
    return { style: next, summary: `Font set to “${font}” on ${c} label layer${c > 1 ? "s" : ""}.` };
  }

  // COLOR
  if (!color) {
    return {
      error: 'Didn\'t understand. Try: "water #0a7e8c", "roads width 2", "hide buildings", "font Metropolis Bold".',
    };
  }
  const r = role ?? "background"; // bare "color #xxx" → background
  const c = colorRole(layers, r, color);
  if (!c) return { error: `No "${r}" layers found to recolor.` };
  return { style: next, summary: `Set ${r} color to ${color} on ${c} layer${c > 1 ? "s" : ""}.` };
}
