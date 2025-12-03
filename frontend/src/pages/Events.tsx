import { useState, useMemo, type FC } from 'react';
import { motion } from 'framer-motion';
import { useEvents } from '../contexts/EventContext';
import EventCard from '../components/EventCard';
import SearchFilter from '../components/SearchFilter';

const Events: FC = () => {
  const { events } = useEvents();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const filteredEvents = useMemo(() => {
    if (!Array.isArray(events)) return [];
    return events.filter((event: any) => {
      const matchesQuery = !searchQuery || 
        event.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.creator?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.country?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesLocation = !locationFilter || 
        event.location?.toLowerCase().includes(locationFilter.toLowerCase());
      
      const matchesCountry = !countryFilter || 
        event.country?.toLowerCase().includes(countryFilter.toLowerCase());

      // Date filter handling (basic)
      const matchesDate = (() => {
        if (!dateFilter) return true;
        try {
          const evDate = new Date(event.date);
          const today = new Date();
          const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
          const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

          if (dateFilter === 'today') {
            return evDate >= startOfDay(today) && evDate <= endOfDay(today);
          }
          if (dateFilter === 'tomorrow') {
            const t = new Date(); t.setDate(t.getDate() + 1);
            return evDate >= startOfDay(t) && evDate <= endOfDay(t);
          }
          if (dateFilter === 'week') {
            const start = startOfDay(today);
            const end = new Date(); end.setDate(end.getDate() + 7);
            return evDate >= start && evDate <= endOfDay(end);
          }
          if (dateFilter === 'month') {
            const start = startOfDay(today);
            const end = new Date(); end.setMonth(end.getMonth() + 1);
            return evDate >= start && evDate <= endOfDay(end);
          }
          if (dateFilter === 'upcoming') {
            return evDate >= startOfDay(today);
          }
        } catch (e) {
          return true;
        }
        return true;
      })();
      
      return matchesQuery && matchesLocation && matchesCountry && matchesDate;
    });
  }, [events, searchQuery, locationFilter, countryFilter, dateFilter]);

  const handleSearch = (query: string, location?: string, country?: string, date?: string) => {
    setSearchQuery(query || '');
    setLocationFilter(location || '');
    setCountryFilter(country || '');
    setDateFilter(date || '');
  };

  return (
    <div className="min-h-screen md:pt-16 pt-4 pb-8  md:pb-30 font-poppins">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-4xl font-bold mb-4 text-gray-800">
            Discover <span className="bg-[#00593F] bg-clip-text text-transparent">Events</span>
          </h1>
          <p className="text-[14px] font-[415] text-muted-foreground max-w-2xl mx-auto mb-8 font-poppins">
            Find amazing events happening in your area or create your own to bring people together.
          </p>
          
          {/* Search */}
          <div className="flex justify-center max-w-4xl mx-auto">
            <div className="flex-1 w-full max-w-2xl ">
              <SearchFilter onSearch={handleSearch} />
            </div>
          </div>
        </motion.div>

        {/* Events Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {filteredEvents.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 md:max-w-[1500px] mx-auto">
              {filteredEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <EventCard
                    event={event}
                  />
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20"
            >
              <div className="backdrop-blur-glass bg-gradient-glass border border-gray-300 rounded-2xl p-12 shadow-glass max-w-md mx-auto">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/20 flex items-center justify-center">
                  <div className="text-2xl">🔍</div>
                </div>
                <h3 className="text-xl font-semibold mb-2">No Events Found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || locationFilter 
                    ? 'Try adjusting your search criteria'
                    : 'No events available at the moment'
                  }
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Events;

