import { body, validationResult } from "express-validator";
import path from "path";
import fs from "fs/promises";
import PaymentReceipt from "../models/PaymentReceipt.js";
import Event from "../models/Event.js";
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import Ticket from "../models/Ticket.js";
import { sendNotificationToUser } from "../socket/socketHandlers.js";
import {
  generateQRCodeData,
  generateQRCodeImage
} from "../utils/ticketGenerator.js";

// Validation middleware
export const validateReceiptUpload = [
  body("eventId").isMongoId().withMessage("Valid event ID is required"),
  body("bookingId").isMongoId().withMessage("Valid booking ID is required"),
  body("amount").isNumeric().withMessage("Valid amount is required"),
  body("paymentMethod").optional().isIn(['bank_transfer', 'mobile_money', 'cash', 'card', 'other']),
  body("transactionReference").optional().isString().isLength({ max: 100 }),
  body("notes").optional().isString().isLength({ max: 500 })
];

// Upload payment receipt
export async function uploadPaymentReceipt(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: "Validation failed", 
        errors: errors.array() 
      });
    }

    const { eventId, bookingId, amount, paymentMethod, transactionReference, notes } = req.body;
    const { receiptImage, receiptImagePublicId } = req.body;

    // Verify the booking belongs to the user
    const booking = await Booking.findById(bookingId).populate('event');
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (String(booking.user) !== String(req.user.id)) {
      return res.status(403).json({ message: "You can only upload receipts for your own bookings" });
    }

    // Verify the event matches
    if (String(booking.event._id) !== String(eventId)) {
      return res.status(400).json({ message: "Event ID does not match booking" });
    }

    // Check if receipt already exists for this booking
    const existingReceipt = await PaymentReceipt.findOne({ booking: bookingId });
    if (existingReceipt) {
      return res.status(400).json({ message: "Payment receipt already uploaded for this booking" });
    }

    // Create payment receipt
    const receipt = await PaymentReceipt.create({
      user: req.user.id,
      event: eventId,
      eventCreator: booking.event.owner,
      booking: bookingId,
      receiptImage,
      receiptImagePublicId,
      amount,
      paymentMethod: paymentMethod || 'bank_transfer',
      transactionReference,
      notes,
      status: 'pending'
    });

    // Populate the receipt with user and event details
    const populatedReceipt = await PaymentReceipt.findById(receipt._id)
      .populate('user', 'name email displayPicture avatar')
      .populate('event', 'title date time location price')
      .populate('eventCreator', 'name email');

    // Create notification for event creator with detailed user information
    const notification = await Notification.create({
      user: booking.event.owner,
      type: 'payment_receipt',
      title: 'New Payment Receipt Submitted',
      message: `${req.user.name} (${req.user.email}) has uploaded a payment receipt for "${booking.event.title}"\n\nPayment Details:\n• Amount: $${amount}\n• Method: ${paymentMethod || 'Bank Transfer'}\n• Transaction Ref: ${transactionReference || 'Not provided'}\n${notes ? `• Notes: ${notes}` : ''}`,
      data: {
        receiptId: receipt._id,
        eventId,
        eventTitle: booking.event.title,
        bookingId,
        amount,
        paymentMethod: paymentMethod || 'bank_transfer',
        transactionReference,
        notes,
        userName: req.user.name,
        userEmail: req.user.email,
        userPhone: req.user.phone || 'Not provided',
        userAvatar: req.user.displayPicture || req.user.avatar,
        submittedAt: new Date().toISOString()
      },
      read: false
    });

    // Send real-time notification to event creator
    if (global.io) {
      sendNotificationToUser(global.io, booking.event.owner.toString(), {
        id: notification._id,
        type: 'payment_receipt',
        title: 'New Payment Receipt Submitted',
        message: `${req.user.name} has uploaded a payment receipt for "${booking.event.title}"`,
        data: notification.data,
        read: false,
        createdAt: notification.createdAt
      });
    }

    res.status(201).json({
      message: "Payment receipt uploaded successfully",
      receipt: populatedReceipt
    });
  } catch (error) {
    next(error);
  }
}

