import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const WATERMARKS = ["watermark-center", "watermark-corner"];
const watermarkDirectory = fileURLToPath(
  new URL("../assets/watermarks/", import.meta.url),
);

for (const name of WATERMARKS) {
  const pngPath = `${watermarkDirectory}${name}.png`;
  const svgPath = `${watermarkDirectory}${name}.svg`;
  const png = await readFile(pngPath);
  const { width, height } = readPngDimensions(png, pngPath);
  const encodedPng = png.toString("base64");

  const svg = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `  <image width="${width}" height="${height}" xlink:href="data:image/png;base64,${encodedPng}"/>`,
    "</svg>",
    "",
  ].join("\n");

  await writeFile(svgPath, svg, "utf8");
  console.log(`Generated ${svgPath} (${width}x${height})`);
}

function readPngDimensions(buffer, path) {
  const pngSignature = "89504e470d0a1a0a";

  if (buffer.length < 24 || buffer.subarray(0, 8).toString("hex") !== pngSignature) {
    throw new Error(`${path} is not a valid PNG file`);
  }

  if (buffer.subarray(12, 16).toString("ascii") !== "IHDR") {
    throw new Error(`${path} does not start with a PNG IHDR chunk`);
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}
