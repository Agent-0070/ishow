import mongoose from "mongoose";

export async function connectDB(uri){
  try {
    mongoose.set("strictQuery", true);
    await mongoose.connect(uri);
    console.log("✅ MongoDB connected");
  } catch (e) {
    console.error("❌ DB error:", e.message);
    process.exit(1);
  }
}
