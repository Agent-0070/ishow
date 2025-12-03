import User from "../models/User.js";
import Event from "../models/Event.js";
import Booking from "../models/Booking.js";

export async function dashboard(req,res,next){
  try{
    const [users, events, bookings] = await Promise.all([
      User.countDocuments(),
      Event.countDocuments(),
      Booking.countDocuments(),
    ]);
    res.json({ users, events, bookings });
  }catch(e){ next(e); }
}

export async function eventAnalytics(req,res,next){
  try{
    const { eventId } = req.params;
    const totalBookings = await Booking.countDocuments({ event: eventId });
    const checkedIn = await Booking.countDocuments({ event: eventId, status: "checked-in" });
    res.json({ totalBookings, checkedIn });
  }catch(e){ next(e); }
}

export async function platformAnalytics(req,res,next){
  try{
    const byStatus = await Event.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
    res.json({ byStatus });
  }catch(e){ next(e); }
}
