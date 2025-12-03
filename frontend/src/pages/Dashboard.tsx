import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { Calendar, Users, MapPin, Plus, TrendingUp, DollarSign, Receipt, Check, X, Eye } from 'lucide-react';
import { useEvents } from '../contexts/EventContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import EventCard from '../components/EventCard';
import EventCreationWizard from '../components/EventCreationWizard';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '../components/ui/dialog';
import { useToast } from '../hooks/use-toast';
import { paymentReceiptAPI, getAbsoluteImageUrl } from '../lib/api';
import api from '../lib/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const Dashboard: React.FC = () => {
  const { events, currentUser, createEvent, updateEvent } = useEvents();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('overview');

  // Handle URL parameters for tab switching
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Fetch payment receipts
  const fetchPaymentReceipts = async () => {
    if (!currentUser) return;

    try {
      setLoadingReceipts(true);
      const response = await paymentReceiptAPI.getReceipts({ limit: 10 });
      setPaymentReceipts(response.data.receipts || []);
    } catch (error) {
      console.error('Failed to fetch payment receipts:', error);
    } finally {
      setLoadingReceipts(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchPaymentReceipts();
    }
  }, [currentUser]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [paymentReceipts, setPaymentReceipts] = useState<any[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState(false);

  if (!currentUser) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <Card className="backdrop-blur-glass bg-gradient-glass border-glass-border/30 shadow-glass p-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
            <p className="text-muted-foreground">Please log in to access your dashboard.</p>
          </div>
        </Card>
      </div>
    );
  }

  const userCreatedEvents = Array.isArray(events) ? events.filter(event =>
    event.createdBy === currentUser?.id ||
    event.owner === currentUser?.id ||
    (event.owner && typeof event.owner === 'object' && event.owner._id === currentUser?.id)
  ) : [];
  const userBookedEvents = Array.isArray(events) ? events.filter(event => Array.isArray(event.booked) ? event.booked.includes(currentUser?.id) : false) : [];

  // Helper to safely get booked count (handles array, number or missing)
  const getBookedCount = (event: any) => {
    if (Array.isArray(event?.booked)) return event.booked.length;
    if (typeof event?.booked === 'number') return event.booked as number;
    return 0;
  };

  const stats = {
    createdEvents: userCreatedEvents.length,
    bookedEvents: userBookedEvents.length,
    totalAttendees: userCreatedEvents.reduce((sum, event) => sum + getBookedCount(event), 0),
    upcomingEvents: userCreatedEvents.filter(event => new Date(event.date) > new Date()).length,
    totalRevenue: userCreatedEvents.reduce((sum, event) => sum + (getBookedCount(event) * (event.price || 0)), 0),
    pendingPayments: paymentReceipts.filter(receipt => receipt.status === 'pending').length,
    confirmedPayments: paymentReceipts.filter(receipt => receipt.status === 'confirmed').length
  };

  // Analytics data for charts
  const getMonthlyEventData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();

    return months.map((month, index) => {
      const eventsInMonth = userCreatedEvents.filter(event => {
        const eventDate = new Date(event.date);
        return eventDate.getFullYear() === currentYear && eventDate.getMonth() === index;
      });

      const attendeesInMonth = eventsInMonth.reduce((sum, event) =>
        sum + getBookedCount(event), 0
      );

      const revenueInMonth = eventsInMonth.reduce((sum, event) =>
        sum + (getBookedCount(event) * (event.price || 0)), 0
      );

      return {
        month,
        events: eventsInMonth.length,
        attendees: attendeesInMonth,
        revenue: revenueInMonth
      };
    });
  };

  const getEventStatusData = () => {
    const statusCounts = userCreatedEvents.reduce((acc, event) => {
      const status = event.status || 'active';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      color: status === 'active' ? '#10b981' :
             status === 'cancelled' ? '#ef4444' :
             status === 'postponed' ? '#f59e0b' : '#6b7280'
    }));
  };

  const getTopPerformingEvents = () => {
    return userCreatedEvents
      .map(event => ({
        name: event.title.length > 20 ? event.title.substring(0, 20) + '...' : event.title,
        attendees: getBookedCount(event),
        revenue: getBookedCount(event) * (event.price || 0)
      }))
      .sort((a, b) => b.attendees - a.attendees)
      .slice(0, 5);
  };

  const monthlyData = getMonthlyEventData();
  const eventStatusData = getEventStatusData();
  const topEvents = getTopPerformingEvents();

  const handleEditEvent = (event: any) => {
    setEditingEvent(event);
    setIsCreateModalOpen(true);
  };

  // Deleted events handled elsewhere; keep API but avoid unused local function

  const handleConfirmReceipt = async (receiptId: string) => {
    try {
      await paymentReceiptAPI.confirmReceipt(receiptId, 'Payment confirmed by event organizer');

      // Note: Backend automatically sends notification to user when payment is confirmed

      toast({
        title: "Payment Confirmed",
        description: "Payment receipt has been confirmed and user has been notified.",
      });

      // Trigger notification refresh for real-time updates
      window.dispatchEvent(new CustomEvent('refreshNotifications'));

      fetchPaymentReceipts(); // Refresh the list
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to confirm payment receipt.",
        variant: "destructive"
      });
    }
  };

  const handleRejectReceipt = async (receiptId: string) => {
    try {
      await paymentReceiptAPI.rejectReceipt(receiptId, 'Payment receipt rejected by event organizer');

      // Note: Backend automatically sends notification to user when payment is rejected

      toast({
        title: "Payment Rejected",
        description: "Payment receipt has been rejected and user has been notified.",
      });

      // Trigger notification refresh for real-time updates
      window.dispatchEvent(new CustomEvent('refreshNotifications'));

      fetchPaymentReceipts(); // Refresh the list
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject payment receipt.",
        variant: "destructive"
      });
    }
  };



  const handleCreateTestTicket = async () => {
    try {
      const response = await api.post('/tickets/create-test-ticket');

      console.log('✅ Test ticket created:', response.data.ticket);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create test ticket.",
        variant: "destructive"
      });
      console.error('❌ Failed to create test ticket:', error);
    }
  };

  const handleCreateSuccess = (eventData: any) => {
    if (editingEvent) {
      updateEvent(editingEvent.id, eventData);
      // No success toast: navigate/close directly per user preference
    } else {
      createEvent(eventData);
      // No success toast: navigate/close directly per user preference
    }
    setIsCreateModalOpen(false);
    setEditingEvent(null);
  };

  return (
    <div className="min-h-screen pt-16 px-4 md:px-6 lg:px-8 font-poppins">
      <div className="max-w-7xl mx-auto py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
            <div>
              <h1 className="text-3xl md:text-4xl lg:text-4xl font-[700] mb-3">
                Welcome back, <span className="bg-gradient-primary bg-clip-text text-transparent">{currentUser?.name || 'User'}</span>
              </h1>
              <p className="text-muted-foreground text-[15px] md:text-base font-[395]">
                Manage your events and track your bookings from your personalized dashboard.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 lg:gap-3">
              <Button
                variant="outline"
                className="backdrop-blur-glass bg-gradient-glass border-gray-300 font-[600] text-gray-600"
                onClick={() => setActiveTab('analytics')}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                View Analytics
              </Button>

              <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-[#01684A] text-white border-0 shadow-accent-glow font-semibold">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Event
                  </Button>
                </DialogTrigger>
                <DialogContent className="backdrop-blur-glass bg-gradient-glass border-gray-300 shadow-glass max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-lg lg:text-xl font-bold">
                      {editingEvent ? 'Edit Event' : 'Create New Event'}
                    </DialogTitle>
                    <DialogDescription className="font-medium">
                      {editingEvent ? 'Update your event details and settings.' : 'Create a new event with all the necessary details and settings.'}
                    </DialogDescription>
                  </DialogHeader>

                  <EventCreationWizard
                    onComplete={handleCreateSuccess}
                    onCancel={() => {
                      setIsCreateModalOpen(false);
                      setEditingEvent(null);
                    }}
                    initialData={editingEvent}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </motion.div>



        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6 lg:mb-8"
        >
          <Card className="backdrop-blur-glass bg-gradient-glass border-gray-300 shadow-glass">
            <CardContent className="p-3 lg:p-4">
              <div className="flex flex-col lg:flex-row items-center lg:space-x-3 space-y-2 lg:space-y-0">
                <div className="w-10 h-10 rounded-full backdrop-blur-sm bg-glass-light/20 border border-gray-300 hover:bg-glass-light/30 transition-colors flex items-center justify-center">
                  <Calendar className="h-4 w-4" />
                </div>
                <div className="text-center lg:text-left">
                  <p className="text-xs lg:text-sm text-muted-foreground font-medium">Created Events</p>
                  <p className="text-xl lg:text-2xl font-bold text-gray-700">{stats.createdEvents}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-glass bg-gradient-glass border-gray-300 shadow-glass">
            <CardContent className="p-3 lg:p-4">
              <div className="flex flex-col lg:flex-row items-center lg:space-x-3 space-y-2 lg:space-y-0">
                <div className="w-10 h-10 rounded-full backdrop-blur-sm bg-glass-light/20 border border-gray-300 hover:bg-glass-light/30 transition-colors flex items-center justify-center">
                  <Users className="h-4 w-4" />
                </div>
                <div className="text-center lg:text-left">
                  <p className="text-xs lg:text-sm text-muted-foreground font-medium">Booked Events</p>
                  <p className="text-xl lg:text-2xl font-bold">{stats.bookedEvents}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-glass bg-gradient-glass border-gray-300 shadow-glass">
            <CardContent className="p-3 lg:p-4">
              <div className="flex flex-col lg:flex-row items-center lg:space-x-3 space-y-2 lg:space-y-0">
                <div className="w-10 h-10 rounded-full backdrop-blur-sm bg-glass-light/20 border border-gray-300 hover:bg-glass-light/30 transition-colors flex items-center justify-center">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div className="text-center lg:text-left">
                  <p className="text-xs lg:text-sm text-muted-foreground font-medium">Total Attendees</p>
                  <p className="text-xl lg:text-2xl font-bold">{stats.totalAttendees}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-glass bg-gradient-glass border-gray-300 shadow-glass">
            <CardContent className="p-3 lg:p-4">
              <div className="flex flex-col lg:flex-row items-center lg:space-x-3 space-y-2 lg:space-y-0">
                <div className="w-10 h-10 rounded-full backdrop-blur-sm bg-glass-light/20 border border-gray-300 hover:bg-glass-light/30 transition-colors flex items-center justify-center">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="text-center lg:text-left">
                  <p className="text-xs lg:text-sm text-muted-foreground font-medium">Upcoming</p>
                  <p className="text-xl lg:text-2xl font-bold">{stats.upcomingEvents}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Mobile: Two-row layout */}
            <div className="block md:hidden mb-6">
              <div className="backdrop-blur-glass bg-gradient-glass border border-gray-300 shadow-glass rounded-lg p-2">
                {/* First row */}
                <div className="flex mb-2 space-x-1">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                      activeTab === 'overview'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    Home
                  </button>
                  <button
                    onClick={() => setActiveTab('analytics')}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                      activeTab === 'analytics'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    Stats
                  </button>
                  <button
                    onClick={() => setActiveTab('created')}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                      activeTab === 'created'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    Mine ({userCreatedEvents.length})
                  </button>
                </div>
                {/* Second row */}
                <div className="flex space-x-1">
                  <button
                    onClick={() => setActiveTab('booked')}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                      activeTab === 'booked'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    Booked ({userBookedEvents.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('payments')}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                      activeTab === 'payments'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    Payments
                  </button>
                  {/* Empty space to balance the layout */}
                  <div className="flex-1"></div>
                </div>
              </div>
            </div>

            {/* Desktop: Single row layout */}
            <TabsList className="hidden md:flex backdrop-blur-glass bg-gradient-glass border border-glass-border/30 shadow-glass mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="created">My Events ({userCreatedEvents.length})</TabsTrigger>
              <TabsTrigger value="booked">Booked Events ({userBookedEvents.length})</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              {/* Stats Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card className="backdrop-blur-glass bg-gradient-glass border-gray-300 shadow-glass">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Events Created</p>
                          <p className="text-2xl font-bold">{stats.createdEvents}</p>
                        </div>
                        <div className="w-12 h-12 rounded-full backdrop-blur-sm bg-glass-light/20 border border-gray-300 hover:bg-glass-light/30 transition-colors flex items-center justify-center">
                          <Calendar className="h-6 w-6" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card className="backdrop-blur-glass bg-gradient-glass border-gray-300 shadow-glass">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Events Booked</p>
                          <p className="text-2xl font-bold">{stats.bookedEvents}</p>
                        </div>
                        <div className="w-12 h-12 rounded-full backdrop-blur-sm bg-glass-light/20 border border-gray-300 hover:bg-glass-light/30 transition-colors flex items-center justify-center">
                          <Users className="h-6 w-6" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card className="backdrop-blur-glass bg-gradient-glass border-gray-300 shadow-glass">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Attendees</p>
                          <p className="text-2xl font-bold">{stats.totalAttendees}</p>
                        </div>
                        <div className="w-12 h-12 rounded-full backdrop-blur-sm bg-glass-light/20 border border-gray-300 hover:bg-glass-light/30 transition-colors flex items-center justify-center">
                          <TrendingUp className="h-6 w-6" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Card className="backdrop-blur-glass bg-gradient-glass border-gray-300 shadow-glass">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Revenue</p>
                          <p className="text-2xl font-bold">${stats.totalRevenue}</p>
                        </div>
                        <div className="w-12 h-12 rounded-full backdrop-blur-sm bg-glass-light/20 border border-gray-300 hover:bg-glass-light/30 transition-colors flex items-center justify-center">
                          <DollarSign className="h-6 w-6" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </TabsContent>

            <TabsContent value="analytics">
              <div className="space-y-6">
                {/* Analytics Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
                    <p className="text-muted-foreground">Comprehensive insights into your event performance</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="bg-glass-light/10 border-gray-300">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {new Date().getFullYear()}
                    </Badge>
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="backdrop-blur-glass bg-gradient-glass border-gray-300 shadow-glass">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Events</p>
                          <p className="text-2xl font-bold">{stats.createdEvents}</p>
                          <p className="text-xs text-green-600">+{stats.upcomingEvents} upcoming</p>
                        </div>
                        <Calendar className="h-8 w-8" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="backdrop-blur-glass bg-gradient-glass border-gray-300 shadow-glass">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Attendees</p>
                          <p className="text-2xl font-bold">{stats.totalAttendees}</p>
                          <p className="text-xs text-blue-600">Avg: {stats.createdEvents > 0 ? Math.round(stats.totalAttendees / stats.createdEvents) : 0} per event</p>
                        </div>
                        <Users className="h-8 w-8" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="backdrop-blur-glass bg-gradient-glass border-gray-300 shadow-glass">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Revenue</p>
                          <p className="text-2xl font-bold">${stats.totalRevenue}</p>
                          <p className="text-xs text-green-600">Avg: ${stats.createdEvents > 0 ? Math.round(stats.totalRevenue / stats.createdEvents) : 0} per event</p>
                        </div>
                        <DollarSign className="h-8 w-8" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="backdrop-blur-glass bg-gradient-glass border-gray-300 shadow-glass">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Success Rate</p>
                          <p className="text-2xl font-bold">{stats.createdEvents > 0 ? Math.round((stats.totalAttendees / (stats.createdEvents * 10)) * 100) : 0}%</p>
                          <p className="text-xs text-muted-foreground">Booking efficiency</p>
                        </div>
                        <TrendingUp className="h-8 w-8" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts Grid */}
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Monthly Performance Chart */}
                  <Card className="backdrop-blur-glass bg-gradient-glass border-gray-300 shadow-glass">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <TrendingUp className="h-5 w-5 mr-2" />
                        Monthly Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="month" stroke="rgba(255,255,255,0.7)" />
                            <YAxis stroke="rgba(255,255,255,0.7)" />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'rgba(0,0,0,0.8)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '8px'
                              }}
                            />
                            <Line type="monotone" dataKey="events" stroke="#8b5cf6" strokeWidth={2} />
                            <Line type="monotone" dataKey="attendees" stroke="#06b6d4" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Event Status Distribution */}
                  <Card className="backdrop-blur-glass bg-gradient-glass border-gray-300 shadow-glass">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Calendar className="h-5 w-5 mr-2" />
                        Event Status Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={eventStatusData}
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                              label={({ name, value }) => `${name}: ${value}`}
                            >
                              {eventStatusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Top Performing Events */}
                <Card className="backdrop-blur-glass bg-gradient-glass border-gray-300 shadow-glass">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="h-5 w-5 mr-2" />
                      Top Performing Events
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topEvents}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                          <XAxis dataKey="name" stroke="rgba(255,255,255,0.7)" />
                          <YAxis stroke="rgba(255,255,255,0.7)" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'rgba(0,0,0,0.8)',
                              border: '1px solid rgba(255,255,255,0.2)',
                              borderRadius: '8px'
                            }}
                          />
                          <Bar dataKey="attendees" fill="#8b5cf6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Revenue Insights */}
                <div className="grid lg:grid-cols-3 gap-6">
                  <Card className="backdrop-blur-glass bg-gradient-glass border-gray-300 shadow-glass">
                    <CardHeader>
                      <CardTitle className="text-lg">Revenue Insights</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Average per Event</span>
                          <span className="font-bold">${stats.createdEvents > 0 ? Math.round(stats.totalRevenue / stats.createdEvents) : 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Average per Attendee</span>
                          <span className="font-bold">${stats.totalAttendees > 0 ? Math.round(stats.totalRevenue / stats.totalAttendees) : 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Highest Earning Event</span>
                          <span className="font-bold">${topEvents.length > 0 ? Math.max(...topEvents.map(e => e.revenue)) : 0}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="backdrop-blur-glass bg-gradient-glass border-gray-300 shadow-glass">
                    <CardHeader>
                      <CardTitle className="text-lg">Attendance Insights</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Average Attendance</span>
                          <span className="font-bold">{stats.createdEvents > 0 ? Math.round(stats.totalAttendees / stats.createdEvents) : 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Best Attended Event</span>
                          <span className="font-bold">{topEvents.length > 0 ? Math.max(...topEvents.map(e => e.attendees)) : 0} people</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Fill Rate</span>
                          <span className="font-bold">{stats.createdEvents > 0 ? Math.round((stats.totalAttendees / (stats.createdEvents * 10)) * 100) : 0}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="backdrop-blur-glass bg-gradient-glass border-gray-300 shadow-glass">
                    <CardHeader>
                      <CardTitle className="text-lg">Growth Metrics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Events This Month</span>
                          <span className="font-bold">{monthlyData[new Date().getMonth()]?.events || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Monthly Revenue</span>
                          <span className="font-bold">${monthlyData[new Date().getMonth()]?.revenue || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Growth Trend</span>
                          <span className="font-bold text-green-600">+{Math.round(Math.random() * 20)}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="created">
              {userCreatedEvents.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {userCreatedEvents.map((event, index) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <EventCard
                        event={event}
                        onEdit={handleEditEvent}
                      />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <Card className="backdrop-blur-glass bg-gradient-glass border-gray-300 shadow-glass p-12 text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No Events Created</h3>
                  <p className="text-muted-foreground mb-4">
                    You haven't created any events yet. Start by creating your first event!
                  </p>
                  <Button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-gradient-accent border-0"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Event
                  </Button>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="booked">
              {userBookedEvents.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {userBookedEvents.map((event, index) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <EventCard event={event} />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <Card className="backdrop-blur-glass bg-gradient-glass border-gray-300 shadow-glass p-12 text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No Booked Events</h3>
                  <p className="text-muted-foreground mb-4">
                    You haven't booked any events yet. Explore amazing events happening around you!
                  </p>
                  <Button variant="outline" className="bg-glass-light/10 border-glass-border/30">
                    Explore Events
                  </Button>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="payments">
              <div className="space-y-6">
                {/* Payment Summary */}
                <div className="grid md:grid-cols-3 gap-6">
                  <Card className="backdrop-blur-glass bg-gradient-glass border-gray-300 shadow-glass">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Revenue</p>
                          <p className="text-2xl font-bold text-green-600">${stats.totalRevenue}</p>
                        </div>
                        <DollarSign className="h-8 w-8" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="backdrop-blur-glass bg-gradient-glass border-gray-300 shadow-glass">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Pending Payments</p>
                          <p className="text-2xl font-bold text-gray-700">{stats.pendingPayments}</p>
                        </div>
                        <Receipt className="h-8 w-8" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="backdrop-blur-glass bg-gradient-glass border-gray-300 shadow-glass">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Confirmed Payments</p>
                          <p className="text-2xl font-bold text-blue-600">{stats.confirmedPayments}</p>
                        </div>
                        <Users className="h-8 w-8" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Test Ticket Creation */}
                <Card className="backdrop-blur-glass bg-gradient-glass border-gray-300 shadow-glass">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold">🎫 Test Ticket System</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Create a test ticket to verify the ticket system is working correctly.
                        </p>
                        <p className="text-xs text-muted-foreground">
                          This will create a sample ticket in the database that you can view in MyTickets.
                        </p>
                      </div>
                      <Button
                        onClick={handleCreateTestTicket}
                        className="bg-[#01684A] text-white border-0 shadow-accent-glow font-semibold"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Test Ticket
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Payment Receipts */}
                <Card className="backdrop-blur-glass bg-gradient-glass border-gray-300 shadow-glass">
                  <CardHeader>
                    <CardTitle className="text-lg lg:text-xl font-[600]">Recent Payment Receipts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingReceipts ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground font-medium">Loading payment receipts...</p>
                      </div>
                    ) : paymentReceipts.length === 0 ? (
                      <div className="text-center py-8">
                        <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground font-medium">No payment receipts yet</p>
                        <p className="text-sm text-muted-foreground">Payment receipts will appear here when users upload them</p>
                      </div>
                    ) : (
                      <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-glass-border/50 scrollbar-track-transparent space-y-4">
                        {paymentReceipts.map((receipt, index) => (
                          <motion.div
                            key={receipt._id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="border border-gray-300 rounded-lg hover:bg-muted/20 transition-colors backdrop-blur-sm"
                          >
                            {/* Mobile Layout */}
                            <div className="block lg:hidden p-4 space-y-3">
                              {/* Header with name and status */}
                              <div className="flex items-center justify-between">
                                <h4 className="font-[410] text-[14px] text-foreground">{receipt.user?.name || 'Unknown User'}</h4>
                                <Badge variant={
                                  receipt.status === 'confirmed' ? 'default' :
                                  receipt.status === 'rejected' ? 'destructive' : 'secondary'
                                } className="font-semibold">
                                  {receipt.status}
                                </Badge>
                              </div>

                              {/* User email */}
                              <div className="space-y-1">
                                <p className="text-[14px] font-[420] text-muted-foreground">Email</p>
                                <p className="text-[14px] font-[600] text-foreground">{receipt.user?.email}</p>
                              </div>

                              {/* Event details */}
                              <div className="space-y-1">
                                <p className="text-[14px] font-[420] text-muted-foreground">Event</p>
                                <p className="text-[14px] font-[420] text-foreground">{receipt.event?.title}</p>
                                {receipt.event?.location && (
                                  <p className="text-xs text-muted-foreground font-medium">{receipt.event.location}</p>
                                )}
                              </div>

                              {/* Amount and payment method */}
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-[14px] font-[420] text-blue-900">Amount</p>
                                  <p className="text-[14px] font-[420] text-blue-300">${receipt.amount}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[14px] font-[420] text-muted-foreground">Method</p>
                                  <p className="text-[14px] font-[600] text-blue-500">{receipt.paymentMethod}</p>
                                </div>
                              </div>

                              {/* Date */}
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Date</p>
                                <p className="text-xs font-semibold text-foreground">
                                  {new Date(receipt.createdAt).toLocaleDateString()}
                                </p>
                              </div>

                              {/* Action buttons */}
                              <div className="flex flex-col space-y-2 pt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(getAbsoluteImageUrl(receipt.receiptImage), '_blank')}
                                  className="bg-glass-light/10 border-gray-300 hover:bg-glass-light/20 backdrop-blur-sm w-full font-semibold"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Receipt
                                </Button>
                                {receipt.status === 'pending' && (
                                  <div className="flex space-x-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleConfirmReceipt(receipt._id)}
                                      className="bg-glass-light/10 border-gray-300 hover:bg-glass-light/20 backdrop-blur-sm hover:text-blue-700 border-[#3CDAFF] flex-1 font-[420]"
                                    >
                                      <Check className="h-4 w-4 mr-1" />
                                      Confirm
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleRejectReceipt(receipt._id)}
                                      className="bg-glass-light/10 border-gray-300 hover:bg-glass-light/20 backdrop-blur-sm hover:text-red-700 border-blue-200 flex-1 font-semibold"
                                    >
                                      <X className="h-4 w-4 mr-1" />
                                      Reject
                                    </Button>
                                  </div>
                                )}
                                {receipt.status === 'confirmed' && (
                                  <Badge variant="default" className="bg-[#3CDAFF] text-gray-800 w-full justify-center py-2 font-[550]">
                                    <Check className="h-3 w-3 mr-1" />
                                    Confirmed
                                  </Badge>
                                )}
                                {receipt.status === 'rejected' && (
                                  <Badge variant="destructive" className="w-full justify-center py-2 font-bold">
                                    <X className="h-3 w-3 mr-1" />
                                    Rejected
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Desktop Layout */}
                            <div className="hidden lg:flex items-center justify-between p-4 ">
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-[410] text-[12px]">{receipt.user?.name || 'Unknown User'}</span>
                                  <Badge variant={
                                    receipt.status === 'confirmed' ? 'default' :
                                    receipt.status === 'rejected' ? 'destructive' : 'secondary'
                                  } className="font-[410] text-[13px]">
                                    {receipt.status}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground font-semibold">{receipt.user?.email}</p>
                                <p className="text-sm text-muted-foreground font-semibold">{receipt.event?.title}</p>
                                {receipt.event?.location && (
                                  <p className="text-xs text-muted-foreground font-medium">{receipt.event.location}</p>
                                )}
                                <p className="text-[15px] font-[550] text-muted-foreground">${receipt.amount}</p>
                                <p className="text-xs text-muted-foreground font-medium">
                                  {new Date(receipt.createdAt).toLocaleDateString()} • {receipt.paymentMethod}
                                </p>
                              </div>
                              <div className="flex space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(getAbsoluteImageUrl(receipt.receiptImage), '_blank')}
                                  className="bg-glass-light/10 border-gray-200 hover:bg-glass-light/20 backdrop-blur-sm font-[415]"
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View Receipt
                                </Button>
                                {receipt.status === 'pending' && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleConfirmReceipt(receipt._id)}
                                      className="bg-glass-light/10 border-gray-300 hover:bg-glass-light/20 backdrop-blur-sm hover:text-blue-700 border-blue-200 font-[420]"
                                    >
                                      <Check className="h-4 w-4 mr-1" />
                                      Confirm
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleRejectReceipt(receipt._id)}
                                      className="bg-glass-light/10 border-gray-300 hover:bg-glass-light/20 backdrop-blur-sm hover:text-red-700 border-red-200/50 font-semibold"
                                    >
                                      <X className="h-4 w-4 mr-1" />
                                      Reject
                                    </Button>
                                  </>
                                )}
                                {receipt.status === 'confirmed' && (
                                  <Badge variant="default" className="bg-gray-200 text-blue-800 font-[410] text-[13px] py-2 px-4 justify-center flex items-center">
                                    <Check className="h-3 w-3 mr-1" />
                                    Confirmed
                                  </Badge>
                                )}
                                {receipt.status === 'rejected' && (
                                  <Badge variant="destructive" className="font-bold">
                                    <X className="h-3 w-3 mr-1" />
                                    Rejected
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
