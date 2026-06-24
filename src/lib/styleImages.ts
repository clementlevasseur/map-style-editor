import type { Map as MapLibreMap, StyleSpecification } from "maplibre-gl";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Working store for user-provided images, kept in the style's `metadata` so they
// travel with the file and persist. For the live preview they are registered with
// map.addImage(); for production, export a sprite (see lib/sprite.ts) and point
// `style.sprite` at it — the spec's canonical mechanism for pattern/icon images.
export const IMAGES_KEY = "mse:images";

export interface EditorImage {
  /** PNG/JPEG/SVG data URI. */
  data: string;
  pixelRatio: number;
  /** Single-channel icon that can be recolored via icon-color / *-pattern. */
  sdf: boolean;
  width: number;
  height: number;
}

export function getImages(style: StyleSpecification | null): Record<string, EditorImage> {
  return ((style?.metadata as any)?.[IMAGES_KEY] ?? {}) as Record<string, EditorImage>;
}

export function imageNames(style: StyleSpecification | null): string[] {
  return Object.keys(getImages(style));
}

export function setImage(style: StyleSpecification, name: string, img: EditorImage): StyleSpecification {
  const next = structuredClone(style) as any;
  next.metadata = next.metadata ?? {};
  next.metadata[IMAGES_KEY] = { ...(next.metadata[IMAGES_KEY] ?? {}), [name]: img };
  return next;
}

export function removeImage(style: StyleSpecification, name: string): StyleSpecification {
  const next = structuredClone(style) as any;
  const imgs = next.metadata?.[IMAGES_KEY];
  if (imgs) delete imgs[name];
  return next;
}

/** Load a data URI into an HTMLImageElement. */
export function loadImageEl(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Image decode failed"));
    el.src = src;
  });
}

/**
 * Register all metadata images on the map (re-applied after each setStyle, which
 * clears runtime images). Idempotent: refreshes an image if it already exists.
 */
export async function hydrateMapImages(map: MapLibreMap, style: StyleSpecification | null): Promise<void> {
  const imgs = getImages(style);
  for (const [name, img] of Object.entries(imgs)) {
    try {
      const el = await loadImageEl(img.data);
      if (map.hasImage(name)) map.removeImage(name);
      map.addImage(name, el, { pixelRatio: img.pixelRatio || 1, sdf: !!img.sdf });
    } catch {
      // Skip malformed images rather than breaking the whole preview.
    }
  }
}
