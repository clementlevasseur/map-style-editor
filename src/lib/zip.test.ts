import { describe, expect, it } from "vitest";
import { createZip } from "./zip";

describe("createZip", () => {
  it("produces a valid zip with the given entries", async () => {
    const enc = new TextEncoder();
    const blob = createZip([
      { name: "style.json", data: enc.encode('{"version":8}') },
      { name: "sprite.png", data: new Uint8Array([1, 2, 3]) },
    ]);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    // local file header signature PK\x03\x04
    expect([bytes[0], bytes[1], bytes[2], bytes[3]]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    // end-of-central-directory signature PK\x05\x06 present
    const text = new TextDecoder("latin1").decode(bytes);
    expect(text).toContain("style.json");
    expect(text).toContain("sprite.png");
    expect(text.includes("PK\x05\x06")).toBe(true);
  });
});
