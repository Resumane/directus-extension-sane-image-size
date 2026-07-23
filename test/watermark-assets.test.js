import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

for (const name of ["watermark-center", "watermark-corner"]) {
  test(`${name}.svg embeds its PNG source exactly`, async () => {
    const pngPath = fileURLToPath(
      new URL(`../assets/watermarks/${name}.png`, import.meta.url),
    );
    const svgPath = fileURLToPath(
      new URL(`../assets/watermarks/${name}.svg`, import.meta.url),
    );
    const [png, svg] = await Promise.all([
      readFile(pngPath),
      readFile(svgPath, "utf8"),
    ]);
    const embeddedPng = svg.match(/xlink:href="data:image\/png;base64,([^"]+)"/);

    assert.ok(embeddedPng, "SVG must contain an embedded PNG data URI");
    assert.deepEqual(Buffer.from(embeddedPng[1], "base64"), png);
  });
}
