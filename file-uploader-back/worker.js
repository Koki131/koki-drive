const { Worker } = require('bullmq');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const IORedis = require('ioredis');

const { updateFilePreveiw } = require("./prisma/queries");

console.log('Worker process started.');

const connection = new IORedis({ host: 'localhost', port: 6379, maxRetriesPerRequest: null });

const redisPublisher = new IORedis({ host: 'localhost', port: 6379 });



const processor = async (job) => {

    
    const { user, fileId, filePath, previewPath, finalPreviewPath, mimeType, basePreviewPath } = job.data;

    try {

        fs.mkdirSync(previewPath, { recursive: true });
    
        if (mimeType.startsWith('image/')) {
          await sharp(filePath)
            .resize(50, 50, { fit: 'cover' })
            .jpeg({ quality: 80 })
            .toFile(finalPreviewPath);
        } else if (mimeType.startsWith('video/')) {
            
            await new Promise((resolve, reject) => {
                ffmpeg(filePath)
                  .screenshots({
                    count: 1,
                    timemarks: ['1'],
                    filename: `${fileId}_temp_preview.png`,
                    folder: previewPath,
                  })
                  .on('end', resolve)
                  .on('error', reject);
              });
        
              const tempPngPath = path.join(previewPath, `${fileId}_temp_preview.png`);

              await sharp(tempPngPath)
                .resize(50, 50, { fit: 'cover' })
                .jpeg({ quality: 80 })
                .toFile(finalPreviewPath);
              
              fs.rmSync(tempPngPath);
        }

        const res = await updateFilePreveiw(fileId, user, basePreviewPath);
        // console.log(`[Worker] Job ${job.id} complete. Preview for file ${fileId} at ${previewPath}`);
        
        
        // 2. NEW: Publish the completion event to Redis
        const channel = `user-notifications:${user.id}`;
        const payload = JSON.stringify({
            event: 'preview-complete',
            parentId: res.parentId,
            file: res,
            previewUrl: basePreviewPath, // This is the URL the frontend can use
            status: 'success'
        });

        await redisPublisher.publish(channel, payload);

        console.log(`[Worker] Published to channel '${channel}' for file ${fileId}`);

    } catch (err) {
        console.error(`[Worker] Job ${job.id} failed for fileId ${fileId}:`, err);

        const channel = `user-notifications:${user.id}`;
        const payload = JSON.stringify({
            event: 'preview-failed',
            fileId: fileId,
            status: 'error',
            message: 'Preview generation failed.'
        });
        await redisPublisher.publish(channel, payload);

        throw err;
    }

};


const worker = new Worker('preview-generation', processor, {
    connection,
    concurrency: 5
});
  
worker.on('completed', (job) => {
    // console.log(`Job ${job.id} has completed!`);
});
  
worker.on('failed', (job, err) => {
    console.log(`Job ${job.id} has failed with ${err.message}`);
});