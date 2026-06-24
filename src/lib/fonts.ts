// Curated open-source font stacks, all served (CORS-enabled, no key) by the
// OpenMapTiles glyphs server. Used to populate the text-font dropdown.
export const GLYPHS_URL = "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf";

export const FONTS: string[] = [
  "Noto Sans Regular",
  "Noto Sans Bold",
  "Noto Sans Italic",
  "Open Sans Regular",
  "Open Sans Bold",
  "Open Sans Italic",
  "Open Sans Semibold",
  "Open Sans Light",
  "Roboto Regular",
  "Roboto Medium",
  "Roboto Bold",
  "Roboto Light",
  "Roboto Condensed Regular",
  "Metropolis Regular",
  "Metropolis Medium",
  "Metropolis Bold",
  "Metropolis Light",
  "Metropolis Semi Bold",
  "Metropolis Black",
  "PT Sans Regular",
  "PT Sans Bold",
  "PT Sans Narrow Regular",
  "Lato Regular",
  "Lato Bold",
  "Source Sans Pro Regular",
];

export const FONT_PROPS = new Set(["text-font"]);

/** True when the style's glyphs server is missing or the limited OpenFreeMap one. */
export function shouldSwitchGlyphs(currentGlyphs: string | undefined): boolean {
  const g = currentGlyphs ?? "";
  return (!g || g.includes("openfreemap")) && g !== GLYPHS_URL;
}
