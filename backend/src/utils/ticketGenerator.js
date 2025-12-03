import QRCode from 'qrcode';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// Generate secure verification hash
export const generateVerificationHash = (ticketData) => {
  const secret = process.env.TICKET_SECRET || 'default-ticket-secret-change-in-production';
  const dataString = JSON.stringify(ticketData);
  return crypto.createHmac('sha256', secret).update(dataString).digest('hex');
};

// Verify ticket hash
export const verifyTicketHash = (ticketData, hash) => {
  const expectedHash = generateVerificationHash(ticketData);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'));
};

// Generate QR code data
export const generateQRCodeData = (ticket, event, user, booking) => {
  const qrData = {
    ticketId: ticket.ticketId,
    eventId: event._id.toString(),
    userId: user._id.toString(),
    bookingId: booking._id.toString(),
    ticketType: ticket.ticketType,
    quantity: ticket.quantity,
    issuedAt: ticket.generatedAt.toISOString(),
    validUntil: ticket.validUntil.toISOString(),
    eventTitle: event.title,
    eventDate: event.date.toISOString(),
    userName: user.name,
    userEmail: user.email
  };

  // Generate verification hash
  const hash = generateVerificationHash(qrData);
  qrData.hash = hash;

  return qrData;
};

// Generate QR code image (base64)
export const generateQRCodeImage = async (qrData) => {
  try {
    const qrString = JSON.stringify(qrData);
    const qrCodeDataURL = await QRCode.toDataURL(qrString, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 256
    });
    
    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
};

// Generate ticket HTML template
export const generateTicketHTML = (ticket, event, user, booking, qrCodeImage) => {
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time) => {
    return time || 'Time TBA';
  };

  const getTicketTypeName = (type) => {
    const types = {
      'vvip': 'VVIP',
      'vip': 'VIP',
      'standard': 'Standard',
      'tableFor2': 'Table for 2',
      'tableFor5': 'Table for 5',
      'regular': 'Regular'
    };
    return types[type] || type.toUpperCase();
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Event Ticket - ${event.title}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Arial', sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
        }
        
        .ticket {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          position: relative;
        }
        
        .ticket::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: 2px;
          background: repeating-linear-gradient(
            to right,
            transparent,
            transparent 10px,
            #ddd 10px,
            #ddd 20px
          );
          transform: translateY(-50%);
        }
        
        .ticket-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        
        .event-title {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 10px;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        
        .ticket-id {
          font-size: 14px;
          opacity: 0.9;
          letter-spacing: 2px;
        }
        
        .ticket-body {
          display: flex;
          min-height: 300px;
        }
        
        .ticket-info {
          flex: 2;
          padding: 40px;
        }
        
        .ticket-qr {
          flex: 1;
          padding: 40px;
          background: #f8f9fa;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-left: 2px dashed #ddd;
        }
        
        .info-row {
          display: flex;
          margin-bottom: 20px;
          align-items: center;
        }
        
        .info-label {
          font-weight: bold;
          color: #333;
          width: 120px;
          font-size: 14px;
        }
        
        .info-value {
          color: #666;
          font-size: 16px;
          flex: 1;
        }
        
        .qr-code {
          width: 200px;
          height: 200px;
          margin-bottom: 20px;
        }
        
        .qr-instructions {
          text-align: center;
          color: #666;
          font-size: 12px;
          line-height: 1.4;
        }
        
        .ticket-footer {
          background: #f8f9fa;
          padding: 20px 40px;
          border-top: 1px solid #eee;
          font-size: 12px;
          color: #666;
          text-align: center;
        }
        
        .ticket-type-badge {
          display: inline-block;
          background: #667eea;
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 20px;
        }
        
        .validity-info {
          background: #e8f5e8;
          border: 1px solid #4caf50;
          border-radius: 8px;
          padding: 15px;
          margin-top: 20px;
        }
        
        .validity-title {
          color: #2e7d32;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .validity-text {
          color: #388e3c;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="ticket">
        <div class="ticket-header">
          <div class="event-title">${event.title}</div>
          <div class="ticket-id">Ticket ID: ${ticket.ticketId}</div>
        </div>
        
        <div class="ticket-body">
          <div class="ticket-info">
            <div class="ticket-type-badge">${getTicketTypeName(ticket.ticketType)}</div>
            
            <div class="info-row">
              <div class="info-label">Event Date:</div>
              <div class="info-value">${formatDate(event.date)}</div>
            </div>
            
            <div class="info-row">
              <div class="info-label">Time:</div>
              <div class="info-value">${formatTime(event.time)}</div>
            </div>
            
            <div class="info-row">
              <div class="info-label">Location:</div>
              <div class="info-value">${event.location}</div>
            </div>
            
            <div class="info-row">
              <div class="info-label">Attendee:</div>
              <div class="info-value">${user.name}</div>
            </div>
            
            <div class="info-row">
              <div class="info-label">Email:</div>
              <div class="info-value">${user.email}</div>
            </div>
            
            <div class="info-row">
              <div class="info-label">Quantity:</div>
              <div class="info-value">${ticket.quantity} ticket${ticket.quantity > 1 ? 's' : ''}</div>
            </div>
            
            ${ticket.seatNumber ? `
            <div class="info-row">
              <div class="info-label">Seat:</div>
              <div class="info-value">${ticket.seatNumber}</div>
            </div>
            ` : ''}
            
            <div class="validity-info">
              <div class="validity-title">✅ Valid Ticket</div>
              <div class="validity-text">This ticket is valid until ${formatDate(ticket.validUntil)}</div>
            </div>
          </div>
          
          <div class="ticket-qr">
            <img src="${qrCodeImage}" alt="QR Code" class="qr-code" />
            <div class="qr-instructions">
              <strong>Present this QR code at the venue</strong><br>
              Scan to verify ticket authenticity<br>
              Keep this ticket safe and accessible
            </div>
          </div>
        </div>
        
        <div class="ticket-footer">
          <strong>Important:</strong> This ticket is non-transferable and valid for one-time use only. 
          Please arrive at least 30 minutes before the event start time. 
          For support, contact the event organizer.
          <br><br>
          Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
        </div>
      </div>
    </body>
    </html>
  `;
};
