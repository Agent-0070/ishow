import { type FC } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Users, MapPin, Sparkles, Heart, Shield } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';

const About: FC = () => {
  const features = [
    {
      icon: Calendar,
      title: 'Easy Event Management',
      description: 'Create, edit, and manage events with our intuitive interface. Set dates, times, locations, and capacity limits effortlessly.',
      color: 'bg-gradient-primary'
    },
    {
      icon: Users,
      title: 'Smart Booking System',
      description: 'Real-time booking with instant confirmations. Track attendance and manage capacity with intelligent notifications.',
      color: 'bg-gradient-accent'
    },
    {
      icon: MapPin,
      title: 'Location-Based Discovery',
      description: 'Find events near you with powerful location search and filtering. Never miss local events that match your interests.',
      color: 'bg-success'
    },
    {
      icon: Shield,
      title: 'Secure & Reliable',
      description: 'Your data is protected with enterprise-grade security. Reliable hosting ensures your events are always accessible.',
      color: 'bg-warning'
    }
  ];

 

  const team = [
    {
      name: 'Idowu Timothy',
      role: 'Founder & CEO',
      description: 'Passionate about connecting people through amazing events and experiences.',
      avatar: 'IT'
    },
    {
      name: 'Abimbola Idowu',
      role: 'Head of Design',
      description: 'Creating beautiful and intuitive experiences that users love.',
      avatar: 'AT'
    },
    {
      name: 'Tech King',
      role: 'CTO',
      description: 'Building robust and scalable technology to power thousands of events.',
      avatar: 'TK'
    }
  ];

  return (
    <div className="min-h-screen pt-16 font-poppins">
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
            <h1 className="text-4xl md:text-5xl text-gray-600 font-[660] mb-6">
              About{' '}
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                iM
              </span>
            </h1>
            
            <p className="text-[13px] md:text-[16px] text-muted-foreground mb-8 max-w-3xl mx-auto">
              We're on a mission to make event planning and discovery effortless, 
              connecting communities through meaningful experiences and shared moments.
            </p>

            <div className="flex items-center justify-center space-x-8 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <Heart className="h-4 w-4 text-destructive" />
                <span>Made with love</span>
              </div>
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Crafted for you</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

     

      {/* Features Section */}
      <section className="py-20">
        <div className="container md:max-w-5xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-[24px] md:text-[50px] font-[700] text-gray-700 mb-4 font-salsa">
              Why Choose iM?
            </h2>
            <p className="text-[13px] md:text-[15px] text-gray-600 max-w-2xl mx-auto">
              We've built the most comprehensive event platform with features that actually matter
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8 text-gray-700">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <Card className="h-full backdrop-blur-glass bg-gradient-glass border-gray-300 shadow-md hover:shadow-accent-glow/20 transition-all duration-300">
                  <CardContent className="p-8">
                    <div className="flex items-start space-x-4">
                      <div className={`w-12 h-12 rounded-full ${feature.color} flex items-center justify-center shadow-glow/50 shrink-0`}>
                        <feature.icon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-[15px] font-semibold mb-3 ">{feature.title}</h3>
                        <p className="text-muted-foreground leading-relaxed text-[14px]">{feature.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-gradient-to-b from-transparent to-muted/20 font-poppins">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-[25px] md:text-[50px] font-[700] mb-4 font-salsa text-gray-700">
              Meet Our Team
            </h2>
            <p className="text-[15px] text-muted-foreground max-w-2xl mx-auto">
              The passionate people behind iM who work tirelessly to make your events unforgettable
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {team.map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <Card className="backdrop-blur-glass bg-gradient-glass border-gray-400 shadow-glass hover:shadow-accent-glow/20 transition-all duration-300 text-center">
                  <CardContent className="p-8">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-700 flex items-center justify-center text-2xl font-bold text-white shadow-glow">
                      {member.avatar}
                    </div>
                    <h3 className="text-xl font-semibold mb-1">{member.name}</h3>
                    <p className="text-accent font-medium mb-3">{member.role}</p>
                    <p className="text-sm text-muted-foreground">{member.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center backdrop-blur-glass bg-gradient-glass border border-glass-border/30 rounded-2xl p-12 shadow-glass max-w-4xl mx-auto"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6 font-salsa text-gray-700">
              Our Mission
            </h2>
            <p className="text-[14px] text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
              At iM, we believe that the best experiences happen when people come together. 
              Our platform empowers organizers to create exceptional events while making it 
              effortless for attendees to discover and join experiences that matter to them. 
              We're not just building software – we're building communities.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/events">
                <Button className="bg-[#42D9FF] border-0 shadow-glow px-8">
                  Explore Events
                </Button>
              </Link>
              <Link to="/auth">
                <Button variant="outline" className="bg-glass-light/10 border-[#42D9FF] hover:bg-glass-light/20 backdrop-blur-sm px-8">
                  Join Our Community
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default About;