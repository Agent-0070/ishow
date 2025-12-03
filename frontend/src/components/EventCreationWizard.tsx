import { useState, type ChangeEvent, type FC } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  Plus, 
  Trash2, 
  Check, 
  ArrowLeft, 
  ArrowRight,
  CreditCard,
  Building,
  Bitcoin,
  Smartphone,
  Upload,
  
  X,
  Banknote
} from 'lucide-react';
import type { Event } from '../contexts/EventContext';

// Define interfaces locally
interface TicketCategory {
  id: string;
  name: string;
  price: number;
  capacity: number;
  sold: number;
  description: string;
  isActive: boolean;
}

interface PaymentMethod {
  id: string;
  type: 'bank_transfer' | 'cashapp' | 'paypal' | 'bitcoin' | 'pay_at_event';
  details: {
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
    tagName?: string;
    email?: string;
    walletAddress?: string;
    instructions?: string;
    acceptedMethods?: string[];
  };
  isActive: boolean;
}
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';

interface EventCreationWizardProps {
  onComplete: (event: Omit<Event, 'id' | 'createdAt' | 'bookedBy' | 'booked'> & { ticketCategories: TicketCategory[]; paymentMethods: PaymentMethod[] }) => void;
  onCancel: () => void;
  initialData?: Partial<Event & { ticketCategories?: TicketCategory[]; paymentMethods?: PaymentMethod[] }>;
}

