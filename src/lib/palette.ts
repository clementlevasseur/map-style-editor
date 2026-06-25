import type { StyleSpecification } from "maplibre-gl";
import { readRoleColor, type RoleKey } from "./quickEdit";
import { DEFAULT_PALETTE, normalizeHex, isHex, PALETTE_ROLES, type Palette } from "./color";
import { applyPaletteToLayers } from "./paletteApply";

export { DEFAULT_PALETTE, PALETTE_ROLES, derivePalette } from "./color";
export type { Palette, PaletteRole } from "./color";

/** Best-effort read of the current colors per role, falling back to defaults. */
export function readPalette(style: StyleSpecification): Palette {
  const layers = ((style as any).layers ?? []) as any[];
  const out = { ...DEFAULT_PALETTE };
  for (const role of PALETTE_ROLES) {
    const c = readRoleColor(layers, role as RoleKey);
    if (isHex(c)) out[role] = normalizeHex(c);
  }
  return out;
}

/** Apply the palette across the whole style (every colored layer). */
export function applyPalette(style: StyleSpecification, pal: Palette): { style: StyleSpecification; summary: string } {
  const next = structuredClone(style) as any;
  const total = applyPaletteToLayers(next.layers || [], pal);
  return { style: next, summary: `Palette applied to ${total} layer${total > 1 ? "s" : ""}.` };
}
