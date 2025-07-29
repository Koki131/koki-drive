const { Queue } = require('bullmq');
const IORedis = require('ioredis');

const connection = new IORedis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null
});

const previewQueue = new Queue('preview-generation', { connection });

module.exports = previewQueue;