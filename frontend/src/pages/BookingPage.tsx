import { useState, type ChangeEvent, type FC } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  DollarSign,
  Upload,
  Check, 
  ArrowLeft,
  Banknote
} from 'lucide-react';
import { useEvents } from '../contexts/EventContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
// Tabs not used in this page
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { useToast } from '../hooks/use-toast';
import { paymentReceiptAPI, uploadAPI, bookingsAPI } from '../lib/api';

const BookingPage: FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
const { events, currentUser } = useEvents();
  const { toast } = useToast();
  
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<any | null>(null);
  const [paymentReceipt, setPaymentReceipt] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [bookingStep, setBookingStep] = useState<'details' | 'payment' | 'receipt' | 'confirmed'>('details');
  const [notes, setNotes] = useState('');
  
  // Ticket selection state (keys are ticketPricing names: regular, vip, vvip, tableFor2, tableFor5, standard)
  const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>({});

  const event = Array.isArray(events) ? events.find(e => (e.id === eventId || e._id === eventId)) : null;

  // Prepare categories from backend ticketPricing shape
  const ticketCategories = event?.ticketPricing ? Object.entries(event.ticketPricing)
    .filter(([, cfg]) => cfg && (typeof (cfg as any)?.price === 'number'))
    .map(([key, cfg]) => ({
      id: key,
      name: key,
      price: (cfg as { price: number; slots: number; includes: string[] }).price,
      slots: (cfg as { price: number; slots: number; includes: string[] }).slots || 0,
      includes: (cfg as { price: number; slots: number; includes: string[] }).includes || []
    }))
    : [];

  const totalTickets = Object.values(selectedTickets).reduce((sum, count) => sum + count, 0);
  const totalPrice = ticketCategories.reduce((sum, category) => {
    const count = selectedTickets[category.id] || 0;
    return sum + (category.price * count);
  }, 0);

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Event Not Found</h1>
          <Button onClick={() => navigate('/events')}>
            Back to Events
          </Button>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please Login</h1>
          <p className="text-muted-foreground mb-4">You need to be logged in to book events</p>
          <Button onClick={() => navigate('/auth')}>
            Login
          </Button>
        </div>
      </div>
    );
  }

  const isCreator = currentUser.id === event.creatorId;
  const isBooked = currentUser.bookedEvents.includes(event.id);
  // booking capacity check not used in this view
  if (isCreator) {
    navigate('/dashboard');
    return null;
  }

  if (event.status === 'cancelled') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Event Cancelled</h1>
          <p className="text-muted-foreground mb-4">This event has been cancelled and is no longer accepting bookings</p>
          <Button onClick={() => navigate('/events')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Button>
        </div>
      </div>
    );
  }

  // Check if event date has passed
  const eventDate = new Date(event.date);
  const now = new Date();
  // Set time to end of day for event date to allow booking until end of event day
  eventDate.setHours(23, 59, 59, 999);
  const isPastEvent = eventDate < now;

  if (isPastEvent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Event Ended</h1>
          <p className="text-muted-foreground mb-4">This event has already ended and is no longer accepting bookings</p>
          <Button onClick={() => navigate('/events')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Button>
        </div>
      </div>
    );
  }

  if (isBooked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Already Booked</h1>
          <p className="text-muted-foreground mb-4">You have already booked this event</p>
          <Button onClick={() => navigate('/events')}>
            Back to Events
          </Button>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPaymentReceipt(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setReceiptPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Ticket selection functions
  const updateTicketCount = (categoryId: string, count: number) => {
    const category = ticketCategories.find(c => c.id === categoryId);
    if (!category) return;

    const maxAvailable = category.slots; // backend-provided slots per type
    const validCount = Math.max(0, Math.min(count, maxAvailable));

    setSelectedTickets(prev => ({
      ...prev,
      [categoryId]: validCount
    }));
  };

  const getAvailableTickets = (categoryId: string) => {
    const category = ticketCategories.find(c => c.id === categoryId);
    return category ? category.slots : 0;
  };

  const handleBooking = async () => {
    // Check authentication first
    if (!currentUser) {
      toast({
        title: "Authentication Required",
        description: "Please log in to book this event",
        variant: "destructive"
      });
      return;
    }

    const token = localStorage.getItem('auth-token');
    if (!token) {
      toast({
        title: "Authentication Error",
        description: "Please log in again to book this event",
        variant: "destructive"
      });
      return;
    }

  if (bookingStep === 'details') {
    if (totalTickets === 0) {
      toast({
        title: 'No tickets selected',
        description: 'Please select at least one ticket to continue.',
        variant: 'destructive',
      });
      return;
    }
    setBookingStep('payment');

  } else if (bookingStep === 'payment' && selectedPaymentMethod?.type) {
    if (selectedPaymentMethod.type === 'pay_at_event') {
      try {
        // Complete booking directly with selected ticket breakdown
        const tickets = Object.entries(selectedTickets)
          .filter(([, qty]) => (qty || 0) > 0)
          .map(([type, qty]) => ({ type, quantity: qty }));

        console.log('🎫 Booking event:', {
          eventId: event.id,
          tickets,
          paymentMethod: 'pay-at-event',
          notes,
          token: localStorage.getItem('auth-token') ? 'Present' : 'Missing'
        });

        const response = await bookingsAPI.createBooking({
          eventId: event.id,
          tickets,
          paymentMethod: 'pay-at-event',
          notes
        });
        if (response.data && response.data._id) {
          setBookingStep('confirmed');
          toast({
            title: 'Booking Confirmed!',
            description: 'Your booking is confirmed. Please pay at the event entrance.',
          });
        }
      } catch (error) {
        console.error('Booking error:', error);
        const errMsg = (error as any)?.message || 'Failed to complete booking. Please try again.';
        toast({
          title: 'Booking Failed',
          description: errMsg,
          variant: 'destructive',
        });
      }
    } else {
      setBookingStep('receipt');
    }

  } else if (bookingStep === 'receipt' && paymentReceipt) {
    try {
      // First upload the receipt image
      console.log('📷 Uploading receipt image:', {
        fileName: paymentReceipt.name,
        fileSize: paymentReceipt.size,
        fileType: paymentReceipt.type
      });
      const uploadResponse = await uploadAPI.uploadImage(paymentReceipt);
      console.log('✅ Upload successful:', uploadResponse);

      // Complete booking with receipt and selected ticket breakdown
      const tickets = Object.entries(selectedTickets)
        .filter(([, qty]) => (qty || 0) > 0)
        .map(([type, qty]) => ({ type, quantity: qty }));

      const bookingResponse = await bookingsAPI.createBooking({
        eventId: event.id,
        tickets,
        paymentMethod: selectedPaymentMethod?.type || 'online',
        notes
      });

      if (bookingResponse.data && bookingResponse.data._id) {
        // Upload payment receipt with booking details
        await paymentReceiptAPI.uploadReceipt({
          eventId: event.id,
          bookingId: bookingResponse.data._id,
          amount: totalPrice,
          receiptImage: uploadResponse.data.url,
          receiptImagePublicId: uploadResponse.data.publicId,
          paymentMethod: selectedPaymentMethod?.type || 'bank_transfer',
          transactionReference: '', // Could be added to form if needed
          notes: notes
        });

        setBookingStep('confirmed');
        toast({
          title: 'Booking Submitted!',
          description: 'Your booking and payment receipt have been submitted for verification.',
        });
      }
    } catch (error) {
      console.error('Booking error:', error);
      const errMsg = (error as any)?.message || 'Failed to complete booking. Please try again.';
      toast({
        title: 'Booking Failed',
        description: errMsg,
        variant: 'destructive',
      });
    }

  } else {
    // Fallback for unexpected state
    toast({
      title: 'Booking Error',
      description: 'Something went wrong with your booking. Please try again.',
      variant: 'destructive',
    });
    console.warn('Unexpected booking state or missing data:', {
      bookingStep,
      selectedPaymentMethod,
      paymentReceipt,
    });
  }
};

  const getPaymentMethodIcon = (type: string) => {
    switch (type) {
      case 'bank_transfer': return '🏦';
      case 'cashapp': return '💳';
      case 'paypal': return '🅿️';
      case 'bitcoin': return '₿';
      case 'pay_at_event': return <Banknote className="h-4 w-4" />;
      default: return '💰';
    }
  };

  const getPaymentMethodLabel = (type: string) => {
    switch (type) {
      case 'bank_transfer': return 'Bank Transfer';
      case 'cashapp': return 'Cash App';
      case 'paypal': return 'PayPal';
      case 'bitcoin': return 'Bitcoin';
      case 'pay_at_event': return 'Pay at Event';
      default: return 'Payment';
    }
  };

  if (bookingStep === 'confirmed') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md mx-auto p-8"
        >
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-4">Booking Confirmed!</h1>
          <p className="text-muted-foreground mb-6">
            Your booking for "{event.title}" has been submitted. The event organizer will verify your payment and confirm your spot.
          </p>
          <div className="space-y-2">
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              Go to Dashboard
            </Button>
            <Button variant="outline" onClick={() => navigate('/events')} className="w-full">
              Browse More Events
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/events')}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Book Event</h1>
            <p className="text-muted-foreground">Complete your booking for this event</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            {(selectedPaymentMethod?.type === 'pay_at_event' 
              ? [
                  { key: 'details', label: 'Details' },
                  { key: 'payment', label: 'Payment' }
                ]
              : [
                  { key: 'details', label: 'Details' },
                  { key: 'payment', label: 'Payment' },
                  { key: 'receipt', label: 'Receipt' }
                ]
            ).map((step, index, array) => {
              const isActive = bookingStep === step.key;
              const isCompleted = array.map(s => s.key).indexOf(bookingStep) > index;
              
              return (
                <div key={step.key} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div 
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                        isActive
                          ? 'bg-primary text-white' 
                          : isCompleted
                          ? 'bg-green-500 text-white'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span className={`text-xs mt-1 ${isActive ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                      {step.label}
                    </span>
                  </div>
                  {index < 2 && (
                    <div 
                      className={`w-16 h-0.5 mx-4 transition-colors ${
                        isCompleted ? 'bg-green-500' : 'bg-muted'
                      }`} 
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Event Details Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="text-lg">Event Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold">{event.title}</h3>
                  <p className="text-sm text-muted-foreground">by {event.creatorId}</p>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-muted-foreground">
                    <Calendar className="h-4 w-4 mr-2" />
                      <div className="flex flex-col">
                        <span className="text-foreground font-medium">{formatDate(event.date)}</span>
                      </div>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <Clock className="h-4 w-4 mr-2" />
                    <div className="flex flex-col">
                        <span className="text-foreground font-medium">{event.time}</span>
                    </div>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-2" />
                    <div className="flex flex-col">
                        <span className="text-foreground font-medium">{event.location}</span>
                    </div>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <Users className="h-4 w-4 mr-2" />
                    {Number(event.capacity || 0) - Number(event.booked || 0)} spots available
                  </div>
                  {/* Price display - show selected tickets total or event price */}
                  {totalTickets > 0 ? (
                    <div className="flex items-center text-muted-foreground">
                      <DollarSign className="h-4 w-4 mr-2" />
                      {totalTickets} ticket{totalTickets > 1 ? 's' : ''} - ${totalPrice.toFixed(2)}
                    </div>
                  ) : event.price ? (
                    <div className="flex items-center text-muted-foreground">
                      <DollarSign className="h-4 w-4 mr-2" />
                      ${event.price}
                    </div>
                  ) : null}
                </div>

                <div className="pt-4 border-t border-glass-border/30">
                  <div className="flex items-center justify-between text-sm">
                    <span>Total Amount:</span>
                    <span className="font-semibold text-lg">${totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {bookingStep === 'details' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Event Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h3 className="font-semibold mb-2">Description</h3>
                      <p className="text-muted-foreground">{event.description}</p>
                    </div>

                    {/* Ticket Selection */}
                    {ticketCategories.length > 0 ? (
                      <div>
                        <h3 className="font-semibold mb-4">Select Tickets</h3>
                        <div className="space-y-4">
                          {ticketCategories
                            .map(category => {
                              const available = getAvailableTickets(category.id);
                              const selected = selectedTickets[category.id] || 0;
                              
                              return (
                                <Card key={category.id} className="border">
                                  <CardContent className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                      <div>
                                        <h4 className="font-semibold">{category.name}</h4>

                                        <p className="text-sm text-muted-foreground">
                                          Available: {available} tickets
                                        </p>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-lg font-bold">${category.price}</div>
                                        <div className="text-sm text-muted-foreground">per ticket</div>
                                      </div>
                                    </div>
                                    
                                    {available > 0 ? (
                                      <div className="flex items-center justify-between mt-3">
                                        <div className="flex items-center space-x-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => updateTicketCount(category.id, selected - 1)}
                                            disabled={selected === 0}
                                          >
                                            -
                                          </Button>
                                          <span className="w-8 text-center font-semibold">{selected}</span>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => updateTicketCount(category.id, selected + 1)}
                                            disabled={selected >= available}
                                          >
                                            +
                                          </Button>
                                        </div>
                                        {selected > 0 && (
                                          <div className="text-sm font-medium">
                                            Subtotal: ${(category.price * selected).toFixed(2)}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <Badge variant="secondary" className="mt-2">Sold Out</Badge>
                                    )}
                                  </CardContent>
                                </Card>
                              );
                            })}
                        </div>
                        
                        {/* Total Summary */}
                        {totalTickets > 0 && (
                          <div className="bg-muted p-4 rounded-lg">
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="font-semibold">Total: {totalTickets} ticket{totalTickets > 1 ? 's' : ''}</span>
                              </div>
                              <div className="text-xl font-bold">${totalPrice.toFixed(2)}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Legacy single price display */
                      event.price && (
                        <div className="bg-muted p-4 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold">Event Price</span>
                            <span className="text-xl font-bold">${event.price}</span>
                          </div>
                        </div>
                      )
                    )}

                    <div>
                      <Label htmlFor="notes">Additional Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        placeholder="Any special requests or notes for the organizer..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    <Button 
                      onClick={handleBooking} 
                      className="w-full" 
                      size="lg"
                      disabled={ticketCategories.length > 0 && totalTickets === 0}
                    >
                      Continue to Payment
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {bookingStep === 'payment' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Select Payment Method</CardTitle>
                    <p className="text-muted-foreground">
                      Choose how you'd like to pay for this event (${totalPrice.toFixed(2)})
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {event.paymentMethods && Array.isArray(event.paymentMethods) && event.paymentMethods.length > 0 ? (
                      <>
                        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                          <div className="flex items-start space-x-3">
                            <div className="text-blue-600 dark:text-blue-400">
                              ℹ️
                            </div>
                            <div className="text-sm text-blue-800 dark:text-blue-200">
                              <p className="font-medium mb-1">Payment Instructions:</p>
                              <p>1. Select a payment method below</p>
                              {!selectedPaymentMethod || selectedPaymentMethod.type !== 'pay_at_event' ? (
                                <>
                                  <p>2. Make the payment using the provided details</p>
                                  <p>3. Upload a screenshot/receipt of your payment</p>
                                  <p>4. Wait for verification from the event organizer</p>
                                </>
                              ) : (
                                <p>2. Your booking will be confirmed and you can pay at the event</p>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {event.paymentMethods.filter(pm => pm.isActive).map((paymentMethod) => (
                      <Card
                        key={paymentMethod.id}
                        className={`cursor-pointer transition-all ${
                          selectedPaymentMethod?.id === paymentMethod.id
                            ? 'ring-2 ring-primary bg-primary/5'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedPaymentMethod(paymentMethod)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-4">
                            <span className="text-2xl">
                              {getPaymentMethodIcon(paymentMethod.type)}
                            </span>
                            <div className="flex-1">
                              <h4 className="font-semibold">
                                {getPaymentMethodLabel(paymentMethod.type)}
                              </h4>
                              <div className="text-sm text-muted-foreground mt-1">
                                {paymentMethod.type === 'bank_transfer' && (
                                  <div>
                                    <p>Bank: {paymentMethod.details.bankName}</p>
                                    <p>Account Name: {paymentMethod.details.accountName}</p>
                                    <p>Account Number: {paymentMethod.details.accountNumber}</p>
                                  </div>
                                )}
                                {paymentMethod.type === 'cashapp' && (
                                  <p>Tag: {paymentMethod.details.tagName}</p>
                                )}
                                {paymentMethod.type === 'paypal' && (
                                  <p>Email: {paymentMethod.details.email}</p>
                                )}
                                {paymentMethod.type === 'bitcoin' && (
                                  <p>Wallet: {paymentMethod.details.walletAddress}</p>
                                )}
                                {paymentMethod.type === 'pay_at_event' && (
                                  <div>
                                    {paymentMethod.details.instructions && (
                                      <p className="mb-2">{paymentMethod.details.instructions}</p>
                                    )}
                                    {paymentMethod.details.acceptedMethods && paymentMethod.details.acceptedMethods.length > 0 && (
                                      <div>
                                        <p className="font-medium">Accepted at event:</p>
                                        <p>{paymentMethod.details.acceptedMethods.join(', ')}</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            {selectedPaymentMethod?.id === paymentMethod.id && (
                              <Check className="h-5 w-5 text-primary" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                        <div className="pt-4">
                          <div className="flex gap-3">
                            <Button 
                              variant="outline"
                              onClick={() => setBookingStep('details')}
                              className="flex-1"
                            >
                              <ArrowLeft className="h-4 w-4 mr-2" />
                              Back
                            </Button>
                            <Button 
                              onClick={handleBooking} 
                              disabled={!selectedPaymentMethod}
                              className="flex-2" 
                              size="lg"
                            >
                              {selectedPaymentMethod?.type === 'pay_at_event' 
                                ? 'Confirm Booking' 
                                : 'Continue to Receipt Upload'
                              }
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">No payment methods available for this event.</p>
                        <p className="text-sm text-muted-foreground mt-2">Please contact the event organizer.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {bookingStep === 'receipt' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Upload Payment Receipt</CardTitle>
                    <p className="text-muted-foreground">
                      Please upload proof of your payment for verification by the event organizer
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {selectedPaymentMethod && (
                      <div className="p-4 bg-glass-light/20 backdrop-blur-sm border border-glass-border/30 rounded-lg">
                        <h4 className="font-semibold mb-2 flex items-center">
                          <span className="text-lg mr-2">{getPaymentMethodIcon(selectedPaymentMethod.type)}</span>
                          Payment Details
                        </h4>
                        <div className="text-sm space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Method:</span>
                            <span className="font-medium">{getPaymentMethodLabel(selectedPaymentMethod.type)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Amount:</span>
                            <span className="font-bold text-green-600">${totalPrice.toFixed(2)}</span>
                          </div>
                          
                          {selectedPaymentMethod.type === 'bank_transfer' && (
                            <>
                              <div className="border-t border-glass-border/30 pt-2 mt-2">
                                <p className="font-medium text-sm mb-1">Bank Transfer Details:</p>
                                <div className="space-y-1">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Bank:</span>
                                    <span>{selectedPaymentMethod.details.bankName}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Account Name:</span>
                                    <span>{selectedPaymentMethod.details.accountName}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Account Number:</span>
                                    <span className="font-mono">{selectedPaymentMethod.details.accountNumber}</span>
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                          
                          {selectedPaymentMethod.type === 'cashapp' && (
                            <div className="border-t border-glass-border/30 pt-2 mt-2">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Cash App Tag:</span>
                                <span className="font-mono">{selectedPaymentMethod.details.tagName}</span>
                              </div>
                            </div>
                          )}
                          
                          {selectedPaymentMethod.type === 'paypal' && (
                            <div className="border-t border-glass-border/30 pt-2 mt-2">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">PayPal Email:</span>
                                <span>{selectedPaymentMethod.details.email}</span>
                              </div>
                            </div>
                          )}
                          
                          {selectedPaymentMethod.type === 'bitcoin' && (
                            <div className="border-t border-glass-border/30 pt-2 mt-2">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Bitcoin Address:</span>
                                <span className="font-mono text-xs break-all">{selectedPaymentMethod.details.walletAddress}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div>
                      <Label htmlFor="receipt-upload" className="text-base font-medium">Payment Receipt / Screenshot</Label>
                      <p className="text-sm text-muted-foreground mb-3">
                        Upload a clear screenshot or photo of your payment confirmation
                      </p>
                      <div className="mt-2">
                        {!paymentReceipt ? (
                          <label 
                            htmlFor="receipt-upload"
                            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-glass-border/40 rounded-lg cursor-pointer hover:bg-glass-light/20 transition-colors backdrop-blur-sm"
                          >
                            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground text-center">
                              <span className="font-medium">Click to upload payment receipt</span><br />
                              <span className="text-xs">PNG, JPG up to 10MB • Make sure payment details are clearly visible</span>
                            </p>
                            <Input
                              id="receipt-upload"
                              type="file"
                              accept="image/*"
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                          </label>
                        ) : (
                          <div className="space-y-4">
                            <div className="relative">
                              <img
                                src={receiptPreview!}
                                alt="Payment receipt"
                                className="w-full max-w-md mx-auto rounded-lg border border-glass-border/30"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setPaymentReceipt(null);
                                  setReceiptPreview(null);
                                }}
                                className="absolute top-2 right-2"
                              >
                                Change
                              </Button>
                            </div>
                            <p className="text-sm text-muted-foreground text-center">
                              Receipt uploaded successfully
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button 
                        variant="outline"
                        onClick={() => setBookingStep('payment')}
                        className="flex-1"
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Payment
                      </Button>
                      <Button 
                        onClick={handleBooking} 
                        disabled={!paymentReceipt}
                        className="flex-2" 
                        size="lg"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Complete Booking
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
