import Ticket from "../models/Ticket.js";
import Event from "../models/Event.js";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import PaymentReceipt from "../models/PaymentReceipt.js";
import Notification from "../models/Notification.js";
import { 
  generateQRCodeData, 
  generateQRCodeImage, 
  generateTicketHTML,
  verifyTicketHash 
} from "../utils/ticketGenerator.js";
import { sendNotificationToUser } from "../socket/socketHandlers.js";

// Generate ticket after payment confirmation
export async function generateTicket(req, res, next) {
  try {
    const { paymentReceiptId } = req.body;

    // Get payment receipt with populated data
    const paymentReceipt = await PaymentReceipt.findById(paymentReceiptId)
      .populate('user', 'name email phone displayPicture')
      .populate('event', 'title date time location owner')
      .populate('booking', 'ticketBreakdown seats paymentMethod');

    if (!paymentReceipt) {
      return res.status(404).json({ message: "Payment receipt not found" });
    }

    if (paymentReceipt.status !== 'confirmed') {
      return res.status(400).json({ message: "Payment must be confirmed before generating ticket" });
    }

    // Check if ticket already exists
    const existingTicket = await Ticket.findOne({ paymentReceipt: paymentReceiptId });
    if (existingTicket) {
      return res.status(400).json({ 
        message: "Ticket already generated for this payment",
        ticket: existingTicket 
      });
    }

    // Generate unique ticket ID
    const ticketId = Ticket.generateTicketId();

    // Determine ticket type and quantity from booking
    const booking = paymentReceipt.booking;
    let ticketType = 'regular';
    let quantity = booking.seats || 1;

    if (booking.ticketBreakdown && booking.ticketBreakdown.length > 0) {
      // Use the first ticket type from breakdown (could be enhanced for multiple types)
      ticketType = booking.ticketBreakdown[0].type;
      quantity = booking.ticketBreakdown[0].quantity;
    }

    // Set ticket validity (valid until 24 hours after event)
    const validFrom = new Date();
    const validUntil = new Date(paymentReceipt.event.date);
    validUntil.setHours(validUntil.getHours() + 24);

    // Create ticket record
    const ticket = new Ticket({
      ticketId,
      event: paymentReceipt.event._id,
      user: paymentReceipt.user._id,
      booking: paymentReceipt.booking._id,
      paymentReceipt: paymentReceipt._id,
      ticketType,
      quantity,
      validFrom,
      validUntil,
      qrCodeData: '', // Will be set after QR generation
      verificationHash: '' // Will be set after QR generation
    });

    // Generate QR code data
    const qrData = generateQRCodeData(ticket, paymentReceipt.event, paymentReceipt.user, booking);
    
    // Generate QR code image
    const qrCodeImage = await generateQRCodeImage(qrData);

    // Update ticket with QR data
    ticket.qrCodeData = JSON.stringify(qrData);
    ticket.verificationHash = qrData.hash;

    // Save ticket
    await ticket.save();

    // Generate ticket HTML (for future PDF generation)
    const ticketHTML = generateTicketHTML(
      ticket, 
      paymentReceipt.event, 
      paymentReceipt.user, 
      booking, 
      qrCodeImage
    );

    // Create notification for user about ticket availability
    const notification = await Notification.create({
      user: paymentReceipt.user._id,
      type: 'ticket_generated',
      title: '🎫 Your Event Ticket is Ready!',
      message: `Your ticket for "${paymentReceipt.event.title}" has been generated and is ready for download.\n\nTicket Details:\n• Ticket ID: ${ticketId}\n• Event Date: ${new Date(paymentReceipt.event.date).toLocaleDateString()}\n• Ticket Type: ${ticketType.toUpperCase()}\n• Quantity: ${quantity}\n\nPlease download and save your ticket. Present the QR code at the venue for entry.`,
      data: {
        ticketId,
        eventId: paymentReceipt.event._id,
        eventTitle: paymentReceipt.event.title,
        eventDate: paymentReceipt.event.date,
        ticketType,
        quantity,
        downloadUrl: `/api/tickets/${ticket._id}/download`
      },
      read: false
    });

    // Send real-time notification
    if (global.io) {
      sendNotificationToUser(global.io, paymentReceipt.user._id.toString(), {
        id: notification._id,
        type: 'ticket_generated',
        title: '🎫 Your Event Ticket is Ready!',
        message: `Your ticket for "${paymentReceipt.event.title}" is ready for download!`,
        data: notification.data,
        read: false,
        createdAt: notification.createdAt
      });
    }

    res.status(201).json({
      message: "Ticket generated successfully",
      ticket: {
        id: ticket._id,
        ticketId: ticket.ticketId,
        eventTitle: paymentReceipt.event.title,
        ticketType,
        quantity,
        validUntil: ticket.validUntil,
        downloadUrl: `/api/tickets/${ticket._id}/download`
      },
      qrCodeImage // Include QR code for immediate display
    });

  } catch (error) {
    console.error('Error generating ticket:', error);
    next(error);
  }
}

