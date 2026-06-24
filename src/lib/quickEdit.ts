import type { StyleSpecification } from "maplibre-gl";
import { FONTS, GLYPHS_URL, shouldSwitchGlyphs } from "./fonts";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Lightweight, rule-based "quick edit": parse a short instruction (a color/font +
// a target role) and apply it to the style. No AI — relies on the OpenMapTiles
// layer vocabulary (source-layer) so role detection is reliable for these styles.

export interface QuickEditResult {
  style?: StyleSpecification;
  summary?: string;
  error?: string;
}

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

type RoleKey = "background" | "water" | "roads" | "land" | "buildings" | "labels" | "boundaries";

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
  fill: "fill-color",
  line: "line-color",
  background: "background-color",
  circle: "circle-color",
  "fill-extrusion": "fill-extrusion-color",
};

export function runQuickEdit(style: StyleSpecification, raw: string): QuickEditResult {
  const cmd = raw.trim().toLowerCase();
  if (!cmd) return {};

  const next = structuredClone(style) as any;
  const layers: any[] = next.layers || [];
  const color = detectColor(cmd);
  const font = detectFont(cmd);
  const wantsFont = /\b(font|police|typo|typeface)\b/.test(cmd);

  // FONT — when a font is named, or the word "font" is used (and not a color command)
  if (font && (wantsFont || !color)) {
    let count = 0;
    for (const l of layers) {
      if (l.type !== "symbol") continue;
      l.layout = { ...(l.layout || {}), "text-font": [font] };
      count++;
    }
    if (!count) return { error: "No text layers to set the font on." };
    if (shouldSwitchGlyphs(next.glyphs)) next.glyphs = GLYPHS_URL;
    return { style: next, summary: `Font set to “${font}” on ${count} label layer${count > 1 ? "s" : ""}.` };
  }

  // COLOR
  if (!color) {
    return {
      error: "Didn't understand. Try: “water #0a7e8c”, “background #ffffff”, “labels #333”, “font Metropolis Bold”.",
    };
  }
  const role = detectRole(cmd) ?? "background"; // bare "color #xxx" → background

  let count = 0;
  if (role === "background") {
    for (const l of layers) {
      if (l.type !== "background") continue;
      l.paint = { ...(l.paint || {}), "background-color": color };
      count++;
    }
  } else if (role === "labels") {
    for (const l of layers) {
      if (l.type !== "symbol") continue;
      l.paint = { ...(l.paint || {}), "text-color": color };
      count++;
    }
  } else {
    const match = ROLE_MATCH[role];
    for (const l of layers) {
      if (l.type === "symbol" || !match(l)) continue;
      if (role === "roads" && /(casing|outline)/.test(lid(l))) continue; // keep road casings
      const prop = COLOR_PROP[l.type];
      if (!prop) continue;
      l.paint = { ...(l.paint || {}), [prop]: color };
      count++;
    }
  }

  if (!count) return { error: `No “${role}” layers found to recolor.` };
  return { style: next, summary: `Set ${role} color to ${color} on ${count} layer${count > 1 ? "s" : ""}.` };
}
