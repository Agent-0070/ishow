import { type FC } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Calendar, Users, MapPin } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { useEvents } from '../contexts/EventContext';
import EventCard from '../components/EventCard';

const Home: FC = () => {
  const { events, isAuthenticated } = useEvents();
  // Show latest 4 events as featured (events are already sorted by createdAt desc from backend)
  const featuredEvents = Array.isArray(events) ? events.slice(0, 4) : [];

  const features = [
    {
      icon: Calendar,
      title: 'Easy Event Creation',
      description: 'Create and manage events with our intuitive interface. Set dates, locations, and capacities effortlessly.'
    },
    {
      icon: Users,
      title: 'Smart Booking System',
      description: 'Book events instantly with real-time availability. Never miss out on your favorite events again.'
    },
    {
      icon: MapPin,
      title: 'Location-Based Search',
      description: 'Find events near you with our powerful location search and filtering system.'
    }
   
  ];

  return (
    <div className="min-h-screen md:pt-16 pt-3 home-page font-poppins">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32 font-poppins">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <motion.h1 
              className="text-3xl md:text-6xl lg:text-7xl font-[550] md:mb-6 mb-1"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
            >
              <span className="bg-[#00593F] bg-clip-text text-transparent">
                Discover
              </span>{' '}
              Amazing Events
            </motion.h1>
            
            <motion.p 
              className="text-[13px] md:text-[17px] font-[405] text-gray-600 mb-8 max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Create, discover, and join incredible events in your area. 
              Connect with like-minded people and make unforgettable memories.
            </motion.p>

            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <Link to="/events">
                <Button 
                  size="lg" 
                  className="bg-[#00593F] text-white border-0 shadow-glow text-[13px] md:text-lg md:px-8 px-4 md:py-6 py-2 h-auto font-poppins font-[405]"
                >
                  Explore Events
                </Button>
              </Link>
              
              {isAuthenticated && (
                <Link to="/dashboard">
                  <Button
                    variant="outline"
                    size="lg"
                    className="bg-glass-light/10 border-glass-border/30 hover:bg-glass-light/20 text-[13px] md:text-lg md:px-8 px-4 md:py-6 py-2 h-auto backdrop-blur-sm"
                  >
                    Create Event
                  </Button>
                </Link>
              )}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="md:py-20 py-7 bg-gradient-to-b from-transparent to-muted/20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center md:mb-16 mb-10"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-4 font-salsa text-gray-600">
              Why Choose <span className="bg-gradient-primary bg-clip-text text-[#00593F] font-salsa">iShow</span>?
            </h2>
            <p className="text-[14px] text-gray-600 max-w-2xl mx-auto">
              Experience the future of event planning with our cutting-edge platform
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <Card className="h-full backdrop-blur-glass font-poppins bg-[#00593F] border-glass-border/30 shadow-glass hover:shadow-accent-glow/20 transition-all duration-300 p-10">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-white flex items-center justify-center shadow-accent-glow/50">
                      <feature.icon className="h-6 w-6 text-[#00593F]" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                    <p className="text-white text-sm">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Events Section */}
      {featuredEvents.length > 0 && (
        <section className="py-20">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <h2 className="text-[25px] font-salsa md:text-[50px] text-gray-600 font-[800] mb-1">
                Featured Events
              </h2>
              <p className="text-[14px] text-muted-foreground">
                Don't miss out on these amazing upcoming events
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:max-w-[1550px] mx-auto mb-8">
              {featuredEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <EventCard event={event} showActions={true} />
                </motion.div>
              ))}
            </div>

            <div className="text-center">
              <Link to="/events">
                <Button variant="outline" className="bg-glass-light/10 border-gray-300 hover:bg-glass-light/20 backdrop-blur-sm">
                  View All Events
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="md:py-20 py-7 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 font-poppins">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center backdrop-blur-glass bg-[#00593F] border border-glass-border/30 rounded-2xl p-12 shadow-glass max-w-4xl mx-auto"
          >
            <h2 className="text-[14px] md:text-[27px] text-white font-[650] mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-[16px] light:text-gray-800 dark:text-white mb-8 max-w-2xl mx-auto">
              Join thousands of event organizers and attendees who are already using iM to create amazing experiences.
            </p>
            
            {!isAuthenticated ? (
              <Link to="/auth">
                <Button 
                  size="lg" 
                  className="bg-[#00593F] text-white border-0 shadow-accent-glow text-lg px-8 py-6 h-auto"
                >
                  Join Now - It's Free!
                </Button>
              </Link>
            ) : (
              <Link to="/dashboard">
                <Button 
                  size="lg" 
                  className="bg-gradient-accent border-0 shadow-accent-glow text-lg px-8 py-6 h-auto"
                >
                  Go to Dashboard
                </Button>
              </Link>
            )}
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Home;