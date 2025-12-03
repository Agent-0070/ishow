import { useState, useEffect, type FC, type ReactNode, type TouchEvent } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';

interface MobileResponsiveProps {
  children: ReactNode;
}

// Mobile-first responsive wrapper
export const MobileWrapper: FC<MobileResponsiveProps> = ({ children }) => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className={`
      min-h-screen
      pt-safe-top pb-safe-bottom pl-safe-left pr-safe-right
      ${isMobile ? 'px-4' : 'px-6'}
    `}>
      {children}
    </div>
  );
};

// Touch-optimized navigation
export const MobileNavigation: FC = () => {
  const [activeTab, setActiveTab] = useState('home');
  
  const navItems = [
    { id: 'home', icon: '🏠', label: 'Home' },
    { id: 'bookings', icon: '📅', label: 'Bookings' },
    { id: 'messages', icon: '💬', label: 'Messages' },
    { id: 'profile', icon: '👤', label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-mobile-nav backdrop-blur-lg border-t border-glass-border pb-safe-bottom z-modal">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item, index) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`
              flex flex-col items-center justify-center
              min-h-touch min-w-touch
              rounded-lg transition-all duration-200
              animate-touch-feedback
              ${activeTab === item.id 
                ? 'bg-mobile-nav-active text-primary' 
                : 'text-muted-foreground hover:text-foreground'
              }
            `}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <span className="text-xl mb-1">{item.icon}</span>
            <span className="text-xs">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

// Swipe gesture component
export const SwipeableCard: FC<{ children: ReactNode; onSwipeLeft?: () => void; onSwipeRight?: () => void }> = ({ 
  children, 
  onSwipeLeft, 
  onSwipeRight 
}) => {
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleTouchStart = (e: TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;
    setCurrentX(e.touches[0].clientX - startX);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    const threshold = 100;
    if (currentX > threshold && onSwipeRight) {
      onSwipeRight();
    } else if (currentX < -threshold && onSwipeLeft) {
      onSwipeLeft();
    }
    
    setCurrentX(0);
    setIsDragging(false);
  };

  return (
    <div
      className={`
        transition-transform duration-200
        ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
      `}
      style={{ transform: `translateX(${currentX}px)` }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
      {isDragging && Math.abs(currentX) > 50 && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-mobile-gesture text-white px-4 py-2 rounded-full animate-swipe-hint">
          {currentX > 0 ? '→ Swipe Right' : '← Swipe Left'}
        </div>
      )}
    </div>
  );
};

// Pull-to-refresh component
export const PullToRefresh: React.FC<{ onRefresh: () => Promise<void>; children: React.ReactNode }> = ({ 
  onRefresh, 
  children 
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);

  const handleTouchStart = (e: TouchEvent) => {
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - startY);
    
    if (window.scrollY === 0 && distance > 0) {
      setPullDistance(Math.min(distance, 100));
      e.preventDefault();
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 50) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    setPullDistance(0);
  };

  return (
    <div
      className="relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div 
          className="absolute top-0 left-1/2 transform -translate-x-1/2 bg-primary text-white px-4 py-2 rounded-full z-10 animate-pull-refresh"
          style={{ top: `${Math.max(pullDistance - 30, -30)}px` }}
        >
          {isRefreshing ? '🔄 Refreshing...' : pullDistance > 50 ? '↓ Release to refresh' : '↓ Pull to refresh'}
        </div>
      )}
      
      <div style={{ transform: `translateY(${pullDistance * 0.5}px)` }}>
        {children}
      </div>
    </div>
  );
};

// Mobile-optimized property card
export const MobilePropertyCard: FC = () => {
  const [liked, setLiked] = useState(false);
  
  return (
    <SwipeableCard
      onSwipeLeft={() => console.log('Dislike')}
      onSwipeRight={() => setLiked(true)}
    >
      <Card className="bg-glass-light backdrop-blur-md border-glass-border overflow-hidden animate-fade-in">
        <div className="relative">
          <img 
            src="/placeholder.svg" 
            alt="Property" 
            className="w-full h-48 object-cover"
          />
          <button
            onClick={() => setLiked(!liked)}
            className={`
              absolute top-4 right-4 
              w-10 h-10 rounded-full 
              flex items-center justify-center
              transition-all duration-200
              animate-touch-feedback
              ${liked ? 'bg-red-500 text-white' : 'bg-white/80 text-gray-600'}
            `}
          >
            {liked ? '❤️' : '🤍'}
          </button>
        </div>
        
        <CardContent className="p-4">
          <h3 className="font-semibold text-lg mb-2">Luxury Apartment</h3>
          <p className="text-muted-foreground text-sm mb-3">
            Beautiful downtown apartment with city views
          </p>
          
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-primary">$150/night</span>
            <div className="flex space-x-2">
              <Button size="sm" variant="outline" className="min-h-touch">
                View
              </Button>
              <Button size="sm" className="min-h-touch">
                Book
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </SwipeableCard>
  );
};

// App-like loading screen
export const MobileLoadingScreen: FC = () => {
  return (
    <div className="fixed inset-0 bg-gradient-primary flex flex-col items-center justify-center z-modal">
      <div className="animate-float mb-8">
        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-4xl animate-glow">
          🏠
        </div>
      </div>
      
      <h1 className="text-3xl font-bold text-white mb-4 animate-fade-in">
        Im-Host
      </h1>
      
      <div className="flex space-x-2 animate-fade-in" style={{ animationDelay: '0.5s' }}>
        <div className="w-3 h-3 bg-white rounded-full animate-typing-dots"></div>
        <div className="w-3 h-3 bg-white rounded-full animate-typing-dots" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-3 h-3 bg-white rounded-full animate-typing-dots" style={{ animationDelay: '0.4s' }}></div>
      </div>
    </div>
  );
};

// Device-specific optimizations
export const DeviceOptimizedLayout: FC<{ children: ReactNode }> = ({ children }) => {
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    isTablet: false,
    isIOS: false,
    hasNotch: false,
  });

  useEffect(() => {
    const userAgent = navigator.userAgent;
    const width = window.innerWidth;
    
    setDeviceInfo({
      isMobile: width < 768,
      isTablet: width >= 768 && width < 1024,
      isIOS: /iPad|iPhone|iPod/.test(userAgent),
      hasNotch: window.screen.height / window.screen.width > 2, // Rough notch detection
    });
  }, []);

  return (
    <div className={`
      ${deviceInfo.isMobile ? 'mobile-layout' : 'desktop-layout'}
      ${deviceInfo.isIOS ? 'ios-device' : 'android-device'}
      ${deviceInfo.hasNotch ? 'has-notch' : 'no-notch'}
    `}>
      {children}
    </div>
  );
};
