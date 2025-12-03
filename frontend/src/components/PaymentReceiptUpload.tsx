import { useState, type ChangeEvent, type FormEvent, type FC } from 'react';
import { Upload, Receipt, DollarSign, CreditCard, Smartphone, Banknote } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent } from './ui/card';
import { useToast } from '../hooks/use-toast';
import { paymentReceiptAPI, uploadAPI } from '../lib/api';

interface PaymentReceiptUploadProps {
  booking: {
    id: string;
    eventId: string;
    eventTitle: string;
    totalAmount: number;
    paymentStatus: string;
  };
  onUploadSuccess?: () => void;
}

const PaymentReceiptUpload: FC<PaymentReceiptUploadProps> = ({ booking, onUploadSuccess }) => {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    receiptImage: '',
    receiptImagePublicId: '',
    amount: booking.totalAmount,
    paymentMethod: 'bank_transfer',
    transactionReference: '',
    notes: ''
  });

  const { toast } = useToast();

  const paymentMethods = [
    { value: 'bank_transfer', label: 'Bank Transfer', icon: Banknote },
    { value: 'mobile_money', label: 'Mobile Money', icon: Smartphone },
    { value: 'card', label: 'Credit/Debit Card', icon: CreditCard },
    { value: 'cash', label: 'Cash Payment', icon: DollarSign },
    { value: 'other', label: 'Other', icon: Receipt }
  ];

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload an image file (JPG, PNG, etc.)",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    try {
      setUploading(true);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);

      // Upload to server
      const response = await uploadAPI.uploadImage(file);
      
      setFormData(prev => ({
        ...prev,
        receiptImage: response.data.url,
        receiptImagePublicId: response.data.publicId
      }));

      toast({
        title: "Image Uploaded",
        description: "Receipt image uploaded successfully",
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!formData.receiptImage) {
      toast({
        title: "Receipt Required",
        description: "Please upload a receipt image",
        variant: "destructive"
      });
      return;
    }

    try {
      setUploading(true);
      
      await paymentReceiptAPI.uploadReceipt({
        eventId: booking.eventId,
        bookingId: booking.id,
        amount: formData.amount,
        receiptImage: formData.receiptImage,
        receiptImagePublicId: formData.receiptImagePublicId,
        paymentMethod: formData.paymentMethod,
        transactionReference: formData.transactionReference,
        notes: formData.notes
      });

      toast({
        title: "Receipt Uploaded",
        description: "Your payment receipt has been submitted for verification",
      });

      setOpen(false);
      onUploadSuccess?.();
      
      // Reset form
      setFormData({
        receiptImage: '',
        receiptImagePublicId: '',
        amount: booking.totalAmount,
        paymentMethod: 'bank_transfer',
        transactionReference: '',
        notes: ''
      });
      setImagePreview(null);
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to submit receipt. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const selectedMethod = paymentMethods.find(method => method.value === formData.paymentMethod);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          disabled={booking.paymentStatus !== 'pending'}
          className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
        >
          <Receipt className="h-4 w-4 mr-2" />
          Upload Receipt
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto glass-card backdrop-blur-glass shadow-glass">
        <DialogHeader>
          <DialogTitle>Upload Payment Receipt</DialogTitle>
          <DialogDescription>
            Upload your payment receipt for verification. Include transaction details and any relevant notes.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Event Info */}
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <h4 className="font-medium">{booking.eventTitle}</h4>
                <p className="text-sm text-muted-foreground">
                  Total Amount: <span className="font-medium">${booking.totalAmount}</span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Receipt Image Upload */}
          <div className="space-y-3">
            <Label htmlFor="receipt-image">Receipt Image *</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
              {imagePreview ? (
                <div className="space-y-3">
                  <img 
                    src={imagePreview} 
                    alt="Receipt preview" 
                    className="max-w-full h-48 object-contain mx-auto rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setImagePreview(null);
                      setFormData(prev => ({ ...prev, receiptImage: '', receiptImagePublicId: '' }));
                    }}
                  >
                    Remove Image
                  </Button>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Click to upload or drag and drop your receipt
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG up to 5MB
                    </p>
                  </div>
                </div>
              )}
              <Input
                id="receipt-image"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={uploading}
              />
            </div>
          </div>

          {/* Payment Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount Paid *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="payment-method">Payment Method *</Label>
              <Select 
                value={formData.paymentMethod} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value }))}
              >
                <SelectTrigger>
                  <SelectValue>
                    {selectedMethod && (
                      <div className="flex items-center">
                        <selectedMethod.icon className="h-4 w-4 mr-2" />
                        {selectedMethod.label}
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      <div className="flex items-center">
                        <method.icon className="h-4 w-4 mr-2" />
                        {method.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Transaction Reference */}
          <div className="space-y-2">
            <Label htmlFor="transaction-ref">Transaction Reference (Optional)</Label>
            <Input
              id="transaction-ref"
              placeholder="Enter transaction ID or reference number"
              value={formData.transactionReference}
              onChange={(e) => setFormData(prev => ({ ...prev, transactionReference: e.target.value }))}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional information about the payment..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="min-h-[80px]"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={uploading || !formData.receiptImage}
              className="bg-green-600 hover:bg-green-700"
            >
              {uploading ? 'Uploading...' : 'Submit Receipt'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentReceiptUpload;
