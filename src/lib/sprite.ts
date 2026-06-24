import type { StyleSpecification } from "maplibre-gl";
import { getImages, loadImageEl } from "./styleImages";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Placed {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  pixelRatio: number;
  sdf: boolean;
  el: HTMLImageElement;
}

/**
 * Pack the style's images into a single sprite sheet (PNG) + index (JSON), the
 * canonical MapLibre mechanism. Simple shelf packing; runs entirely client-side.
 */
export async function buildSprite(
  style: StyleSpecification,
): Promise<{ png: Blob; json: string } | null> {
  const imgs = getImages(style);
  const names = Object.keys(imgs);
  if (!names.length) return null;

  const items = await Promise.all(
    names.map(async (n) => ({ name: n, meta: imgs[n], el: await loadImageEl(imgs[n].data) })),
  );
  items.sort((a, b) => b.el.height - a.el.height);

  const PAD = 2;
  const MAX_W = 1024;
  let x = 0;
  let y = 0;
  let rowH = 0;
  let sheetW = 0;
  const placed: Placed[] = [];
  for (const it of items) {
    const w = it.el.width || 1;
    const h = it.el.height || 1;
    if (x > 0 && x + w + PAD > MAX_W) {
      x = 0;
      y += rowH + PAD;
      rowH = 0;
    }
    placed.push({ name: it.name, x, y, w, h, pixelRatio: it.meta.pixelRatio || 1, sdf: !!it.meta.sdf, el: it.el });
    x += w + PAD;
    rowH = Math.max(rowH, h);
    sheetW = Math.max(sheetW, x);
  }
  const sheetH = y + rowH;

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, sheetW);
  canvas.height = Math.max(1, sheetH);
  const ctx = canvas.getContext("2d")!;
  for (const p of placed) ctx.drawImage(p.el, p.x, p.y, p.w, p.h);

  const index: Record<string, any> = {};
  for (const p of placed) {
    index[p.name] = { x: p.x, y: p.y, width: p.w, height: p.h, pixelRatio: p.pixelRatio };
    if (p.sdf) index[p.name].sdf = true;
  }

  const png: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), "image/png"));
  return { png, json: JSON.stringify(index, null, 2) };
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke later — revoking synchronously can cancel the download.
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
