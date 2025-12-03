import { useState } from 'react';
import { Calendar, Clock, MapPin, Trash2, Users, Bell, Edit, CalendarX } from 'lucide-react';
import { type Event, useEvents } from '../contexts/EventContext';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
// RadioGroup not required here
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { useToast } from '../hooks/use-toast';

interface EventManagementActionsProps {
  event: Event;
  onEdit?: (event: Event) => void;
}

const EventManagementActions: React.FC<EventManagementActionsProps> = ({ event, onEdit }) => {
  const { updateEventStatus, deleteEvent } = useEvents();
  const { toast } = useToast();
  
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'postpone' | 'cancel' | null>(null);
  
  const [formData, setFormData] = useState({
    message: '',
    newDate: '',
    newTime: '',
    newLocation: ''
  });

  const bookedCount = event.bookedSlots || 0;
  const canDelete = bookedCount === 0;

  const handleStatusUpdate = async (status: 'postponed' | 'cancelled') => {
    try {
      const statusData = {
        status,
        reason: formData.message,
        ...(status === 'postponed' && formData.newDate && { newDate: formData.newDate }),
        ...(status === 'postponed' && formData.newTime && { newTime: formData.newTime }),
        ...(formData.newLocation && { newLocation: formData.newLocation })
      };

      // Update event status
      await updateEventStatus(event.id, status, statusData);

      // Note: Notifications are automatically sent by the backend in updateEventStatus
      // Removed duplicate notification sending to prevent multiple messages

      toast({
        title: `Event ${status === 'postponed' ? 'Postponed' : 'Cancelled'}`,
        description: `Event has been ${status}${bookedCount > 0 ? ` and ${bookedCount} attendees have been notified` : ''}`,
      });

      setStatusDialogOpen(false);
      setActionType(null);
      setFormData({ message: '', newDate: '', newTime: '', newLocation: '' });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${actionType} event. Please try again.`,
        variant: "destructive"
      });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteEvent(event.id);
      toast({
        title: "Event Deleted",
        description: "Event has been permanently deleted.",
      });
      setDeleteDialogOpen(false);
    } catch (error: any) {
      // Handle specific error for events with bookings
      if (error?.response?.status === 400 && error?.response?.data?.canDelete === false) {
        toast({
          title: "Cannot Delete Event",
          description: `This event has ${error.response.data.bookingCount} booking(s). Cancel the event instead to notify attendees.`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to delete event. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  const openStatusDialog = (type: 'postpone' | 'cancel') => {
    setActionType(type);
    setFormData({ 
      message: '', 
      newDate: '', 
      newTime: '', 
      newLocation: '' 
    });
    setStatusDialogOpen(true);
  };

  return (
    <div className="flex gap-2 flex-wrap">
      {/* Edit Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onEdit?.(event)}
        className="bg-glass-light/10 border-gray-300 hover:bg-glass-light/20"
      >
        <Edit className="h-4 w-4 mr-2" />
        Edit
      </Button>

      {/* Postpone Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => openStatusDialog('postpone')}
        className="bg-glass-light/10 border-gray-300 hover:bg-glass-light/20"
      >
        <Clock className="h-4 w-4 mr-2" />
        Postpone
      </Button>

      {/* Cancel Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => openStatusDialog('cancel')}
        className="bg-glass-light/10 border-gray-300 hover:bg-glass-light/20"
      >
        <CalendarX className="h-4 w-4 mr-2" />
        Cancel
      </Button>

      {/* Delete Button */}
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setDeleteDialogOpen(true)}
        disabled={!canDelete}
        className={!canDelete ? "opacity-50 cursor-not-allowed" : ""}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Delete
      </Button>

      {/* Status Update Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto glass-card backdrop-blur-glass shadow-glass">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'postpone' ? 'Postpone Event' : 'Cancel Event'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'postpone'
                ? 'Postpone this event and notify all attendees with the new details.'
                : 'Cancel this event and notify all attendees with the cancellation reason.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Event Info */}
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  {event.title}
                  <Badge variant="outline" className="ml-2">
                    <Users className="h-3 w-3 mr-1" />
                    {bookedCount} booked
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    <div className="flex flex-col">
                      {event.status === 'postponed' && event.statusDetails?.originalDate ? (
                        <>
                          <span className="text-foreground font-medium">
                            {new Date(event.date).toLocaleDateString()}
                          </span>
                          <span className="text-xs text-muted-foreground line-through">
                            Originally: {new Date(event.statusDetails.originalDate).toLocaleDateString()}
                          </span>
                        </>
                      ) : (
                        new Date(event.date).toLocaleDateString()
                      )}
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    <div className="flex flex-col">
                      {event.status === 'postponed' && event.statusDetails?.originalTime ? (
                        <>
                          <span className="text-foreground font-medium">
                            {event.time}
                          </span>
                          <span className="text-xs text-muted-foreground line-through">
                            Originally: {event.statusDetails.originalTime}
                          </span>
                        </>
                      ) : (
                        event.time
                      )}
                    </div>
                  </div>
                  <div className="flex items-center col-span-2">
                    <MapPin className="h-4 w-4 mr-2" />
                    <div className="flex flex-col">
                      {event.status === 'postponed' && event.statusDetails?.originalLocation ? (
                        <>
                          <span className="text-foreground font-medium">
                            {event.location}
                          </span>
                          <span className="text-xs text-muted-foreground line-through">
                            Originally: {event.statusDetails.originalLocation}
                          </span>
                        </>
                      ) : (
                        event.location
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notification Warning */}
            {bookedCount > 0 && (
              <div className="p-4 glass-card">
                <div className="flex items-start space-x-3">
                  <Bell className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium text-foreground">Notification Alert</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {bookedCount} attendee{bookedCount > 1 ? 's' : ''} will be automatically notified about this {actionType === 'postpone' ? 'postponement' : 'cancellation'}.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="message">
                {actionType === 'postpone' ? 'Postponement' : 'Cancellation'} Message *
              </Label>
              <Textarea
                id="message"
                placeholder={`Explain why the event is being ${actionType === 'postpone' ? 'postponed' : 'cancelled'}...`}
                value={formData.message}
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                className="min-h-[100px]"
                required
              />
            </div>

            {/* Postpone-specific fields */}
            {actionType === 'postpone' && (
              <div className="space-y-4 p-4 glass-card">
                <h4 className="font-medium text-foreground">New Event Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newDate">New Date *</Label>
                    <Input
                      id="newDate"
                      type="date"
                      value={formData.newDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, newDate: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newTime">New Time</Label>
                    <Input
                      id="newTime"
                      type="time"
                      value={formData.newTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, newTime: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newLocation">New Location (if changed)</Label>
                  <Input
                    id="newLocation"
                    placeholder="Enter new location if changed..."
                    value={formData.newLocation}
                    onChange={(e) => setFormData(prev => ({ ...prev, newLocation: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStatusDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleStatusUpdate(actionType === 'postpone' ? 'postponed' : 'cancelled')}
                disabled={!formData.message || (actionType === 'postpone' && !formData.newDate)}
                className="bg-primary hover:bg-primary/90"
              >
                {actionType === 'postpone' ? 'Postpone Event' : 'Cancel Event'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="glass-card backdrop-blur-glass shadow-glass">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              {canDelete ? (
                <>
                  Are you sure you want to permanently delete "{event.title}"? 
                  This action cannot be undone.
                </>
              ) : (
                <>
                  Cannot delete "{event.title}" because {bookedCount} user{bookedCount > 1 ? 's have' : ' has'} already booked this event. 
                  You can cancel the event instead to notify attendees.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {canDelete && (
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Event
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EventManagementActions;
