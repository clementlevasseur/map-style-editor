// Extract a dominant, vivid color from an image (client-side, canvas) to seed a
// brand palette. Returns a #rrggbb hex.

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Image decode failed"));
    el.src = src;
  });
}

const toHex = (n: number) => Math.round(n).toString(16).padStart(2, "0");

export async function dominantColor(dataUrl: string): Promise<string> {
  const img = await loadImg(dataUrl);
  const w = 64;
  const h = Math.max(1, Math.round((w * img.height) / img.width));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  // Bucket pixels by coarse RGB; score buckets by count * colorfulness, ignoring
  // near-transparent / near-white / near-black pixels.
  const buckets = new Map<number, { n: number; r: number; g: number; b: number; score: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 128) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const lum = (max + min) / 2;
    if (lum > 240 || lum < 18) continue;
    const colorfulness = max - min;
    const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
    const e = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0, score: 0 };
    e.n++;
    e.r += r;
    e.g += g;
    e.b += b;
    e.score += 1 + colorfulness; // weight colorful pixels
    buckets.set(key, e);
  }

  let best: { n: number; r: number; g: number; b: number; score: number } | null = null;
  for (const e of buckets.values()) if (!best || e.score > best.score) best = e;
  if (!best) return "#3b6fe2";
  return `#${toHex(best.r / best.n)}${toHex(best.g / best.n)}${toHex(best.b / best.n)}`;
}
