import { adjustColor, type Palette } from "./color";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Comprehensive palette application: assign EVERY colored layer to a palette color
// so nothing is left behind (the role-based quick edits are intentionally narrower).

const sl = (l: any) => String(l["source-layer"] || "").toLowerCase();
const lid = (l: any) => String(l.id || "").toLowerCase();

function colorFor(l: any, pal: Palette): [string, string] | null {
  const t = l.type;
  if (t === "background") return ["background-color", pal.background];
  if (t === "symbol") return ["text-color", pal.labels];

  const water = /water|ocean|sea/.test(sl(l)) || /\b(water|ocean|sea|river|lake|waterway)\b/.test(lid(l));
  const building = /building/.test(sl(l)) || /building/.test(lid(l));
  const boundary = /boundary|admin/.test(sl(l)) || /(boundary|admin|border)/.test(lid(l));
  const road =
    /transportation|aeroway/.test(sl(l)) ||
    /(road|highway|street|rail|transit|path|bridge|tunnel|aeroway|runway|taxiway)/.test(lid(l));

  if (t === "fill" || t === "fill-extrusion") {
    const prop = t === "fill" ? "fill-color" : "fill-extrusion-color";
    if (water) return [prop, pal.water];
    if (building) return [prop, pal.buildings];
    return [prop, pal.land];
  }
  if (t === "line") {
    if (water) return ["line-color", pal.water];
    if (boundary) return ["line-color", adjustColor(pal.background, -0.4)];
    if (road) return ["line-color", /casing|outline/.test(lid(l)) ? adjustColor(pal.roads, -0.18) : pal.roads];
    return ["line-color", pal.roads];
  }
  if (t === "circle") return ["circle-color", pal.buildings];
  return null;
}

/** Recolor every applicable layer in place. Returns the number of layers changed. */
export function applyPaletteToLayers(layers: any[], pal: Palette): number {
  let n = 0;
  for (const l of layers) {
    const r = colorFor(l, pal);
    if (!r) continue;
    const [prop, color] = r;
    // Don't add text color to icon-only symbol layers.
    if (prop === "text-color" && !(l.layout?.["text-field"] || l.paint?.["text-color"])) continue;
    const paint = { ...(l.paint || {}), [prop]: color };
    // Recolor secondary colors so they don't clash (e.g. a green fill outline).
    if (l.type === "fill" && paint["fill-outline-color"] !== undefined) {
      paint["fill-outline-color"] = adjustColor(color, -0.12);
    }
    if (l.type === "circle" && paint["circle-stroke-color"] !== undefined) {
      paint["circle-stroke-color"] = adjustColor(color, -0.15);
    }
    l.paint = paint;
    n++;
  }
  return n;
}
