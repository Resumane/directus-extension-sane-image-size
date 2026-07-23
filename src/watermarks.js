const CENTER_WATERMARK = {
  intrinsicWidth: 1024,
  intrinsicHeight: 172,
  widthRatio: 0.378,
};

const CORNER_WATERMARK = {
  intrinsicWidth: 640,
  intrinsicHeight: 392,
  widthRatio: 0.239,
  marginXRatio: 0.009,
  marginYRatio: 0.015,
};

export function getWatermarkOverlays(imageWidth, imageHeight, paths) {
  if (
    !Number.isFinite(imageWidth) ||
    !Number.isFinite(imageHeight) ||
    imageWidth <= 0 ||
    imageHeight <= 0
  ) {
    return [];
  }

  const centerWidth = calculateFittedWidth(
    imageWidth,
    imageHeight,
    CENTER_WATERMARK,
  );
  const marginX = Math.round(imageWidth * CORNER_WATERMARK.marginXRatio);
  const marginY = Math.round(imageHeight * CORNER_WATERMARK.marginYRatio);
  const cornerWidth = calculateFittedWidth(
    imageWidth - marginX,
    imageHeight - marginY,
    CORNER_WATERMARK,
    imageWidth,
  );
  const cornerHeight = Math.round(
    cornerWidth * CORNER_WATERMARK.intrinsicHeight / CORNER_WATERMARK.intrinsicWidth,
  );

  return [
    {
      input: paths.center,
      gravity: "center",
      density: calculateDensity(centerWidth, CENTER_WATERMARK.intrinsicWidth),
    },
    {
      input: paths.corner,
      left: Math.max(0, imageWidth - cornerWidth - marginX),
      top: Math.max(0, imageHeight - cornerHeight - marginY),
      density: calculateDensity(cornerWidth, CORNER_WATERMARK.intrinsicWidth),
    },
  ];
}

function calculateFittedWidth(
  availableWidth,
  availableHeight,
  watermark,
  referenceWidth = availableWidth,
) {
  const desiredWidth = Math.round(referenceWidth * watermark.widthRatio);
  const heightLimitedWidth = Math.floor(
    availableHeight * watermark.intrinsicWidth / watermark.intrinsicHeight,
  );

  return Math.max(1, Math.min(desiredWidth, availableWidth, heightLimitedWidth));
}

function calculateDensity(targetWidth, intrinsicWidth) {
  return Number((72 * targetWidth / intrinsicWidth).toFixed(4));
}
