import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  targetType: { type: String, enum: ["event","user"], required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true },
  rating: { type: Number, min: 1, max: 5 },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event" },
  eventName: { type: String },

  // Reply functionality
  parentComment: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: null },
  replies: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
  isReply: { type: Boolean, default: false }
},{ timestamps: true });

export default mongoose.model("Comment", commentSchema);
