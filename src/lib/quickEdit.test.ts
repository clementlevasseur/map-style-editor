import { describe, expect, it } from "vitest";
import { runQuickEdit } from "./quickEdit";

/* eslint-disable @typescript-eslint/no-explicit-any */
function style(): any {
  return {
    version: 8,
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    sources: {},
    layers: [
      { id: "bg", type: "background", paint: { "background-color": "#ffffff" } },
      { id: "water", type: "fill", "source-layer": "water", paint: { "fill-color": "#aaaaaa" } },
      { id: "road", type: "line", "source-layer": "transportation", paint: { "line-color": "#000000", "line-width": 1 } },
      { id: "poi", type: "symbol", layout: { "text-font": ["Noto Sans Regular"] }, paint: { "text-color": "#111111" } },
    ],
  };
}
const layer = (s: any, id: string) => s.layers.find((l: any) => l.id === id);

describe("runQuickEdit", () => {
  it("colors a role by source-layer", () => {
    const r = runQuickEdit(style(), "water #ff0000");
    expect(layer(r.style, "water").paint["fill-color"]).toBe("#ff0000");
  });

  it("colors the background for a bare color", () => {
    const r = runQuickEdit(style(), "background #123456");
    expect(layer(r.style, "bg").paint["background-color"]).toBe("#123456");
  });

  it("sets the font and switches glyphs away from OpenFreeMap", () => {
    const r = runQuickEdit(style(), "font Roboto Bold");
    expect(layer(r.style, "poi").layout["text-font"]).toEqual(["Roboto Bold"]);
    expect((r.style as any).glyphs).toContain("openmaptiles");
  });

  it("hides a role", () => {
    const r = runQuickEdit(style(), "hide water");
    expect(layer(r.style, "water").layout.visibility).toBe("none");
  });

  it("sets line width", () => {
    const r = runQuickEdit(style(), "roads width 4");
    expect(layer(r.style, "road").paint["line-width"]).toBe(4);
  });

  it("applies a dark theme", () => {
    const r = runQuickEdit(style(), "theme dark");
    const bg = layer(r.style, "bg").paint["background-color"] as string;
    expect(parseInt(bg.slice(1, 3), 16)).toBeLessThan(80);
  });

  it("reports an error on gibberish", () => {
    expect(runQuickEdit(style(), "florp").error).toBeTruthy();
  });
});
