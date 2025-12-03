import { useState, type FormEvent, type FC } from 'react';
import { Star, MessageSquare } from 'lucide-react';
import { useEvents } from '../contexts/EventContext';
import { useAddComment } from '../hooks/useComments';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useToast } from '../hooks/use-toast';

interface AddCommentFormProps {
  userId: string;
  userName: string;
}

const AddCommentForm: FC<AddCommentFormProps> = ({ userId, userName }) => {
  const { currentUser, events } = useEvents();
  const { toast } = useToast();
  const addCommentMutation = useAddComment();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    eventId: '',
    comment: '',
    rating: 5
  });

  // Get events created by the user being reviewed
  const userEvents = events.filter(event => event.createdBy === userId);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      toast({
        title: "Authentication Required",
        description: "Please log in to leave a comment",
        variant: "destructive"
      });
      return;
    }

    if (!formData.eventId || !formData.comment.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select an event and write a comment",
        variant: "destructive"
      });
      return;
    }

    const selectedEvent = events.find(e => e.id === formData.eventId);
    if (!selectedEvent) {
      toast({
        title: "Event Not Found",
        description: "The selected event could not be found",
        variant: "destructive"
      });
      return;
    }

    try {
      await addCommentMutation.mutateAsync({
        userId,
        commentData: {
          eventId: formData.eventId,
          eventName: selectedEvent.title,
          comment: formData.comment.trim(),
          rating: formData.rating
        }
      });

      toast({
        title: "Comment Added",
        description: `Your review for ${userName} has been posted`,
      });

      setFormData({
        eventId: '',
        comment: '',
        rating: 5
      });
      setIsOpen(false);
    } catch (error) {
      toast({
        title: "Failed to Add Comment",
        description: "There was an error posting your review. Please try again.",
        variant: "destructive"
      });
    }
  };

  const renderStars = (rating: number, onStarClick: (star: number) => void) => {
    return (
      <div className="flex items-center space-x-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onStarClick(i + 1)}
            className={`h-5 w-5 ${
              i < rating 
                ? 'text-yellow-400 fill-current' 
                : 'text-gray-300 hover:text-yellow-300'
            } transition-colors`}
          >
            <Star className="h-full w-full" />
          </button>
        ))}
        <span className="text-sm text-muted-foreground ml-2">
          ({rating}/5)
        </span>
      </div>
    );
  };

  // Don't show the form if current user is the same as the profile user or no user events
  if (!currentUser || currentUser.id === userId || userEvents.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen} >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <MessageSquare className="h-4 w-4 mr-2" />
          Leave Review
        </Button>
      </DialogTrigger>
  <DialogContent className="max-w-md bg-white dark:bg-gray-300 border border-gray-200 dark:border-gray-800">
        <DialogHeader>
          <DialogTitle>Leave a Review for {userName}</DialogTitle>
          <DialogDescription>
            Share your experience and rate your interaction with {userName}.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 ">
          {/* Event Selection */}
          <div className="space-y-2">
            <Label htmlFor="event">Which event did you attend?</Label>
            <Select value={formData.eventId} onValueChange={(value) => setFormData(prev => ({ ...prev, eventId: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select an event..." />
              </SelectTrigger>
              <SelectContent>
                {userEvents.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.title} - {event.date}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rating */}
          <div className="space-y-2">
            <Label>Your Rating</Label>
            {renderStars(formData.rating, (star) => setFormData(prev => ({ ...prev, rating: star })))}
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment">Your Review</Label>
            <Textarea
              id="comment"
              placeholder="Share your experience with this event organizer..."
              value={formData.comment}
              onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
              className="min-h-[100px]"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {formData.comment.length}/500 characters
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={addCommentMutation.isPending}>
              {addCommentMutation.isPending ? 'Posting...' : 'Post Review'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCommentForm;
