import { useState, useEffect, type FC } from 'react';
import { Bell, Calendar, MapPin, Clock, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { useToast } from '../hooks/use-toast';
import { notificationsAPI } from '../lib/api';
import { getNotificationIcon } from '../hooks/useBookingNotifications';

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  data?: {
    // Event update fields
    eventId?: string;
    eventTitle?: string;
    updateType?: string;
    reason?: string;
    newDate?: string;
    newTime?: string;
    newLocation?: string;
    originalDate?: string;
    originalTime?: string;
    originalLocation?: string;

    // Payment fields
    receiptId?: string;
    bookingId?: string;
    amount?: number;
    paymentMethod?: string;
    transactionReference?: string;
    notes?: string;

    // User information (for payment receipts)
    userName?: string;
    userEmail?: string;
    userPhone?: string;
    userAvatar?: string;
    submittedAt?: string;

    // Event details
    eventDate?: string;
    eventTime?: string;
    eventLocation?: string;

    // Confirmation details
    confirmedBy?: string;
    confirmedAt?: string;
    verificationNotes?: string;

    // Rejection details
    rejectionReason?: string;
    rejectedBy?: string;
    rejectedAt?: string;
    organizerEmail?: string;
    organizerPhone?: string;

    // Ticket fields
    ticketId?: string;
    ticketType?: string;
    quantity?: number;
    downloadUrl?: string;
  };
  read: boolean;
  createdAt: string;
}

