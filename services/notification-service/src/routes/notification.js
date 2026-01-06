const express = require('express');
const { body, validationResult } = require('express-validator');
const notificationController = require('../controllers/notificationController');

const router = express.Router();

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Send notification (generic - push only)
router.post('/send', [
  body('type').notEmpty().withMessage('Notification type is required'),
  body('userId').notEmpty().withMessage('User ID is required')
], validate, notificationController.sendNotification);
// Send push notification
router.post('/push', [
  body('deviceToken').notEmpty().withMessage('Device token is required')
], validate, notificationController.sendPush);

// Get queue statistics
router.get('/stats', notificationController.getStats);

module.exports = router;