const EventCreationWizard: FC<EventCreationWizardProps> = ({
  onComplete,
  onCancel,
  initialData
}) => {
  const [step, setStep] = useState<'details' | 'tickets' | 'payment'>('details');
  const [eventData, setEventData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    date: initialData?.date || '',
    time: initialData?.time || '',
    location: initialData?.location || '',
    country: initialData?.country || '',
    currency: initialData?.currency || 'USD',
    capacity: 10,
    images: initialData?.images || [] as string[],
  });

  const [ticketCategories, setTicketCategories] = useState<TicketCategory[]>(
    initialData?.ticketCategories || [
      {
        id: 'regular',
        name: 'Regular',
        price: 0,
        capacity: 10,
        sold: 0,
        description: 'General admission',
        isActive: true
      }
    ]
  );

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(
    initialData?.paymentMethods || []
  );

  const [newPaymentMethod, setNewPaymentMethod] = useState<Partial<PaymentMethod>>({
    type: 'bank_transfer',
    details: {},
    isActive: true
  });

  const handleEventDataChange = (field: string, value: any) => {
    setEventData(prev => ({ ...prev, [field]: value }));
  };

  // Image Management
  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 3);
    if (files.length === 0) return;

    try {
      const form = new FormData();
      files.forEach(f => form.append('images', f));

      const token = localStorage.getItem('auth-token') || '';
      const baseUrl = import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || 'http://localhost:5000';
      const res = await fetch(`${baseUrl}/api/upload/images`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      if (!res.ok) throw new Error('Image upload failed');
      const data = await res.json();
      const urls: string[] = data.urls || [];

      setEventData(prev => ({
        ...prev,
        images: [...prev.images, ...urls].slice(0, 3)
      }));
    } catch (err) {
      console.error('Image upload error:', err);
    }
  };

  const removeImage = (indexToRemove: number) => {
    setEventData(prev => ({
      ...prev,
      images: prev.images.filter((_, index) => index !== indexToRemove)
    }));
  };

  // Ticket Category Management
  const addTicketCategory = () => {
    const newCategory: TicketCategory = {
      id: `ticket-${Date.now()}`,
      name: '',
      price: 0,
      capacity: 1,
      sold: 0,
      description: '',
      isActive: true
    };
    setTicketCategories(prev => [...prev, newCategory]);
  };

  const removeTicketCategory = (id: string) => {
    if (ticketCategories.length > 1) { // Keep at least one category
      setTicketCategories(prev => prev.filter(tc => tc.id !== id));
    }
  };

  const updateTicketCategory = (id: string, field: keyof TicketCategory, value: any) => {
    setTicketCategories(prev =>
      prev.map(tc =>
        tc.id === id ? { ...tc, [field]: value } : tc
      )
    );
  };

  const toggleTicketCategory = (id: string) => {
    setTicketCategories(prev =>
      prev.map(tc =>
        tc.id === id ? { ...tc, isActive: !tc.isActive } : tc
      )
    );
  };

  const getPresetTicketCategories = () => [
    { name: 'VVIP', price: 500, description: 'Premium experience with exclusive access' },
    { name: 'VIP', price: 300, description: 'VIP seating and priority access' },
    { name: 'Standard', price: 150, description: 'General admission with all access' },
    { name: 'Table for 2', price: 350, description: 'Private table for 2 guests' },
    { name: 'Table for 5', price: 800, description: 'Private table for 5 guests' },
    { name: 'Regular', price: 75, description: 'Basic access' }
  ];

  const addPresetCategory = (preset: { name: string; price: number; description: string }) => {
    const newCategory: TicketCategory = {
      id: `ticket-${Date.now()}`,
      name: preset.name,
      price: preset.price,
      capacity: 10,
      sold: 0,
      description: preset.description,
      isActive: true
    };
    setTicketCategories(prev => [...prev, newCategory]);
  };

  const addPaymentMethod = () => {
    if (newPaymentMethod.type && isPaymentMethodValid(newPaymentMethod)) {
      const paymentMethod: PaymentMethod = {
        id: Date.now().toString(),
        type: newPaymentMethod.type as PaymentMethod['type'],
        details: newPaymentMethod.details || {},
        isActive: newPaymentMethod.isActive || true
      };

      setPaymentMethods(prev => [...prev, paymentMethod]);
      setNewPaymentMethod({
        type: 'bank_transfer',
        details: {},
        isActive: true
      });
    }
  };

  const removePaymentMethod = (id: string) => {
    setPaymentMethods(prev => prev.filter(pm => pm.id !== id));
  };

  const togglePaymentMethod = (id: string) => {
    setPaymentMethods(prev =>
      prev.map(pm =>
        pm.id === id ? { ...pm, isActive: !pm.isActive } : pm
      )
    );
  };

  const isPaymentMethodValid = (pm: Partial<PaymentMethod>) => {
    if (!pm.type || !pm.details) return false;

    switch (pm.type) {
      case 'bank_transfer':
        return !!(pm.details.bankName && pm.details.accountName && pm.details.accountNumber);
      case 'cashapp':
        return !!pm.details.tagName;
      case 'paypal':
        return !!pm.details.email;
      case 'bitcoin':
        return !!pm.details.walletAddress;
      case 'pay_at_event':
        return true; // Pay at event doesn't require additional details
      default:
        return false;
    }
  };

  const isStepValid = (currentStep: string) => {
    if (currentStep === 'details') {
      return !!(
        eventData.title &&
        eventData.description &&
        eventData.date &&
        eventData.time &&
        eventData.location &&
        eventData.country &&
        eventData.currency &&
        eventData.capacity > 0
      );
    }
    if (currentStep === 'tickets') {
      const activeCategories = ticketCategories.filter(tc => tc.isActive);
      return activeCategories.length > 0 && 
             activeCategories.every(tc => 
               tc.name.trim() !== '' && 
               tc.price >= 0 && 
               tc.capacity > 0
             );
    }
    if (currentStep === 'payment') {
      return paymentMethods.filter(pm => pm.isActive).length > 0;
    }
    return false;
  };

  const handleNext = () => {
    if (step === 'details' && isStepValid('details')) {
      setStep('tickets');
    } else if (step === 'tickets' && isStepValid('tickets')) {
      setStep('payment');
    }
  };

  const handlePrevious = () => {
    if (step === 'payment') {
      setStep('tickets');
    } else if (step === 'tickets') {
      setStep('details');
    }
  };

  const handleComplete = () => {
    if (isStepValid('details') && isStepValid('tickets') && isStepValid('payment')) {
      onComplete({
          ...eventData,
          ticketCategories: ticketCategories.filter(tc => tc.isActive),
          paymentMethods: paymentMethods.filter(pm => pm.isActive),
          totalSlots: 0,
          bookedSlots: 0,
          ticketPricing: {
              vvip: {
                  price: 0,
                  slots: 0,
                  includes: []
              },
              vip: {
                  price: 0,
                  slots: 0,
                  includes: []
              },
              standard: {
                  price: 0,
                  slots: 0,
                  includes: []
              },
              tableFor2: {
                  price: 0,
                  slots: 0,
                  includes: []
              },
              tableFor5: {
                  price: 0,
                  slots: 0,
                  includes: []
              },
              regular: {
                  price: 0,
                  slots: 0,
                  includes: []
              }
          },
          paymentMethod: 'online',
          tags: [],
          createdBy: '',
          createdByName: '',
          isBookable: false,
          status: 'published', // align with backend enum [draft|published|cancelled]
          contactInfo: {
              phone: '',
              email: '',
              whatsapp: ''
          },
          attendees: undefined,
          price: 0,
          creatorId: ''
      } as any);
    }
  };

  const getCurrencySymbol = (currency: string) => {
    const symbols: { [key: string]: string } = {
      USD: '$', EUR: '€', GBP: '£', CAD: 'C$', AUD: 'A$', 
      JPY: '¥', KRW: '₩', BRL: 'R$', MXN: '$', INR: '₹', 
      CNY: '¥', NGN: '₦', ZAR: 'R', KES: 'KSh', GHS: '₵'
    };
    return symbols[currency] || currency;
  };

  const getPaymentMethodIcon = (type: PaymentMethod['type']) => {
    switch (type) {
      case 'bank_transfer': return <Building className="h-5 w-5" />;
      case 'cashapp': return <Smartphone className="h-5 w-5" />;
      case 'paypal': return <CreditCard className="h-5 w-5" />;
      case 'bitcoin': return <Bitcoin className="h-5 w-5" />;
      case 'pay_at_event': return <Banknote className="h-5 w-5" />;
      default: return <DollarSign className="h-5 w-5" />;
    }
  };

  const getPaymentMethodLabel = (type: PaymentMethod['type']) => {
    switch (type) {
      case 'bank_transfer': return 'Bank Transfer';
      case 'cashapp': return 'Cash App';
      case 'paypal': return 'PayPal';
      case 'bitcoin': return 'Bitcoin';
      case 'pay_at_event': return 'Pay at Event';
      default: return 'Payment';
    }
  };

  const renderPaymentMethodForm = () => {
    return (
      <div className="space-y-4 p-4 border border-gray-300 rounded-lg bg-glass-light/5 backdrop-blur-sm font-poppins">
        <div>
          <Label>Payment Method Type</Label>
          <Select
            value={newPaymentMethod.type}
            onValueChange={(value) => 
              setNewPaymentMethod(prev => ({ 
                ...prev, 
                type: value as PaymentMethod['type'],
                details: {} 
              }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className='bg-glass-light/10 backdrop-blur-sm border border-gray-300'>
              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              <SelectItem value="cashapp">Cash App</SelectItem>
              <SelectItem value="paypal">PayPal</SelectItem>
              <SelectItem value="bitcoin">Bitcoin</SelectItem>
              <SelectItem value="pay_at_event">Pay at Event</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {newPaymentMethod.type === 'bank_transfer' && (
          <div className="space-y-3">
            <div>
              <Label>Bank Name</Label>
              <Input
                value={newPaymentMethod.details?.bankName || ''}
                onChange={(e) => setNewPaymentMethod(prev => ({
                  ...prev,
                  details: { ...prev.details, bankName: e.target.value }
                }))}
                placeholder="e.g., Chase Bank"
              />
            </div>
            <div>
              <Label>Account Name</Label>
              <Input
                value={newPaymentMethod.details?.accountName || ''}
                onChange={(e) => setNewPaymentMethod(prev => ({
                  ...prev,
                  details: { ...prev.details, accountName: e.target.value }
                }))}
                placeholder="Your full name"
              />
            </div>
            <div>
              <Label>Account Number</Label>
              <Input
                value={newPaymentMethod.details?.accountNumber || ''}
                onChange={(e) => setNewPaymentMethod(prev => ({
                  ...prev,
                  details: { ...prev.details, accountNumber: e.target.value }
                }))}
                placeholder="Account number"
              />
            </div>
          </div>
        )}

        {newPaymentMethod.type === 'cashapp' && (
          <div>
            <Label>Cash App Tag</Label>
            <Input
              value={newPaymentMethod.details?.tagName || ''}
              onChange={(e) => setNewPaymentMethod(prev => ({
                ...prev,
                details: { ...prev.details, tagName: e.target.value }
              }))}
              placeholder="$YourUsername"
            />
          </div>
        )}

        {newPaymentMethod.type === 'paypal' && (
          <div>
            <Label>PayPal Email</Label>
            <Input
              type="email"
              value={newPaymentMethod.details?.email || ''}
              onChange={(e) => setNewPaymentMethod(prev => ({
                ...prev,
                details: { ...prev.details, email: e.target.value }
              }))}
              placeholder="your.email@example.com"
            />
          </div>
        )}

        {newPaymentMethod.type === 'bitcoin' && (
          <div>
            <Label>Bitcoin Wallet Address</Label>
            <Input
              value={newPaymentMethod.details?.walletAddress || ''}
              onChange={(e) => setNewPaymentMethod(prev => ({
                ...prev,
                details: { ...prev.details, walletAddress: e.target.value }
              }))}
              placeholder="Bitcoin wallet address"
            />
          </div>
        )}

        {newPaymentMethod.type === 'pay_at_event' && (
          <div className="space-y-3">
            <div>
              <Label>Payment Instructions</Label>
              <Textarea
                value={newPaymentMethod.details?.instructions || ''}
                onChange={(e) => setNewPaymentMethod(prev => ({
                  ...prev,
                  details: { ...prev.details, instructions: e.target.value }
                }))}
                placeholder="e.g., Payment can be made at the event entrance. Please bring exact change if paying cash."
                className="min-h-[80px]"
              />
            </div>
            <div>
              <Label>Accepted Payment Methods at Event</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {['Cash', 'Credit Card', 'Debit Card', 'Mobile Payment'].map((method) => (
                  <Button
                    key={method}
                    type="button"
                    variant={
                      newPaymentMethod.details?.acceptedMethods?.includes(method) 
                        ? "default" 
                        : "outline"
                    }
                    size="sm"
                    onClick={() => {
                      const currentMethods = newPaymentMethod.details?.acceptedMethods || [];
                      const newMethods = currentMethods.includes(method)
                        ? currentMethods.filter(m => m !== method)
                        : [...currentMethods, method];
                      
                      setNewPaymentMethod(prev => ({
                        ...prev,
                        details: { ...prev.details, acceptedMethods: newMethods }
                      }));
                    }}
                  >
                    {method}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        <Button
          onClick={addPaymentMethod}
          disabled={!isPaymentMethodValid(newPaymentMethod)}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Payment Method
        </Button>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto font-poppins">
      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center space-x-4">
          {[
            { key: 'details', label: 'Details' },
            { key: 'tickets', label: 'Tickets' },
            { key: 'payment', label: 'Payment' }
          ].map((stepItem, index) => {
            const stepIndex = ['details', 'tickets', 'payment'].indexOf(step);
            const currentIndex = ['details', 'tickets', 'payment'].indexOf(stepItem.key);
            
            return (
              <div key={stepItem.key} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                      step === stepItem.key 
                        ? 'bg-primary text-white' 
                        : currentIndex < stepIndex
                        ? 'bg-green-500 text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {currentIndex < stepIndex ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span className={`text-xs mt-1 ${step === stepItem.key ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                    {stepItem.label}
                  </span>
                </div>
                {index < 2 && (
                  <div 
                    className={`w-16 h-0.5 mx-4 ${
                      stepIndex > index 
                        ? 'bg-green-500' 
                        : 'bg-muted'
                    }`} 
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Card>
        {step === 'details' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Event Title</Label>
                <Input
                  id="title"
                  value={eventData.title}
                  onChange={(e) => handleEventDataChange('title', e.target.value)}
                  placeholder="Enter event title"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={eventData.description}
                  onChange={(e) => handleEventDataChange('description', e.target.value)}
                  placeholder="Describe your event"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={eventData.date}
                    onChange={(e) => handleEventDataChange('date', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={eventData.time}
                    onChange={(e) => handleEventDataChange('time', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={eventData.location}
                  onChange={(e) => handleEventDataChange('location', e.target.value)}
                  placeholder="Event location"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Select value={eventData.country} onValueChange={(value) => handleEventDataChange('country', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent className='bg-glass-light/5 backdrop-blur-sm'>
                      <SelectItem value="United States">United States</SelectItem>
                      <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                      <SelectItem value="Canada">Canada</SelectItem>
                      <SelectItem value="Australia">Australia</SelectItem>
                      <SelectItem value="Germany">Germany</SelectItem>
                      <SelectItem value="France">France</SelectItem>
                      <SelectItem value="Spain">Spain</SelectItem>
                      <SelectItem value="Italy">Italy</SelectItem>
                      <SelectItem value="Netherlands">Netherlands</SelectItem>
                      <SelectItem value="Japan">Japan</SelectItem>
                      <SelectItem value="South Korea">South Korea</SelectItem>
                      <SelectItem value="Brazil">Brazil</SelectItem>
                      <SelectItem value="Mexico">Mexico</SelectItem>
                      <SelectItem value="India">India</SelectItem>
                      <SelectItem value="China">China</SelectItem>
                      <SelectItem value="Nigeria">Nigeria</SelectItem>
                      <SelectItem value="South Africa">South Africa</SelectItem>
                      <SelectItem value="Kenya">Kenya</SelectItem>
                      <SelectItem value="Ghana">Ghana</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={eventData.currency} onValueChange={(value) => handleEventDataChange('currency', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent className='bg-glass-light/5 backdrop-blur-sm border-gray-300'>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="CAD">CAD (C$)</SelectItem>
                      <SelectItem value="AUD">AUD (A$)</SelectItem>
                      <SelectItem value="JPY">JPY (¥)</SelectItem>
                      <SelectItem value="KRW">KRW (₩)</SelectItem>
                      <SelectItem value="BRL">BRL (R$)</SelectItem>
                      <SelectItem value="MXN">MXN ($)</SelectItem>
                      <SelectItem value="INR">INR (₹)</SelectItem>
                      <SelectItem value="CNY">CNY (¥)</SelectItem>
                      <SelectItem value="NGN">NGN (₦)</SelectItem>
                      <SelectItem value="ZAR">ZAR (R)</SelectItem>
                      <SelectItem value="KES">KES (KSh)</SelectItem>
                      <SelectItem value="GHS">GHS (₵)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="capacity">Capacity</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min="1"
                    value={eventData.capacity}
                    onChange={(e) => handleEventDataChange('capacity', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              {/* Image Upload Section */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Event Images (Optional - Max 3)</Label>
                
                {/* Image Preview */}
                {eventData.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {eventData.images.map((image, index) => (
                      <div key={index} className="relative group">
                        <img 
                          src={image} 
                          alt={`Event preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Button */}
                {eventData.images.length < 3 && (
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      id="images"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <label htmlFor="images" className="cursor-pointer">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                          <Upload className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Upload Images</p>
                          <p className="text-xs text-muted-foreground">
                            Click to select images ({3 - eventData.images.length} remaining)
                          </p>
                        </div>
                      </div>
                    </label>
                  </div>
                )}
              </div>
            </CardContent>
          </motion.div>
        )}

        {step === 'tickets' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Ticket Categories
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Set up different ticket types and pricing for your event
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Quick Add Presets */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Quick Add Presets</Label>
                <div className="flex flex-wrap gap-2">
                  {getPresetTicketCategories().map((preset, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => addPresetCategory(preset)}
                      className="text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {preset.name} ({getCurrencySymbol(eventData.currency)}{preset.price})
                    </Button>
                  ))}
                </div>
              </div>

              {/* Ticket Categories List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Ticket Categories</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addTicketCategory}
                    className="text-xs"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Category
                  </Button>
                </div>

                {ticketCategories.map((category, index) => (
                  <Card key={category.id} className={`border ${!category.isActive ? 'opacity-50' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={category.isActive}
                            onCheckedChange={() => toggleTicketCategory(category.id)}
                          />
                          <span className="text-sm font-medium">Category {index + 1}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTicketCategory(category.id)}
                          disabled={ticketCategories.length <= 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`name-${category.id}`} className="text-xs">Category Name</Label>
                          <Input
                            id={`name-${category.id}`}
                            placeholder="e.g., VIP, Standard, Regular"
                            value={category.name}
                            onChange={(e) => updateTicketCategory(category.id, 'name', e.target.value)}
                            disabled={!category.isActive}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`price-${category.id}`} className="text-xs">Price ({getCurrencySymbol(eventData.currency)})</Label>
                          <Input
                            id={`price-${category.id}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={category.price}
                            onChange={(e) => updateTicketCategory(category.id, 'price', parseFloat(e.target.value) || 0)}
                            disabled={!category.isActive}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`capacity-${category.id}`} className="text-xs">Available Tickets</Label>
                          <Input
                            id={`capacity-${category.id}`}
                            type="number"
                            min="1"
                            value={category.capacity}
                            onChange={(e) => updateTicketCategory(category.id, 'capacity', parseInt(e.target.value) || 1)}
                            disabled={!category.isActive}
                          />
                        </div>
                        <div className="md:col-span-1">
                          <Label htmlFor={`description-${category.id}`} className="text-xs">Description (Optional)</Label>
                          <Input
                            id={`description-${category.id}`}
                            placeholder="Brief description of this ticket type"
                            value={category.description}
                            onChange={(e) => updateTicketCategory(category.id, 'description', e.target.value)}
                            disabled={!category.isActive}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Summary */}
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">Summary</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Total Categories: {ticketCategories.filter(tc => tc.isActive).length}</p>
                  <p>Total Capacity: {ticketCategories.filter(tc => tc.isActive).reduce((sum, tc) => sum + tc.capacity, 0)}</p>
                  <p>Price Range: ${Math.min(...ticketCategories.filter(tc => tc.isActive).map(tc => tc.price))} - ${Math.max(...ticketCategories.filter(tc => tc.isActive).map(tc => tc.price))}</p>
                </div>
              </div>
            </CardContent>
          </motion.div>
        )}

        {step === 'payment' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
              <p className="text-muted-foreground">
                Add payment methods for attendees to use when booking your event
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Existing Payment Methods */}
              {paymentMethods.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold">Your Payment Methods</h4>
                  {paymentMethods.map((pm) => (
                    <Card key={pm.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getPaymentMethodIcon(pm.type)}
                          <div>
                            <p className="font-medium">{getPaymentMethodLabel(pm.type)}</p>
                            <p className="text-sm text-muted-foreground">
                              {pm.type === 'bank_transfer' && `${pm.details.bankName} - ${pm.details.accountNumber}`}
                              {pm.type === 'cashapp' && pm.details.tagName}
                              {pm.type === 'paypal' && pm.details.email}
                              {pm.type === 'bitcoin' && `${pm.details.walletAddress?.slice(0, 12)}...`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={pm.isActive}
                            onCheckedChange={() => togglePaymentMethod(pm.id)}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removePaymentMethod(pm.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {/* Add New Payment Method */}
              <div>
                <h4 className="font-semibold mb-3">Add Payment Method</h4>
                {renderPaymentMethodForm()}
              </div>
            </CardContent>
          </motion.div>
        )}

        {/* Navigation */}
        <div className="flex justify-between p-6 border-t border-gray-300">
          <Button variant="outline" onClick={step === 'details' ? onCancel : handlePrevious}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {step === 'details' ? 'Cancel' : 'Previous'}
          </Button>
          
          {step === 'details' ? (
            <Button onClick={handleNext} disabled={!isStepValid('details')}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : step === 'tickets' ? (
            <Button onClick={handleNext} disabled={!isStepValid('tickets')}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleComplete} disabled={!isStepValid('payment')}>
              <Check className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default EventCreationWizard;
