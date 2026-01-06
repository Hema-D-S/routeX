const nodemailer = require('nodemailer');
const templates = require('../templates/emailTemplates');

// Check if we should use mock mode
const useMockEmail = () => {
  return process.env.MOCK_EMAIL === 'true' || 
         process.env.NODE_ENV === 'development' ||
         !process.env.SMTP_USER ||
         process.env.SMTP_USER === 'your-email@gmail.com';
};

// Create transporter
const createTransporter = () => {
  // For production with real credentials
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

const sendEmail = async (data) => {
  const { to, subject, template, templateData, html, text } = data;

  // Mock mode for development - just log the email
  if (useMockEmail()) {
    console.log('\n📧 [MOCK EMAIL] ================');
    console.log(`   To: ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Template: ${template || 'none'}`);
    console.log('================================\n');
    
    return {
      success: true,
      messageId: `mock-${Date.now()}`,
      mock: true
    };
  }

  try {
    const transporter = createTransporter();

    // Get template if specified
    let emailHtml = html;
    let emailText = text;
    
    if (template && templates[template]) {
      const templateContent = templates[template](templateData);
      emailHtml = templateContent.html;
      emailText = templateContent.text;
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Uber Clone" <noreply@uberclone.com>',
      to,
      subject,
      text: emailText,
      html: emailHtml
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log(`Email sent: ${info.messageId}`);
    
    // In development, log preview URL
    if (process.env.NODE_ENV === 'development') {
      console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }

    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
};

module.exports = {
  sendEmail
};
