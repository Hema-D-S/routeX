// SMS Handler - Mock implementation for development
// In production, integrate with Twilio, Vonage, or similar

const sendSMS = async (data) => {
  const { to, message } = data;

  try {
    // Mock SMS sending for development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[MOCK SMS] To: ${to}`);
      console.log(`[MOCK SMS] Message: ${message}`);
      
      return {
        success: true,
        messageId: `mock-${Date.now()}`,
        mock: true
      };
    }

    // Production implementation with Twilio
    // Uncomment and configure for production:
    /*
    const twilio = require('twilio');
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to
    });

    return {
      success: true,
      messageId: result.sid
    };
    */

    // For now, just log
    console.log(`SMS would be sent to ${to}: ${message}`);
    return {
      success: true,
      messageId: `sms-${Date.now()}`
    };

  } catch (error) {
    console.error('SMS sending error:', error);
    throw error;
  }
};

// SMS Templates
const smsTemplates = {
  rideRequested: (data) => 
    `Your ride has been requested. Pickup: ${data.pickup}. We're finding a driver for you.`,
  
  rideAccepted: (data) => 
    `Great news! ${data.driverName} is on the way in a ${data.vehicleModel}. ETA: ${data.eta} mins.`,
  
  driverArrived: (data) => 
    `Your driver has arrived! Look for ${data.vehicleModel} - ${data.vehicleNumber}.`,
  
  rideCompleted: (data) => 
    `Ride completed! Total fare: ₹${data.fare}. Thank you for riding with us!`,
  
  rideCancelled: (data) => 
    `Your ride has been cancelled. Reason: ${data.reason || 'N/A'}`,
  
  otp: (data) => 
    `Your OTP for Uber Clone is: ${data.otp}. Valid for 5 minutes.`
};

const sendTemplateSMS = async (to, templateName, data) => {
  if (!smsTemplates[templateName]) {
    throw new Error(`SMS template '${templateName}' not found`);
  }
  
  const message = smsTemplates[templateName](data);
  return sendSMS({ to, message });
};

module.exports = {
  sendSMS,
  sendTemplateSMS
};
