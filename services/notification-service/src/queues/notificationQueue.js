const Queue = require('bull');
const pushHandler = require('../handlers/pushHandler');

let pushQueue;
let queuesInitialized = false;

const getRedisConfig = () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined
});

const initializeQueues = () => {
  // Skip queue initialization if SKIP_REDIS is set
  if (process.env.SKIP_REDIS === 'true') {
    console.log('⚠️  Redis skipped - push notifications will be sent directly (no queuing)');
    queuesInitialized = false;
    return;
  }

  try {
    const redisConfig = getRedisConfig();

  // Push Notification Queue
  pushQueue = new Queue('push-notifications', {
    redis: redisConfig,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: 100,
      removeOnFail: 50
    }
  });

  // Process push notification jobs
  pushQueue.process(async (job) => {
    console.log(`Processing push notification job ${job.id}`);
    return pushHandler.sendPush(job.data);
  });

  // Event listeners
  pushQueue.on('completed', (job) => {
    console.log(`Job ${job.id} completed in push queue`);
  });

  pushQueue.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed in push queue:`, err.message);
  });

  pushQueue.on('error', (err) => {
    // Only log once, not repeatedly
    if (!queuesInitialized) {
      console.error(`Push queue connection error - Redis may not be running`);
    }
  });

  queuesInitialized = true;
  console.log('📬 Push notification queue initialized');
  } catch (err) {
    console.log('⚠️  Redis not available - push notifications will be sent directly');
    queuesInitialized = false;
  }
};

const addPushJob = async (data) => {
  if (!pushQueue) {
    console.log('Push queue not initialized, sending directly');
    return pushHandler.sendPush(data);
  }
  return pushQueue.add(data);
};

const getQueueStats = async () => {
  const stats = {};
  
  if (pushQueue) {
    stats.push = {
      waiting: await pushQueue.getWaitingCount(),
      active: await pushQueue.getActiveCount(),
      completed: await pushQueue.getCompletedCount(),
      failed: await pushQueue.getFailedCount()
    };
  }

  return stats;
};

module.exports = {
  initializeQueues,
  addPushJob,
  getQueueStats
};
