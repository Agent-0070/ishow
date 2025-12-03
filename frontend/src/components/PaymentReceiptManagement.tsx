import { useState, useEffect, type FC } from 'react';
import { CheckCircle, XCircle, Eye, Receipt, DollarSign, Calendar, MapPin, User, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import { useToast } from '../hooks/use-toast';
import { paymentReceiptAPI, getAbsoluteImageUrl } from '../lib/api';
import { triggerNotificationRefresh } from '../utils/notifications';

interface PaymentReceipt {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    displayPicture?: string;
    avatar?: string;
  };
  event: {
    _id: string;
    title: string;
    date: string;
    time: string;
    location: string;
    price: number;
  };
  booking: {
    _id: string;
    ticketQuantity: number;
    totalAmount: number;
  };
  receiptImage: string;
  amount: number;
  paymentMethod: string;
  transactionReference?: string;
  notes?: string;
  status: 'pending' | 'confirmed' | 'rejected';
  verificationNotes?: string;
  createdAt: string;
  verifiedAt?: string;
}

const PaymentReceiptManagement: FC = () => {
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentReceipt | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const { toast } = useToast();

  const fetchReceipts = async () => {
    try {
      const response = await paymentReceiptAPI.getReceipts();
      setReceipts(response.data.receipts || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch payment receipts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  const handleConfirmPayment = async (receiptId: string) => {
    try {
      setActionLoading(true);
      await paymentReceiptAPI.confirmReceipt(receiptId, verificationNotes);

      toast({
        title: "Payment Confirmed",
        description: "Payment receipt has been confirmed and user notified",
      });

      // Trigger notification refresh for real-time updates
      triggerNotificationRefresh();

      setSelectedReceipt(null);
      setVerificationNotes('');
      fetchReceipts();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to confirm payment",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectPayment = async (receiptId: string) => {
    try {
      setActionLoading(true);
      await paymentReceiptAPI.rejectReceipt(receiptId, verificationNotes);

      toast({
        title: "Payment Rejected",
        description: "Payment receipt has been rejected and user notified",
      });

      // Trigger notification refresh for real-time updates
      triggerNotificationRefresh();

      setSelectedReceipt(null);
      setVerificationNotes('');
      fetchReceipts();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject payment",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'confirmed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Confirmed</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatPaymentMethod = (method: string) => {
    const methods: { [key: string]: string } = {
      'bank_transfer': 'Bank Transfer',
      'mobile_money': 'Mobile Money',
      'card': 'Credit/Debit Card',
      'cash': 'Cash Payment',
      'other': 'Other'
    };
    return methods[method] || method;
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Receipt className="h-5 w-5 mr-2" />
            Payment Receipts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading payment receipts...</p>
        </CardContent>
      </Card>
    );
  }

  const pendingReceipts = receipts.filter(r => r.status === 'pending');
  const processedReceipts = receipts.filter(r => r.status !== 'pending');

  return (
    <div className="space-y-6">
      {/* Pending Receipts */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Receipt className="h-5 w-5 mr-2" />
              Pending Payment Receipts
            </div>
            {pendingReceipts.length > 0 && (
              <Badge variant="destructive">{pendingReceipts.length} pending</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingReceipts.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No pending payment receipts</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingReceipts.map((receipt) => (
                <div key={receipt._id} className="p-4 border rounded-lg bg-background/50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4" />
                          <span className="font-medium">{receipt.user.name}</span>
                        </div>
                        {getStatusBadge(receipt.status)}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium">{receipt.event.title}</p>
                          <div className="flex items-center text-muted-foreground mt-1">
                            <Calendar className="h-3 w-3 mr-1" />
                            {formatDate(receipt.event.date)} at {receipt.event.time}
                          </div>
                          <div className="flex items-center text-muted-foreground">
                            <MapPin className="h-3 w-3 mr-1" />
                            {receipt.event.location}
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex items-center text-muted-foreground">
                            <DollarSign className="h-3 w-3 mr-1" />
                            Amount: ${receipt.amount}
                          </div>
                          <p className="text-muted-foreground">
                            Method: {formatPaymentMethod(receipt.paymentMethod)}
                          </p>
                          {receipt.transactionReference && (
                            <p className="text-muted-foreground text-xs">
                              Ref: {receipt.transactionReference}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {receipt.notes && (
                        <p className="text-sm text-muted-foreground mt-2 italic">
                          "{receipt.notes}"
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedReceipt(receipt)}
                            className="bg-glass-light/10 border-gray-300 hover:bg-glass-light/20 backdrop-blur-sm"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="glass-card backdrop-blur-glass shadow-glass max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Review Payment Receipt</DialogTitle>
                            <DialogDescription>
                              Review the payment receipt details and confirm or reject the payment.
                            </DialogDescription>
                          </DialogHeader>
                          
                          {selectedReceipt && (
                            <div className="space-y-4">
                              {/* Receipt Image */}
                              <div className="text-center">
                                <img
                                  src={getAbsoluteImageUrl(selectedReceipt.receiptImage)}
                                  alt="Payment Receipt"
                                  className="max-w-full max-h-96 mx-auto rounded-lg border"
                                />
                              </div>
                              
                              {/* Receipt Details */}
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p><strong>User:</strong> {selectedReceipt.user.name}</p>
                                  <p><strong>Email:</strong> {selectedReceipt.user.email}</p>
                                  <p><strong>Event:</strong> {selectedReceipt.event.title}</p>
                                  <p><strong>Amount:</strong> ${selectedReceipt.amount}</p>
                                </div>
                                <div>
                                  <p><strong>Payment Method:</strong> {formatPaymentMethod(selectedReceipt.paymentMethod)}</p>
                                  {selectedReceipt.transactionReference && (
                                    <p><strong>Reference:</strong> {selectedReceipt.transactionReference}</p>
                                  )}
                                  <p><strong>Submitted:</strong> {formatDate(selectedReceipt.createdAt)}</p>
                                </div>
                              </div>
                              
                              {selectedReceipt.notes && (
                                <div>
                                  <p className="font-medium">User Notes:</p>
                                  <p className="text-sm text-muted-foreground italic">"{selectedReceipt.notes}"</p>
                                </div>
                              )}
                              
                              {/* Verification Notes */}
                              <div>
                                <Label htmlFor="verificationNotes">Verification Notes (Optional)</Label>
                                <Textarea
                                  id="verificationNotes"
                                  value={verificationNotes}
                                  onChange={(e) => setVerificationNotes(e.target.value)}
                                  placeholder="Add any notes about this payment verification..."
                                  className="mt-1"
                                />
                              </div>
                              
                              {/* Action Buttons */}
                              <div className="flex justify-end space-x-2">
                                <Button
                                  variant="outline"
                                  onClick={() => handleRejectPayment(selectedReceipt._id)}
                                  disabled={actionLoading}
                                  className="bg-glass-light/10 border-gray-300 hover:bg-glass-light/20 backdrop-blur-sm text-red-600 hover:text-red-700 border-red-200/50"
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                                <Button
                                  onClick={() => handleConfirmPayment(selectedReceipt._id)}
                                  disabled={actionLoading}
                                  className="bg-glass-light/10 border-gray-300 hover:bg-glass-light/20 backdrop-blur-sm text-green-600 hover:text-green-700 border-green-200/50"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Confirm Payment
                                </Button>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processed Receipts */}
      {processedReceipts.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              Processed Receipts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {processedReceipts.map((receipt) => (
                  <div key={receipt._id} className="p-3 border rounded-lg bg-background/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{receipt.user.name}</p>
                        <p className="text-sm text-muted-foreground">{receipt.event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          ${receipt.amount} • {formatDate(receipt.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(receipt.status)}
                        {receipt.verifiedAt && (
                          <p className="text-xs text-muted-foreground mt-1">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {formatDate(receipt.verifiedAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PaymentReceiptManagement;
