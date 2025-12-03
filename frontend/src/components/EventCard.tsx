import { useState, type FC } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, Users, Bell } from 'lucide-react';
import { type Event, useEvents } from '../contexts/EventContext';
import { Button } from './ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useToast } from '../hooks/use-toast';
import EventManagementActions from './EventManagementActions';

interface EventCardProps {
  event: Event;
  onEdit?: (event: Event) => void;
  showActions?: boolean;
}

const EventCard: FC<EventCardProps> = ({
  event,
  onEdit,
  showActions = true
}) => {
  const { currentUser, unbookEvent, users } = useEvents();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [showAllTickets, setShowAllTickets] = useState(false);
  const [showAllImages, setShowAllImages] = useState(false);

  const isCreator = currentUser?.id === event.createdBy;
  const isBooked = currentUser?.bookedEvents?.includes(event.id) || false;
  const isFull = (event.bookedSlots || 0) >= (event.totalSlots || 1);
  const isCancelled = event.status === 'cancelled';

  const eventDate = new Date(event.date);
  const now = new Date();
  eventDate.setHours(23, 59, 59, 999);
  const isPastEvent = eventDate < now;

  const canBook = !!currentUser && !isCreator && !isFull && !isBooked && !isCancelled && !isPastEvent;
  const canUnbook = !!currentUser && isBooked;

  const creatorUser = users.find(user => user.id === event.createdBy);
  const eventCreatorName = event.createdByName || creatorUser?.name || 'Unknown User';

  const isValidImageUrl = (url: string) => {
    return !!url &&
      !url.includes('example.com') &&
      !url.startsWith('data:image/png;base64,iVBOR') &&
      url.length > 10;
  };

  const validCreatedByAvatar = event.createdByAvatar && isValidImageUrl(event.createdByAvatar) ? event.createdByAvatar : null;
  const validDisplayPicture = creatorUser?.displayPicture && isValidImageUrl(creatorUser.displayPicture) ? creatorUser.displayPicture : null;
  const validAvatar = creatorUser?.avatar && isValidImageUrl(creatorUser.avatar) ? creatorUser.avatar : null;
  const eventCreatorAvatar = validCreatedByAvatar || validDisplayPicture || validAvatar;

  const getCurrencySymbol = (currency: string) => {
    const symbols: { [key: string]: string } = {
      USD: '$', EUR: '€', GBP: '£', CAD: 'C$', AUD: 'A$',
      JPY: '¥', KRW: '₩', BRL: 'R$', MXN: '$', INR: '₹',
      CNY: '¥', NGN: '₦', ZAR: 'R', KES: 'KSh', GHS: '₵'
    };
    return symbols[currency || 'USD'] || (currency || 'USD');
  };

  const isPostponed = (s?: string): s is 'postponed' => s === 'postponed';

  const handleBook = () => {
    if (canBook) {
      navigate(`/book/${event.id}`);
    }
  };

  const handleUnbook = () => {
    if (canUnbook) {
      unbookEvent(event.id);
      toast({
        title: 'Booking Cancelled',
        description: `You have cancelled your booking for "${event.title}".`,
      });
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const formatted = new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    if (isPostponed(event.status)) {
      console.log('📅 EventCard formatDate debug:', {
        eventId: event.id,
        inputDate: dateStr,
        formattedDate: formatted,
        eventStatus: event.status,
        eventDate: event.date
      });
    }

    return formatted;
  };

  // availability color helper removed (unused)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`backdrop-blur-glass font-poppins text-[15px] rounded bg-gradient-glass border border-[#00593F] shadow-md hover:shadow-accent-glow/20 transition-all duration-300 overflow-hidden ${isCancelled ? 'opacity-75 grayscale' : ''}`}>
        {event.images && event.images.length > 0 && (
          <div className="rounded-t-lg relative ">
            {!showAllImages ? (
              <div className="relative">
                <img src={event.images[0]} alt={event.title} className="w-full h-49 object-cover rounded" />
                {((event.status && event.status !== 'active') || isPastEvent) && (
                  <div className="absolute top-2 left-2">
                    <Badge
                      variant={
                        event.status === 'cancelled' ? 'destructive' :
                        isPostponed(event.status) ? 'secondary' :
                        isPastEvent ? 'outline' : 'default'
                      }
                      className="bg-gray-700 text-white font-[500] px-2 py-1 text-[8px]"
                    >
                      {isPostponed(event.status) && '⏰ POSTPONED'}
                      {event.status === 'cancelled' && '❌ CANCELLED'}
                      {event.status === 'updated' && '📝 UPDATED'}
                      {isPastEvent && (!event.status || event.status === 'active') && '🏁 ENDED'}
                    </Badge>
                  </div>
                )}
                {event.images.length > 1 && (
                  <button
                    className="absolute top-2 right-2 bg-black/60 text-white text-[13px] px-2 py-1 rounded hover:bg-black/80 transition-colors cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); setShowAllImages(true); }}
                  >
                    +{event.images.length - 1} more
                  </button>
                )}
              </div>
            ) : (
              <div className="relative">
                <div className="flex overflow-x-auto space-x-2 p-2 bg-black/5">
                  {event.images.map((image, index) => (
                    <img key={index} src={image} alt={`${event.title} ${index + 1}`} className="h-40 w-48 object-cover rounded flex-shrink-0" />
                  ))}
                </div>
                <button
                  className="absolute top-2 right-2 bg-black/60 text-white text-[13px] px-2 py-1 rounded hover:bg-black/80 transition-colors cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); setShowAllImages(false); }}
                >
                  Show Less
                </button>
              </div>
            )}
          </div>
        )}

        {isCancelled && (
          <div className="absolute inset-0 bg-black/20 z-10 flex items-center justify-center">
            <div className="bg-red-600/90 text-white px-4 py-2 rounded-lg font-[600] text-[15px] font-poppins">
              ❌ EVENT CANCELLED
            </div>
          </div>
        )}

        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1">
              {eventCreatorAvatar ? (
                <Avatar className="h-10 w-10">
                  <AvatarImage src={eventCreatorAvatar} alt={eventCreatorName} />
                  <AvatarFallback className="text-[19px]">
                    {eventCreatorName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <Avatar className="h-11 w-11">
                  <AvatarFallback className="text-[15px] bg-gray-500 text-white font-[550]">
                    {eventCreatorName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              )}

              <div>
                <p className="text-muted-foreground text-[12.5px] font-poppins font-[505]">
                  <button
                    className="text-muted-foreground hover:text-primary/80 hover:underline transition-colors font-[450] font-poppins"
                    onClick={(e) => { e.stopPropagation(); navigate(`/user/${event.createdBy}`); }}
                  >
                    {eventCreatorName}
                  </button>
                </p>
              </div>
            </div>

            <div>
              <CardTitle className="text-[15px] font-[410] text-muted-foreground font-poppins flex items-center gap-3">
                {event.title}
                {event.status === 'cancelled' && (
                  <Badge variant="destructive">
                    Cancelled
                  </Badge>
                )}
              </CardTitle>
            </div>

            <div>
              <p className="text-[14px] text-muted-foreground font-poppins font-[500] line-clamp-2">
                {event.description}
              </p>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3 text-[13px] font-[420] text-muted-foreground">
                <Users className="h-4 w-4 text-muted-foregroundfont-[420]" />
                <span>{Number(event.totalSlots ?? event.capacity ?? 0) - Number(event.bookedSlots ?? 0)} spots available</span>
              </div>
              <div className="text-[13px] text-muted-foreground font-[420]">
                {event.bookedSlots || 0}/{event.totalSlots || 0}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 text-[14px]">
            <div className="flex items-center text-muted-foreground">
              <Calendar className="h-5 w-5 mr-2 text-muted-foreground" />
              <div className="flex flex-col">
                {isPostponed(event.status) ? (
                  <>
                    <span className="text-[14px] text-muted-foreground font-[420] flex items-center">
                      {formatDate(event.statusDetails?.newDate || event.date)}
                      <Badge variant="secondary" className="ml-2 text-[10px] text-muted-foreground   border-gray-300">New Date</Badge>
                    </span>
                  </>
                ) : (
                  formatDate(event.date)
                )}
              </div>
            </div>

            <div className="flex items-center text-muted-foreground">
              <Clock className="h-5 w-5 mr-2 text-muted-foreground" />
              <div className="flex flex-col">
                {isPostponed(event.status) ? (
                  <span className="text-[13px] text-muted-foreground font-[450]">{event.statusDetails?.newTime || event.time}</span>
                ) : (
                  event.time
                )}
              </div>
            </div>

            <div className="flex items-center text-muted-foreground">
              <MapPin className="h-5 w-5 mr-2 text-muted-foreground" />
              <div className="flex flex-col">
                {isPostponed(event.status) ? (
                  <span className="text-foreground font-medium">{event.statusDetails?.newLocation || event.location}</span>
                ) : (
                  event.location
                )}
              </div>
            </div>
          </div>
            {event.status && event.status !== 'active' && event.status !== 'postponed' && event.statusDetails && (
          <div className="p-2 rounded-md bg-muted/50 border border-gray-300 mt-2">
              <div className="flex items-start space-x-2">
                <div className="text-[15px]">
                  {event.status === 'cancelled' && '❌'}
                  {event.status === 'updated' && '📝'}
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-[650] text-black capitalize">{event.status} Event</p>
                  <p className="text-[14px] text-gray-800 mt-1">{event.statusDetails?.message || 'Event status information'}</p>
                </div>
              </div>
            </div>
          )}

          {event.ticketPricing && (
            <div className="pt-2 border-t border-glass-border/30 mt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[14px] text-muted-foreground font-[450]">Tickets:</span>
                <div className="flex items-center gap-2">
                  {(event.paymentMethod === 'pay-at-event' || event.paymentMethod === 'both') && (
                    <Badge variant="outline" className="text-[13px] text-blue-500 border-blue-300">Pay at Event</Badge>
                  )}
                  <span className="text-[13px] text-muted-foreground font-[420]">Multiple types</span>
                </div>
              </div>

              <div className="space-y-1">
                {Object.entries(event.ticketPricing)
                  .filter(([_, details]) => (details as any).slots > 0)
                  .slice(0, showAllTickets ? undefined : 2)
                  .map(([type, details]) => (
                    <div key={type} className="flex items-center justify-between text-[13px] font-[420]">
                      <span className="text-muted-foreground capitalize">{type.replace(/([A-Z])/g, ' $1').replace(/For/g, 'for')}:</span>
                      <span className="text-[13px] font-[420] text-muted-foreground">{getCurrencySymbol(event.currency || 'USD')}{(details as any).price}</span>
                    </div>
                  ))
                }

                {Object.entries(event.ticketPricing).filter(([_, details]) => (details as any).slots > 0).length > 2 && (
                  <button
                    className="text-[13px] text-muted-foreground text-center hover:text-primary transition-colors cursor-pointer w-full py-1 font-[600]"
                    onClick={(e) => { e.stopPropagation(); setShowAllTickets(!showAllTickets); }}
                  >
                    {showAllTickets ? 'Show Less' : `+${Object.entries(event.ticketPricing).filter(([_, details]) => (details as any).slots > 0).length - 2} more types`}
                  </button>
                )}
              </div>
            </div>
          )}
        </CardContent>

        {showActions && (
          <CardFooter className="pt-3 flex gap-2 flex-wrap">
            {isCreator ? (
              <EventManagementActions event={event} onEdit={onEdit} />
            ) : currentUser ? (
              isBooked ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnbook}
                  className="flex-1 bg-warning/10 border-warning/30 text-warning hover:bg-warning/20"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Cancel Booking
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleBook}
                  disabled={!canBook}
                  className="flex-1 bg-[#00593f] hover:bg-[#004d33] text-white border-0 shadow-accent-glow/50 disabled:opacity-50 disabled:shadow-none"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  {isCancelled ? 'Event Cancelled' : isPastEvent ? 'Event Ended' : isFull ? 'Fully Booked' : 'Book Now'}
                </Button>
              )
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled
                className="flex-1 bg-glass-light/10 border-glass-border/30"
              >
                <Bell className="h-4 w-4 mr-2" />
                Login to Book
              </Button>
            )}
          </CardFooter>
        )}
      </Card>
    </motion.div>
  );
};

export default EventCard;