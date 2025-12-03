import { useState, useEffect, type ChangeEvent, type FC } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, MapPin, Users, AlertTriangle, Upload, Image as ImageIcon } from 'lucide-react';
import { useEvents } from '../contexts/EventContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useToast } from '../hooks/use-toast';

const EventDetails: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { events, currentUser } = useEvents();
  const { toast } = useToast();
  
  const [paymentReceipt, setPaymentReceipt] = useState<File | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  const event = Array.isArray(events) ? events.find(e => e.id === id) : null;
  
  // Mock data for event status and payments
  const [eventStatus, _setEventStatus] = useState({
    status: 'active', // active, cancelled, postponed, venue_changed
    cancellationReason: '',
    newDate: '',
    newVenue: '',
    refundAmount: 0,
    refundStatus: 'pending' // pending, processed, failed
  });

  const [payments, setPayments] = useState([
    {
      id: 'pay_1',
      userId: 'user_1',
      userName: 'John Doe',
      userEmail: 'john@example.com',
      amount: 150,
      status: 'completed',
      receiptUrl: '/placeholder.svg',
      timestamp: new Date(),
      bookingId: 'bk_123'
    }
  ]);

  useEffect(() => {
    if (!event) {
      navigate('/events');
    }
  }, [event, navigate]);

  if (!event) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center font-poppins">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Event Not Found</h2>
          <p className="text-muted-foreground mb-4">The event you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/events')}>
            Back to Events
          </Button>
        </Card>
      </div>
    );
  }

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: 'File too large',
          description: 'Please select a file smaller than 5MB.',
          variant: 'destructive',
        });
        return;
      }
      setPaymentReceipt(file);
    }
  };

  const handlePaymentSubmission = async () => {
    if (!paymentReceipt || !paymentAmount) {
      toast({
        title: 'Missing Information',
        description: 'Please select a receipt and enter the payment amount.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    // Simulate upload process
    setTimeout(() => {
      const newPayment = {
        id: `pay_${Date.now()}`,
        userId: currentUser!.id,
        userName: currentUser!.name,
        userEmail: currentUser!.email,
        amount: parseFloat(paymentAmount),
        status: 'pending' as const,
        receiptUrl: URL.createObjectURL(paymentReceipt!),
        timestamp: new Date(),
        bookingId: `bk_${Date.now()}`
      };

      setPayments(prev => [newPayment, ...prev]);

      // Send notification to event owner
      // TODO: Implement notification system
      console.log('Payment notification:', {
        type: 'booking_confirmed',
        title: 'Payment Received',
        message: `${currentUser!.name} has submitted payment of $${paymentAmount} for "${event.title}"`,
        eventId: event.id,
        bookingId: newPayment.bookingId
      });

      toast({
        title: 'Payment Submitted!',
        description: 'Your payment receipt has been uploaded. The event organizer will review it soon.',
      });

      setPaymentReceipt(null);
      setPaymentAmount('');
      setIsUploading(false);
    }, 2000);
  };

  const isEventOwner = currentUser?.id === event.creatorId;
  const hasUserBooked = currentUser && event.booked > 0 && currentUser.id === event.creatorId;

  // Check if event date has passed
  const eventDate = new Date(event.date);
  const now = new Date();
  // Set time to end of day for event date to allow booking until end of event day
  eventDate.setHours(23, 59, 59, 999);
  const isPastEvent = eventDate < now;

  return (
    <div className="min-h-screen pt-16 pb-8 font-poppins">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start justify-between"
          >
            <div>
              <h1 className="text-3xl font-bold mb-2">{event.title}</h1>
              <p className="text-muted-foreground">{event.description}</p>
            </div>
            
            {/* Event Status Badge */}
            <Badge
              variant={
                event.status === 'active' || event.status === 'published' ? 'default' :
                event.status === 'cancelled' ? 'destructive' :
                event.status === 'postponed' ? 'secondary' :
                'outline'
              }
              className="text-sm"
            >
              {event.status === 'active' || event.status === 'published' ? '✅ Active' :
               event.status === 'cancelled' ? '❌ Cancelled' :
               event.status === 'postponed' ? '⏰ Postponed' :
               event.status === 'updated' ? '📝 Updated' :
               '📍 Status: ' + (event.status || 'Unknown')}
            </Badge>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Details */}
            <Card>
              <CardHeader>
                <CardTitle>Event Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div className="flex flex-col">
                    <span className="font-medium">{new Date(event.date).toLocaleDateString()} at {event.time}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <div className="flex flex-col">
                    <span className="font-medium">{event.location}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-primary" />
                  <span>{event.booked} / {Number(event.capacity || 0)} attendees</span>
                </div>
              </CardContent>
            </Card>

            {/* Event Status Updates */}
            {eventStatus.status !== 'active' && (
              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <span>Event Update</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {event.status === 'cancelled' && event.statusDetails && (
                    <div className="space-y-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">❌</span>
                        <p className="text-destructive font-medium">This event has been cancelled.</p>
                      </div>
                      <p className="text-sm text-muted-foreground">{event.statusDetails.message}</p>
                      {event.statusDetails.updatedAt && (
                        <p className="text-xs text-muted-foreground">
                          Cancelled on: {new Date(event.statusDetails.updatedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
                  {event.status === 'postponed' && event.statusDetails && (
                    <div className="space-y-3 p-4 bg-amber-50 border border-gray-300 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">⏰</span>
                        <p className="text-amber-800 font-medium">This event has been postponed.</p>
                      </div>
                      <p className="text-sm text-amber-700">{event.statusDetails.message}</p>

                      <div className="grid grid-cols-1 md:grid-cols-1 gap-3">
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-amber-800">Updated Date & Time:</p>
                          <p className="text-sm text-amber-700 font-medium">
                            {new Date(event.date).toLocaleDateString()} at {event.time}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-amber-800">Updated Location:</p>
                          <p className="text-sm text-amber-700 font-medium">{event.location}</p>
                        </div>
                      </div>

                      {event.statusDetails.updatedAt && (
                        <p className="text-xs text-amber-600">
                          Updated on: {new Date(event.statusDetails.updatedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
                  {event.status === 'updated' && event.statusDetails && (
                    <div className="space-y-2 p-4 bg-blue-50 border border-gray-300 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">📝</span>
                        <p className="text-blue-800 font-medium">This event has been updated.</p>
                      </div>
                      <p className="text-sm text-blue-700">{event.statusDetails.message}</p>
                      {event.statusDetails.updatedAt && (
                        <p className="text-xs text-blue-600">
                          Updated on: {new Date(event.statusDetails.updatedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Payment Section for Attendees */}
            {hasUserBooked && !isEventOwner && (
              <Card>
                <CardHeader>
                  <CardTitle>Upload Payment Receipt</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="amount">Payment Amount ($)</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="Enter amount paid"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="receipt">Payment Receipt</Label>
                    <div className="mt-2">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 dark:border-gray-600">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          {paymentReceipt ? (
                            <>
                              <ImageIcon className="w-8 h-8 mb-2 text-green-500" />
                              <p className="text-sm text-green-600">{paymentReceipt.name}</p>
                            </>
                          ) : (
                            <>
                              <Upload className="w-8 h-8 mb-2 text-gray-500" />
                              <p className="text-sm text-gray-500">Click to upload receipt</p>
                              <p className="text-xs text-gray-500">PNG, JPG or PDF (Max 5MB)</p>
                            </>
                          )}
                        </div>
                        <input
                          id="receipt"
                          type="file"
                          className="hidden"
                          accept="image/*,application/pdf"
                          onChange={handleFileUpload}
                        />
                      </label>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handlePaymentSubmission}
                    disabled={!paymentReceipt || !paymentAmount || isUploading}
                    className="w-full"
                  >
                    {isUploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Uploading...
                      </>
                    ) : (
                      'Submit Payment Receipt'
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Payment History for Event Owners */}
            {isEventOwner && (
              <Card>
                <CardHeader>
                  <CardTitle>Payment Receipts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {payments.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No payments received yet.</p>
                  ) : (
                    payments.map((payment) => (
                      <motion.div
                        key={payment.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border rounded-lg p-4 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{payment.userName}</span>
                          <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
                            {payment.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{payment.userEmail}</p>
                        <p className="text-lg font-bold text-green-600">${payment.amount}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(payment.receiptUrl, '_blank')}
                          className="w-full"
                        >
                          View Receipt
                        </Button>
                      </motion.div>
                    ))
                  )}
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {isEventOwner ? (
                  <>
                    <Button variant="outline" className="w-full">
                      Edit Event
                    </Button>
                    <Button variant="outline" className="w-full">
                      Message Attendees
                    </Button>
                    <Button variant="destructive" className="w-full">
                      Cancel Event
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" className="w-full">
                      Message Organizer
                    </Button>
                    {hasUserBooked ? (
                      <Button
                        variant="destructive"
                        className="w-full"
                        disabled={isPastEvent}
                      >
                        {isPastEvent ? 'Event Ended' : 'Cancel Booking'}
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        disabled={isPastEvent || event.status === 'cancelled'}
                      >
                        {isPastEvent ? 'Event Ended' :
                         event.status === 'cancelled' ? 'Event Cancelled' :
                         'Book Now'}
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetails;
