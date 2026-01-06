const Ride = require('../models/Ride');
const pricingService = require('../services/pricingService');
const axios = require('axios');

// Helper function to calculate distance using Haversine formula (fallback)
function calculateDistanceHaversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

// Get real route distance and duration using OSRM (free routing service)
async function getRouteInfo(pickupLat, pickupLng, dropoffLat, dropoffLng) {
  try {
    // OSRM expects coordinates as lng,lat
    const url = `https://router.project-osrm.org/route/v1/driving/${pickupLng},${pickupLat};${dropoffLng},${dropoffLat}?overview=false`;
    
    console.log('OSRM Request URL:', url);
    
    const response = await axios.get(url, { timeout: 10000 });
    
    console.log('OSRM Response:', response.data.code, response.data.routes?.[0]?.distance, response.data.routes?.[0]?.duration);
    
    if (response.data.code === 'Ok' && response.data.routes && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      const distance = route.distance / 1000; // Convert meters to km
      const duration = Math.ceil(route.duration / 60); // Convert seconds to minutes
      
      console.log(`Route found: ${distance.toFixed(2)} km, ${duration} min`);
      
      return {
        distance: distance,
        duration: duration
      };
    }
    
    // Fallback to Haversine if OSRM fails
    throw new Error('No route found in response');
  } catch (error) {
    console.log('OSRM error, falling back to Haversine:', error.message);
    const distance = calculateDistanceHaversine(pickupLat, pickupLng, dropoffLat, dropoffLng);
    console.log(`Haversine distance: ${distance.toFixed(2)} km`);
    return {
      distance: distance,
      duration: Math.ceil(distance * 2) // Estimate 2 min per km
    };
  }
}

// Request a new ride
exports.requestRide = async (req, res) => {
  try {
    const riderId = req.headers['x-user-id'];
    console.log('Ride request from rider:', riderId);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const { 
      vehicleType,
      pickup,
      dropoff,
      paymentMethod
    } = req.body;

    // Support both {lat, lng} and [lng, lat] formats
    const pickupLat = pickup.coordinates?.lat ?? pickup.coordinates?.[1];
    const pickupLng = pickup.coordinates?.lng ?? pickup.coordinates?.[0];
    const dropoffLat = dropoff.coordinates?.lat ?? dropoff.coordinates?.[1];
    const dropoffLng = dropoff.coordinates?.lng ?? dropoff.coordinates?.[0];

    // Get real route distance and duration from OSRM
    const routeInfo = await getRouteInfo(pickupLat, pickupLng, dropoffLat, dropoffLng);
    const distance = routeInfo.distance;
    const duration = routeInfo.duration;

    console.log('Route info received:', { distance, duration });

    // Ensure minimum distance to avoid 0 fare
    let finalDistance = Math.max(distance, 0.1);
    console.log('Final distance after validation:', finalDistance);

    // Calculate fare
    const fare = pricingService.calculateFare(vehicleType, finalDistance);
    console.log('Calculated fare:', fare);

    // Create ride
    const ride = new Ride({
      riderId,
      vehicleType,
      pickup: {
        address: pickup.address,
        location: {
          type: 'Point',
          coordinates: [pickupLng, pickupLat] // GeoJSON format: [lng, lat]
        }
      },
      dropoff: {
        address: dropoff.address,
        location: {
          type: 'Point',
          coordinates: [dropoffLng, dropoffLat] // GeoJSON format: [lng, lat]
        }
      },
      distance: finalDistance,
      duration,
      fare,
      paymentMethod: paymentMethod || 'cash'
    });

    await ride.save();

    // Emit to available drivers via socket
    const io = req.app.get('io');
    const driverNotification = {
      _id: ride._id,
      rideId: ride._id,
      pickup: ride.pickup,
      dropoff: ride.dropoff,
      vehicleType: ride.vehicleType,
      fare: ride.fare.totalFare,
      distance: ride.distance,
      duration: ride.duration
    };
    console.log('📢 Broadcasting to drivers:', driverNotification);
    io.to('available-drivers').emit('new-ride-request', driverNotification);

    // Send notification to notification service
    try {
      await axios.post(`${process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3003'}/notifications/send`, {
        type: 'ride_requested',
        userId: riderId,
        data: {
          rideId: ride._id,
          pickup: pickup.address,
          dropoff: dropoff.address
        }
      });
    } catch (err) {
      console.error('Failed to send notification:', err.message);
    }

    res.status(201).json({
      message: 'Ride requested successfully',
      ride
    });
  } catch (error) {
    console.error('Request ride error:', error);
    res.status(500).json({ error: 'Failed to request ride' });
  }
};

