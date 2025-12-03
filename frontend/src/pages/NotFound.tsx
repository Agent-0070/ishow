import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen pt-16 flex items-center justify-center">
      <div className="text-center backdrop-blur-glass bg-gradient-glass border border-glass-border/30 rounded-2xl p-12 shadow-glass max-w-md mx-auto">
        <h1 className="text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-4">Oops! Page not found</p>
        <p className="text-sm text-muted-foreground mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/">
          <button className="px-6 py-3 bg-gradient-primary text-white rounded-lg border-0 shadow-glow hover:shadow-accent-glow transition-all duration-300">
            Return to Home
          </button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