// Get payment receipts for event creator
export async function getPaymentReceipts(req, res, next) {
  try {
    const { status, eventId } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build query
    const query = { eventCreator: req.user.id };
    if (status) query.status = status;
    if (eventId) query.event = eventId;

    // Get receipts with pagination
    const receipts = await PaymentReceipt.find(query)
      .populate('user', 'name email displayPicture avatar')
      .populate('event', 'title date time location price')
      .populate('booking', 'ticketQuantity totalAmount')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await PaymentReceipt.countDocuments(query);

    res.json({
      receipts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
}

// Get single payment receipt by ID (authorized: event creator or receipt owner)
export async function getPaymentReceiptById(req, res, next) {
  try {
    const { receiptId } = req.params;
    const receipt = await PaymentReceipt.findById(receiptId)
      .populate('user', 'name email displayPicture avatar')
      .populate('event', 'title date time location price')
      .populate('booking');

    if (!receipt) {
      return res.status(404).json({ message: 'Payment receipt not found' });
    }

    // Authorization: only event creator or receipt owner can fetch
    const isEventCreator = String(receipt.eventCreator) === String(req.user.id);
    const isReceiptOwner = String(receipt.user) === String(req.user.id);

    if (!isEventCreator && !isReceiptOwner) {
      return res.status(403).json({ message: 'You are not authorized to view this payment receipt' });
    }

    res.json({ receipt });
  } catch (error) {
    next(error);
  }
}

// Confirm payment receipt
export async function confirmPaymentReceipt(req, res, next) {
  try {
    const { receiptId } = req.params;
    const { verificationNotes } = req.body;

    // Find the receipt
    const receipt = await PaymentReceipt.findById(receiptId)
      .populate('user', 'name email')
      .populate('event', 'title date time location status')
      .populate('booking');

    if (!receipt) {
      return res.status(404).json({ message: "Payment receipt not found" });
    }

    // Verify the user is the event creator
    if (String(receipt.eventCreator) !== String(req.user.id)) {
      return res.status(403).json({ message: "You can only confirm receipts for your own events" });
    }

    // Update receipt status
    receipt.status = 'confirmed';
    receipt.verifiedAt = new Date();
    receipt.verifiedBy = req.user.id;
    receipt.verificationNotes = verificationNotes;
    await receipt.save();

    // Update booking payment status
    const booking = receipt.booking;
    booking.paymentStatus = 'confirmed';
    booking.paymentConfirmedAt = new Date();
    await booking.save();

    // Create notification for user
    const notification = await Notification.create({
      user: receipt.user._id,
      type: 'payment_confirmed',
      title: '✅ Payment Confirmed',
      message: `Great news! Your payment for "${receipt.event.title}" has been confirmed by the event organizer.\n\nPayment Details:\n• Amount: $${receipt.amount}\n• Method: ${receipt.paymentMethod}\n• Confirmed by: ${req.user.name}\n• Event Date: ${new Date(receipt.event.date).toLocaleDateString()}\n\nYour booking is now confirmed. See you at the event!`,
      data: {
        receiptId: receipt._id,
        eventId: receipt.event._id,
        eventTitle: receipt.event.title,
        eventDate: receipt.event.date,
        eventTime: receipt.event.time,
        eventLocation: receipt.event.location,
        amount: receipt.amount,
        paymentMethod: receipt.paymentMethod,
        confirmedBy: req.user.name,
        confirmedAt: new Date().toISOString(),
        verificationNotes
      },
      read: false
    });

    // Send real-time notification to user
    if (global.io) {
      sendNotificationToUser(global.io, receipt.user._id.toString(), {
        id: notification._id,
        type: 'payment_confirmed',
        title: '✅ Payment Confirmed',
        message: `Your payment for "${receipt.event.title}" has been confirmed!`,
        data: notification.data,
        read: false,
        createdAt: notification.createdAt
      });
    }

    // Automatically generate ticket after payment confirmation
    try {
      // Check if ticket already exists
      const existingTicket = await Ticket.findOne({ paymentReceipt: receipt._id });

      if (!existingTicket) {
        // Generate unique ticket ID
        const ticketId = Ticket.generateTicketId();

        // Determine ticket type and quantity from booking
        let ticketType = 'regular';
        let quantity = receipt.booking.seats || 1;

        if (receipt.booking.ticketBreakdown && receipt.booking.ticketBreakdown.length > 0) {
          ticketType = receipt.booking.ticketBreakdown[0].type;
          quantity = receipt.booking.ticketBreakdown[0].quantity;
        }

        // Set ticket validity (valid until 24 hours after event)
        const validFrom = new Date();

        // Debug event data
        console.log('🔍 Event data for ticket generation:', {
          eventId: receipt.event._id,
          eventTitle: receipt.event.title,
          eventDate: receipt.event.date,
          eventDateType: typeof receipt.event.date,
          fullEvent: receipt.event
        });

        // Handle event date with fallback
        let eventDate;
        if (receipt.event.date) {
          eventDate = new Date(receipt.event.date);
        } else {
          // Fallback: use current date + 30 days if no event date
          console.log('⚠️ No event date found, using fallback');
          eventDate = new Date();
          eventDate.setDate(eventDate.getDate() + 30);
        }

        // Ensure event date is valid
        if (isNaN(eventDate.getTime())) {
          console.error('❌ Invalid event date:', receipt.event.date);
          console.error('❌ Event object:', receipt.event);
          // Use fallback date
          eventDate = new Date();
          eventDate.setDate(eventDate.getDate() + 30);
          console.log('🔧 Using fallback date:', eventDate);
        }

        const validUntil = new Date(eventDate);
        validUntil.setHours(validUntil.getHours() + 24);

        // Generate QR code data first
        const tempTicketData = {
          ticketId,
          event: receipt.event._id,
          user: receipt.user._id,
          booking: receipt.booking._id,
          paymentReceipt: receipt._id,
          ticketType,
          quantity,
          validFrom,
          validUntil,
          generatedAt: validFrom // Use validFrom as generatedAt
        };

        const qrData = generateQRCodeData(tempTicketData, receipt.event, receipt.user, receipt.booking);

        // Create ticket record with QR code data
        const ticket = new Ticket({
          ticketId,
          user: receipt.user,
          event: receipt.event._id,
          booking: receipt.booking._id,
          paymentReceipt: receipt._id,
          ticketType,
          quantity,
          validFrom,
          validUntil,
          qrCodeData: JSON.stringify(qrData),
          verificationHash: qrData.hash
        });

        // Save ticket with enhanced logging
        console.log('💾 Attempting to save ticket to database:', {
          ticketId: ticket.ticketId,
          userId: ticket.user,
          eventId: ticket.event,
          paymentReceiptId: ticket.paymentReceipt
        });

        const savedTicket = await ticket.save();
        console.log('✅ Ticket saved successfully to database:', {
          ticketId: savedTicket.ticketId,
          mongoId: savedTicket._id,
          createdAt: savedTicket.createdAt
        });

        // Create ticket notification
        const ticketNotification = await Notification.create({
          user: receipt.user._id,
          type: 'ticket_generated',
          title: '🎫 Your Event Ticket is Ready!',
          message: `Your ticket for "${receipt.event.title}" has been generated and is ready for download.\n\nTicket Details:\n• Ticket ID: ${ticketId}\n• Event Date: ${new Date(receipt.event.date).toLocaleDateString()}\n• Ticket Type: ${ticketType.toUpperCase()}\n• Quantity: ${quantity}\n\nPlease download and save your ticket. Present the QR code at the venue for entry.`,
          data: {
            ticketId,
            eventId: receipt.event._id,
            eventTitle: receipt.event.title,
            eventDate: receipt.event.date,
            ticketType,
            quantity,
            downloadUrl: `/api/tickets/${ticket._id}/download`
          },
          read: false
        });

        // Send real-time ticket notification
        if (global.io) {
          sendNotificationToUser(global.io, receipt.user._id.toString(), {
            id: ticketNotification._id,
            type: 'ticket_generated',
            title: '🎫 Your Event Ticket is Ready!',
            message: `Your ticket for "${receipt.event.title}" is ready for download!`,
            data: ticketNotification.data,
            read: false,
            createdAt: ticketNotification.createdAt
          });
        }

        console.log(`✅ Ticket generated automatically for payment receipt: ${receipt._id}`);
      }
    } catch (ticketError) {
      console.error('❌ Failed to generate ticket automatically:', ticketError);
      // Don't fail the payment confirmation if ticket generation fails
    }

    res.json({
      message: "Payment receipt confirmed successfully",
      receipt
    });
  } catch (error) {
    next(error);
  }
}

// Reject payment receipt
export async function rejectPaymentReceipt(req, res, next) {
  try {
    const { receiptId } = req.params;
    const { verificationNotes } = req.body;

    // Find the receipt
    const receipt = await PaymentReceipt.findById(receiptId)
      .populate('user', 'name email')
      .populate('event', 'title');

    if (!receipt) {
      return res.status(404).json({ message: "Payment receipt not found" });
    }

    // Verify the user is the event creator
    if (String(receipt.eventCreator) !== String(req.user.id)) {
      return res.status(403).json({ message: "You can only reject receipts for your own events" });
    }

    // Update receipt status
    receipt.status = 'rejected';
    receipt.verifiedAt = new Date();
    receipt.verifiedBy = req.user.id;
    receipt.verificationNotes = verificationNotes || 'Receipt rejected by event organizer';
    await receipt.save();

    // Create notification for user
    const notification = await Notification.create({
      user: receipt.user._id,
      type: 'payment_rejected',
      title: '❌ Payment Receipt Rejected',
      message: `Your payment receipt for "${receipt.event.title}" has been rejected by the event organizer.\n\nRejection Details:\n• Reason: ${verificationNotes || 'No specific reason provided'}\n• Rejected by: ${req.user.name}\n• Original Amount: $${receipt.amount}\n\nPlease review the rejection reason and resubmit a corrected payment receipt, or contact the event organizer directly for assistance.`,
      data: {
        receiptId: receipt._id,
        eventId: receipt.event._id,
        eventTitle: receipt.event.title,
        eventDate: receipt.event.date,
        eventTime: receipt.event.time,
        eventLocation: receipt.event.location,
        amount: receipt.amount,
        paymentMethod: receipt.paymentMethod,
        rejectionReason: verificationNotes || 'No specific reason provided',
        rejectedBy: req.user.name,
        rejectedAt: new Date().toISOString(),
        organizerEmail: req.user.email,
        organizerPhone: req.user.phone
      },
      read: false
    });

    // Send real-time notification to user
    if (global.io) {
      sendNotificationToUser(global.io, receipt.user._id.toString(), {
        id: notification._id,
        type: 'payment_rejected',
        title: '❌ Payment Receipt Rejected',
        message: `Your payment receipt for "${receipt.event.title}" has been rejected.`,
        data: notification.data,
        read: false,
        createdAt: notification.createdAt
      });
    }

    res.json({
      message: "Payment receipt rejected",
      receipt
    });
  } catch (error) {
    next(error);
  }
}

// Get user's payment receipts
export async function getUserPaymentReceipts(req, res, next) {
  try {
    const receipts = await PaymentReceipt.find({ user: req.user.id })
      .populate('event', 'title date time location price')
      .populate('booking', 'ticketQuantity totalAmount')
      .sort({ createdAt: -1 });

    res.json({ receipts });
  } catch (error) {
    next(error);
  }
}

// Get payment receipt image
export async function getPaymentReceiptImage(req, res, next) {
  try {
    const { receiptId } = req.params;
    console.log(`📄 Attempting to serve receipt image for ID: ${receiptId}`);

    // Find the receipt
    const receipt = await PaymentReceipt.findById(receiptId)
      .populate('event', 'title owner');

    if (!receipt) {
      console.log(`❌ Payment receipt not found: ${receiptId}`);
      return res.status(404).json({ message: "Payment receipt not found" });
    }

    console.log(`✅ Found receipt: ${receipt._id}, Image URL: ${receipt.receiptImage}`);

    // Check if user is authorized to view this receipt
    // Either the event creator or the user who submitted the receipt
    const isEventCreator = String(receipt.event.owner) === String(req.user.id);
    const isReceiptOwner = String(receipt.user) === String(req.user.id);

    console.log(`🔐 Authorization check - User: ${req.user.id}, Event Owner: ${receipt.event.owner}, Receipt Owner: ${receipt.user}`);
    console.log(`🔐 Is Event Creator: ${isEventCreator}, Is Receipt Owner: ${isReceiptOwner}`);

    if (!isEventCreator && !isReceiptOwner) {
      console.log(`❌ Unauthorized access attempt for receipt: ${receiptId}`);
      return res.status(403).json({
        message: "You are not authorized to view this payment receipt"
      });
    }

    // Check if receipt has an image URL
    if (!receipt.receiptImage) {
      console.log(`❌ No receipt image URL found for receipt: ${receiptId}`);
      return res.status(404).json({ message: "No receipt image found" });
    }

    console.log(`📁 Serving receipt image from URL: ${receipt.receiptImage}`);

    // If it's a local file (starts with http://localhost), serve it directly
    if (receipt.receiptImage.includes('localhost')) {
      // Extract the file path from the URL
      const urlParts = receipt.receiptImage.split('/uploads/');
      if (urlParts.length === 2) {
        const filename = urlParts[1];
        const filePath = path.join(process.cwd(), 'uploads', filename);

        console.log(`📁 Attempting to serve local file: ${filePath}`);

        // Check if file exists
        try {
          await fs.access(filePath);
          console.log(`✅ File exists, serving: ${filePath}`);
          // Serve the file
          return res.sendFile(filePath);
        } catch (fileError) {
          console.log(`❌ File not found: ${filePath}`, fileError.message);
          return res.status(404).json({ message: "Receipt image file not found" });
        }
      }
    }

    // For external URLs (like Cloudinary), redirect to the URL
    console.log(`🔗 Redirecting to external URL: ${receipt.receiptImage}`);
    res.redirect(receipt.receiptImage);
  } catch (error) {
    next(error);
  }
}
