// Ready-to-paste integration snippets. They reference a hosted style URL (the
// realistic production setup) — host your exported style.json and drop in its URL.

export interface Snippet {
  id: string;
  label: string;
  lang: string;
  code: (styleUrl: string) => string;
}

export const SNIPPETS: Snippet[] = [
  {
    id: "maplibre",
    label: "MapLibre GL JS",
    lang: "javascript",
    code: (u) => `import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const map = new maplibregl.Map({
  container: "map",
  style: "${u}",
  center: [2.35, 48.85],
  zoom: 11,
});`,
  },
  {
    id: "react-map-gl",
    label: "react-map-gl",
    lang: "tsx",
    code: (u) => `import Map from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

export default function MapView() {
  return (
    <Map
      initialViewState={{ longitude: 2.35, latitude: 48.85, zoom: 11 }}
      mapStyle="${u}"
      style={{ width: "100%", height: "100%" }}
    />
  );
}`,
  },
  {
    id: "react-native",
    label: "React Native",
    lang: "tsx",
    code: (u) => `import { MapView, Camera } from "@maplibre/maplibre-react-native";

export default function Map() {
  return (
    <MapView style={{ flex: 1 }} mapStyle="${u}">
      <Camera centerCoordinate={[2.35, 48.85]} zoomLevel={11} />
    </MapView>
  );
}`,
  },
];

export const STYLE_URL_PLACEHOLDER = "https://YOUR_HOST/style.json";
