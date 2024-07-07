import { defineHook } from "@directus/extensions-sdk";

export default defineHook(({ action }, { services, logger, env }) => {
  const { AssetsService, FilesService } = services;
  const quality = 75; // Fixed quality for AVIF
  const maxSize = env.EXTENSIONS_SANE_IMAGE_SIZE_MAXSIZE ?? 1920;
  const watermarkPath = '/directus/extensions/directus-extension-sane-image-size/watermark.png';
  const queue = [];
  let isProcessing = false;

  action("files.upload", async ({ payload, key }, context) => {
    if (payload.optimized !== true) {
      queue.push({ payload, key, context });
      if (!isProcessing) {
        processQueue();
      }
    }
  });

  async function processQueue() {
    if (queue.length === 0) {
      isProcessing = false;
      return;
    }
    isProcessing = true;
    const { payload, key, context } = queue.shift();
    
    try {
      await processImage(payload, key, context);
    } catch (error) {
      logger.error(`Error processing image: ${error.message}`);
    }
    // Process next item in queue
    processQueue();
  }

  async function processImage(payload, key, context) {
    const transformation = getTransformation(payload.type, quality, maxSize);
    if (transformation !== undefined) {
      const serviceOptions = { ...context, knex: context.database };
      const assets = new AssetsService(serviceOptions);
      const files = new FilesService(serviceOptions);
      
      try {
        // Step 1: Resize and convert to AVIF
        const { stream: resizedStream, stat } = await assets.getAsset(key, transformation);
        
        if (stat.size < payload.filesize) {
          await sleep(4000);
          
          // Step 2: Apply watermark
          const watermarkTransformation = getWatermarkTransformation(watermarkPath);
          const { stream: finalStream, stat: finalStat } = await assets.getAsset(key, watermarkTransformation, resizedStream);
          
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
        } else {
          logger.info(`AVIF conversion for ${key} skipped: new file size not smaller`);
        }
      } catch (error) {
        logger.error(`Error processing file ${key}: ${error.message}`);
      }
    }
  }

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
            ['withMetadata'],
            ['avif', { quality }]
          ],
        },
      };
    }
    return undefined;
  }

  function getWatermarkTransformation(watermarkPath) {
    return {
      transformationParams: {
        transforms: [
          ['composite', [{
            input: watermarkPath,
            gravity: 'center',
          }]],
        ],
      },
    };
  }
});

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
