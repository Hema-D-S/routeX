const { 
  addPushJob, 
  getQueueStats 
} = require('../queues/notificationQueue');
const pushHandler = require('../handlers/pushHandler');

// Send notification (generic endpoint)
exports.sendNotification = async (req, res) => {
  try {
    const { type, userId, channels = ['push'], data } = req.body;

    const results = {
      push: null
    };

    // Map notification types to templates
    const notificationMap = {
      ride_requested: {
        pushTemplate: 'rideRequested'
      },
      ride_accepted: {
        pushTemplate: 'rideAccepted'
      },
      ride_completed: {
        pushTemplate: 'rideCompleted'
      },
      ride_cancelled: {
        pushTemplate: 'rideCancelled'
      },
      welcome: {
        pushTemplate: 'welcome'
      }
    };

    const config = notificationMap[type];
    if (!config) {
      return res.status(400).json({ error: `Unknown notification type: ${type}` });
    }

    // Send via push notifications only
    if (data.deviceToken) {
      results.push = await addPushJob({
        deviceToken: data.deviceToken,
        template: config.pushTemplate,
        data
      });
    }

    res.json({
      message: 'Push notification queued successfully',
      results
    });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
};

// Send push notification directly
exports.sendPush = async (req, res) => {
  try {
    const { deviceToken, title, body, data, template } = req.body;

    let result;
    if (template) {
      result = await pushHandler.sendTemplatePush(deviceToken, template, data);
    } else {
      result = await addPushJob({ deviceToken, title, body, data });
    }

    res.json({
      message: 'Push notification queued successfully',
      result
    });
  } catch (error) {
    console.error('Send push error:', error);
    res.status(500).json({ error: 'Failed to queue push notification' });
  }
};

// Get queue statistics
exports.getStats = async (req, res) => {
  try {
    const useRedis = process.env.SKIP_REDIS !== 'true';
    
    if (useRedis) {
      const stats = await getQueueStats();
      return res.json({ 
        message: 'Queue statistics',
        mode: 'queued',
        stats 
      });
    }
    
    // When Redis is disabled, notifications are sent directly
    res.json({
      message: 'Notifications are sent directly without queuing',
      mode: 'direct',
      stats: {
        push: {
          queuing: false,
          message: 'Push notifications sent immediately without Redis queue'
        }
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get service stats' });
  }
};
