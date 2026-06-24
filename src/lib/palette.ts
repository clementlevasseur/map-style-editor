import type { StyleSpecification } from "maplibre-gl";
import { colorRole, readRoleColor, type RoleKey } from "./quickEdit";

export const PALETTE_ROLES = ["background", "land", "water", "roads", "buildings", "labels"] as const;
export type PaletteRole = (typeof PALETTE_ROLES)[number];
export type Palette = Record<PaletteRole, string>;

export const DEFAULT_PALETTE: Palette = {
  background: "#f8f8f6",
  land: "#eeede8",
  water: "#a8c8e0",
  roads: "#ffffff",
  buildings: "#e2ded6",
  labels: "#333333",
};

/* ---------- hex <-> hsl ---------- */
function hexToHsl(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let s = 0;
  let hue = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) hue = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
    hue *= 60;
  }
  return [hue, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function isHex(c: string | undefined): c is string {
  return !!c && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c);
}

/** Derive a tasteful monochromatic map palette from one brand color (light or dark). */
export function derivePalette(base: string, dark = false): Palette {
  const hex = isHex(base) ? base : "#3b6fe2";
  const [h, s0] = hexToHsl(hex);
  const s = Math.max(0.12, Math.min(0.6, s0));
  if (dark) {
    return {
      background: hslToHex(h, s * 0.25, 0.1),
      land: hslToHex(h, s * 0.3, 0.15),
      buildings: hslToHex(h, s * 0.4, 0.22),
      water: hslToHex(h, s * 0.55, 0.3),
      roads: hslToHex(h, s * 0.2, 0.42),
      labels: hslToHex(h, s * 0.3, 0.86),
    };
  }
  return {
    background: hslToHex(h, s * 0.3, 0.96),
    land: hslToHex(h, s * 0.4, 0.92),
    buildings: hslToHex(h, s * 0.5, 0.85),
    water: hslToHex(h, s * 0.55, 0.78),
    roads: hslToHex(h, s * 0.15, 0.99),
    labels: hslToHex(h, Math.min(0.6, s * 0.7), 0.26),
  };
}

/** Best-effort read of the current colors per role, falling back to defaults. */
export function readPalette(style: StyleSpecification): Palette {
  const layers = ((style as any).layers ?? []) as any[];
  const out = { ...DEFAULT_PALETTE };
  for (const role of PALETTE_ROLES) {
    const c = readRoleColor(layers, role as RoleKey);
    if (isHex(c)) out[role] = c.length === 4 ? hslToHex(...hexToHsl(c)) : c;
  }
  return out;
}

/** Apply every role color across the style. */
export function applyPalette(style: StyleSpecification, pal: Palette): { style: StyleSpecification; summary: string } {
  const next = structuredClone(style) as any;
  const layers: any[] = next.layers || [];
  let total = 0;
  for (const role of PALETTE_ROLES) total += colorRole(layers, role as RoleKey, pal[role]);
  return { style: next, summary: `Palette applied to ${total} layer${total > 1 ? "s" : ""}.` };
}
