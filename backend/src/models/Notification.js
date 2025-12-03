import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: {
    type: String,
    enum: [
      'payment_receipt',
      'payment_confirmed',
      'payment_rejected',
      'event_postponed',
      'event_cancelled',
      'event_update',
      'booking_confirmed',
      'booking_cancelled'
    ],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: { type: Object, default: {} }, // Additional data for the notification
  read: { type: Boolean, default: false }
},{ timestamps: true });

export default mongoose.model("Notification", notificationSchema);
