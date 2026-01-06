const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  role: {
    type: String,
    enum: ['rider', 'driver', 'admin'],
    default: 'rider'
  },
  profilePicture: {
    type: String,
    default: null
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Driver specific fields
  driverInfo: {
    type: {
      licenseNumber: String,
      vehicleType: {
        type: String,
        enum: ['economy', 'standard', 'premium', 'xl', null],
        default: null
      },
      vehicleNumber: String,
      vehicleModel: String,
      rating: {
        type: Number,
        default: 5.0,
        min: 1,
        max: 5
      },
      totalRides: {
        type: Number,
        default: 0
      },
      isAvailable: {
        type: Boolean,
        default: false
      },
      currentLocation: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point'
        },
        coordinates: {
          type: [Number],
          default: [0, 0]
        }
      }
    },
    default: {}
  },
  // Rider specific fields
  riderInfo: {
    savedAddresses: [{
      label: String,
      address: String,
      coordinates: {
        type: [Number]
      }
    }],
    rating: {
      type: Number,
      default: 5.0,
      min: 1,
      max: 5
    },
    totalRides: {
      type: Number,
      default: 0
    }
  },
  // Password reset fields
  passwordResetToken: String,
  passwordResetExpires: Date
}, {
  timestamps: true
});

// Index for geospatial queries
userSchema.index({ 'driverInfo.currentLocation': '2dsphere' });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', userSchema);
