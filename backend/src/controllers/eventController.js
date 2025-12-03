import { body, validationResult } from "express-validator";
import Event from "../models/Event.js";
import Comment from "../models/Comment.js";
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { sendNotificationToUsers } from "../socket/socketHandlers.js";

export const validateEvent = [
  body("title").isString().isLength({ min: 3 }),
  body("date").isISO8601().toDate(),
  body("location").isString().isLength({ min: 2 }),
  body("capacity").optional().isInt({ min: 0 }).toInt(),
];

export const validateEventUpdate = [
  body("title").optional().isString().isLength({ min: 3, max: 200 }),
  body("description").optional().isString().isLength({ max: 5000 }),
  body("date").optional().isISO8601().toDate(),
  body("time").optional().isString().isLength({ min: 1, max: 20 }),
  body("location").optional().isString().isLength({ min: 2, max: 300 }),
  body("capacity").optional().isInt({ min: 0 }).toInt(),
  body("totalSlots").optional().isInt({ min: 0 }).toInt(),
  body("bookedSlots").optional().isInt({ min: 0 }).toInt(),
  body("currency").optional().isIn(['USD','EUR','GBP','CAD','AUD','JPY','KRW','BRL','MXN','INR','CNY','NGN','ZAR','KES','GHS']),
  body("price").optional().isFloat({ min: 0 }).toFloat(),
  body("ticketPricing").optional().isObject(),
  body("paymentMethods").optional().isArray({ max: 20 }),
  body("paymentMethods.*.type").optional().isIn(['bank_transfer','cashapp','paypal','bitcoin','pay_at_event']),
  body("paymentMethods.*.isActive").optional().isBoolean(),
];


export async function listEvents(req,res,next){
  try{
    // Include all events (including cancelled) but sort them appropriately
    const events = await Event.find({}).populate("owner","name email avatar displayPicture").sort({
      status: 1, // Show active events first
      date: 1
    });
    res.json(events);
  }catch(e){ next(e); }
}

export async function getEvent(req,res,next){
  try{
    const event = await Event.findById(req.params.id).populate("owner","name email avatar displayPicture");
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json(event);
  }catch(e){ next(e); }
}

export async function createEvent(req,res,next){
  try{
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    // Only accept Cloudinary URLs provided in body.images
    const images = Array.isArray(req.body.images) ? req.body.images : [];

    const event = await Event.create({ ...req.body, images, owner: req.user.id });
    res.status(201).json(event);
  }catch(e){ next(e); }
}

export async function updateEvent(req,res,next){
  try{
    const allowed = [
      "title","description","date","time","location","capacity","totalSlots","bookedSlots",
      "currency","price","ticketPricing","paymentMethods","status"
    ];
    const updates = allowed.reduce((acc,k)=>{ if (k in req.body) acc[k]=req.body[k]; return acc; },{});
    const event = await Event.findOneAndUpdate({ _id: req.params.id, owner: req.user.id }, updates, { new: true });
    if (!event) return res.status(404).json({ message: "Not found or not owner" });
    res.json(event);
  }catch(e){ next(e); }
}

export async function deleteEvent(req,res,next){
  try{
    // First check if event exists and user is owner
    const event = await Event.findOne({ _id: req.params.id, owner: req.user.id });
    if (!event) return res.status(404).json({ message: "Not found or not owner" });

    // Check if event has any bookings
    const bookingCount = await Booking.countDocuments({ event: event._id });

    if (bookingCount > 0) {
      return res.status(400).json({
        message: "Cannot delete event with existing bookings. Cancel the event instead.",
        bookingCount,
        canDelete: false
      });
    }

    // If no bookings, proceed with deletion
    await Event.findByIdAndDelete(event._id);
    res.json({ message: "Event deleted successfully" });
  }catch(e){ next(e); }
}

