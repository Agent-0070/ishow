import { body, validationResult } from "express-validator";
import Booking from "../models/Booking.js";
import Event from "../models/Event.js";

export const validateBooking = [
  body("eventId").isString(),
  body("seats").optional().isInt({ min: 1 }).toInt(),
  body("tickets").optional().isArray(),
  body("paymentMethod").optional().isString(),
  body("attendeeInfo").optional().isObject(),
  body("notes").optional().isString(),
];

export async function createBooking(req,res,next){
  try{
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const {
      eventId,
      seats,
      tickets,
      paymentMethod = 'online',
      attendeeInfo,
      notes = ''
    } = req.body;

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (String(event.owner) === req.user.id) return res.status(400).json({ message: "Cannot book your own event" });

    // Prevent booking cancelled events
    if (event.status === 'cancelled') {
      return res.status(400).json({ message: "Cannot book a cancelled event" });
    }

    // Handle both old format (seats) and new format (tickets array)
    let totalSeats = 1;
    let ticketBreakdown = [];

    if (tickets && Array.isArray(tickets)) {
      // New format with ticket breakdown
      totalSeats = tickets.reduce((sum, ticket) => sum + (ticket.quantity || 0), 0);
      ticketBreakdown = tickets.filter(ticket => ticket.quantity > 0);
    } else if (seats) {
      // Old format with just seat count
      totalSeats = seats;
    }

    if (totalSeats <= 0) {
      return res.status(400).json({ message: "Must book at least one ticket" });
    }

    // Check if event has enough capacity
    const currentBookedSlots = event.bookedSlots || 0;
    const totalSlots = event.totalSlots || 0;

    if (currentBookedSlots + totalSeats > totalSlots) {
      return res.status(400).json({ message: "Not enough tickets available" });
    }

    // Create booking with enhanced data
    const bookingData = {
      event: event._id,
      user: req.user.id,
      seats: totalSeats,
      paymentMethod,
      notes,
      status: paymentMethod === 'pay-at-event' ? 'confirmed' : 'pending',
      ...(ticketBreakdown.length > 0 && { ticketBreakdown }),
      ...(attendeeInfo && { attendeeInfo })
    };

    const booking = await Booking.create(bookingData);

    // Update event's booked slots
    await Event.findByIdAndUpdate(eventId, {
      $inc: { bookedSlots: totalSeats }
    });

    res.status(201).json(booking);
  }catch(e){ next(e); }
}

export async function myBookings(req,res,next){
  try{
    const bookings = await Booking.find({ user: req.user.id }).populate("event").sort({ createdAt: -1 });
    res.json(bookings);
  }catch(e){ next(e); }
}

export async function eventBookings(req,res,next){
  try{
    const { eventId } = req.params;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (String(event.owner) !== req.user.id) return res.status(403).json({ message: "Forbidden" });
    const bookings = await Booking.find({ event: eventId }).populate("user","name email");
    res.json(bookings);
  }catch(e){ next(e); }
}

export async function checkinBooking(req,res,next){
  try{
    const { id } = req.params;
    const booking = await Booking.findByIdAndUpdate(id, { status: "checked-in" }, { new: true });
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.json(booking);
  }catch(e){ next(e); }
}
