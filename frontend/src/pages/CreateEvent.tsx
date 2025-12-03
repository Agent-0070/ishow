import { type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEvents } from '../contexts/EventContext';
import EventCreationWizard from '../components/EventCreationWizard';
import { useToast } from '../hooks/use-toast';

const CreateEvent: FC = () => {
  const { createEvent, currentUser } = useEvents();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleEventCreate = (eventData: any) => {
    try {
      const newEvent = {
        ...eventData,
        // Map wizard structures to backend fields
        totalSlots: eventData.ticketCategories?.filter((tc: any) => tc.isActive).reduce((sum: number, tc: any) => sum + (tc.capacity || 0), 0) || eventData.capacity || 0,
        bookedSlots: 0,
        ticketPricing: (eventData.ticketCategories || []).reduce((acc: any, tc: any) => {
          const key = (tc.name || '').replace(/\s+/g, '').replace(/for/i,'For').toLowerCase();
          acc[key] = { price: Number(tc.price) || 0, slots: Number(tc.capacity) || 0, includes: tc.includes || [] };
          return acc;
        }, {}),
        paymentMethods: eventData.paymentMethods || [],
      };

      createEvent(newEvent);
      navigate('/events');
    } catch (error) {
      toast({
        title: 'Error Creating Event',
        description: 'There was a problem creating your event. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    navigate('/events');
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen pt-16 font-poppins">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
            <p className="text-muted-foreground mb-4">Please log in to create an event</p>
            <button 
              onClick={() => navigate('/auth')}
              className="bg-primary text-white px-4 py-2 rounded"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen md:pt-16 pt-4 font-poppins">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-xl md:text-5xl font-bold mb-4">
            Create <span className="bg-[#00593f] bg-clip-text text-transparent">Event</span>
          </h1>
          <p className="md:text-xl text-[13px] text-muted-foreground max-w-2xl mx-auto">
            Create an amazing event and bring people together. Set up your event details, 
            ticket categories, and payment methods.
          </p>
        </motion.div>

        {/* Event Creation Wizard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <EventCreationWizard
            onComplete={handleEventCreate}
            onCancel={handleCancel}
          />
        </motion.div>
      </div>
    </div>
  );
};

export default CreateEvent;
