import { useState, type FC, type FormEvent } from 'react';
import { Calendar, Clock, MapPin, MessageSquare } from 'lucide-react';
import { type Event, useEvents } from '../contexts/EventContext';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useToast } from '../hooks/use-toast';

interface EventStatusEditorProps {
  event: Event;
  onClose?: () => void;
}

const EventStatusEditor: FC<EventStatusEditorProps> = ({ event, onClose }) => {
  const { updateEventStatus } = useEvents();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    status: event.status || 'active',
    message: event.statusDetails?.message || '',
    newDate: event.statusDetails?.newDate || '',
    newTime: event.statusDetails?.newTime || '',
    newLocation: event.statusDetails?.newLocation || ''
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const statusData = {
      status: formData.status,
      reason: formData.message,
      ...(formData.newDate && { newDate: formData.newDate }),
      ...(formData.newTime && { newTime: formData.newTime }),
      ...(formData.newLocation && { newLocation: formData.newLocation })
    };

    updateEventStatus(event.id, formData.status as Event['status'], statusData);
    
    toast({
      title: "Event Status Updated",
      description: `Event has been marked as ${formData.status}`,
    });

    setIsOpen(false);
    onClose?.();
  };

  const statusOptions = [
    { value: 'active', label: 'Active', description: 'Event is running as planned' },
    { value: 'postponed', label: 'Postponed', description: 'Event has been moved to a later date' },
    { value: 'cancelled', label: 'Cancelled', description: 'Event has been cancelled' },
    { value: 'updated', label: 'Updated', description: 'Event details have been changed' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="mr-2">
          <MessageSquare className="h-4 w-4 mr-1" />
          Update Status
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update Event Status</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Current Event Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{event.title}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  {event.date}
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  {event.time}
                </div>
                <div className="flex items-center col-span-2">
                  <MapPin className="h-4 w-4 mr-2" />
                  {event.location}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Event Status</Label>
            <RadioGroup
              value={formData.status}
              onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as Event['status'] }))}
              className="space-y-3"
            >
              {statusOptions.map((option) => (
                <div key={option.value} className="flex items-start space-x-3">
                  <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                  <div className="space-y-1">
                    <Label htmlFor={option.value} className="font-medium cursor-pointer">
                      {option.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Status Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Status Message</Label>
            <Textarea
              id="message"
              placeholder="Explain the status change to attendees..."
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              className="min-h-[80px]"
              required
            />
          </div>

          {/* Conditional Fields for Postponed */}
          {formData.status === 'postponed' && (
            <div className="space-y-4 p-4 border border-amber-200 rounded-lg bg-amber-50/50">
              <h4 className="font-medium text-amber-800">New Event Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="newDate">New Date</Label>
                  <Input
                    id="newDate"
                    type="date"
                    value={formData.newDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, newDate: e.target.value }))}
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
            </div>
          )}

          {/* Conditional Fields for Updated */}
          {formData.status === 'updated' && (
            <div className="space-y-4 p-4 border border-blue-200 rounded-lg bg-blue-50/50">
              <h4 className="font-medium text-blue-800">Updated Information</h4>
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

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              Update Status
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EventStatusEditor;
