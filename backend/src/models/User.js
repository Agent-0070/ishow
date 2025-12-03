import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    // index: true, // Removed to avoid duplicate index warning
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  avatar: {
    type: String,
    default: null
  },
  displayPicture: {
    type: String,
    default: null
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },
  homeAddress: {
    type: String,
    maxlength: [200, 'Home address cannot exceed 200 characters']
  },
  companyAddress: {
    type: String,
    maxlength: [200, 'Company address cannot exceed 200 characters']
  },
  companyDescription: {
    type: String,
    maxlength: [1000, 'Company description cannot exceed 1000 characters']
  },
  hostingCountries: [{
    type: String,
    trim: true
  }],
  partners: [{
    name: String,
    description: String,
    website: String
  }],
  
  // User statistics
  successfulEvents: {
    type: Number,
    default: 0
  },
  totalEventsCreated: {
    type: Number,
    default: 0
  },
  totalEventsAttended: {
    type: Number,
    default: 0
  },
  
  // Comments received about this user from other users
  receivedComments: [{
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    fromUserName: {
      type: String,
      required: true
    },
    fromUserAvatar: String,
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true
    },
    eventName: {
      type: String,
      required: true
    },
    comment: {
      type: String,
      required: true,
      maxlength: [500, 'Comment cannot exceed 500 characters']
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // User's created events
  createdEvents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  }],
  
  // Events user has booked
  bookedEvents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  }],
  
  // Account status
  isRestricted: {
    type: Boolean,
    default: false
  },
  isBanned: {
    type: Boolean,
    default: false
  },
  banReason: String,
  restrictionReason: String,
  
  // Email verification
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  
  // Password reset
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  // Last login tracking
  lastLogin: Date,
  loginCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
// userSchema.index({ email: 1 }); // Removed to avoid duplicate index warning
userSchema.index({ role: 1 });
userSchema.index({ isRestricted: 1, isBanned: 1 });
userSchema.index({ createdAt: -1 });

// Virtual for average rating
userSchema.virtual('averageRating').get(function() {
  if (!this.receivedComments || this.receivedComments.length === 0) {
    return 0;
  }
  const total = this.receivedComments.reduce((sum, comment) => sum + comment.rating, 0);
  return Math.round((total / this.receivedComments.length) * 10) / 10;
});

// Virtual for total comments count
userSchema.virtual('totalComments').get(function() {
  return this.receivedComments ? this.receivedComments.length : 0;
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT token
userSchema.methods.generateAuthToken = function() {
  const payload = {
    userId: this._id,
    email: this.email,
    role: this.role,
    name: this.name
  };
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// Generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
  const resetToken = crypto.randomBytes(20).toString('hex');
  
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return resetToken;
};

// Method to check if user can create events
userSchema.methods.canCreateEvents = function() {
  return !this.isRestricted && !this.isBanned;
};

// Method to check if user can book events
userSchema.methods.canBookEvents = function() {
  return !this.isBanned;
};

// Static method to find by credentials
userSchema.statics.findByCredentials = async function(email, password) {
  const user = await this.findOne({ email }).select('+password');
  
  if (!user) {
    throw new Error('Invalid login credentials');
  }
  
  const isMatch = await user.comparePassword(password);
  
  if (!isMatch) {
    throw new Error('Invalid login credentials');
  }
  
  // Update login tracking
  user.lastLogin = new Date();
  user.loginCount += 1;
  await user.save();
  
  return user;
};

export default mongoose.model('User', userSchema);
