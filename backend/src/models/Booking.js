import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  seats: { type: Number, default: 1, min: 1 },
  status: { type: String, enum: ["pending","confirmed","cancelled","checked-in"], default: "pending" },

  // Enhanced booking data
  paymentMethod: { type: String, enum: ["online", "pay-at-event", "bank_transfer", "cashapp", "paypal", "bitcoin"], default: "online" },
  notes: { type: String, default: "" },

  // Ticket breakdown for multi-ticket bookings
  ticketBreakdown: [{
    type: { type: String, required: true }, // e.g., "vip", "standard", "regular"
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number }, // Price per ticket for this type
  }],

  // Attendee information
  attendeeInfo: {
    name: { type: String },
    email: { type: String },
    phone: { type: String }
  },

  // Payment tracking (legacy support)
  ticketQuantity: { type: Number, default: 1 },
  totalAmount: { type: Number },
  paymentStatus: { type: String, enum: ["pending", "confirmed", "rejected"], default: "pending" },
  paymentConfirmedAt: { type: Date }
},{ timestamps: true });

export default mongoose.model("Booking", bookingSchema);
