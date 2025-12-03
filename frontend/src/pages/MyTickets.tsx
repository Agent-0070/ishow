import { useState, useEffect, type FC } from 'react';
import { motion } from 'framer-motion';
import {
  Download,
  QrCode,
  Calendar,
  MapPin,
  Clock,
  Ticket,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import QRCode from 'qrcode';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useToast } from '../hooks/use-toast';
import { useEvents } from '../contexts/EventContext';
import { ticketsAPI } from '../lib/api';

interface TicketData {
  id: string;
  ticketId: string;
  event: {
    _id: string;
    title: string;
    date: string;
    time: string;
    location: string;
    status: string;
  };
  ticketType: string;
  quantity: number;
  status: string;
  validUntil: string;
  isValid: boolean;
  downloadCount: number;
  createdAt: string;
  downloadUrl: string;
}

const MyTickets: FC = () => {
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const { currentUser, isAuthenticated } = useEvents();
  const { toast } = useToast();

  // Get token from localStorage
  const token = localStorage.getItem('auth-token');

  useEffect(() => {
    if (isAuthenticated && currentUser && token) {
      fetchTickets();
    } else {
      setLoading(false);
      if (!isAuthenticated) {
        toast({
          title: "Authentication Required",
          description: "Please log in to view your tickets.",
          variant: "destructive",
        });
      }
    }
  }, [isAuthenticated, currentUser, token]);

  const fetchTickets = async () => {
    try {
      const response = await ticketsAPI.getMyTickets();
      setTickets(response.data.tickets || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast({
        title: "Error",
        description: "Failed to load your tickets. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async (ticket: TicketData) => {
    try {
      // Create QR code data with ticket information
      const qrData = {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketId,
        eventId: ticket.event._id,
        userId: currentUser?.id ?? null,
        eventTitle: ticket.event.title,
        eventDate: ticket.event.date,
        ticketType: ticket.ticketType,
        isValid: ticket.isValid
      };

      const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      setQrCodeUrl(qrCodeDataURL);
      setShowQrModal(true);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: "Error",
        description: "Failed to generate QR code. Please try again.",
        variant: "destructive"
      });
    }
  };

  const downloadTicket = async (ticketId: string, ticketNumber: string) => {
    setDownloading(ticketId);
    try {
      const response = await ticketsAPI.downloadTicket(ticketId);

      // Convert response to blob for download
      const blob = new Blob([response.data], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `ticket-${ticketNumber}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Ticket downloaded successfully!",
      });

      // Refresh tickets to update download count
      fetchTickets();
    } catch (error) {
      console.error('Error downloading ticket:', error);
      toast({
        title: "Error",
        description: "Failed to download ticket. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloading(null);
    }
  };

  const getStatusIcon = (status: string, isValid: boolean) => {
    if (!isValid) return <XCircle className="h-4 w-4 text-red-500" />;
    
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'used':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'expired':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string, isValid: boolean) => {
    if (!isValid) {
      return <Badge variant="destructive">Invalid</Badge>;
    }
    
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'used':
        return <Badge variant="secondary">Used</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTicketTypeName = (type: string) => {
    const types: Record<string, string> = {
      'vvip': 'VVIP',
      'vip': 'VIP',
      'standard': 'Standard',
      'tableFor2': 'Table for 2',
      'tableFor5': 'Table for 5',
      'regular': 'Regular'
    };
    return types[type] || type.toUpperCase();
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 font-poppins">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center space-x-3 mb-8">
          <Ticket className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">My Tickets</h1>
        </div>

        {tickets.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Ticket className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Tickets Yet</h3>
              <p className="text-muted-foreground text-center">
                You don't have any tickets yet. Book an event and complete payment to get your tickets!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {tickets.map((ticket) => (
              <motion.div
                key={ticket.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <CardTitle className="text-xl">{ticket.event.title}</CardTitle>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(ticket.event.date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{ticket.event.time || 'Time TBA'}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-4 w-4" />
                            <span>{ticket.event.location}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(ticket.status, ticket.isValid)}
                        {getStatusBadge(ticket.status, ticket.isValid)}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Ticket ID</p>
                        <p className="font-mono text-sm">{ticket.ticketId}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Type</p>
                        <p className="font-semibold">{getTicketTypeName(ticket.ticketType)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Quantity</p>
                        <p className="font-semibold">{ticket.quantity} ticket{ticket.quantity > 1 ? 's' : ''}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Valid Until</p>
                        <p className="text-sm">{new Date(ticket.validUntil).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Downloaded {ticket.downloadCount} time{ticket.downloadCount !== 1 ? 's' : ''}
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadTicket(ticket.id, ticket.ticketId)}
                          disabled={!ticket.isValid || downloading === ticket.id}
                          className="flex items-center space-x-2"
                        >
                          {downloading === ticket.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                          <span>Download</span>
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex items-center space-x-2"
                          disabled={!ticket.isValid}
                          onClick={() => generateQRCode(ticket)}
                        >
                          <QrCode className="h-4 w-4" />
                          <span>QR Code</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* QR Code Modal */}
      {showQrModal && qrCodeUrl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowQrModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4">Ticket QR Code</h3>
              <img src={qrCodeUrl} alt="Ticket QR Code" className="mx-auto mb-4" />
              <p className="text-sm text-gray-600 mb-4">
                Show this QR code at the event entrance for quick check-in.
              </p>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowQrModal(false)}
                  className="flex-1"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.download = 'ticket-qr-code.png';
                    link.href = qrCodeUrl;
                    link.click();
                  }}
                  className="flex-1"
                >
                  Download QR
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyTickets;
