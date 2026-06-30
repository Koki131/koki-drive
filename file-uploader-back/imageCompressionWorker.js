const { Worker } = require('bullmq');
const sharp = require('sharp');
const fs = require('fs');
const IORedis = require('ioredis');

const connection = new IORedis({ host: 'localhost', port: 6379, maxRetriesPerRequest: null });
const redisPublisher = new IORedis({ host: 'localhost', port: 6379 });


console.log('Image Compress Worker process started.');

const processor = async (job) => {
    const { user, fileId, inputPath, mimeType } = job.data;
    const tempPath = `${inputPath}.tmp`;

    try {
        await sharp(inputPath)
            .jpeg({ quality: 82, mozjpeg: true }) // keep same format/extension
            .toFile(tempPath);

        fs.renameSync(tempPath, inputPath); // atomic swap, no broken-read window

        console.log(`[Image Compress Worker] Job ${job.id} complete. Compressed file ${fileId} at ${inputPath}`);
        const stats = fs.statSync(inputPath);
        await redisPublisher.publish(`user-notifications:${user.id}`, JSON.stringify({
            event: 'image-compressed',
            fileId,
            size: stats.size,
            status: 'success'
        }));



    } catch (err) {
        console.error(`[Image Compress Worker] Job ${job.id} failed:`, err);
        if (fs.existsSync(tempPath)) fs.rmSync(tempPath);
    }
};

const worker = new Worker('image-compress', processor, {
    connection,
    concurrency: 3
});