const NotificationsList: FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchNotifications = async () => {
    try {
      const response = await notificationsAPI.getNotifications();
      setNotifications(response.data || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (notificationId: string) => {
    try {
      await notificationsAPI.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId ? { ...notif, read: true } : notif
        )
      );
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive"
      });
    }
  };





  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'event_postponed':
        return 'border-amber-200 bg-amber-50/50';
      case 'event_cancelled':
        return 'border-red-200 bg-red-50/50';
      case 'payment_confirmed':
        return 'border-green-200 bg-green-50/50';
      case 'payment_rejected':
        return 'border-red-200 bg-red-50/50';
      case 'payment_receipt':
        return 'border-blue-200 bg-blue-50/50';
      case 'ticket_generated':
        return 'border-purple-200 bg-purple-50/50';
      default:
        return 'border-gray-200 bg-gray-50/50';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return timeString;
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading notifications...</p>
        </CardContent>
      </Card>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Notifications
          </div>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unreadCount} new
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`p-4 rounded-lg border transition-colors ${
                    notification.read ? 'bg-background' : getNotificationColor(notification.type)
                  } ${!notification.read ? 'border-l-4' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      {getNotificationIcon(notification.type as any)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className={`font-medium ${!notification.read ? 'font-semibold' : ''}`}>
                            {notification.title}
                          </h4>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(notification.createdAt)}
                          </span>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2 whitespace-pre-line">
                          {notification.message}
                        </p>

                        {/* Event Update Details */}
                        {(notification.type === 'event_postponed' || notification.type === 'event_cancelled') && notification.data && (
                          <div className="mt-3 p-3 bg-background/50 rounded-md border">
                            <h5 className="font-medium text-sm mb-2">Event Details:</h5>
                            <div className="space-y-1 text-xs">
                              <p><strong>Event:</strong> {notification.data.eventTitle}</p>

                              {notification.type === 'event_postponed' && (
                                <>
                                  {notification.data.newDate && (
                                    <div className="flex items-center space-x-2">
                                      <Calendar className="h-3 w-3" />
                                      <span>
                                        <strong>New Date:</strong> {formatDate(notification.data.newDate)}
                                        {notification.data.originalDate && (
                                          <span className="text-muted-foreground ml-2">
                                            (was {formatDate(notification.data.originalDate)})
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  )}

                                  {notification.data.newTime && (
                                    <div className="flex items-center space-x-2">
                                      <Clock className="h-3 w-3" />
                                      <span>
                                        <strong>New Time:</strong> {formatTime(notification.data.newTime)}
                                        {notification.data.originalTime && (
                                          <span className="text-muted-foreground ml-2">
                                            (was {formatTime(notification.data.originalTime)})
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  )}

                                  {notification.data.newLocation && (
                                    <div className="flex items-center space-x-2">
                                      <MapPin className="h-3 w-3" />
                                      <span>
                                        <strong>New Location:</strong> {notification.data.newLocation}
                                        {notification.data.originalLocation && (
                                          <span className="text-muted-foreground ml-2">
                                            (was {notification.data.originalLocation})
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  )}
                                </>
                              )}

                              {notification.data.reason && (
                                <p><strong>Reason:</strong> {notification.data.reason}</p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Payment Receipt Details */}
                        {(notification.type === 'payment_receipt' || notification.type === 'payment_confirmed' || notification.type === 'payment_rejected') && notification.data && (
                          <div className="mt-3 p-3 bg-background/50 rounded-md border">
                            <h5 className="font-medium text-sm mb-2">
                              {notification.type === 'payment_receipt' ? 'Payment Receipt Submitted' :
                               notification.type === 'payment_confirmed' ? 'Payment Confirmation Details' :
                               'Payment Rejection Details'}
                            </h5>
                            <div className="space-y-2 text-xs">
                              {/* Event Information */}
                              {notification.data.eventTitle && (
                                <div className="flex items-center space-x-2">
                                  <Calendar className="h-3 w-3 text-primary" />
                                  <span><strong>Event:</strong> {notification.data.eventTitle}</span>
                                </div>
                              )}

                              {/* User Information (for payment receipts) */}
                              {notification.type === 'payment_receipt' && (
                                <div className="bg-blue-50 p-2 rounded border-l-2 border-blue-200">
                                  <p className="font-medium text-blue-800 mb-1">Customer Details:</p>
                                  {notification.data.userName && (
                                    <p><strong>Name:</strong> {notification.data.userName}</p>
                                  )}
                                  {notification.data.userEmail && (
                                    <p><strong>Email:</strong> {notification.data.userEmail}</p>
                                  )}
                                  {notification.data.userPhone && notification.data.userPhone !== 'Not provided' && (
                                    <p><strong>Phone:</strong> {notification.data.userPhone}</p>
                                  )}
                                </div>
                              )}

                              {/* Payment Information */}
                              <div className="bg-green-50 p-2 rounded border-l-2 border-green-200">
                                <p className="font-medium text-green-800 mb-1">Payment Information:</p>
                                {notification.data.amount && (
                                  <p><strong>Amount:</strong> ${notification.data.amount}</p>
                                )}
                                {notification.data.paymentMethod && (
                                  <p><strong>Method:</strong> {notification.data.paymentMethod.replace('_', ' ').toUpperCase()}</p>
                                )}
                                {notification.data.transactionReference && (
                                  <p><strong>Transaction Ref:</strong> {notification.data.transactionReference}</p>
                                )}
                                {notification.data.notes && (
                                  <p><strong>Notes:</strong> {notification.data.notes}</p>
                                )}
                              </div>

                              {/* Event Details */}
                              {(notification.data.eventDate || notification.data.eventTime || notification.data.eventLocation) && (
                                <div className="bg-purple-50 p-2 rounded border-l-2 border-purple-200">
                                  <p className="font-medium text-purple-800 mb-1">Event Information:</p>
                                  {notification.data.eventDate && (
                                    <p><strong>Date:</strong> {new Date(notification.data.eventDate).toLocaleDateString()}</p>
                                  )}
                                  {notification.data.eventTime && (
                                    <p><strong>Time:</strong> {notification.data.eventTime}</p>
                                  )}
                                  {notification.data.eventLocation && (
                                    <p><strong>Location:</strong> {notification.data.eventLocation}</p>
                                  )}
                                </div>
                              )}

                              {/* Confirmation/Rejection Details */}
                              {notification.type === 'payment_confirmed' && notification.data.confirmedBy && (
                                <div className="bg-green-50 p-2 rounded border-l-2 border-green-200">
                                  <p className="font-medium text-green-800 mb-1">Confirmation Details:</p>
                                  <p><strong>Confirmed by:</strong> {notification.data.confirmedBy}</p>
                                  {notification.data.confirmedAt && (
                                    <p><strong>Confirmed at:</strong> {new Date(notification.data.confirmedAt).toLocaleString()}</p>
                                  )}
                                  {notification.data.verificationNotes && (
                                    <p><strong>Notes:</strong> {notification.data.verificationNotes}</p>
                                  )}
                                </div>
                              )}

                              {notification.type === 'payment_rejected' && (
                                <div className="bg-red-50 p-2 rounded border-l-2 border-red-200">
                                  <p className="font-medium text-red-800 mb-1">Rejection Details:</p>
                                  {notification.data.rejectionReason && (
                                    <p><strong>Reason:</strong> {notification.data.rejectionReason}</p>
                                  )}
                                  {notification.data.rejectedBy && (
                                    <p><strong>Rejected by:</strong> {notification.data.rejectedBy}</p>
                                  )}
                                  {notification.data.rejectedAt && (
                                    <p><strong>Rejected at:</strong> {new Date(notification.data.rejectedAt).toLocaleString()}</p>
                                  )}
                                  {notification.data.organizerEmail && (
                                    <p><strong>Contact:</strong> {notification.data.organizerEmail}</p>
                                  )}
                                </div>
                              )}

                              {/* Submission timestamp */}
                              {notification.data.submittedAt && (
                                <p className="text-muted-foreground">
                                  <strong>Submitted:</strong> {new Date(notification.data.submittedAt).toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Ticket Generation Details */}
                        {notification.type === 'ticket_generated' && notification.data && (
                          <div className="mt-3 p-3 bg-purple-50 rounded-md border border-purple-200">
                            <h5 className="font-medium text-sm mb-2 text-purple-800">🎫 Ticket Ready for Download</h5>
                            <div className="space-y-2 text-xs">
                              {/* Event Information */}
                              {notification.data.eventTitle && (
                                <div className="flex items-center space-x-2">
                                  <Calendar className="h-3 w-3 text-purple-600" />
                                  <span><strong>Event:</strong> {notification.data.eventTitle}</span>
                                </div>
                              )}

                              {/* Ticket Information */}
                              <div className="bg-white p-2 rounded border-l-2 border-purple-300">
                                <p className="font-medium text-purple-800 mb-1">Ticket Details:</p>
                                {notification.data.ticketId && (
                                  <p><strong>Ticket ID:</strong> {notification.data.ticketId}</p>
                                )}
                                {notification.data.ticketType && (
                                  <p><strong>Type:</strong> {notification.data.ticketType.toUpperCase()}</p>
                                )}
                                {notification.data.quantity && (
                                  <p><strong>Quantity:</strong> {notification.data.quantity} ticket{notification.data.quantity > 1 ? 's' : ''}</p>
                                )}
                                {notification.data.eventDate && (
                                  <p><strong>Event Date:</strong> {new Date(notification.data.eventDate).toLocaleDateString()}</p>
                                )}
                              </div>

                              {/* Download Action */}
                              {notification.data.downloadUrl && (
                                <div className="bg-purple-100 p-2 rounded border-l-2 border-purple-400">
                                  <p className="font-medium text-purple-800 mb-1">Next Steps:</p>
                                  <p className="text-purple-700">
                                    Visit <strong>My Tickets</strong> page to download your ticket and view the QR code for venue entry.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-2">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification._id)}
                          className="h-8 w-8 p-0"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}

                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationsList;
