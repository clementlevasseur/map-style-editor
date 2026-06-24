import maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";

let registered = false;

/**
 * Register the `pmtiles://` protocol on MapLibre so styles that reference
 * Protomaps / PMTiles archives (e.g. bikipi) render locally. Idempotent.
 */
export function registerMapProtocols(): void {
  if (registered) return;
  const protocol = new Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);
  registered = true;
}
