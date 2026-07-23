import assert from "node:assert/strict";
import test from "node:test";

import { getWatermarkOverlays } from "../src/watermarks.js";

const paths = {
  center: "/watermarks/center.svg",
  corner: "/watermarks/corner.svg",
};

test("matches the legacy 1920px watermark proportions", () => {
  const [center, corner] = getWatermarkOverlays(1920, 1440, paths);

  assert.equal(center.input, paths.center);
  assert.equal(center.gravity, "center");
  assert.equal(Math.round(1024 * center.density / 72), 726);

  assert.equal(corner.input, paths.corner);
  assert.equal(Math.round(640 * corner.density / 72), 459);
  assert.equal(corner.left, 1444);
  assert.equal(corner.top, 1137);
});

test("watermarks small images below the legacy threshold", () => {
  const [center, corner] = getWatermarkOverlays(320, 240, paths);

  assert.equal(Math.round(1024 * center.density / 72), 121);
  assert.equal(Math.round(640 * corner.density / 72), 76);
  assert.ok(corner.left >= 0);
  assert.ok(corner.top >= 0);
});

test("only skips invalid image dimensions", () => {
  assert.deepEqual(getWatermarkOverlays(0, 600, paths), []);
  assert.deepEqual(getWatermarkOverlays(800, 0, paths), []);
});

test("keeps both overlays within portrait images", () => {
  const [center, corner] = getWatermarkOverlays(1080, 1920, paths);
  const cornerWidth = Math.round(640 * corner.density / 72);
  const cornerHeight = Math.round(cornerWidth * 392 / 640);

  assert.ok(center.density > 0);
  assert.ok(corner.left >= 0);
  assert.ok(corner.top >= 0);
  assert.ok(corner.left + cornerWidth <= 1080);
  assert.ok(corner.top + cornerHeight <= 1920);
});
