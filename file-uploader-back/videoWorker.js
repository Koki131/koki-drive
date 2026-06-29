const { Worker } = require('bullmq');
const {exec} = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const IORedis = require('ioredis');
const { updateStatus } = require('./prisma/queries');


console.log('Video Worker process started.');

const connection = new IORedis({ host: 'localhost', port: 6379, maxRetriesPerRequest: null });

// const redisPublisher = new IORedis({ host: 'localhost', port: 6379 });


const processor = async (job) => {
    const { inputPath, outputPath, masterRelativePath,  file, userId } = job.data;

    let sourceHeight, sourceBitrate;
    try {
        const ffprobeCommand = `ffprobe -v error -select_streams v:0 -show_entries stream=height,bit_rate -of json "${inputPath}"`;
        const { stdout } = await execPromise(ffprobeCommand);
        const probeData = JSON.parse(stdout);
        const videoStream = probeData.streams[0];
        if (!videoStream) throw new Error('No video stream found in the input file.');

        sourceHeight = videoStream.height;
        sourceBitrate = Math.round(parseInt(videoStream.bit_rate || '1000000', 10) / 1000);
        console.log(`Probed video: ${sourceHeight}p @ ${sourceBitrate}kbps`);
    } catch (error) {
        console.error('Failed to probe video file:', error);
        throw error;
    }

    const allRenditions = [
        { name: '360p',  height: 360,  videoBitrate: 400,  audioBitrate: '96k',  crf: 32 },
        { name: '480p',  height: 480,  videoBitrate: 700, audioBitrate: '128k', crf: 30 },
        { name: '720p',  height: 720,  videoBitrate: 1400, audioBitrate: '128k', crf: 28 },
        { name: '1080p', height: 1080, videoBitrate: 2500, audioBitrate: '192k', crf: 26 },
    ];

    const activeRenditions = allRenditions.filter(r => sourceHeight >= r.height);
    if (activeRenditions.length === 0) {
        activeRenditions.push({
            name: `${sourceHeight}p`, height: sourceHeight,
            videoBitrate: sourceBitrate, audioBitrate: '96k'
        });
    }

    const filterComplex = `[0:v]split=${activeRenditions.length}` +
        activeRenditions.map((_, i) => `[v${i+1}]`).join('') + '; ' +
        activeRenditions.map((r, i) => `[v${i+1}]scale=w=-2:h=${r.height},format=yuv420p[outv${i+1}]`).join('; ');

    const mapArgs = activeRenditions.map((_, i) => `-map "[outv${i+1}]" -map 0:a:0`).join(' ');


    const codecArgs = activeRenditions.map((r, i) =>
        `-c:v:${i} libx264 -preset fast -crf:v:${i} ${r.crf} -maxrate:v:${i} ${r.videoBitrate}k -bufsize:v:${i} ${r.videoBitrate * 2}k -c:a:${i} aac -b:a:${i} ${r.audioBitrate} -ac:a:${i} 2`
    ).join(' ');

    const varStreamMap = activeRenditions.map((r, i) => `v:${i},a:${i},name:${r.name}`).join(' ');

    const ffmpegCommand = `
        ffmpeg -i "${inputPath}"
        -filter_complex "${filterComplex}"
        ${mapArgs}
        ${codecArgs}
        -f hls
        -hls_time 6
        -hls_playlist_type vod
        -hls_segment_filename "${outputPath}/segment_%v_%03d.ts"
        -master_pl_name master.m3u8
        -var_stream_map "${varStreamMap}"
        "${outputPath}/%v.m3u8"
    `.replace(/\s+/g, ' ').trim();

    console.log("Executing FFmpeg Command:\n", ffmpegCommand);

    try {
        await execPromise(ffmpegCommand);
        console.log(`Successfully transcoded ${inputPath}`);
        
        const updatedFile = await updateStatus(file.id);


    } catch (error) {
        console.error('Error during dynamic transcoding:', error);
        
        
        throw error;
    }
};


const worker = new Worker('video-generation', processor, {
    connection,
    concurrency: 5
});
  
worker.on('completed', (job) => {
    // console.log(`Job ${job.id} has completed!`);
});
  
worker.on('failed', (job, err) => {
    console.log(`Job ${job.id} has failed with ${err.message}`);
});