// Accept ride (driver)
exports.acceptRide = async (req, res) => {
  try {
    const driverId = req.headers['x-user-id'];
    const { rideId } = req.params;

    const ride = await Ride.findOneAndUpdate(
      { _id: rideId, status: 'requested' },
      {
        driverId,
        status: 'accepted',
        'timeline.acceptedAt': new Date()
      },
      { new: true }
    );

    if (!ride) {
      return res.status(404).json({ error: 'Ride not found or already accepted' });
    }

    // Notify rider via socket
    const io = req.app.get('io');
    io.to(`rider-${ride.riderId}`).emit('ride-accepted', {
      ride: ride
    });

    // Send push notification to rider
    try {
      await axios.post(`${process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3003'}/notifications/send`, {
        type: 'ride_accepted',
        userId: ride.riderId.toString(),
        data: {
          rideId: ride._id,
          driverId: driverId,
          status: 'Driver accepted your ride',
          eta: ride.duration
        }
      });
    } catch (err) {
      console.error('Failed to send ride accepted notification:', err.message);
    }

    res.json({
      message: 'Ride accepted',
      ride
    });
  } catch (error) {
    console.error('Accept ride error:', error);
    res.status(500).json({ error: 'Failed to accept ride' });
  }
};

// Update ride status
exports.updateRideStatus = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { status } = req.body;
    const userId = req.headers['x-user-id'];

    console.log('🔄 Updating ride status:', { rideId, status, userId });

    const updateData = { status };

    // Update timeline based on status
    switch (status) {
      case 'arriving':
        updateData['timeline.arrivedAt'] = new Date();
        break;
      case 'in_progress':
        updateData['timeline.startedAt'] = new Date();
        break;
      case 'completed':
        updateData['timeline.completedAt'] = new Date();
        updateData['paymentStatus'] = 'completed';
        break;
      case 'cancelled':
        updateData['timeline.cancelledAt'] = new Date();
        updateData['cancellation.cancelledBy'] = req.body.cancelledBy || 'rider';
        updateData['cancellation.reason'] = req.body.reason;
        break;
    }

    console.log('📝 Update data:', updateData);

    const ride = await Ride.findByIdAndUpdate(
      rideId,
      { $set: updateData },
      { new: true }
    );

    if (!ride) {
      console.error('Ride not found:', rideId);
      return res.status(404).json({ error: 'Ride not found' });
    }

    console.log('✅ Ride updated, new status:', ride.status);

    // Emit status update
    const io = req.app.get('io');
    io.to(`ride-${rideId}`).emit('ride-status-updated', {
      rideId,
      status,
      ride
    });

    // Send push notification
    try {
      await axios.post(`${process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3003'}/notifications/send`, {
        type: `ride_${status}`,
        userId: ride.riderId.toString(),
        data: {
          rideId: ride._id,
          status: status,
          distance: ride.distance,
          fare: ride.fare?.totalFare
        }
      });
    } catch (err) {
      console.error(`Failed to send ride ${status} notification:`, err.message);
    }

    res.json({
      message: 'Ride status updated',
      ride
    });
  } catch (error) {
    console.error('Update ride status error:', error);
    res.status(500).json({ error: 'Failed to update ride status' });
  }
};

// Get ride by ID
exports.getRideById = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.rideId);
    
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    res.json({ ride });
  } catch (error) {
    console.error('Get ride error:', error);
    res.status(500).json({ error: 'Failed to get ride' });
  }
};

