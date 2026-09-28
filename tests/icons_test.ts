// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The phone app's store icon carries no alpha channel. App Store Connect
// refuses an app icon with one — even when every pixel is opaque — so the
// icon script writes it as plain RGB, and this pins the committed file.
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ICON = join(import.meta.dirname, "..", "native", "assets", "icon.png");

/** The chunk types in a PNG, in order, up to the first image data. */
function chunkTypes(png: Buffer): string[] {
  const types: string[] = [];
  let pos = 8;
  while (pos + 8 <= png.length) {
    const length = png.readUInt32BE(pos);
    const type = png.toString("ascii", pos + 4, pos + 8);
    types.push(type);
    if (type === "IDAT") break;
    pos += 12 + length;
  }
  return types;
}

describe("the phone app's icon", () => {
  const png = readFileSync(ICON);

  it("is a 1024 × 1024 PNG", () => {
    expect(png.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
    expect(png.readUInt32BE(16)).toBe(1024);
    expect(png.readUInt32BE(20)).toBe(1024);
  });

  it("is opaque RGB, with no alpha channel and no transparency chunk", () => {
    expect(png[25]).toBe(2); // colour type 2: truecolour, no alpha
    expect(chunkTypes(png)).not.toContain("tRNS");
  });
});
