import type { StyleSpecification } from "maplibre-gl";
import { isHex } from "./color";
import { readRoleColor } from "./quickEdit";

/* eslint-disable @typescript-eslint/no-explicit-any */

function luminance(hex: string): number {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const ch = [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Rough check of label text color vs the map background. */
export function checkLabelContrast(style: StyleSpecification | null): { ratio: number; low: boolean } | null {
  if (!style) return null;
  const layers = ((style as any).layers ?? []) as any[];
  const bg = readRoleColor(layers, "background");
  const text = readRoleColor(layers, "labels");
  if (!isHex(bg) || !isHex(text)) return null;
  const ratio = contrastRatio(bg, text);
  return { ratio, low: ratio < 3 };
}
