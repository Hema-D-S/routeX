const express = require('express');
const { body, query, validationResult } = require('express-validator');
const userController = require('../controllers/userController');

const router = express.Router();

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Get user by ID
router.get('/:id', userController.getUserById);

// Update user profile
router.put('/profile', userController.updateProfile);
router.put('/:id/profile', userController.updateProfile);

// Driver specific routes
router.put('/driver/info', userController.updateDriverInfo);
router.put('/driver/location', [
  body('longitude').isNumeric().withMessage('Longitude must be a number'),
  body('latitude').isNumeric().withMessage('Latitude must be a number')
], validate, userController.updateDriverLocation);

// Driver availability (online/offline toggle)
router.patch('/availability', userController.updateAvailability);

// Get nearby drivers
router.get('/drivers/nearby', [
  query('longitude').isNumeric().withMessage('Longitude must be a number'),
  query('latitude').isNumeric().withMessage('Latitude must be a number'),
  query('radius').optional().isNumeric().withMessage('Radius must be a number')
], validate, userController.getNearbyDrivers);

// Rider saved addresses
router.post('/addresses', [
  body('label').notEmpty().withMessage('Label is required'),
  body('address').notEmpty().withMessage('Address is required'),
  body('coordinates').isArray({ min: 2, max: 2 }).withMessage('Coordinates must be [longitude, latitude]')
], validate, userController.addSavedAddress);

// Delete user
router.delete('/:id', userController.deleteUser);

module.exports = router;