// Get user rides (history)
exports.getUserRides = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { role = 'rider', status, page = 1, limit = 10 } = req.query;

    console.log('📜 Fetching ride history:', { userId, role, status, page, limit });

    const query = role === 'driver' 
      ? { driverId: userId }
      : { riderId: userId };

    if (status) {
      query.status = status;
    }

    console.log('🔍 Query:', query);

    const rides = await Ride.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Ride.countDocuments(query);

    console.log(`✅ Found ${rides.length} rides (total: ${total})`);

    res.json({
      rides,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get user rides error:', error);
    res.status(500).json({ error: 'Failed to get rides' });
  }
};

// Rate ride
exports.rateRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { rating, feedback, role } = req.body; // role: 'rider' or 'driver'
    
    console.log('📝 Rating submission received:', { rideId, rating, feedback, role });

    // Determine rater type - use 'role' if provided, otherwise default to 'rider'
    const raterType = role || 'rider';

    const updateData = {};
    
    if (raterType === 'rider') {
      updateData['rating.driverRating'] = rating;
      updateData['rating.riderFeedback'] = feedback || '';
    } else {
      updateData['rating.riderRating'] = rating;
      updateData['rating.driverFeedback'] = feedback || '';
    }

    console.log('💾 Updating ride with:', updateData);

    const ride = await Ride.findByIdAndUpdate(
      rideId,
      { $set: updateData },
      { new: true }
    );

    if (!ride) {
      console.error('Ride not found:', rideId);
      return res.status(404).json({ error: 'Ride not found' });
    }

    console.log('✅ Rating submitted successfully');
    res.json({
      message: 'Rating submitted',
      ride
    });
  } catch (error) {
    console.error('Rate ride error:', error);
    res.status(500).json({ error: 'Failed to rate ride' });
  }
};

// Cancel ride
exports.cancelRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const userId = req.headers['x-user-id'];
    const { reason } = req.body;

    const ride = await Ride.findById(rideId);

    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    // Check if ride can be cancelled
    if (['completed', 'cancelled'].includes(ride.status)) {
      return res.status(400).json({ error: 'Ride cannot be cancelled' });
    }

    // Determine who is cancelling
    const cancelledBy = ride.riderId?.toString() === userId ? 'rider' : 'driver';

    ride.status = 'cancelled';
    ride.cancellation = {
      cancelledBy,
      reason: reason || 'No reason provided',
      cancelledAt: new Date()
    };
    ride.timeline = ride.timeline || {};
    ride.timeline.cancelledAt = new Date();

    await ride.save();

    // Emit cancellation event
    const io = req.app.get('io');
    io.to(`ride-${rideId}`).emit('ride-cancelled', {
      rideId,
      cancelledBy,
      reason
    });

    // Send push notifications to the other party
    try {
      if (cancelledBy === 'rider' && ride.driverId) {
        io.to(`driver-${ride.driverId}`).emit('ride-cancelled', {
          rideId,
          message: 'Rider has cancelled the ride'
        });
        // Send push to driver
        await axios.post(`${process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3003'}/notifications/send`, {
          type: 'ride_cancelled',
          userId: ride.driverId.toString(),
          data: {
            rideId: ride._id,
            cancelledBy: 'rider',
            reason: reason
          }
        });
      } else if (cancelledBy === 'driver') {
        io.to(`rider-${ride.riderId}`).emit('ride-cancelled', {
          rideId,
          message: 'Driver has cancelled the ride'
        });
        // Send push to rider
        await axios.post(`${process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3003'}/notifications/send`, {
          type: 'ride_cancelled',
          userId: ride.riderId.toString(),
          data: {
            rideId: ride._id,
            cancelledBy: 'driver',
            reason: reason
          }
        });
      }
    } catch (err) {
      console.error('Failed to send cancellation notification:', err.message);
    }

    res.json({
      message: 'Ride cancelled successfully',
      ride
    });
  } catch (error) {
    console.error('Cancel ride error:', error);
    res.status(500).json({ error: 'Failed to cancel ride' });
  }
};