export async function updateStatus(req,res,next){
  try{
    const { status, reason, newDate, newTime, newLocation } = req.body;

    console.log('🔄 Event status update request:', {
      eventId: req.params.id,
      status,
      reason,
      newDate,
      newTime,
      newLocation
    });

    const event = await Event.findOne({ _id: req.params.id, owner: req.user.id });
    if (!event) return res.status(404).json({ message: "Not found or not owner" });

    // Store original values if postponing for the first time
    if (status === 'postponed' && event.status !== 'postponed') {
      event.statusDetails = {
        message: reason,
        updatedAt: new Date(),
        originalDate: event.date,
        originalTime: event.time,
        originalLocation: event.location,
        ...(newDate && { newDate: new Date(newDate) }),
        ...(newTime && { newTime }),
        ...(newLocation && { newLocation })
      };

      // Update the main event fields with new values if provided
      if (newDate) event.date = new Date(newDate);
      if (newTime) event.time = newTime;
      if (newLocation) event.location = newLocation;
    } else if (status === 'postponed' && event.status === 'postponed') {
      // Update existing postponement
      event.statusDetails = {
        ...event.statusDetails,
        message: reason,
        updatedAt: new Date(),
        ...(newDate && { newDate: new Date(newDate) }),
        ...(newTime && { newTime }),
        ...(newLocation && { newLocation })
      };

      // Update the main event fields with new values if provided
      if (newDate) event.date = new Date(newDate);
      if (newTime) event.time = newTime;
      if (newLocation) event.location = newLocation;
    } else if (status === 'cancelled') {
      event.statusDetails = {
        message: reason,
        updatedAt: new Date()
      };
    }

    event.status = status;
    await event.save();

    console.log('✅ Event saved with new status:', {
      eventId: event._id,
      status: event.status,
      date: event.date,
      time: event.time,
      location: event.location,
      statusDetails: event.statusDetails
    });

    // Send notifications to all booked users for postponed or cancelled events
    if (status === 'postponed' || status === 'cancelled') {
      try {
        // Get all users who have booked this event AND have confirmed payments
        const bookings = await Booking.find({
          event: event._id,
          paymentStatus: 'confirmed'
        }).populate('user', 'name email');
        const bookedUsers = bookings.map(booking => booking.user).filter(Boolean);

        if (bookedUsers.length > 0) {
          let notificationTitle, notificationMessage;

          if (status === 'postponed') {
            notificationTitle = 'Event Postponed';
            notificationMessage = `The event "${event.title}" has been postponed. ${reason}`;

            // Add new date/time/location info if provided
            if (newDate) {
              notificationMessage += `\n\nNew Date: ${new Date(newDate).toLocaleDateString()}`;
            }
            if (newTime) {
              notificationMessage += `\nNew Time: ${newTime}`;
            }
            if (newLocation) {
              notificationMessage += `\nNew Location: ${newLocation}`;
            }
          } else if (status === 'cancelled') {
            notificationTitle = 'Event Cancelled';
            notificationMessage = `The event "${event.title}" has been cancelled. ${reason}`;
          }

          // Create notifications for each booked user
          const notifications = bookedUsers.map(user => ({
            user: user._id,
            type: status === 'postponed' ? 'event_postponed' : 'event_cancelled',
            title: notificationTitle,
            message: notificationMessage,
            data: {
              eventId: event._id,
              eventTitle: event.title,
              updateType: status,
              reason: reason,
              ...(status === 'postponed' && newDate && { newDate }),
              ...(status === 'postponed' && newTime && { newTime }),
              ...(status === 'postponed' && newLocation && { newLocation }),
              originalDate: event.statusDetails?.originalDate || event.date,
              originalTime: event.statusDetails?.originalTime || event.time,
              originalLocation: event.statusDetails?.originalLocation || event.location
            },
            read: false
          }));

          // Save all notifications
          const savedNotifications = await Notification.insertMany(notifications);

          // Send real-time notifications via Socket.io
          if (global.io && savedNotifications.length > 0) {
            const userIds = bookedUsers.map(user => user._id.toString());
            const notificationData = {
              type: status === 'postponed' ? 'event_postponed' : 'event_cancelled',
              title: notificationTitle,
              message: notificationMessage,
              data: {
                eventId: event._id,
                eventTitle: event.title,
                updateType: status,
                reason: reason,
                ...(status === 'postponed' && newDate && { newDate }),
                ...(status === 'postponed' && newTime && { newTime }),
                ...(status === 'postponed' && newLocation && { newLocation }),
                originalDate: event.statusDetails?.originalDate || event.date,
                originalTime: event.statusDetails?.originalTime || event.time,
                originalLocation: event.statusDetails?.originalLocation || event.location
              },
              read: false,
              createdAt: new Date()
            };

            const sentCount = sendNotificationToUsers(global.io, userIds, notificationData);
            console.log(`🔔 Real-time notifications sent to ${sentCount}/${userIds.length} connected users`);
          }

          console.log(`✅ Sent ${status} notifications to ${bookedUsers.length} users for event: ${event.title}`);
        }
      } catch (notificationError) {
        console.error('❌ Failed to send notifications:', notificationError);
        // Don't fail the main operation if notifications fail
      }
    }

    res.json(event);
  }catch(e){ next(e); }
}

