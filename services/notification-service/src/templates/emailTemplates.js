// Email Templates

const templates = {
  // Welcome email after registration
  welcome: (data) => ({
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #000; color: #fff; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 4px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Uber Clone!</h1>
          </div>
          <div class="content">
            <h2>Hi ${data.firstName}!</h2>
            <p>Thank you for signing up with Uber Clone. We're excited to have you on board!</p>
            <p>You can now:</p>
            <ul>
              <li>Book rides anytime, anywhere</li>
              <li>Track your driver in real-time</li>
              <li>Pay seamlessly</li>
            </ul>
            <p><a href="${data.appUrl || '#'}" class="button">Start Riding</a></p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Uber Clone. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Welcome to Uber Clone, ${data.firstName}! Thank you for signing up. Start booking rides today!`
  }),

  // Ride confirmation email
  rideConfirmation: (data) => ({
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #000; color: #fff; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .ride-details { background: #fff; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Ride Confirmed!</h1>
          </div>
          <div class="content">
            <p>Your ride has been booked successfully.</p>
            <div class="ride-details">
              <p><strong>Pickup:</strong> ${data.pickup}</p>
              <p><strong>Dropoff:</strong> ${data.dropoff}</p>
              <p><strong>Vehicle Type:</strong> ${data.vehicleType}</p>
              <p><strong>Estimated Fare:</strong> ₹${data.fare}</p>
              <p><strong>Driver:</strong> ${data.driverName || 'Searching...'}</p>
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Uber Clone. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Ride Confirmed! Pickup: ${data.pickup}, Dropoff: ${data.dropoff}, Fare: ₹${data.fare}`
  }),

  // Ride receipt email
  rideReceipt: (data) => ({
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #000; color: #fff; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .receipt { background: #fff; padding: 20px; border-radius: 8px; margin: 15px 0; }
          .total { font-size: 24px; font-weight: bold; border-top: 2px solid #000; padding-top: 10px; margin-top: 10px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Your Receipt</h1>
          </div>
          <div class="content">
            <div class="receipt">
              <p><strong>Ride ID:</strong> ${data.rideId}</p>
              <p><strong>Date:</strong> ${new Date(data.date).toLocaleDateString()}</p>
              <hr>
              <p><strong>From:</strong> ${data.pickup}</p>
              <p><strong>To:</strong> ${data.dropoff}</p>
              <p><strong>Distance:</strong> ${data.distance} km</p>
              <p><strong>Duration:</strong> ${data.duration} mins</p>
              <hr>
              <p>Base Fare: ₹${data.baseFare}</p>
              <p>Distance Fare: ₹${data.distanceFare}</p>
              <div class="total">Total: ₹${data.totalFare}</div>
            </div>
            <p>Thank you for riding with us!</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Uber Clone. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Receipt for Ride ${data.rideId}. Total: ₹${data.totalFare}. From: ${data.pickup} To: ${data.dropoff}`
  }),

  // Password reset email
  passwordReset: (data) => ({
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #000; color: #fff; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 4px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Reset Your Password</h1>
          </div>
          <div class="content">
            <p>Hi ${data.firstName},</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <p><a href="${data.resetUrl}" class="button">Reset Password</a></p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Uber Clone. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Reset your password by visiting: ${data.resetUrl}. This link expires in 1 hour.`
  }),

  // Password reset email
  password_reset: (data) => ({
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #000; color: #fff; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hi ${data.name},</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <p><a href="${data.resetLink}" class="button" style="text-decoration: none;">Reset Password</a></p>
            <p><strong>Important:</strong> This link will expire in ${data.expiresIn}.</p>
            <p>If you didn't request this password reset, please ignore this email or contact our support team.</p>
            <p><strong>For security:</strong> Never share this link with anyone.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Uber Clone. All rights reserved.</p>
            <p>Need help? Contact support@uberclone.com</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Password reset link: ${data.resetLink}. This link expires in ${data.expiresIn}. If you didn't request this, ignore this email.`
  })
};
