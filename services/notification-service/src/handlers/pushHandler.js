// Push Notification Handler
// Uses Firebase Cloud Messaging (FCM)

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
let firebaseInitialized = false;

const initializeFirebase = () => {
  if (firebaseInitialized || admin.apps.length > 0) {
    return;
  }

  try {
    const serviceAccountPath = path.join(__dirname, '../../', process.env.FCM_SERVICE_ACCOUNT_KEY || './firebase-key.json');
    const serviceAccount = require(serviceAccountPath);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FCM_PROJECT_ID
    });

    firebaseInitialized = true;
    console.log('🔥 Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase:', error.message);
    console.log('⚠️  Using mock push notifications');
  }
};

const sendPush = async (data) => {
  const { deviceToken, title, body, data: payload } = data;

  try {
    // Initialize Firebase on first use
    if (!firebaseInitialized && admin.apps.length === 0) {
      initializeFirebase();
    }

    // If Firebase not available, use mock
    if (admin.apps.length === 0) {
      console.log(`📱 [MOCK PUSH] Token: ${deviceToken?.substring(0, 20)}...`);
      console.log(`📱 [MOCK PUSH] Title: ${title}`);
      console.log(`📱 [MOCK PUSH] Body: ${body}`);
      
      return {
        success: true,
        messageId: `mock-push-${Date.now()}`,
        mock: true
      };
    }

    // Send via Firebase Cloud Messaging
    const message = {
      token: deviceToken,
      notification: {
        title: title || 'Uber Clone',
        body: body || 'You have a notification'
      },
      data: payload ? Object.entries(payload).reduce((acc, [key, val]) => {
        acc[key] = String(val);
        return acc;
      }, {}) : {},
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK'
        }
      },
      apns: {
        headers: {
          'apns-priority': '10'
        },
        payload: {
          aps: {
            alert: {
              title: title || 'Uber Clone',
              body: body || 'You have a notification'
            },
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    const messageId = await admin.messaging().send(message);

    console.log(`✅ Push notification sent successfully:`, messageId);

    return {
      success: true,
      messageId: messageId
    };
  } catch (error) {
    console.error('❌ Push notification error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Send template-based push notifications
const sendTemplatePush = async (deviceToken, template, data) => {
  const templates = {
    rideRequested: {
      title: '🚗 Ride Requested',
      body: `New ride request to ${data?.dropoffAddress || 'destination'}`
    },
    rideAccepted: {
      title: '✅ Driver Accepted!',
      body: `${data?.driverName || 'Your driver'} accepted your ride`
    },
    rideCompleted: {
      title: '🎉 Ride Completed',
      body: `Thank you for riding! Rate your experience`
    },
    rideCancelled: {
      title: '❌ Ride Cancelled',
      body: `Your ride has been cancelled`
    },
    welcome: {
      title: '👋 Welcome to Uber Clone!',
      body: 'Start your first ride today'
    }
  };

  const templateData = templates[template] || templates.welcome;

  return sendPush({
    deviceToken,
    title: templateData.title,
    body: templateData.body,
    data
  });
};

module.exports = {
  sendPush,
  sendTemplatePush,
  initializeFirebase
};

