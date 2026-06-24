import { describe, expect, it } from "vitest";
import { adjustColor, derivePalette, hexToHsl, hslToHex, normalizeHex, PALETTE_ROLES } from "./color";

describe("color", () => {
  it("round-trips hex <-> hsl", () => {
    const out = hslToHex(...hexToHsl("#3b6fe2"));
    expect(out).toMatch(/^#[0-9a-f]{6}$/);
    // within 2/255 per channel
    for (let i = 1; i < 7; i += 2) {
      expect(Math.abs(parseInt(out.slice(i, i + 2), 16) - parseInt("3b6fe2".slice(i - 1, i + 1), 16))).toBeLessThan(3);
    }
  });

  it("normalizes #rgb to #rrggbb", () => {
    expect(normalizeHex("#abc")).toBe("#aabbcc");
    expect(normalizeHex("not-a-color")).toBe("not-a-color");
  });

  it("lightens and darkens", () => {
    const [, , lLight] = hexToHsl(adjustColor("#808080", 0.2));
    const [, , lDark] = hexToHsl(adjustColor("#808080", -0.2));
    expect(lLight).toBeGreaterThan(0.6);
    expect(lDark).toBeLessThan(0.4);
  });

  it("derives a palette for every role", () => {
    const pal = derivePalette("#3b6fe2");
    for (const role of PALETTE_ROLES) expect(pal[role]).toMatch(/^#[0-9a-f]{6}$/);
    // dark background should be darker than light background
    expect(hexToHsl(derivePalette("#3b6fe2", true).background)[2]).toBeLessThan(
      hexToHsl(derivePalette("#3b6fe2", false).background)[2],
    );
  });

  it("complementary scheme shifts water hue", () => {
    const mono = derivePalette("#3b6fe2", false, "mono");
    const comp = derivePalette("#3b6fe2", false, "complementary");
    expect(comp.water).not.toBe(mono.water);
  });
});
