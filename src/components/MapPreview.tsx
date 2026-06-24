import { useEffect, useRef, useState } from "react";
import maplibregl, { type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { registerMapProtocols } from "../lib/mapProtocols";
import { hydrateMapImages } from "../lib/styleImages";

registerMapProtocols();

interface MapPreviewProps {
  /** Last valid parsed style. Applied live via setStyle({ diff: true }). */
  style: StyleSpecification | null;
}

const PLACES: { name: string; center: [number, number]; zoom: number }[] = [
  { name: "Paris", center: [2.35, 48.85], zoom: 11 },
  { name: "London", center: [-0.12, 51.5], zoom: 11 },
  { name: "New York", center: [-74.0, 40.71], zoom: 11 },
  { name: "Tokyo", center: [139.7, 35.68], zoom: 11 },
  { name: "San Francisco", center: [-122.43, 37.77], zoom: 12 },
  { name: "Alps (terrain)", center: [7.66, 45.97], zoom: 9 },
  { name: "World", center: [10, 30], zoom: 1.6 },
];

interface ViewState {
  lng: number;
  lat: number;
  zoom: number;
}

export default function MapPreview({ style }: MapPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [view, setView] = useState<ViewState>({ lng: 2.35, lat: 48.85, zoom: 11 });

  // Init map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: style ?? { version: 8, sources: {}, layers: [] },
      center: [view.lng, view.lat],
      zoom: view.zoom,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.ScaleControl(), "bottom-left");
    const update = () => {
      const c = map.getCenter();
      setView({ lng: c.lng, lat: c.lat, zoom: map.getZoom() });
    };
    map.on("move", update);
    mapRef.current = map;

    // Keep the canvas in sync with its container (panel drag, window resize…).
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply style changes live, preserving the camera.
  // Big styles (Liberty/rootka) keep loading tiles/sprite/glyphs for a while; if we
  // call setStyle() before the current style is loaded, MapLibre's diff bails. So we
  // apply immediately when loaded, otherwise defer to the next `idle` and always use
  // the LATEST style (a ref) so rapid edits during loading aren't lost.
  const latestStyle = useRef<StyleSpecification | null>(null);
  const deferred = useRef(false);
  useEffect(() => {
    latestStyle.current = style;
    const map = mapRef.current;
    if (!map || !style) return;

    const apply = () => {
      const s = latestStyle.current;
      if (!s) return;
      try {
        map.setStyle(s, { diff: true });
      } catch {
        map.setStyle(s, { diff: false });
      }
      // Re-register user images: a full style load clears runtime images, so also
      // re-add once the style settles.
      void hydrateMapImages(map, s);
      map.once("styledata", () => void hydrateMapImages(map, s));
    };

    if (map.isStyleLoaded()) {
      apply();
    } else if (!deferred.current) {
      deferred.current = true;
      map.once("idle", () => {
        deferred.current = false;
        apply();
      });
    }
  }, [style]);

  return (
    <div className="map-wrap">
      <div ref={containerRef} className="map-canvas" />
      <select
        className="select map-places"
        value=""
        title="Jump to a location"
        onChange={(e) => {
          const p = PLACES.find((x) => x.name === e.target.value);
          e.target.value = "";
          if (p) mapRef.current?.flyTo({ center: p.center, zoom: p.zoom });
        }}
      >
        <option value="">Go to…</option>
        {PLACES.map((p) => (
          <option key={p.name} value={p.name}>
            {p.name}
          </option>
        ))}
      </select>
      <div className="map-coords">
        {view.lat.toFixed(4)}, {view.lng.toFixed(4)} · z{view.zoom.toFixed(2)}
      </div>
    </div>
  );
}