// Get user's tickets
export async function getUserTickets(req, res, next) {
  try {
    const userId = req.user.id;
    console.log('🎫 Fetching tickets for user:', userId);

    const tickets = await Ticket.find({ user: userId })
      .populate('event', 'title date time location status')
      .populate('booking', 'paymentMethod')
      .sort({ createdAt: -1 });

    console.log(`🎫 Found ${tickets.length} tickets for user ${userId}`);

    if (tickets.length > 0) {
      console.log('🎫 Ticket details:', tickets.map(t => ({
        ticketId: t.ticketId,
        eventTitle: t.event?.title,
        status: t.status,
        createdAt: t.createdAt
      })));
    } else {
      console.log('🎫 No tickets found for user. Checking database...');

      // Debug: Check if any tickets exist at all
      const totalTickets = await Ticket.countDocuments();
      console.log(`🎫 Total tickets in database: ${totalTickets}`);

      // Debug: Check if user has any payment receipts
      const userReceipts = await PaymentReceipt.countDocuments({ user: userId });
      console.log(`💳 User has ${userReceipts} payment receipts`);
    }

    res.json({
      tickets: tickets.map(ticket => ({
        id: ticket._id,
        ticketId: ticket.ticketId,
        event: ticket.event,
        ticketType: ticket.ticketType,
        quantity: ticket.quantity,
        status: ticket.status,
        validUntil: ticket.validUntil,
        isValid: ticket.isValid,
        downloadCount: ticket.downloadCount,
        createdAt: ticket.createdAt,
        downloadUrl: `/api/tickets/${ticket._id}/download`
      }))
    });

  } catch (error) {
    console.error('❌ Error fetching tickets:', error);
    next(error);
  }
}

// Download ticket (HTML format for now, can be extended to PDF)
export async function downloadTicket(req, res, next) {
  try {
    const ticketId = req.params.id;
    const userId = req.user.id;

    const ticket = await Ticket.findOne({ _id: ticketId, user: userId })
      .populate('event', 'title date time location')
      .populate('user', 'name email')
      .populate('booking', 'paymentMethod');

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    if (!ticket.isValid) {
      return res.status(400).json({ message: "Ticket is no longer valid" });
    }

    // Parse QR code data
    const qrData = JSON.parse(ticket.qrCodeData);
    
    // Generate QR code image
    const qrCodeImage = await generateQRCodeImage(qrData);

    // Generate ticket HTML
    const ticketHTML = generateTicketHTML(
      ticket, 
      ticket.event, 
      ticket.user, 
      ticket.booking, 
      qrCodeImage
    );

    // Record download
    await ticket.recordDownload();

    // Set response headers for HTML download
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="ticket-${ticket.ticketId}.html"`);
    
    res.send(ticketHTML);

  } catch (error) {
    next(error);
  }
}

// Validate ticket (for event organizers)
export async function validateTicket(req, res, next) {
  try {
    const { qrData } = req.body;

    if (!qrData) {
      return res.status(400).json({ message: "QR code data is required" });
    }

    let parsedData;
    try {
      parsedData = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
    } catch (error) {
      return res.status(400).json({ message: "Invalid QR code format" });
    }

    // Verify hash
    const isValidHash = verifyTicketHash(
      { ...parsedData, hash: undefined }, 
      parsedData.hash
    );

    if (!isValidHash) {
      return res.status(400).json({ 
        message: "Invalid ticket - security verification failed",
        valid: false 
      });
    }

    // Find ticket in database
    const ticket = await Ticket.findOne({ ticketId: parsedData.ticketId })
      .populate('event', 'title date time location owner')
      .populate('user', 'name email');

    if (!ticket) {
      return res.status(404).json({ 
        message: "Ticket not found in database",
        valid: false 
      });
    }

    // Check if user is event organizer
    if (String(ticket.event.owner) !== String(req.user.id)) {
      return res.status(403).json({ 
        message: "Only event organizers can validate tickets",
        valid: false 
      });
    }

    // Check ticket validity
    if (!ticket.isValid) {
      return res.status(400).json({ 
        message: `Ticket is ${ticket.status}`,
        valid: false,
        status: ticket.status 
      });
    }

    // Check if already used
    if (ticket.status === 'used') {
      return res.status(400).json({ 
        message: "Ticket has already been used",
        valid: false,
        usedAt: ticket.usedAt,
        usedBy: ticket.usedBy 
      });
    }

    res.json({
      message: "Ticket is valid",
      valid: true,
      ticket: {
        ticketId: ticket.ticketId,
        eventTitle: ticket.event.title,
        attendeeName: ticket.user.name,
        attendeeEmail: ticket.user.email,
        ticketType: ticket.ticketType,
        quantity: ticket.quantity,
        eventDate: ticket.event.date,
        eventTime: ticket.event.time,
        eventLocation: ticket.event.location
      }
    });

  } catch (error) {
    next(error);
  }
}

// Mark ticket as used (for event organizers)
export async function useTicket(req, res, next) {
  try {
    const { ticketId } = req.params;

    const ticket = await Ticket.findOne({ ticketId })
      .populate('event', 'owner title')
      .populate('user', 'name email');

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Check if user is event organizer
    if (String(ticket.event.owner) !== String(req.user.id)) {
      return res.status(403).json({ message: "Only event organizers can mark tickets as used" });
    }

    if (ticket.status === 'used') {
      return res.status(400).json({ message: "Ticket has already been used" });
    }

    if (!ticket.isValid) {
      return res.status(400).json({ message: "Ticket is not valid" });
    }

    // Mark as used
    await ticket.markAsUsed(req.user.id);

    res.json({
      message: "Ticket marked as used successfully",
      ticket: {
        ticketId: ticket.ticketId,
        attendeeName: ticket.user.name,
        usedAt: ticket.usedAt
      }
    });

  } catch (error) {
    next(error);
  }
}