// Get fare estimate
exports.getFareEstimate = async (req, res) => {
  try {
    const { pickup, dropoff, vehicleType } = req.body;

    // Support both {lat, lng} format and query params
    const pickupLat = pickup?.lat || req.query.pickupLat;
    const pickupLng = pickup?.lng || req.query.pickupLng;
    const dropoffLat = dropoff?.lat || req.query.dropoffLat;
    const dropoffLng = dropoff?.lng || req.query.dropoffLng;

    if (!pickupLat || !pickupLng || !dropoffLat || !dropoffLng) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    // Get real route distance and duration from OSRM
    const routeInfo = await getRouteInfo(
      parseFloat(pickupLat), parseFloat(pickupLng),
      parseFloat(dropoffLat), parseFloat(dropoffLng)
    );

    const distance = routeInfo.distance;
    const duration = routeInfo.duration;

    // Ensure minimum distance
    const finalDistance = Math.max(distance, 0.1);

    const estimates = {
      distance: parseFloat(finalDistance.toFixed(2)),
      duration: duration,
      unit: 'km',
      fares: {
        economy: pricingService.calculateFare('economy', finalDistance),
        standard: pricingService.calculateFare('standard', finalDistance),
        premium: pricingService.calculateFare('premium', finalDistance),
        xl: pricingService.calculateFare('xl', finalDistance)
      }
    };

    // If specific vehicle type requested, return that fare
    if (vehicleType && estimates.fares[vehicleType]) {
      estimates.selectedFare = estimates.fares[vehicleType];
    }

    res.json(estimates);
  } catch (error) {
    console.error('Get fare estimate error:', error);
    res.status(500).json({ error: 'Failed to get fare estimate' });
  }
};

// Get active rides
exports.getActiveRides = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { role = 'rider' } = req.query;

    const query = role === 'driver' 
      ? { driverId: userId, status: { $in: ['accepted', 'arriving', 'in_progress'] } }
      : { riderId: userId, status: { $in: ['requested', 'accepted', 'arriving', 'in_progress'] } };

    const rides = await Ride.find(query).sort({ createdAt: -1 });

    res.json({ rides });
  } catch (error) {
    console.error('Get active rides error:', error);
    res.status(500).json({ error: 'Failed to get active rides' });
  }
};

// Get driver statistics
exports.getDriverStats = async (req, res) => {
  try {
    const driverId = req.headers['x-user-id'];
    console.log('📊 Fetching driver stats for:', driverId);

    // Get today's rides (completed only)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayRides = await Ride.find({
      driverId,
      status: 'completed',
      'timeline.completedAt': { $gte: today }
    });

    // Calculate today's earnings
    const todayEarnings = todayRides.reduce((sum, ride) => sum + (ride.fare?.totalFare || 0), 0);
    const todayRidesCount = todayRides.length;

    // Get this week's rides (completed only)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    const weeklyRides = await Ride.find({
      driverId,
      status: 'completed',
      'timeline.completedAt': { $gte: weekAgo }
    });

    const weeklyEarnings = weeklyRides.reduce((sum, ride) => sum + (ride.fare?.totalFare || 0), 0);
    const weeklyRidesCount = weeklyRides.length;

    // Get total stats (completed rides only)
    const allRides = await Ride.find({ driverId });
    const completedRides = allRides.filter(r => r.status === 'completed');
    const totalRides = completedRides.length;
    const acceptedRides = allRides.filter(r => r.status !== 'cancelled').length;
    const acceptanceRate = acceptedRides > 0 ? Math.round((acceptedRides / allRides.length) * 100) : 100;

    // Calculate average rating
    const ratings = completedRides
      .filter(r => r.driverRating)
      .map(r => r.driverRating);
    const avgRating = ratings.length > 0 
      ? (ratings.reduce((a, b) => a + b, 0) / ratings.length) 
      : 5.0;

    const stats = {
      todayEarnings: todayEarnings,
      todayRides: todayRidesCount,
      weeklyEarnings: weeklyEarnings,
      weeklyRides: weeklyRidesCount,
      totalRides: totalRides,
      rating: avgRating,
      acceptanceRate: acceptanceRate
    };

    console.log('📊 Driver stats:', stats);
    res.json(stats);
  } catch (error) {
    console.error('Get driver stats error:', error);
    res.status(500).json({ error: 'Failed to get driver stats' });
  }
};
