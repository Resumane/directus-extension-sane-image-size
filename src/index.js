import { defineHook } from "@directus/extensions-sdk";

export default defineHook(({ action }, { services, logger, env }) => {
  const { AssetsService, FilesService } = services;
  const quality = 75; // Fixed quality for AVIF
  const maxSize = env.EXTENSIONS_SANE_IMAGE_SIZE_MAXSIZE ?? 1920;
  const watermarkPath = '/directus/extensions/directus-extension-sane-image-size/watermark.png';
  const watermarkSizePercent = 20; // Watermark size as percentage of the image width
  const minWatermarkWidth = 100; // Minimum watermark width in pixels

  action("files.upload", async ({ payload, key }, context) => {
    if (payload.optimized !== true) {
      const transformation = getTransformation(payload.type, quality, maxSize);
      if (transformation !== undefined) {
        const serviceOptions = { ...context, knex: context.database };
        const assets = new AssetsService(serviceOptions);
        const files = new FilesService(serviceOptions);

        try {
          // Step 1: Convert to AVIF
          const { stream: avifStream, stat } = await assets.getAsset(key, transformation);
          
          logger.info(`Original image dimensions: ${stat.width}x${stat.height}`);

          // Get watermark dimensions
          const watermarkStat = await assets.getAssetInfo(watermarkPath);
          logger.info(`Watermark dimensions: ${watermarkStat.width}x${watermarkStat.height}`);

          // Step 2: Apply watermark
          const watermarkTransformation = getWatermarkTransformation(watermarkPath, stat.width, stat.height, watermarkSizePercent, minWatermarkWidth);
          logger.info(`Watermark transformation: ${JSON.stringify(watermarkTransformation)}`);

          const { stream: finalStream, stat: finalStat } = await assets.getAsset(key, watermarkTransformation, avifStream);

          // Update file metadata
          payload.width = finalStat.width;
          payload.height = finalStat.height;
          payload.filesize = finalStat.size;
          payload.type = 'image/avif';
          payload.filename_download = payload.filename_download.replace(/\.[^/.]+$/, ".avif");

          await files.uploadOne(
            finalStream,
            {
              ...payload,
              optimized: true,
            },
            key,
            { emitEvents: false }
          );
          logger.info(`File ${key} successfully converted to AVIF with fitted watermark`);
        } catch (error) {
          logger.error(`Error processing file ${key}: ${error.message}`);
          logger.error(`Error stack: ${error.stack}`);
        }
      }
    }
  });
});

function getTransformation(type, quality, maxSize) {
  const format = type.split("/")[1] ?? "";
  if (["jpg", "jpeg", "png", "webp"].includes(format)) {
    return {
      transformationParams: {
        format: 'avif',
        quality,
        width: maxSize,
        height: maxSize,
        fit: "inside",
        withoutEnlargement: true,
        transforms: [
          ['avif', { quality }]
        ],
      },
    };
  }
  return undefined;
}

function getWatermarkTransformation(watermarkPath, imageWidth, imageHeight, watermarkSizePercent, minWatermarkWidth) {
  let watermarkWidth = Math.round(imageWidth * (watermarkSizePercent / 100));
  
  // Ensure watermark is not smaller than minWatermarkWidth
  watermarkWidth = Math.max(watermarkWidth, minWatermarkWidth);
  
  // Ensure watermark is not larger than the image
  watermarkWidth = Math.min(watermarkWidth, imageWidth);

  return {
    transformationParams: {
      transforms: [
        ['resize', { 
          width: imageWidth, 
          height: imageHeight, 
          fit: 'contain', 
          background: { r: 0, g: 0, b: 0, alpha: 0 } 
        }],
        ['composite', [{
          input: watermarkPath,
          gravity: 'center',
          resize: {
            width: watermarkWidth,
            height: imageHeight,
            fit: 'inside'
          }
        }]],
      ],
    },
  };
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