export async function myEvents(req,res,next){
  try{
    const events = await Event.find({ owner: req.user.id }).sort({ createdAt: -1 });
    res.json(events);
  }catch(e){ next(e); }
}

export async function addEventComment(req,res,next){
  try{
    const text = req.body.text || req.body.comment;
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ message: "Comment text is required" });
    }
    const c = await Comment.create({ targetType: "event", targetId: req.params.id, user: req.user.id, text: text.trim() });
    res.status(201).json(c);
  }catch(e){ next(e); }
}

export async function sendEventNotification(req,res,next){
  try{
    const eventId = req.params.id;
    const { type, message, eventTitle, newDate, newTime } = req.body;

    // Verify the event exists and user is the owner
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (String(event.owner) !== String(req.user.id)) {
      return res.status(403).json({ message: "Only event owner can send notifications" });
    }

    // Get all users who have booked this event
    const bookings = await Booking.find({ event: eventId }).populate('user', 'name email');
    const bookedUsers = bookings.map(booking => booking.user).filter(Boolean);

    if (bookedUsers.length === 0) {
      return res.json({ message: "No attendees to notify", notificationsSent: 0 });
    }

    // Create notifications for each booked user
    const notifications = bookedUsers.map(user => ({
      user: user._id,
      type: 'event_update',
      title: type === 'postponed' ? 'Event Postponed' : 'Event Cancelled',
      message: message,
      data: {
        eventId,
        eventTitle,
        updateType: type,
        ...(newDate && { newDate }),
        ...(newTime && { newTime })
      },
      read: false
    }));

    // Save all notifications
    const savedNotifications = await Notification.insertMany(notifications);

    // Send real-time notifications via Socket.io
    if (global.io && savedNotifications.length > 0) {
      const userIds = bookedUsers.map(user => user._id.toString());
      const notificationData = {
        type: 'event_update',
        title: type === 'postponed' ? 'Event Postponed' : 'Event Cancelled',
        message: message,
        data: {
          eventId,
          eventTitle,
          updateType: type,
          ...(newDate && { newDate }),
          ...(newTime && { newTime })
        },
        read: false,
        createdAt: new Date()
      };

      const sentCount = sendNotificationToUsers(global.io, userIds, notificationData);
      console.log(`🔔 Real-time notifications sent to ${sentCount}/${userIds.length} connected users`);
    }

    res.json({
      message: "Notifications sent successfully",
      notificationsSent: bookedUsers.length,
      notifiedUsers: bookedUsers.map(user => ({ id: user._id, name: user.name, email: user.email }))
    });
  }catch(e){ next(e); }
}
