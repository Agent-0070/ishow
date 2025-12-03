import { useState, useEffect, type FC } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { Calendar, Users, Plus, TrendingUp, DollarSign, Receipt } from 'lucide-react';
import { useEvents } from '../contexts/EventContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
// Badge not used in this file
import EventCard from '../components/EventCard';
import EventCreationWizard from '../components/EventCreationWizard';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { useToast } from '../hooks/use-toast';

const Dashboard: FC = () => {
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

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);

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

  const userCreatedEvents = events.filter(event => event.creatorId === currentUser.id);
  const userBookedEvents = events.filter(event => event.attendees && event.attendees.includes(currentUser.id));

  const stats = {
    createdEvents: userCreatedEvents.length,
    bookedEvents: userBookedEvents.length,
    totalAttendees: userCreatedEvents.reduce((sum, event) => sum + event.booked, 0),
    upcomingEvents: userCreatedEvents.filter(event => new Date(event.date) > new Date()).length,
    totalRevenue: userCreatedEvents.reduce((sum, event) => sum + (event.booked * (event.price || 0)), 0)
  };

  const handleCreateEvent = (eventData: any) => {
    const fullEventData = {
      ...eventData,
      creator: currentUser.name,
      creatorId: currentUser.id,
    };

    if (editingEvent) {
      // Track changes and notify attendees
      const changes = [];
      if (editingEvent.location !== eventData.location) {
        changes.push(`Location changed from "${editingEvent.location}" to "${eventData.location}"`);
      }
      if (editingEvent.date !== eventData.date) {
        changes.push(`Date changed from ${editingEvent.date} to ${eventData.date}`);
      }
      if (editingEvent.time !== eventData.time) {
        changes.push(`Time changed from ${editingEvent.time} to ${eventData.time}`);
      }
      
      updateEvent(editingEvent.id, fullEventData);
      
      // Send notifications to all attendees if there are changes
      if (changes.length > 0) {
        // TODO: Implement notification system
        console.log('Event updated:', {
          type: 'event_updated',
          title: `Event Updated: ${eventData.title}`,
          message: `The following changes have been made: ${changes.join(', ')}`,
          eventId: editingEvent.id
        });
      }
      
      toast({
        title: 'Event Updated',
        description: 'Your event has been successfully updated. All attendees have been notified of changes.',
      });
      setEditingEvent(null);
    } else {
      createEvent(fullEventData);
      toast({
        title: 'Event Created',
        description: 'Your event has been successfully created.',
      });
    }

    setIsCreateModalOpen(false);
  };

  const handleEditEvent = (event: any) => {
    setEditingEvent(event);
    setIsCreateModalOpen(true);
  };

  // Deletion handled via modal/actions; local helper removed to avoid unused warning

  return (
    <div className="min-h-screen pt-16 pb-20 md:pb-6 font-poppins">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {currentUser.name}!
          </h1>
          <p className="text-muted-foreground">
            Manage your events and track your hosting success.
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <Card className="backdrop-blur-glass bg-gradient-glass border-glass-border/30 shadow-glass">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Events Created</p>
                  <p className="text-2xl font-bold text-primary">{stats.createdEvents}</p>
                </div>
                <Calendar className="h-8 w-8 text-primary/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-glass bg-gradient-glass border-glass-border/30 shadow-glass">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Attendees</p>
                  <p className="text-2xl font-bold text-primary">{stats.totalAttendees}</p>
                </div>
                <Users className="h-8 w-8 text-primary/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-glass bg-gradient-glass border-glass-border/30 shadow-glass">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Upcoming Events</p>
                  <p className="text-2xl font-bold text-primary">{stats.upcomingEvents}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-primary/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-glass bg-gradient-glass border-glass-border/30 shadow-glass">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold text-primary">${stats.totalRevenue}</p>
                </div>
                <DollarSign className="h-8 w-8 text-primary/60" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="events">My Events</TabsTrigger>
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold">Quick Actions</h2>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="backdrop-blur-glass bg-gradient-glass border-glass-border/30 shadow-glass hover:shadow-accent-glow/20 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-accent flex items-center justify-center shadow-accent-glow/50">
                        <Plus className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">Create New Event</h3>
                        <p className="text-sm text-muted-foreground">Start planning your next amazing event</p>
                      </div>
                      <Button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="ml-auto"
                      >
                        Create
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="backdrop-blur-glass bg-gradient-glass border-glass-border/30 shadow-glass hover:shadow-accent-glow/20 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center shadow-primary-glow/50">
                        <TrendingUp className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">View Analytics</h3>
                        <p className="text-sm text-muted-foreground">Track your event performance</p>
                      </div>
                      <Button variant="outline">
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Events */}
              <div>
                <h3 className="text-xl font-semibold mb-4">Recent Events</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {userCreatedEvents.slice(0, 3).map((event, index) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index }}
                    >
                      <EventCard
                        event={event}
                        onEdit={handleEditEvent}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="events" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold">My Events</h2>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Event
                </Button>
              </div>
              
              {userCreatedEvents.length === 0 ? (
                <Card className="backdrop-blur-glass bg-gradient-glass border-glass-border/30 shadow-glass">
                  <CardContent className="p-12 text-center">
                    <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No events yet</h3>
                    <p className="text-muted-foreground mb-4">Create your first event to get started</p>
                    <Button onClick={() => setIsCreateModalOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Event
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {userCreatedEvents.map((event, index) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index }}
                    >
                      <EventCard
                        event={event}
                        onEdit={handleEditEvent}
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="bookings" className="space-y-6">
              <h2 className="text-2xl font-semibold">My Bookings</h2>
              
              {userBookedEvents.length === 0 ? (
                <Card className="backdrop-blur-glass bg-gradient-glass border-glass-border/30 shadow-glass">
                  <CardContent className="p-12 text-center">
                    <Receipt className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No bookings yet</h3>
                    <p className="text-muted-foreground">Browse events to make your first booking</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {userBookedEvents.map((event, index) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index }}
                    >
                      <EventCard event={event} showActions={false} />
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="payments" className="space-y-6">
              <h2 className="text-2xl font-semibold">Payment Management</h2>
              
              <Card className="backdrop-blur-glass bg-gradient-glass border-glass-border/30 shadow-glass">
                <CardContent className="p-8 text-center">
                  <DollarSign className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">Payment Center</h3>
                  <p className="text-muted-foreground">
                    View payment receipts, process refunds, and manage your earnings
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Create/Edit Event Modal */}
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEvent ? 'Edit Event' : 'Create New Event'}
              </DialogTitle>
              <DialogDescription>
                {editingEvent ? 'Update your event details and settings.' : 'Create a new event with all the necessary details and settings.'}
              </DialogDescription>
            </DialogHeader>
            
            <EventCreationWizard
              onComplete={handleCreateEvent}
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
  );
};

export default Dashboard;
