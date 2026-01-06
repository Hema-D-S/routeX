const express = require('express');
const { body, query, validationResult } = require('express-validator');
const rideController = require('../controllers/rideController');

const router = express.Router();

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Request a new ride
router.post('/request', [
  body('vehicleType').isIn(['economy', 'standard', 'premium', 'xl']).withMessage('Invalid vehicle type'),
  body('pickup.address').notEmpty().withMessage('Pickup address is required'),
  body('pickup.coordinates').isObject().withMessage('Pickup coordinates required'),
  body('dropoff.address').notEmpty().withMessage('Dropoff address is required'),
  body('dropoff.coordinates').isObject().withMessage('Dropoff coordinates required')
], validate, rideController.requestRide);

// Accept ride (driver)
router.post('/:rideId/accept', rideController.acceptRide);

// Update ride status
router.patch('/:rideId/status', [
  body('status').isIn(['arriving', 'arrived', 'in_progress', 'completed', 'cancelled']).withMessage('Invalid status')
], validate, rideController.updateRideStatus);

// Get fare estimate
router.post('/estimate', [
  body('pickup').isObject().withMessage('Pickup location required'),
  body('dropoff').isObject().withMessage('Dropoff location required')
], validate, rideController.getFareEstimate);

// Get user's active rides
router.get('/active', rideController.getActiveRides);

// Get user's ride history
router.get('/history', rideController.getUserRides);

// Get driver statistics
router.get('/driver-stats', rideController.getDriverStats);

// Get ride by ID
router.get('/:rideId', rideController.getRideById);

// Rate a ride
router.post('/:rideId/rate', [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('role').optional().isIn(['rider', 'driver']).withMessage('Role must be rider or driver')
], validate, rideController.rateRide);

// Cancel a ride
router.post('/:rideId/cancel', rideController.cancelRide);

// Get driver statistics
router.get('/driver-stats', rideController.getDriverStats);

module.exports = router;
