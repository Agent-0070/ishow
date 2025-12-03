import { type FC } from 'react';
import { Card, CardHeader, CardContent } from './ui/card';
import { Button } from './ui/button';

interface DashboardMetric {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
}

interface ChartData {
  name: string;
  value: number;
  color: string;
}

export const AdvancedDashboard: FC = () => {
  const metrics: DashboardMetric[] = [
    { title: 'Total Bookings', value: '1,234', change: '+12%', trend: 'up' },
    { title: 'Revenue', value: '$45,678', change: '+8%', trend: 'up' },
    { title: 'Occupancy Rate', value: '87%', change: '-2%', trend: 'down' },
    { title: 'Guest Satisfaction', value: '4.8', change: '+0.2', trend: 'up' },
  ];

  const chartData: ChartData[] = [
    { name: 'Jan', value: 400, color: 'dashboard-chart-1' },
    { name: 'Feb', value: 300, color: 'dashboard-chart-2' },
    { name: 'Mar', value: 600, color: 'dashboard-chart-3' },
    { name: 'Apr', value: 800, color: 'dashboard-chart-4' },
    { name: 'May', value: 500, color: 'dashboard-chart-5' },
  ];

  return (
    <div className="w-full space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold bg-gradient-dashboard bg-clip-text text-transparent">
          Host Dashboard
        </h1>
        <Button className="animate-glow">
          Generate Report
        </Button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <Card 
            key={metric.title}
            className="bg-dashboard-widget backdrop-blur-md border-gray-300 animate-widget-appear"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <CardContent className="p-6">
              <div className="animate-metric-pulse">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  {metric.title}
                </h3>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{metric.value}</span>
                  <span 
                    className={`text-sm px-2 py-1 rounded-full ${
                      metric.trend === 'up' 
                        ? 'bg-notification-success/20 text-notification-success' 
                        : metric.trend === 'down'
                        ? 'bg-notification-error/20 text-notification-error'
                        : 'bg-notification-info/20 text-notification-info'
                    }`}
                  >
                    {metric.change}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card className="bg-dashboard-widget backdrop-blur-md border-glass-border">
          <CardHeader>
            <h3 className="text-lg font-semibold">Monthly Revenue</h3>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between space-x-2">
              {chartData.map((data, index) => (
                <div key={data.name} className="flex-1 flex flex-col items-center">
                  <div 
                    className={`w-full bg-${data.color} rounded-t-lg animate-chart-draw`}
                    style={{ 
                      height: `${(data.value / 800) * 200}px`,
                      animationDelay: `${index * 0.2}s`
                    }}
                  ></div>
                  <span className="text-xs mt-2 text-muted-foreground">{data.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Real-time Activity */}
        <Card className="bg-dashboard-widget backdrop-blur-md border-glass-border">
          <CardHeader>
            <h3 className="text-lg font-semibold">Real-time Activity</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { user: 'John Doe', action: 'New booking', time: '2 min ago', type: 'booking' },
              { user: 'Jane Smith', action: 'Payment received', time: '5 min ago', type: 'payment' },
              { user: 'Mike Johnson', action: 'Check-in', time: '10 min ago', type: 'checkin' },
              { user: 'Sarah Wilson', action: 'Review submitted', time: '15 min ago', type: 'review' },
            ].map((activity, index) => (
              <div 
                key={index}
                className="flex items-center space-x-3 p-3 rounded-lg bg-dashboard-metric/50 animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className={`w-3 h-3 rounded-full ${
                  activity.type === 'booking' ? 'bg-dashboard-chart-1' :
                  activity.type === 'payment' ? 'bg-dashboard-chart-2' :
                  activity.type === 'checkin' ? 'bg-dashboard-chart-3' :
                  'bg-dashboard-chart-4'
                } animate-pulse`}></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.user}</p>
                  <p className="text-xs text-muted-foreground">{activity.action}</p>
                </div>
                <span className="text-xs text-muted-foreground">{activity.time}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Performance Monitor */}
      <Card className="bg-dashboard-widget backdrop-blur-md border-glass-border">
        <CardHeader>
          <h3 className="text-lg font-semibold">System Performance</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: 'Server Load', value: 45, color: 'dashboard-chart-1' },
              { label: 'Response Time', value: 78, color: 'dashboard-chart-2' },
              { label: 'Memory Usage', value: 62, color: 'dashboard-chart-3' },
            ].map((stat, index) => (
              <div key={stat.label} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{stat.label}</span>
                  <span>{stat.value}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full bg-${stat.color} rounded-full animate-progress-bar`}
                    style={{ width: `${stat.value}%`, animationDelay: `${index * 0.2}s` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
