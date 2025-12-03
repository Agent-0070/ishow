import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import { 
  generateTicket, 
  getUserTickets, 
  downloadTicket, 
  validateTicket, 
  useTicket 
} from "../controllers/ticketController.js";

const router = Router();

// Generate ticket after payment confirmation
router.post("/generate", authRequired, generateTicket);

// Get user's tickets
router.get("/my-tickets", authRequired, getUserTickets);

// Download ticket
router.get("/:id/download", authRequired, downloadTicket);

// Validate ticket (for event organizers)
router.post("/validate", authRequired, validateTicket);

// Mark ticket as used (for event organizers)
router.patch("/:ticketId/use", authRequired, useTicket);

// Test endpoint to create a sample ticket
router.post('/create-test-ticket', authRequired, async (req, res) => {
  try {
    const userId = req.user.id;

    console.log('🎫 Creating test ticket for user:', userId);

    // Find any event created by the user or any available event
    const Event = (await import('../models/Event.js')).default;
    const Ticket = (await import('../models/Ticket.js')).default;

    const event = await Event.findOne().sort({ createdAt: -1 });

    if (!event) {
      return res.status(400).json({
        message: "No events found. Please create an event first to generate a test ticket."
      });
    }

    // Generate unique ticket ID
    const ticketId = `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create a minimal Booking for this test ticket (so Ticket can reference it)
    const Booking = (await import('../models/Booking.js')).default;
    const booking = await Booking.create({
      event: event._id,
      user: userId,
      seats: 1,
      status: 'confirmed',
      ticketQuantity: 1,
      totalAmount: 0,
      paymentStatus: 'confirmed'
    });

    // Create a minimal PaymentReceipt so Ticket can reference it
    const PaymentReceipt = (await import('../models/PaymentReceipt.js')).default;
    const receipt = await PaymentReceipt.create({
      user: userId,
      event: event._id,
      eventCreator: event.owner || event.owner?._id || null,
      booking: booking._id,
      receiptImage: '/uploads/test-receipt.png',
      amount: 0,
      paymentMethod: 'other',
      status: 'confirmed'
    });

    // Minimal required security fields for Ticket model
    const crypto = await import('crypto');
    const qrCodeData = Buffer.from(ticketId).toString('base64');
    const verificationHash = crypto.createHash('sha256').update(ticketId).digest('hex');
    const validFrom = new Date();
    const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Create test ticket with required references and fields
    const testTicket = new Ticket({
      ticketId,
      user: userId,
      event: event._id,
      booking: booking._id,
      paymentReceipt: receipt._id,
      ticketType: 'regular',
      quantity: 1,
      ticketQuantity: 1,
      status: 'active',
      qrCodeData,
      verificationHash,
      validFrom,
      validUntil,
      downloadCount: 0,
      metadata: {
        testTicket: true,
        createdVia: 'test-endpoint',
        createdAt: new Date()
      }
    });

    console.log('💾 Saving test ticket to database:', {
      ticketId: testTicket.ticketId,
      userId: testTicket.user,
      eventId: testTicket.event,
      eventTitle: event.title,
      bookingId: booking._id,
      receiptId: receipt._id
    });

    const savedTicket = await testTicket.save();

    console.log('✅ Test ticket created successfully:', {
      ticketId: savedTicket.ticketId,
      mongoId: savedTicket._id,
      createdAt: savedTicket.createdAt
    });

    // Populate the event details for response
    await savedTicket.populate('event', 'title date time location');

    res.json({
      success: true,
      message: "Test ticket created successfully!",
      ticket: {
        id: savedTicket._id,
        ticketId: savedTicket.ticketId,
        event: savedTicket.event,
        ticketType: savedTicket.ticketType,
        quantity: savedTicket.quantity,
        status: savedTicket.status,
        isValid: savedTicket.isValid,
        validUntil: savedTicket.validUntil,
        createdAt: savedTicket.createdAt,
        metadata: savedTicket.metadata
      }
    });

  } catch (error) {
    console.error('❌ Error creating test ticket:', error);
    res.status(500).json({
      message: "Failed to create test ticket",
      error: error.message
    });
  }
});

export default router;
