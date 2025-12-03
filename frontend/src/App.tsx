import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { EventProvider, useEvents } from "./contexts/EventContext";
import { MobileWrapper, DeviceOptimizedLayout } from "./components/MobileResponsive";
import { NotificationSystem } from "./components/NotificationSystem";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Events from "./pages/Events";
import EventDetails from "./pages/EventDetails";
import BookingPage from "./pages/BookingPage";
import CreateEvent from "./pages/CreateEvent";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import About from "./pages/About";
import Notifications from "./pages/Notifications";
import Analytics from "./pages/Analytics";
import ProfileEdit from "./pages/ProfileEdit";
import UserProfile from "./pages/UserProfile";
import EmailVerification from "./pages/EmailVerification";
import MyTickets from "./pages/MyTickets";
import NotFound from "./pages/NotFound";
import ErrorBoundary from "./components/ErrorBoundary";
import { authService } from "./lib/auth";
import { wsClient } from "./lib/websocket";
import { pushNotificationService } from "./lib/pushNotifications";
import { useEffect, type FC, type ReactNode } from 'react';

const queryClient = new QueryClient();

// Protected Route Component
const ProtectedRoute: FC<{ children: ReactNode; adminOnly?: boolean }> = ({
  children,
  adminOnly = false
}) => {
  const { isAuthenticated, currentUser } = useEvents();

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (adminOnly && currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-4">
            <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
            <p>You don't have permission to access this page. Admin privileges required.</p>
          </div>
          <Navigate to="/events" replace />
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const App = () => {
  // Persistence hooks are currently unused in this build; remove to avoid TS warnings

  useEffect(() => {
    // Initialize services
    const initializeApp = async () => {
      // Initialize push notifications
      await pushNotificationService.initialize();
      
      // Connect WebSocket if authenticated
      if (authService.isAuthenticated()) {
        const token = localStorage.getItem('auth-token');
        wsClient.connect(token || undefined);
      }
      
      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        setTimeout(() => {
          pushNotificationService.requestPermission();
        }, 3000); // Ask after 3 seconds to not be intrusive
      }
    };

    initializeApp();

    // Cleanup WebSocket on unmount
    return () => {
      wsClient.disconnect();
    };
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <EventProvider>
            <TooltipProvider>
              <DeviceOptimizedLayout>
                <MobileWrapper>
                  <Toaster />
                  <Sonner />
                  <BrowserRouter>
                  <div className="min-h-screen bg-background flex flex-col">
                    <Navbar />

                    <main className="pt-16 pb-6 flex-1">
                      <Routes>
                        {/* Public Routes */}
                        <Route path="/" element={<Home />} />
                        <Route path="/events" element={<Events />} />
                        <Route path="/events/:id" element={<EventDetails />} />
                        <Route path="/book/:eventId" element={<BookingPage />} />
                        <Route path="/about" element={<About />} />
                        <Route path="/auth" element={<Auth />} />
                        <Route path="/verify-email" element={<EmailVerification />} />

                        {/* Protected Routes */}
                        <Route path="/create-event" element={
                          <ProtectedRoute>
                            <CreateEvent />
                          </ProtectedRoute>
                        } />

                        <Route path="/dashboard" element={
                          <ProtectedRoute>
                            <Dashboard />
                          </ProtectedRoute>
                        } />

                        <Route path="/notifications" element={
                          <ProtectedRoute>
                            <Notifications />
                          </ProtectedRoute>
                        } />

                        <Route path="/my-tickets" element={
                          <ProtectedRoute>
                            <MyTickets />
                          </ProtectedRoute>
                        } />

                        <Route path="/analytics" element={
                          <ProtectedRoute>
                            <Analytics />
                          </ProtectedRoute>
                        } />

                        <Route path="/profile/edit" element={
                          <ProtectedRoute>
                            <ProfileEdit />
                          </ProtectedRoute>
                        } />

                        <Route path="/user/:userId" element={<UserProfile />} />

                        {/* Admin Only Routes */}
                        <Route path="/admin" element={
                          <ProtectedRoute adminOnly>
                            <Admin />
                          </ProtectedRoute>
                        } />

                        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </main>

                    {/* Footer */}
                    <Footer />

                    {/* Global Notification System */}
                    <NotificationSystem />
                  </div>
                  </BrowserRouter>
                </MobileWrapper>
              </DeviceOptimizedLayout>
            </TooltipProvider>
          </EventProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
