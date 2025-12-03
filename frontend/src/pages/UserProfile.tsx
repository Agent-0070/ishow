import { useState, useEffect, type FC } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Globe, Users, Building, Award, Mail, MapPin, Star } from 'lucide-react';
import { useEvents } from '../contexts/EventContext';
import { usersAPI, eventsAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import AddCommentForm from '../components/AddCommentForm';
import CommentsList from '../components/CommentsList';
import { useToast } from '../hooks/use-toast';

const UserProfile: FC = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useEvents();
  const { toast } = useToast();

  const [showMoreBio, setShowMoreBio] = useState(false);
  const [showMoreCompany, setShowMoreCompany] = useState(false);
  const [showAllCountries, setShowAllCountries] = useState(false);
  const [showAllPartners, setShowAllPartners] = useState(false);
  const [showAllPastEvents, setShowAllPastEvents] = useState(false);

  const [user, setUser] = useState<any>(null);
  const [userEvents, setUserEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true); // page-level: until user loads
  const [loadingEvents, setLoadingEvents] = useState(true); // section-level for events
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch user data
        const userResponse = await usersAPI.getUser(userId);
        setUser(userResponse.data);

        // Fetch user's events (public list) and filter by owner/creator
        setLoadingEvents(true);
        const eventsResponse = await eventsAPI.getEvents({});
        const allEvents = Array.isArray(eventsResponse.data)
          ? eventsResponse.data
          : (eventsResponse.data?.data || []);
        const filteredEvents = allEvents.filter((ev: any) => {
          const ownerId = (ev.owner && (ev.owner._id || ev.owner)) || ev.createdBy || ev.creatorId;
          return ownerId === userId;
        }).map((e: any) => ({ ...e, id: e._id || e.id }));
        setUserEvents(filteredEvents);
        setLoadingEvents(false);

      } catch (err: any) {
        console.error('Error fetching user data:', err);
        setError('Failed to load user profile');
        toast({
          title: 'Error',
          description: 'Failed to load user profile',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    // Trigger initial load
    fetchUserData();


    // No need for manual event listeners - React Query handles state updates

  }, [userId, toast]);

  if (loading) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading user profile...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">User Not Found</h2>
          <p className="text-muted-foreground mb-4">{error || "The user you're looking for doesn't exist."}</p>
          <Button onClick={() => navigate('/events')} variant="outline">
            Back to Events
          </Button>
        </div>
      </div>
    );
  }

  const getMonthName = (month: number) => {
    return new Date(0, month - 1).toLocaleString('default', { month: 'long' });
  };

  return (
    <div className="min-h-screen pt-16 bg-gradient-to-br from-background to-muted/50">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            {currentUser?.id !== user.id && currentUser?.id !== user._id && (
              <AddCommentForm userId={user.id || user._id} userName={user.name || 'User'} />
            )}
          </div>

          {/* User Info Card */}
          <Card className="backdrop-blur-glass bg-gradient-glass border-gray-300 shadow-glass mb-8">
            <CardHeader>
              <div className="flex items-start space-x-6">
                <Avatar className="h-24 w-24 border-4 border-gray-300">
                  {user?.displayPicture || user?.avatar ? (
                    <AvatarImage src={user.displayPicture || user.avatar} alt={user?.name || 'User'} />
                  ) : (
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground text-[14px] font-bold">
                      {user?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-[18px] mb-2">{user?.name || 'User'}</CardTitle>
                  <div className="flex items-center text-muted-foreground text-[14px] mb-3">
                    <Mail className="h-3.5 w-4 mr-2" />
                    {user?.email || 'No email'}
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="secondary">
                      {userEvents.length} Events Created
                    </Badge>
                    {user.hostingCountries && user.hostingCountries.length > 0 && (
                      <Badge variant="outline">
                        {user.hostingCountries.length} Countries
                      </Badge>
                    )}
                    {Array.isArray(user.partners) && user.partners.length > 0 && (
                      <Badge variant="outline">
                        {user.partners.length} Partners
                      </Badge>
                    )}
                    {user.averageRating && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {user.averageRating} ({user.totalComments || 0} reviews)
                      </Badge>
                    )}
                  </div>
                  {user.homeAddress && (
                    <div className="flex items-center text-muted-foreground text-[14px]">
                      <MapPin className="h-4 w-4 mr-2" />
                      {user.homeAddress}
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            {user.bio && (
              <CardContent>
                <div className="space-y-2">
                  <h4 className="font-[14px] flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    About
                  </h4>
                  <p className={`text-muted-foreground text-[14px] leading-relaxed ${showMoreBio ? '' : 'line-clamp-3'}`}>{user.bio}</p>
                  {user.bio?.length > 200 && (
                    <button className="text-xs text-primary" onClick={() => setShowMoreBio(!showMoreBio)}>
                      {showMoreBio ? 'Show less' : 'Show more'}
                    </button>
                  )}
                </div>
              </CardContent>
            )}
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Company Information */}
            {user.companyDescription && (
              <Card className="backdrop-blur-glass bg-gradient-glass border-gray-300 shadow-glass">
                <CardHeader>
                  <CardTitle className="flex items-center text-[16px]">
                    <Building className="h-5 w-5 mr-2" />
                    Event Company
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={`text-muted-foreground text-[14px] leading-relaxed ${showMoreCompany ? '' : 'line-clamp-3'}`}>{user.companyDescription}</p>
                  {user.companyDescription?.length > 200 && (
                    <button className="text-xs text-primary mt-1" onClick={() => setShowMoreCompany(!showMoreCompany)}>
                      {showMoreCompany ? 'Show less' : 'Show more'}
                    </button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Hosting Countries */}
            {user.hostingCountries && user.hostingCountries.length > 0 && (
              <Card className="backdrop-blur-glass bg-gradient-glass border-gray-300 shadow-glass">
                <CardHeader>
                  <CardTitle className="flex items-center text-[14px]">
                    <Globe className="h-5 w-5 mr-2" />
                    Hosting Countries
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 text-[14px]">
                    {(showAllCountries ? user.hostingCountries : user.hostingCountries.slice(0, 12)).map((country: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined, index: React.Key | null | undefined) => (
                      <Badge key={index} variant="secondary">{country}</Badge>
                    ))}
                  </div>
                  {user.hostingCountries.length > 12 && (
                    <button className="text-[14px] text-primary mt-2" onClick={() => setShowAllCountries(!showAllCountries)}>
                      {showAllCountries ? 'Show less' : `Show ${user.hostingCountries.length - 12} more`}
                    </button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Successful Events */}
            {user?.successfulEvents && Array.isArray(user.successfulEvents) && user.successfulEvents.length > 0 && (
              <Card className="backdrop-blur-glass bg-gradient-glass border-gray-300 shadow-glass">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Award className="h-5 w-5 mr-2" />
                    Successful Events
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {user.successfulEvents.map((event: { eventName: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; month: number; year: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; description: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; }, index: React.Key | null | undefined) => (
                      <div key={index} className="border-l-2 border-gray-300 pl-4">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-[410]">{event.eventName}</h4>
                          <Badge variant="outline" className="text-[14px]">
                            {getMonthName(event.month)} {event.year}
                          </Badge>
                        </div>
                        {event.description && (
                          <p className="text-[14px] text-muted-foreground">{event.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Past Events by Country (collapsible) */}
            {user?.pastEvents && Array.isArray(user.pastEvents) && user.pastEvents.length > 0 && (
              <Card className="backdrop-blur-glass bg-gradient-glass border-gray-300 shadow-glass">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MapPin className="h-5 w-5 mr-2" />
                    Past Events by Country ({user.pastEvents.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(showAllPastEvents ? user.pastEvents : user.pastEvents.slice(0, 6)).map((event: { eventName: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; country: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; month: number; year: any; description: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; }, index: React.Key | null | undefined) => (
                      <div key={index} className="border-l-2 border-gray-300 pl-4">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-[550]">{event.eventName}</h4>
                          <div className="flex items-center space-x-2">
                            {event.country && (
                              <Badge variant="outline" className="text-[14px]">
                                {event.country}
                              </Badge>
                            )}
                            {(event.month || event.year) && (
                              <Badge variant="outline" className="text-[14px]">
                                {event.month ? getMonthName(event.month) : ''} {event.year || ''}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {event.description && (
                          <p className="text-[14px] text-muted-foreground">{event.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                  {user.pastEvents.length > 6 && (
                    <div className="text-center mt-3">
                      <Button variant="ghost" size="sm" onClick={() => setShowAllPastEvents(!showAllPastEvents)}>
                        {showAllPastEvents ? 'Show less' : `Show ${user.pastEvents.length - 6} more`}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Partners */}
            {Array.isArray(user.partners) && user.partners.length > 0 && (
              <Card className="backdrop-blur-glass bg-gradient-glass border-gray-300 shadow-glass lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center text-[16px]">
                    <Users className="h-5 w-5 mr-2" />
                    Event Partners
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(showAllPartners ? user.partners : user.partners.slice(0, 6)).map((partner: { name: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; type: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; description: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; }, index: React.Key | null | undefined) => (
                      <div key={index} className="p-4 border border-gray-300 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{partner.name}</h4>
                          <Badge variant="outline" className="text-xs capitalize">
                            {partner.type}
                          </Badge>
                        </div>
                        {partner.description && (
                          <p className="text-sm text-muted-foreground">{partner.description}</p>
                        )}
                      </div>
                    ))}
                    {user.partners.length > 6 && (
                      <div className="col-span-full">
                        <button className="text-xs text-primary" onClick={() => setShowAllPartners(!showAllPartners)}>
                          {showAllPartners ? 'Show less' : `Show ${user.partners.length - 6} more`}
                        </button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Comments Section */}
          <Card className="backdrop-blur-glass bg-gradient-glass border-gray-300 shadow-glass mt-8">
            <CardContent className="p-6">
              <CommentsList userId={userId!} userName={user.name} />
            </CardContent>
          </Card>

          {/* Recent Events */}
          <Card className="backdrop-blur-glass bg-gradient-glass border-gray-300 shadow-glass mt-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Recent Events {loadingEvents ? '' : `(${userEvents.length})`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingEvents ? (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="p-4 border border-gray-300 rounded-lg">
                        <div className="w-full h-32 rounded mb-3 bg-muted animate-pulse" />
                        <div className="h-4 w-2/3 bg-muted rounded animate-pulse mb-2" />
                        <div className="h-3 w-full bg-muted rounded animate-pulse mb-2" />
                        <div className="h-3 w-5/6 bg-muted rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : userEvents.length === 0 ? (
                <div className="text-[14px] text-muted-foreground">No events yet.</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {userEvents.slice(0, 6).map((event) => (
                      <div
                        key={event.id}
                        className="p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-glass-light/10 transition-colors"
                        onClick={() => navigate(`/events/${event.id}`)}
                      >
                        {event.images && event.images.length > 0 && (
                          <img
                            src={event.images[0]}
                            alt={event.title}
                            className="w-full h-32 object-cover rounded mb-3"
                          />
                        )}
                        <h4 className="font-[14px] mb-1">{event.title}</h4>
                        <p className="text-sm text-muted-foreground mb-2" style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {event.description}
                        </p>
                        <div className="flex items-center justify-between text-[14px] text-muted-foreground">
                          <span>{event.date}</span>
                          <Badge variant="outline" className="text-[14px]">
                            {event.bookedSlots}/{event.totalSlots}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                  {userEvents.length > 6 && (
                    <div className="text-center mt-4">
                      <Button
                        variant="outline"
                        onClick={() => navigate('/events')}
                        className="border-glass-border/30"
                      >
                        View All Events
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default UserProfile;
