import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';

interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'bank';
  last4?: string;
  brand?: string;
  isDefault: boolean;
}

// Booking interface removed (not used in this component)

interface Ticket {
  id: string;
  bookingId: string;
  qrCode: string;
  checkInCode: string;
}

export const BookingPaymentSystem: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<'booking' | 'payment' | 'confirmation'>('booking');
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [bookingDetails, setBookingDetails] = useState({
    checkIn: '',
    checkOut: '',
    guests: 1,
  });
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [generatedTicket, setGeneratedTicket] = useState<Ticket | null>(null);

  const properties = [
    { id: '1', name: 'Luxury Downtown Apartment', price: 150, image: '/placeholder.svg' },
    { id: '2', name: 'Cozy Beach House', price: 200, image: '/placeholder.svg' },
    { id: '3', name: 'Mountain Cabin Retreat', price: 120, image: '/placeholder.svg' },
  ];

  const paymentMethods: PaymentMethod[] = [
    { id: '1', type: 'card', last4: '4242', brand: 'Visa', isDefault: true },
    { id: '2', type: 'paypal', isDefault: false },
    { id: '3', type: 'bank', isDefault: false },
  ];

  const calculateTotal = () => {
    const property = properties.find(p => p.id === selectedProperty);
    if (!property || !bookingDetails.checkIn || !bookingDetails.checkOut) return 0;
    
    const checkIn = new Date(bookingDetails.checkIn);
    const checkOut = new Date(bookingDetails.checkOut);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    
    return property.price * nights;
  };

  const processPayment = async () => {
    setPaymentStatus('processing');
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Simulate random success/failure
    const success = Math.random() > 0.2; // 80% success rate
    
    if (success) {
      setPaymentStatus('success');
      
      // Generate ticket
      const ticket: Ticket = {
        id: Date.now().toString(),
        bookingId: Date.now().toString(),
        qrCode: 'QR-' + Math.random().toString(36).substr(2, 9),
        checkInCode: Math.random().toString(36).substr(2, 6).toUpperCase(),
      };
      
      setGeneratedTicket(ticket);
      setCurrentStep('confirmation');
    } else {
      setPaymentStatus('failed');
    }
  };

  const getPaymentStatusColor = () => {
    switch (paymentStatus) {
      case 'processing': return 'payment-pending';
      case 'success': return 'payment-confirmed';
      case 'failed': return 'payment-failed';
      default: return 'primary';
    }
  };

  const getPaymentIcon = () => {
    switch (paymentStatus) {
      case 'processing': return '⏳';
      case 'success': return '✅';
      case 'failed': return '❌';
      default: return '💳';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        {['booking', 'payment', 'confirmation'].map((step, index) => (
          <div key={step} className="flex items-center">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold
              ${currentStep === step ? 'bg-primary text-white animate-glow' : 
                ['booking', 'payment', 'confirmation'].indexOf(currentStep) > index 
                  ? 'bg-payment-confirmed text-white' 
                  : 'bg-gray-200 text-gray-600'
              }
            `}>
              {index + 1}
            </div>
            {index < 2 && <div className="w-16 h-1 bg-gray-200 mx-2"></div>}
          </div>
        ))}
      </div>

      {/* Booking Step */}
      {currentStep === 'booking' && (
        <div className="space-y-6 animate-fade-in">
          <h2 className="text-2xl font-bold text-center">Select Your Stay</h2>
          
          {/* Property Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {properties.map((property, index) => (
              <Card 
                key={property.id}
                className={`
                  cursor-pointer transition-all duration-200 animate-widget-appear
                  ${selectedProperty === property.id 
                    ? 'ring-2 ring-primary bg-primary/10' 
                    : 'hover:shadow-lg'
                  }
                `}
                style={{ animationDelay: `${index * 0.1}s` }}
                onClick={() => setSelectedProperty(property.id)}
              >
                <img 
                  src={property.image} 
                  alt={property.name}
                  className="w-full h-48 object-cover rounded-t-lg"
                />
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2">{property.name}</h3>
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-primary">${property.price}</span>
                    <span className="text-sm text-muted-foreground">/night</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Booking Details */}
          {selectedProperty && (
            <Card className="bg-glass-light backdrop-blur-md border-gray-300 animate-scale-in">
              <CardHeader>
                <h3 className="text-lg font-semibold">Booking Details</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Check-in Date</label>
                    <Input
                      type="date"
                      value={bookingDetails.checkIn}
                      onChange={(e) => setBookingDetails(prev => ({ ...prev, checkIn: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Check-out Date</label>
                    <Input
                      type="date"
                      value={bookingDetails.checkOut}
                      onChange={(e) => setBookingDetails(prev => ({ ...prev, checkOut: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Number of Guests</label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={bookingDetails.guests}
                    onChange={(e) => setBookingDetails(prev => ({ ...prev, guests: parseInt(e.target.value) }))}
                  />
                </div>

                {calculateTotal() > 0 && (
                  <div className="bg-primary/10 p-4 rounded-lg animate-booking-confirm">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Total Amount:</span>
                      <span className="text-2xl font-bold text-primary">${calculateTotal()}</span>
                    </div>
                  </div>
                )}

                <Button 
                  onClick={() => setCurrentStep('payment')}
                  disabled={!selectedProperty || !bookingDetails.checkIn || !bookingDetails.checkOut}
                  className="w-full animate-glow"
                >
                  Continue to Payment
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Payment Step */}
      {currentStep === 'payment' && (
        <div className="space-y-6 animate-slide-in-right">
          <h2 className="text-2xl font-bold text-center">Payment Information</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Methods */}
            <Card className="bg-glass-light backdrop-blur-md border-gray-300">
              <CardHeader>
                <h3 className="text-lg font-semibold">Select Payment Method</h3>
              </CardHeader>
              <CardContent className="space-y-3">
                {paymentMethods.map((method, index) => (
                  <div
                    key={method.id}
                    className={`
                      p-4 border rounded-lg cursor-pointer transition-all duration-200 animate-fade-in
                      ${paymentMethod === method.id 
                        ? 'border-primary bg-primary/10' 
                        : 'border-gray-200 hover:border-gray-300'
                      }
                    `}
                    style={{ animationDelay: `${index * 0.1}s` }}
                    onClick={() => setPaymentMethod(method.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">
                          {method.type === 'card' ? '💳' : method.type === 'paypal' ? '🅿️' : '🏦'}
                        </span>
                        <div>
                          <p className="font-medium capitalize">{method.type}</p>
                          {method.last4 && (
                            <p className="text-sm text-muted-foreground">
                              {method.brand} •••• {method.last4}
                            </p>
                          )}
                        </div>
                      </div>
                      {method.isDefault && (
                        <Badge className="bg-primary/20 text-primary">Default</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card className="bg-glass-light backdrop-blur-md border-gray-300">
              <CardHeader>
                <h3 className="text-lg font-semibold">Order Summary</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Property:</span>
                    <span className="font-medium">
                      {properties.find(p => p.id === selectedProperty)?.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Check-in:</span>
                    <span>{bookingDetails.checkIn}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Check-out:</span>
                    <span>{bookingDetails.checkOut}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Guests:</span>
                    <span>{bookingDetails.guests}</span>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-primary">${calculateTotal()}</span>
                  </div>
                </div>

                <Button 
                  onClick={processPayment}
                  disabled={!paymentMethod || paymentStatus === 'processing'}
                  className={`w-full bg-${getPaymentStatusColor()} animate-${paymentStatus === 'success' ? 'payment-success' : 'glow'}`}
                >
                  <span className="mr-2">{getPaymentIcon()}</span>
                  {paymentStatus === 'idle' && 'Complete Payment'}
                  {paymentStatus === 'processing' && 'Processing...'}
                  {paymentStatus === 'success' && 'Payment Successful!'}
                  {paymentStatus === 'failed' && 'Payment Failed - Retry'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Confirmation Step */}
      {currentStep === 'confirmation' && generatedTicket && (
        <div className="space-y-6 animate-scale-in">
          <div className="text-center">
            <div className="text-6xl mb-4 animate-payment-success">🎉</div>
            <h2 className="text-3xl font-bold text-payment-confirmed mb-2">Booking Confirmed!</h2>
            <p className="text-muted-foreground">Your payment was successful and your booking is confirmed.</p>
          </div>

          {/* Digital Ticket */}
          <Card className="bg-gradient-primary text-white animate-ticket-generate">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <h3 className="text-2xl font-bold">Digital Ticket</h3>
                
                <div className="bg-white/20 p-4 rounded-lg backdrop-blur-sm">
                  <div className="text-6xl mb-4">📱</div>
                  <div className="space-y-2">
                    <p><strong>Booking ID:</strong> {generatedTicket.bookingId}</p>
                    <p><strong>QR Code:</strong> {generatedTicket.qrCode}</p>
                    <p><strong>Check-in Code:</strong> {generatedTicket.checkInCode}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <Button variant="outline" className="bg-white/20 border-white/30 text-white hover:bg-white/30">
                    Download Ticket
                  </Button>
                  <Button variant="outline" className="bg-white/20 border-white/30 text-white hover:bg-white/30">
                    Add to Wallet
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card className="bg-glass-light backdrop-blur-md border-gray-300">
            <CardHeader>
              <h3 className="text-lg font-semibold">What's Next?</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-3 animate-fade-in">
                  <span className="text-2xl">📧</span>
                  <div>
                    <p className="font-medium">Confirmation Email Sent</p>
                    <p className="text-sm text-muted-foreground">Check your email for booking details</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                  <span className="text-2xl">🏠</span>
                  <div>
                    <p className="font-medium">Host Contact Information</p>
                    <p className="text-sm text-muted-foreground">You'll receive host details 24 hours before check-in</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                  <span className="text-2xl">📱</span>
                  <div>
                    <p className="font-medium">Mobile Check-in</p>
                    <p className="text-sm text-muted-foreground">Use your QR code for contactless check-in</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
