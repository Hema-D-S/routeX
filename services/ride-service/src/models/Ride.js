const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  riderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  status: {
    type: String,
    enum: ['requested', 'accepted', 'arriving', 'in_progress', 'completed', 'cancelled'],
    default: 'requested'
  },
  vehicleType: {
    type: String,
    enum: ['economy', 'standard', 'premium', 'xl'],
    required: true
  },
  pickup: {
    address: {
      type: String,
      required: true
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        required: true
      }
    }
  },
  dropoff: {
    address: {
      type: String,
      required: true
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        required: true
      }
    }
  },
  distance: {
    type: Number, // in kilometers
    required: true
  },
  duration: {
    type: Number, // estimated duration in minutes
    required: true
  },
  fare: {
    baseFare: {
      type: Number,
      required: true
    },
    distanceFare: {
      type: Number,
      required: true
    },
    totalFare: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'INR'
    }
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'wallet'],
    default: 'cash'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  rating: {
    riderRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    driverRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    riderFeedback: String,
    driverFeedback: String
  },
  timeline: {
    requestedAt: {
      type: Date,
      default: Date.now
    },
    acceptedAt: Date,
    arrivedAt: Date,
    startedAt: Date,
    completedAt: Date,
    cancelledAt: Date
  },
  cancellation: {
    cancelledBy: {
      type: String,
      enum: ['rider', 'driver', 'system', null],
      default: null
    },
    reason: String
  },
  route: {
    encodedPolyline: String,
    waypoints: [{
      location: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point'
        },
        coordinates: [Number]
      },
      timestamp: Date
    }]
  }
}, {
  timestamps: true
});

// Indexes
rideSchema.index({ 'pickup.location': '2dsphere' });
rideSchema.index({ 'dropoff.location': '2dsphere' });
rideSchema.index({ riderId: 1, status: 1 });
rideSchema.index({ driverId: 1, status: 1 });
rideSchema.index({ status: 1 });

module.exports = mongoose.model('Ride', rideSchema);
