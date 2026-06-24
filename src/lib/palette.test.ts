import { describe, expect, it } from "vitest";
import { applyPalette, derivePalette, readPalette } from "./palette";

/* eslint-disable @typescript-eslint/no-explicit-any */
const style = (): any => ({
  version: 8,
  sources: {},
  layers: [
    { id: "bg", type: "background", paint: { "background-color": "#ffffff" } },
    { id: "water", type: "fill", "source-layer": "water", paint: { "fill-color": "#aaaaaa" } },
  ],
});

describe("palette", () => {
  it("applies and reads back role colors", () => {
    const pal = derivePalette("#cc3366");
    const { style: next } = applyPalette(style(), pal);
    const water = (next as any).layers.find((l: any) => l.id === "water");
    expect(water.paint["fill-color"]).toBe(pal.water);
    expect(readPalette(next).water).toBe(pal.water);
  });
});
