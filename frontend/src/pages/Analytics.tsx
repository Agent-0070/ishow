import { useState, useMemo, type FC } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp,
  Users,
  Calendar,
  DollarSign,
  MapPin,
  
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { useEvents } from '../contexts/EventContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from '../components/ui/chart';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer,
  
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';

const Analytics: FC = () => {
  const { events, currentUser } = useEvents();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [selectedEvent, setSelectedEvent] = useState<string>('all');

  // Filter events based on user role
  const userEvents = currentUser?.role === 'admin'
    ? (Array.isArray(events) ? events : [])
    : (Array.isArray(events) ? events.filter(event => event.creatorId === currentUser?.id) : []);

  // Calculate analytics data
  const analyticsData = useMemo(() => {
    const filteredEvents = selectedEvent === 'all'
      ? userEvents
      : (Array.isArray(userEvents) ? userEvents.filter(event => event.id === selectedEvent) : []);

    // Ensure filteredEvents is always an array
    const safeFilteredEvents = Array.isArray(filteredEvents) ? filteredEvents : [];

    // Basic metrics
    const totalEvents = safeFilteredEvents.length;
    const totalBookings = safeFilteredEvents.reduce((sum, event) => sum + (event.booked || 0), 0);
    const totalCapacity = safeFilteredEvents.reduce((sum, event) => sum + Number(event.capacity || 0), 0);
    const totalRevenue = safeFilteredEvents.reduce((sum, event) => {
      return sum + (event.ticketCategories?.reduce((catSum: number, cat: { price: any; sold: any; }) => {
        return catSum + ((cat.price || 0) * (cat.sold || 0));
      }, 0) || ((event.price || 0) * (event.booked || 0)));
    }, 0);

    const avgBookingRate = totalCapacity > 0 ? (totalBookings / totalCapacity) * 100 : 0;

    // Event performance data
    const eventPerformance = safeFilteredEvents.map(event => {
      const revenue = event.ticketCategories?.reduce((sum: number, cat: { price: number; sold: number; }) => {
        return sum + (cat.price * cat.sold);
      }, 0) || (event.price || 0) * event.booked;

      return {
        name: event.title.length > 20 ? event.title.substring(0, 20) + '...' : event.title,
        bookings: event.booked,
        capacity: Number(event.capacity),
        revenue: revenue,
        bookingRate: (event.booked / Number(event.capacity)) * 100
      };
    });

    // Booking trends (mock data for demonstration)
    const bookingTrends = [
      { date: '2024-01-01', bookings: 12, revenue: 1800 },
      { date: '2024-01-08', bookings: 19, revenue: 2850 },
      { date: '2024-01-15', bookings: 8, revenue: 1200 },
      { date: '2024-01-22', bookings: 25, revenue: 3750 },
      { date: '2024-01-29', bookings: 15, revenue: 2250 },
      { date: '2024-02-05', bookings: 22, revenue: 3300 },
      { date: '2024-02-12', bookings: 18, revenue: 2700 }
    ];

    // Ticket category distribution
    const ticketDistribution = safeFilteredEvents.reduce((acc: any[], event) => {
      if (event.ticketCategories) {
        event.ticketCategories.forEach((cat: { name: any; sold: number; price: number; }) => {
          const existing = acc.find(item => item.name === cat.name);
          if (existing) {
            existing.value += cat.sold;
            existing.revenue += cat.price * cat.sold;
          } else {
            acc.push({
              name: cat.name,
              value: cat.sold,
              revenue: cat.price * cat.sold
            });
          }
        });
      }
      return acc;
    }, []);

    // Location analytics
    const locationData = safeFilteredEvents.reduce((acc: any[], event) => {
      const location = event.location.split(',')[1]?.trim() || event.location;
      const existing = acc.find(item => item.location === location);
      if (existing) {
        existing.events += 1;
        existing.bookings += event.booked;
      } else {
        acc.push({
          location,
          events: 1,
          bookings: event.booked
        });
      }
      return acc;
    }, []);

    return {
      totalEvents,
      totalBookings,
      totalCapacity,
      totalRevenue,
      avgBookingRate,
      eventPerformance,
      bookingTrends,
      ticketDistribution,
      locationData
    };
  }, [userEvents, selectedEvent]);

  const chartConfig = {
    bookings: {
      label: "Bookings",
      color: "hsl(var(--chart-1))",
    },
    revenue: {
      label: "Revenue",
      color: "hsl(var(--chart-2))",
    },
    capacity: {
      label: "Capacity",
      color: "hsl(var(--chart-3))",
    },
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground">
              {currentUser?.role === 'admin' ? 'Platform-wide' : 'Your event'} performance insights
            </p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-start sm:justify-end">
            <Button variant="outline" size="sm" className="w-auto">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm" className="w-auto">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span className="text-sm font-medium">Filters:</span>
              </div>
              
              <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className='bg-white text-black'>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className='bg-white dark:bg-black text-black'>
                  <SelectItem value="all">All Events</SelectItem>
                  {Array.isArray(userEvents) ? userEvents.map(event => (
                    <SelectItem  key={event.id}  value={event.id}>
                      {event.title}
                    </SelectItem>
                  )) : null}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.totalEvents}</div>
                <p className="text-xs text-muted-foreground">
                  +2 from last month
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.totalBookings}</div>
                <p className="text-xs text-muted-foreground">
                  {analyticsData.avgBookingRate.toFixed(1)}% booking rate
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${analyticsData.totalRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  +15% from last month
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Booking Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.avgBookingRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  {analyticsData.totalCapacity} total capacity
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Charts Section */}
        <Tabs defaultValue="performance" className="space-y-6">
          <TabsList className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-4">
            <TabsTrigger value="performance" className="min-w-[140px] flex-shrink-0">Event Performance</TabsTrigger>
            <TabsTrigger value="trends" className="min-w-[140px] flex-shrink-0">Booking Trends</TabsTrigger>
            <TabsTrigger value="distribution" className="min-w-[140px] flex-shrink-0">Ticket Distribution</TabsTrigger>
            <TabsTrigger value="locations" className="min-w-[140px] flex-shrink-0">Locations</TabsTrigger>
          </TabsList>

          <TabsContent value="performance">
            <Card>
              <CardHeader>
                <CardTitle>Event Performance</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Bookings and revenue by event
                </p>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="w-full min-w-0 h-[240px] sm:h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.eventPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="bookings" fill="var(--color-bookings)" />
                      <Bar dataKey="capacity" fill="var(--color-capacity)" opacity={0.3} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends">
            <Card>
              <CardHeader>
                <CardTitle>Booking Trends</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Bookings and revenue over time
                </p>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="w-full min-w-0 h-[240px] sm:h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsData.bookingTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area 
                        type="monotone" 
                        dataKey="bookings" 
                        stroke="var(--color-bookings)" 
                        fill="var(--color-bookings)" 
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="distribution">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Ticket Category Distribution</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Sales by ticket type
                  </p>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[200px] sm:h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analyticsData.ticketDistribution}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                        >
                          {analyticsData.ticketDistribution.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue by Category</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Revenue breakdown by ticket type
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analyticsData.ticketDistribution.map((category, index) => (
                      <div key={category.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-sm">{category.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">${category.revenue.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">{category.value} tickets</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="locations">
            <Card>
              <CardHeader>
                <CardTitle>Performance by Location</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Event performance across different locations
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                  {analyticsData.locationData.map((location) => (
                    <div key={location.location} className="min-w-[260px] flex-shrink-0 flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{location.location}</div>
                          <div className="text-sm text-muted-foreground">
                            {location.events} event{location.events !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{location.bookings} bookings</div>
                        <div className="text-sm text-muted-foreground">
                          {(location.bookings / location.events).toFixed(1)} avg per event
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Event List with Analytics */}
        <Card>
          <CardHeader>
            <CardTitle>Event Performance Details</CardTitle>
            <p className="text-sm text-muted-foreground">
              Detailed performance metrics for each event
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              {analyticsData.eventPerformance.map((event, index) => (
                <div key={index} className="min-w-[280px] flex-shrink-0 flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <h4 className="font-medium">{event.name}</h4>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span>{event.bookings}/{event.capacity} booked</span>
                      <Badge variant={event.bookingRate > 70 ? "default" : "secondary"}>
                        {event.bookingRate}% filled
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">${event.revenue.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">revenue</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
