import mongoose from "mongoose";

const paymentReceiptSchema = new mongoose.Schema({
  // User who uploaded the receipt
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  
  // Event for which payment was made
  event: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Event", 
    required: true 
  },
  
  // Event creator (who will verify the receipt)
  eventCreator: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  
  // Booking reference
  booking: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Booking", 
    required: true 
  },
  
  // Receipt details
  receiptImage: { 
    type: String, 
    required: true 
  },
  receiptImagePublicId: { 
    type: String 
  },
  
  // Payment information
  amount: { 
    type: Number, 
    required: true 
  },
  currency: { 
    type: String, 
    default: 'USD' 
  },
  paymentMethod: { 
    type: String, 
    enum: ['bank_transfer', 'mobile_money', 'cash', 'card', 'other'],
    default: 'bank_transfer'
  },
  transactionReference: { 
    type: String 
  },
  
  // Status tracking
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'rejected'],
    default: 'pending'
  },
  
  // Verification details
  verifiedAt: { 
    type: Date 
  },
  verifiedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  },
  verificationNotes: { 
    type: String 
  },
  
  // Additional notes from user
  notes: { 
    type: String 
  }
}, { 
  timestamps: true 
});

// Indexes for efficient queries
paymentReceiptSchema.index({ eventCreator: 1, status: 1 });
paymentReceiptSchema.index({ user: 1, event: 1 });
paymentReceiptSchema.index({ event: 1, status: 1 });

export default mongoose.model("PaymentReceipt", paymentReceiptSchema);
