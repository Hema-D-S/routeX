const User = require('../models/User');

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: user.toJSON() });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.params.id;
    const allowedUpdates = ['firstName', 'lastName', 'phone', 'profilePicture'];
    const updates = {};

    // Filter only allowed fields
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// Update driver info
exports.updateDriverInfo = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.params.id;
    const { licenseNumber, vehicleType, vehicleNumber, vehicleModel, isAvailable } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role !== 'driver') {
      return res.status(400).json({ error: 'User is not a driver' });
    }

    user.driverInfo = {
      ...user.driverInfo,
      licenseNumber: licenseNumber || user.driverInfo?.licenseNumber,
      vehicleType: vehicleType || user.driverInfo?.vehicleType,
      vehicleNumber: vehicleNumber || user.driverInfo?.vehicleNumber,
      vehicleModel: vehicleModel || user.driverInfo?.vehicleModel,
      isAvailable: isAvailable !== undefined ? isAvailable : user.driverInfo?.isAvailable
    };

    await user.save();

    res.json({
      message: 'Driver info updated successfully',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Update driver info error:', error);
    res.status(500).json({ error: 'Failed to update driver info' });
  }
};

// Update driver location
exports.updateDriverLocation = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.params.id;
    const { longitude, latitude } = req.body;

    if (!longitude || !latitude) {
      return res.status(400).json({ error: 'Longitude and latitude are required' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          'driverInfo.currentLocation': {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          }
        }
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Location updated successfully',
      location: user.driverInfo.currentLocation
    });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
};

// Get nearby drivers
exports.getNearbyDrivers = async (req, res) => {
  try {
    const { longitude, latitude, radius = 5000 } = req.query; // radius in meters

    if (!longitude || !latitude) {
      return res.status(400).json({ error: 'Longitude and latitude are required' });
    }

    const drivers = await User.find({
      role: 'driver',
      'driverInfo.isAvailable': true,
      'driverInfo.currentLocation': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseInt(radius)
        }
      }
    }).select('firstName lastName driverInfo.rating driverInfo.vehicleType driverInfo.vehicleModel driverInfo.currentLocation');

    res.json({
      count: drivers.length,
      drivers
    });
  } catch (error) {
    console.error('Get nearby drivers error:', error);
    res.status(500).json({ error: 'Failed to get nearby drivers' });
  }
};

// Add saved address for rider
exports.addSavedAddress = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { label, address, coordinates } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $push: {
          'riderInfo.savedAddresses': { label, address, coordinates }
        }
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Address saved successfully',
      savedAddresses: user.riderInfo.savedAddresses
    });
  } catch (error) {
    console.error('Add saved address error:', error);
    res.status(500).json({ error: 'Failed to save address' });
  }
};

// Delete user (soft delete)
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.params.id;

    const user = await User.findByIdAndUpdate(
      userId,
      { isActive: false },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

// Update driver availability (online/offline)
exports.updateAvailability = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { isAvailable } = req.body;

    if (isAvailable === undefined) {
      return res.status(400).json({ error: 'isAvailable is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role !== 'driver') {
      return res.status(400).json({ error: 'Only drivers can update availability' });
    }

    user.driverInfo = user.driverInfo || {};
    user.driverInfo.isAvailable = isAvailable;

    await user.save();

    res.json({
      message: isAvailable ? 'You are now online' : 'You are now offline',
      isAvailable: user.driverInfo.isAvailable
    });
  } catch (error) {
    console.error('Update availability error:', error);
    res.status(500).json({ error: 'Failed to update availability' });
  }
};
