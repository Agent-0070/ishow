import { type FC } from 'react';
import { motion } from 'framer-motion';
import { Shield, Users, Calendar, Trash2, Ban, UserX, UserCheck, AlertTriangle } from 'lucide-react';
import { useEvents } from '../contexts/EventContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import EventCard from '../components/EventCard';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import { useToast } from '../hooks/use-toast';

const Admin: FC = () => {
  const { 
    events, 
    users, 
    currentUser, 
    deleteEvent, 
    deleteUser, 
    toggleUserRestriction, 
    toggleUserBan 
  } = useEvents();
  const { toast } = useToast();

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <Card className="backdrop-blur-glass bg-gradient-glass border-glass-border/30 shadow-glass p-8">
          <div className="text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
            <p className="text-muted-foreground">You don't have permission to access the admin panel.</p>
          </div>
        </Card>
      </div>
    );
  }

  const totalUsers = Array.isArray(users) ? users.length : 0;
  const totalEvents = Array.isArray(events) ? events.length : 0;
  const bannedUsers = Array.isArray(users) ? users.filter(user => user.isBanned).length : 0;
  const restrictedUsers = Array.isArray(users) ? users.filter(user => user.isRestricted).length : 0;

  const handleDeleteEvent = (eventId: string) => {
    deleteEvent(eventId);
    toast({
      title: 'Event Deleted',
      description: 'The event has been permanently deleted.',
    });
  };

  const handleDeleteUser = (userId: string) => {
    const user = users.find(u => u.id === userId);
    deleteUser(userId);
    toast({
      title: 'User Deleted',
      description: `${user?.name} has been permanently deleted.`,
    });
  };

  const handleToggleBan = (userId: string) => {
    const user = users.find(u => u.id === userId);
    toggleUserBan(userId);
    toast({
      title: user?.isBanned ? 'User Unbanned' : 'User Banned',
      description: `${user?.name} has been ${user?.isBanned ? 'unbanned' : 'banned'}.`,
    });
  };

  const handleToggleRestriction = (userId: string) => {
    const user = users.find(u => u.id === userId);
    toggleUserRestriction(userId);
    toast({
      title: user?.isRestricted ? 'User Unrestricted' : 'User Restricted',
      description: `${user?.name} has been ${user?.isRestricted ? 'unrestricted' : 'restricted'}.`,
    });
  };

  return (
    <div className="min-h-screen pt-16">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 rounded-full bg-gradient-primary shadow-glow">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">
                Admin <span className="bg-gradient-primary bg-clip-text text-transparent">Dashboard</span>
              </h1>
              <p className="text-muted-foreground">
                Manage users, events, and monitor platform activity.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          <Card className="backdrop-blur-glass bg-gradient-glass border-glass-border/30 shadow-glass">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-full bg-gradient-primary">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{totalUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-glass bg-gradient-glass border-glass-border/30 shadow-glass">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-full bg-gradient-accent">
                  <Calendar className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Events</p>
                  <p className="text-2xl font-bold">{totalEvents}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-glass bg-gradient-glass border-glass-border/30 shadow-glass">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-full bg-destructive">
                  <Ban className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Banned Users</p>
                  <p className="text-2xl font-bold">{bannedUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-glass bg-gradient-glass border-glass-border/30 shadow-glass">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-full bg-warning">
                  <AlertTriangle className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Restricted</p>
                  <p className="text-2xl font-bold">{restrictedUsers}</p>
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
          <Tabs defaultValue="users" className="w-full">
            <TabsList className="backdrop-blur-glass bg-gradient-glass border border-glass-border/30 shadow-glass mb-6">
              <TabsTrigger value="users">User Management</TabsTrigger>
              <TabsTrigger value="events">Event Moderation</TabsTrigger>
            </TabsList>

            <TabsContent value="users">
              <div className="space-y-4">
                {Array.isArray(users) && users.length > 0 ? (
                  users.map((user, index) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="backdrop-blur-glass bg-gradient-glass border-glass-border/30 shadow-glass">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <Avatar className="h-12 w-12 border-2 border-glass-border/30">
                              <AvatarFallback className="bg-gradient-primary text-white font-semibold">
                                {user.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h3 className="font-semibold">{user.name}</h3>
                                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                  {user.role}
                                </Badge>
                                {user.isBanned && (
                                  <Badge variant="destructive">Banned</Badge>
                                )}
                                {user.isRestricted && (
                                  <Badge variant="outline">Restricted</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                              <div className="flex items-center space-x-4 mt-1 text-xs text-muted-foreground">
                                <span>Events Created: {user.createdEvents.length}</span>
                                <span>Events Booked: {user.bookedEvents.length}</span>
                              </div>
                            </div>
                          </div>

                          {user.id !== currentUser?.id && user.role !== 'admin' && (
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleRestriction(user.id)}
                                className={`bg-glass-light/10 border-glass-border/30 ${
                                  user.isRestricted 
                                    ? 'text-success hover:bg-success/10' 
                                    : 'text-warning hover:bg-warning/10'
                                }`}
                              >
                                {user.isRestricted ? (
                                  <>
                                    <UserCheck className="h-4 w-4 mr-2" />
                                    Unrestrict
                                  </>
                                ) : (
                                  <>
                                    <AlertTriangle className="h-4 w-4 mr-2" />
                                    Restrict
                                  </>
                                )}
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleBan(user.id)}
                                className={`bg-glass-light/10 border-glass-border/30 ${
                                  user.isBanned 
                                    ? 'text-success hover:bg-success/10' 
                                    : 'text-destructive hover:bg-destructive/10'
                                }`}
                              >
                                {user.isBanned ? (
                                  <>
                                    <UserCheck className="h-4 w-4 mr-2" />
                                    Unban
                                  </>
                                ) : (
                                  <>
                                    <Ban className="h-4 w-4 mr-2" />
                                    Ban
                                  </>
                                )}
                              </Button>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                  >
                                    <UserX className="h-4 w-4 mr-2" />
                                    Delete
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="backdrop-blur-glass bg-gradient-glass border-glass-border/30 shadow-glass">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete User</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to permanently delete {user.name}? 
                                      This action cannot be undone and will remove all their events and bookings.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteUser(user.id)}
                                      className="bg-destructive hover:bg-destructive/90"
                                    >
                                      Delete User
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No users found</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="events">
              {Array.isArray(events) && events.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {events.map((event, index) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="relative">
                        <EventCard
                          event={event}
                          showActions={false}
                        />
                        <div className="absolute top-2 right-2">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="shadow-lg"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="backdrop-blur-glass bg-gradient-glass border-glass-border/30 shadow-glass">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Event</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{event.title}"? 
                                  This action cannot be undone and will cancel all bookings.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteEvent(event.id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Delete Event
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <Card className="backdrop-blur-glass bg-gradient-glass border-glass-border/30 shadow-glass p-12 text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No Events Found</h3>
                  <p className="text-muted-foreground">
                    There are currently no events on the platform.
                  </p>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default Admin;