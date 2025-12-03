import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema({
  // Unique ticket identifier
  ticketId: { 
    type: String, 
    required: true, 
    unique: true,
    // index: true, // Removed to avoid duplicate index warning
  },
  
  // References
  event: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Event", 
    required: true 
  },
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  booking: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Booking", 
    required: true 
  },
  paymentReceipt: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "PaymentReceipt", 
    required: true 
  },

  // Ticket details
  ticketType: { 
    type: String, 
    required: true,
    enum: ['vvip', 'vip', 'standard', 'tableFor2', 'tableFor5', 'regular']
  },
  quantity: { 
    type: Number, 
    required: true, 
    min: 1 
  },
  seatNumber: { type: String }, // Optional seat assignment
  section: { type: String }, // Optional section assignment

  // Security and validation
  qrCodeData: { 
    type: String, 
    required: true 
  },
  verificationHash: { 
    type: String, 
    required: true 
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['active', 'used', 'cancelled', 'expired'],
    default: 'active'
  },
  
  // Usage tracking
  usedAt: { type: Date },
  usedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  }, // Event organizer who scanned the ticket
  
  // Validity
  validFrom: { type: Date, required: true },
  validUntil: { type: Date, required: true },
  
  // Additional metadata
  downloadCount: { type: Number, default: 0 },
  lastDownloaded: { type: Date },
  
  // Ticket generation details
  generatedAt: { type: Date, default: Date.now },
  pdfUrl: { type: String }, // URL to generated PDF ticket
  
}, { timestamps: true });

// Indexes for performance
ticketSchema.index({ event: 1, user: 1 });
// ticketSchema.index({ ticketId: 1 }); // Removed to avoid duplicate index warning
ticketSchema.index({ status: 1 });
ticketSchema.index({ validUntil: 1 });

// Virtual for checking if ticket is valid
ticketSchema.virtual('isValid').get(function() {
  const now = new Date();
  return this.status === 'active' && 
         this.validFrom <= now && 
         this.validUntil >= now;
});

// Method to mark ticket as used
ticketSchema.methods.markAsUsed = function(scannedBy) {
  this.status = 'used';
  this.usedAt = new Date();
  this.usedBy = scannedBy;
  return this.save();
};

// Method to increment download count
ticketSchema.methods.recordDownload = function() {
  this.downloadCount += 1;
  this.lastDownloaded = new Date();
  return this.save();
};

// Static method to generate unique ticket ID
ticketSchema.statics.generateTicketId = function() {
  const prefix = 'TKT';
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const timestamp = Date.now().toString().slice(-6);
  return `${prefix}-${year}-${random}${timestamp}`;
};

export default mongoose.model("Ticket", ticketSchema);
