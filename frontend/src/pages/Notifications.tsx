import { useState, useEffect, type FC } from 'react';

import { Bell, Check, Filter, Search, ArrowLeft, Eye, User, Calendar, DollarSign, FileText } from 'lucide-react';
import { useBookingNotifications, getNotificationIcon, getNotificationColor, type BookingNotification } from '../hooks/useBookingNotifications';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { paymentReceiptAPI, getAbsoluteImageUrl } from '../lib/api';
import { useNavigate, useLocation } from 'react-router-dom';

const Notifications: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hookResult = useBookingNotifications() as any;

  // Provide default values to prevent runtime errors
  const notifications = hookResult?.notifications || [];
  const isLoading = hookResult?.isLoading || false;
  const unreadCount = hookResult?.unreadCount || 0;
  const markAsRead = hookResult?.markAsRead || (() => Promise.resolve());
  const markAllAsRead = hookResult?.markAllAsRead || (() => Promise.resolve());

  const getNotificationsByType = hookResult?.getNotificationsByType || (() => []);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<BookingNotification | null>(null);

  // Handle navigation from navbar with selected notification
  useEffect(() => {
    const state = location.state as any;
    if (state?.selectedNotificationId && state?.fromNavbar) {
      const notification = notifications.find((n: BookingNotification) => n.id === state.selectedNotificationId);
      if (notification) {
        setSelectedNotification(notification);
        // Clear the location state to prevent re-triggering
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, notifications]);

  const handleNotificationClick = (notification: BookingNotification) => {
    markAsRead(notification.id);
    setSelectedNotification(notification);
  };

  const handleBackToList = () => {
    setSelectedNotification(null);
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const formatFullDate = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(timestamp);
  };

  // Filter notifications based on search query, type, and read status
  const filteredNotifications = notifications.filter((notification: BookingNotification) => {
    const matchesSearch = notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || (notification.type && notification.type === filterType);
    const matchesReadStatus = !showOnlyUnread || !notification.read;

    return matchesSearch && matchesType && matchesReadStatus;
  });

  // Group notifications by date
  const groupedNotifications = filteredNotifications.reduce((groups: Record<string, BookingNotification[]>, notification: BookingNotification) => {
    const date = new Date(notification.timestamp).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(notification);
    return groups;
  }, {} as Record<string, any[]>);

  const notificationTypes = [
    { value: 'all', label: 'All Notifications' },
    { value: 'booking_confirmed', label: 'Booking Confirmed' },
    { value: 'booking_cancelled', label: 'Booking Cancelled' },
    { value: 'event_updated', label: 'Event Updated' },
    { value: 'event_postponed', label: 'Event Postponed' },
    { value: 'event_cancelled', label: 'Event Cancelled' },
    { value: 'payment_confirmed', label: 'Payment Confirmed' },
    { value: 'payment_rejected', label: 'Payment Rejected' },
    { value: 'refund_processed', label: 'Refund Processed' },
    { value: 'payment_reminder', label: 'Payment Reminder' }
  ];

  const getNotificationStats = () => {
    const total = notifications.length;
    const unread = unreadCount;
    const byType = notificationTypes.slice(1).map(type => ({
      type: type.value,
      label: type.label,
      count: getNotificationsByType(type.value as any).length
    }));
    
    return { total, unread, byType };
  };

  const stats = getNotificationStats();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Bell className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
                <p className="text-muted-foreground">
                  {stats.total} total • {stats.unread} unread
                </p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                className="flex items-center space-x-2"
              >
                <Check className="h-4 w-4" />
                <span>Mark All Read</span>
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-card/50 backdrop-blur-sm border-gray-300">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <Bell className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-card/50 backdrop-blur-sm border-gray-300">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Unread</p>
                    <p className="text-2xl font-bold text-primary">{stats.unread}</p>
                  </div>
                  <div className="h-3 w-3 bg-primary rounded-full" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-card/50 backdrop-blur-sm border-gray-300">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Bookings</p>
                    <p className="text-2xl font-bold">
                      {stats.byType.filter(t => t.type.includes('booking')).reduce((sum, t) => sum + t.count, 0)}
                    </p>
                  </div>
                  <span className="text-2xl">✅</span>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-card/50 backdrop-blur-sm border-gray-300">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Events</p>
                    <p className="text-2xl font-bold">
                      {stats.byType.filter(t => t.type.includes('event')).reduce((sum, t) => sum + t.count, 0)}
                    </p>
                  </div>
                  <span className="text-2xl">📅</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Notification View */}
          {selectedNotification && (
            <div className="mb-8">
              <Card className="backdrop-blur-glass bg-gradient-glass border-gray-300 shadow-glass">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleBackToList}
                        className="p-2"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      <div className="flex-shrink-0">
                        {getNotificationIcon(selectedNotification.type || 'booking_confirmed')}
                      </div>
                      <div>
                        <CardTitle className="text-xl">{selectedNotification.title}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {formatTimeAgo(selectedNotification.timestamp)}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={selectedNotification.read ? "secondary" : "default"}
                      className="font-semibold"
                    >
                      {selectedNotification.read ? "Read" : "Unread"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-muted/20 rounded-lg">
                      <p className="text-base leading-relaxed">{selectedNotification.message}</p>
                    </div>

                    {/* Payment Receipt Details */}
                    {selectedNotification.type === 'payment_receipt' && selectedNotification.data && (
                      <div className="space-y-4">
                        <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                          Payment Receipt Details
                        </h4>

                        {/* Customer Information */}
                        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <h5 className="font-medium text-blue-800 dark:text-blue-200 mb-3 flex items-center">
                            <User className="h-4 w-4 mr-2" />
                            Customer Information
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            {selectedNotification.data.userName && (
                              <div>
                                <span className="text-muted-foreground">Name:</span>
                                <p className="font-medium">{selectedNotification.data.userName}</p>
                              </div>
                            )}
                            {selectedNotification.data.userEmail && (
                              <div>
                                <span className="text-muted-foreground">Email:</span>
                                <p className="font-medium">{selectedNotification.data.userEmail}</p>
                              </div>
                            )}
                            {selectedNotification.data.userPhone && selectedNotification.data.userPhone !== 'Not provided' && (
                              <div>
                                <span className="text-muted-foreground">Phone:</span>
                                <p className="font-medium">{selectedNotification.data.userPhone}</p>
                              </div>
                            )}
                            {selectedNotification.data.submittedAt && (
                              <div>
                                <span className="text-muted-foreground">Submitted:</span>
                                <p className="font-medium">{new Date(selectedNotification.data.submittedAt).toLocaleString()}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Payment Information */}
                        <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                          <h5 className="font-medium text-green-800 dark:text-green-200 mb-3 flex items-center">
                            <DollarSign className="h-4 w-4 mr-2" />
                            Payment Information
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            {selectedNotification.data.amount && (
                              <div>
                                <span className="text-muted-foreground">Amount:</span>
                                <p className="font-medium text-lg">${selectedNotification.data.amount}</p>
                              </div>
                            )}
                            {selectedNotification.data.paymentMethod && (
                              <div>
                                <span className="text-muted-foreground">Payment Method:</span>
                                <p className="font-medium capitalize">{selectedNotification.data.paymentMethod.replace('_', ' ')}</p>
                              </div>
                            )}
                            {selectedNotification.data.transactionReference && (
                              <div>
                                <span className="text-muted-foreground">Transaction Reference:</span>
                                <p className="font-medium">{selectedNotification.data.transactionReference}</p>
                              </div>
                            )}
                            {selectedNotification.data.notes && (
                              <div className="md:col-span-2">
                                <span className="text-muted-foreground">Notes:</span>
                                <p className="font-medium">{selectedNotification.data.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Event Information */}
                        {selectedNotification.data.eventTitle && (
                          <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                            <h5 className="font-medium text-purple-800 dark:text-purple-200 mb-3 flex items-center">
                              <Calendar className="h-4 w-4 mr-2" />
                              Event Information
                            </h5>
                            <div className="text-sm">
                              <span className="text-muted-foreground">Event:</span>
                              <p className="font-medium">{selectedNotification.data.eventTitle}</p>
                            </div>
                          </div>
                        )}

                        {/* Receipt Image */}
                        {selectedNotification.data.receiptId && (
                          <div className="p-4 bg-gray-50 dark:bg-gray-950/20 rounded-lg border border-gray-300 dark:border-gray-800">
                            <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-3 flex items-center">
                              <FileText className="h-4 w-4 mr-2" />
                              Payment Receipt Image
                            </h5>
                            <div className="space-y-3">
                              <p className="text-sm text-muted-foreground">
                                Click the button below to view the uploaded payment receipt image.
                              </p>
                              <Button
                                onClick={async () => {
                                  try {
                                    const resp = await paymentReceiptAPI.getReceipt(selectedNotification.data.receiptId);
                                    const receipt = resp.data.receipt;
                                    if (receipt && receipt.receiptImage) {
                                      const imageUrl = getAbsoluteImageUrl(receipt.receiptImage);
                                      window.open(imageUrl, '_blank');
                                    } else {
                                      window.open(getAbsoluteImageUrl(`/api/payment-receipts/${selectedNotification.data.receiptId}/image`), '_blank');
                                    }
                                  } catch (err) {
                                    console.error('Failed to fetch receipt:', err);
                                    window.open(getAbsoluteImageUrl(`/api/payment-receipts/${selectedNotification.data.receiptId}/image`), '_blank');
                                  }
                                }}
                                className="w-full md:w-auto"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Receipt Image
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {selectedNotification.metadata && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                          Additional Details
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {selectedNotification.metadata.newDate && (
                            <div className="p-3 bg-muted/10 rounded-md">
                              <p className="text-xs text-muted-foreground">New Date</p>
                              <p className="font-semibold">{selectedNotification.metadata.newDate}</p>
                            </div>
                          )}
                          {selectedNotification.metadata.newLocation && (
                            <div className="p-3 bg-muted/10 rounded-md">
                              <p className="text-xs text-muted-foreground">New Location</p>
                              <p className="font-semibold">{selectedNotification.metadata.newLocation}</p>
                            </div>
                          )}
                          {selectedNotification.metadata.refundAmount && (
                            <div className="p-3 bg-muted/10 rounded-md">
                              <p className="text-xs text-muted-foreground">Refund Amount</p>
                              <p className="font-semibold">${selectedNotification.metadata.refundAmount}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex space-x-3 pt-4 border-t">
                      {selectedNotification.eventId && (
                        <Button
                          variant="outline"
                          onClick={() => navigate(`/events/${selectedNotification.eventId}`)}
                          className="flex-1"
                        >
                          View Event Details
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          {!selectedNotification && (
            <Card className="bg-card/50 backdrop-blur-sm border-border/50 mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search notifications..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    {notificationTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button
                  variant={showOnlyUnread ? "default" : "outline"}
                  onClick={() => setShowOnlyUnread(!showOnlyUnread)}
                  className="flex items-center space-x-2"
                >
                  <Filter className="h-4 w-4" />
                  <span>Unread Only</span>
                </Button>
              </div>
            </CardContent>
          </Card>
          )}
        </div>

        {/* Notifications List */}
          {!selectedNotification && (
            <div>
          {Object.keys(groupedNotifications).length === 0 ? (
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardContent className="p-12 text-center">
                <Bell className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No notifications found</h3>
                <p className="text-muted-foreground">
                  {searchQuery || filterType !== 'all' || showOnlyUnread
                    ? 'Try adjusting your filters'
                    : 'You\'ll see notifications here when you have some'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {(() => {
                    const groupedEntries = Object.entries(groupedNotifications) as [string, BookingNotification[]][];
                    return groupedEntries
                      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                      .map(([date, dayNotifications]) => (
                      <div key={date}>
                        <h3 className="text-lg font-semibold mb-4 text-foreground">
                          {new Date(date).toDateString() === new Date().toDateString()
                            ? 'Today'
                            : new Date(date).toDateString() === new Date(Date.now() - 86400000).toDateString()
                            ? 'Yesterday'
                            : new Intl.DateTimeFormat('en-US', {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric'
                              }).format(new Date(date))
                          }
                        </h3>
                        
                        <div className="space-y-3">
                          {dayNotifications.map((notification) => (
                            <div
                              key={notification.id}
                              className="group"
                            >
                              <Card 
                                className={`cursor-pointer border-border/50 ${
                                  !notification.read
                                    ? 'bg-primary/5 border-primary/20 shadow-md'
                                    : 'bg-card/50 backdrop-blur-sm hover:bg-card/80'
                                }`}
                                onClick={() => handleNotificationClick(notification)}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-start space-x-4">
                                    <div className="mt-1 flex-shrink-0">
                                      {getNotificationIcon(notification.type || 'booking_confirmed')}
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-semibold text-foreground truncate">
                                          {notification.title}
                                        </h4>
                                        <div className="flex items-center space-x-2">
                                          {!notification.read && (
                                            <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                                          )}
                                          <Badge
                                            variant="outline"
                                            className="text-xs"
                                            style={{ borderColor: notification.type ? getNotificationColor(notification.type) : 'text-gray-600' }}
                                          >
                                            {notification.type ? notification.type.replace('_', ' ') : 'notification'}
                                          </Badge>
                                        </div>
                                      </div>
                                      
                                      <p className="text-muted-foreground mb-2 leading-relaxed">
                                        {notification.message}
                                      </p>
                                      
                                      <div className="flex items-center justify-between">
                                        <p className="text-xs text-muted-foreground">
                                          {formatFullDate(notification.timestamp)}
                                        </p>
                                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100">
                                          {!notification.read && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                markAsRead(notification._id || notification.id);
                                              }}
                                              className="h-8 w-8 p-0"
                                            >
                                              <Check className="h-4 w-4" />
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
            </div>
          )}
        </div>
          )}
      </div>
    </div>
  );
};

export default Notifications;
