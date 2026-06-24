// Encode a style into a URL hash (#s=…) so it can be shared as a static link.
// Uses the native CompressionStream (gzip) + base64url. No backend, no dependency.
// Images (metadata mse:images) are stripped — they would make the URL huge.

/* eslint-disable @typescript-eslint/no-explicit-any */

async function gzip(text: string): Promise<Uint8Array> {
  const part = new TextEncoder().encode(text) as unknown as BlobPart;
  const stream = new Blob([part]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function gunzip(bytes: Uint8Array): Promise<string> {
  const stream = new Blob([bytes as unknown as BlobPart]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new TextDecoder().decode(await new Response(stream).arrayBuffer());
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Build a shareable URL for the given style text. Returns null if it can't compress. */
export async function buildShareUrl(text: string): Promise<{ url: string; strippedImages: boolean }> {
  let strippedImages = false;
  let payload = text;
  try {
    const obj = JSON.parse(text);
    if (obj?.metadata?.["mse:images"]) {
      delete obj.metadata["mse:images"];
      strippedImages = true;
    }
    payload = JSON.stringify(obj);
  } catch {
    // not valid JSON — share raw text as-is
  }
  const hash = toBase64Url(await gzip(payload));
  const url = `${location.origin}${location.pathname}#s=${hash}`;
  return { url, strippedImages };
}

/** Read a style from the current URL hash, if present. */
export async function readSharedStyle(): Promise<string | null> {
  const m = location.hash.match(/[#&]s=([^&]+)/);
  if (!m) return null;
  try {
    const text = await gunzip(fromBase64Url(m[1]));
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return null;
  }
}

export function clearShareHash(): void {
  if (location.hash) history.replaceState(null, "", location.pathname + location.search);
}
