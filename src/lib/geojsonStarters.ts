// Public, key-free, CORS-enabled GeoJSON datasets offered as one-click starters.
// (Natural Earth via geojson.xyz + a MapLibre demo.) Cycleways and other local OSM
// data aren't global GeoJSON — extract those from Overpass and import via URL/file.

export interface GeoStarter {
  label: string;
  url: string;
  type: "fill" | "line" | "circle";
}

const NE = "https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0";

export const GEOJSON_STARTERS: GeoStarter[] = [
  { label: "Countries (Natural Earth)", url: `${NE}/ne_110m_admin_0_countries.geojson`, type: "fill" },
  { label: "Populated places", url: `${NE}/ne_50m_populated_places_simple.geojson`, type: "circle" },
  { label: "Rivers & lakes", url: `${NE}/ne_50m_rivers_lake_centerlines.geojson`, type: "line" },
  { label: "US states (demo)", url: "https://maplibre.org/maplibre-gl-js/docs/assets/us_states.geojson", type: "fill" },
];
