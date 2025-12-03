import mongoose from "mongoose";

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  date: { type: Date, required: true },
  time: { type: String },
  location: { type: String, required: true },
  images: [String],
  capacity: { type: Number, default: 0 },
  totalSlots: { type: Number, default: 0 },
  bookedSlots: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },
  price: { type: Number },
  ticketPricing: {
    vvip: { price: Number, slots: Number, includes: [String] },
    vip: { price: Number, slots: Number, includes: [String] },
    standard: { price: Number, slots: Number, includes: [String] },
    tableFor2: { price: Number, slots: Number, includes: [String] },
    tableFor5: { price: Number, slots: Number, includes: [String] },
    regular: { price: Number, slots: Number, includes: [String] },
  },
  paymentMethods: [{
    id: String,
    type: { type: String, enum: ['bank_transfer','cashapp','paypal','bitcoin','pay_at_event'] },
    isActive: { type: Boolean, default: true },
    details: { type: Object },
  }],
  status: { type: String, enum: ["draft","published","cancelled","postponed"], default: "published" },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  // Postponement/Cancellation details
  statusDetails: {
    message: String,
    updatedAt: Date,
    newDate: Date,
    newTime: String,
    newLocation: String,
    originalDate: Date,
    originalTime: String,
    originalLocation: String
  },
},{ timestamps: true });

export default mongoose.model("Event", eventSchema);
