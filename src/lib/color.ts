// Pure color helpers shared by the palette and quick-edit features.

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

export function isHex(c: string | undefined): c is string {
  return !!c && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c);
}

const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));

export function hexToHsl(hex: string): [number, number, number] {
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

export function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = clamp(s);
  l = clamp(l);
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

/** Adjust a hex color's lightness/saturation (deltas in 0..1). Non-hex passes through. */
export function adjustColor(hex: string, dl = 0, ds = 0): string {
  if (!isHex(hex)) return hex;
  const [h, s, l] = hexToHsl(hex);
  return hslToHex(h, clamp(s + ds), clamp(l + dl));
}

/** Normalize a (possibly #rgb) hex to #rrggbb; pass non-hex through. */
export function normalizeHex(c: string): string {
  return isHex(c) && c.length === 4 ? hslToHex(...hexToHsl(c)) : c;
}

export type Scheme = "mono" | "analogous" | "complementary";

// Per-role saturation multiplier + lightness, for light and dark variants.
const TONES: Record<"light" | "dark", Record<PaletteRole, [number, number]>> = {
  light: {
    background: [0.3, 0.96],
    land: [0.4, 0.92],
    buildings: [0.5, 0.85],
    water: [0.55, 0.78],
    roads: [0.15, 0.99],
    labels: [0.7, 0.26],
  },
  dark: {
    background: [0.25, 0.1],
    land: [0.3, 0.15],
    buildings: [0.4, 0.22],
    water: [0.55, 0.3],
    roads: [0.2, 0.42],
    labels: [0.3, 0.86],
  },
};

/** Derive a coherent map palette from one brand color (light/dark, color scheme). */
export function derivePalette(base: string, dark = false, scheme: Scheme = "mono"): Palette {
  const hex = isHex(base) ? base : "#3b6fe2";
  const [h, s0] = hexToHsl(hex);
  const s = clamp(s0, 0.12, 0.6);
  const hueFor = (role: PaletteRole): number => {
    if (scheme === "complementary" && role === "water") return h + 180;
    if (scheme === "analogous") {
      if (role === "land") return h - 22;
      if (role === "buildings") return h + 22;
      if (role === "water") return h + 32;
    }
    return h;
  };
  const tones = TONES[dark ? "dark" : "light"];
  const out = {} as Palette;
  for (const role of PALETTE_ROLES) {
    const [sm, l] = tones[role];
    out[role] = hslToHex(hueFor(role), Math.min(0.7, s * sm), l);
  }
  return out;
}
