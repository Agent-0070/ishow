import { type FC } from 'react';
import { Link } from 'react-router-dom';
import { Github, Twitter, Heart, Mail, MapPin, Phone } from 'lucide-react';

const Footer: FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-glass backdrop-blur-glass border-t border-[#00593F] mt-auto font-poppins">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="relative">
                <div className="w-8 h-8  flex items-center justify-center font-[550] text-[#00593F] text-[18px] z-10">
                  iShow
                </div>
                <div className="absolute inset-0 bg-gradient-primary rounded-lg opacity-20 blur-sm"></div>
              </div>
             
            </div>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              Your premier destination for creating, managing, and discovering amazing events. 
              Connect with your community and make every moment memorable.
            </p>
            <div className="flex space-x-4">
              <a
                href="https://github.com/Agent-0070"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full backdrop-blur-sm bg-glass-light/20 border border-[#00593F] hover:bg-glass-light/30 transition-colors flex items-center justify-center group"
                aria-label="GitHub"
              >
                <Github className="h-4 w-4 group-hover:scale-110 transition-transform" />
              </a>
              <a
                href="https://x.com/temijpg"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full backdrop-blur-sm bg-glass-light/20 border border-[#00593F] hover:bg-glass-light/30 transition-colors flex items-center justify-center group"
                aria-label="Twitter"
              >
                <Twitter className="h-4 w-4 group-hover:scale-110 transition-transform" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link 
                  to="/" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link 
                  to="/events" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Browse Events
                </Link>
              </li>
              <li>
                <Link 
                  to="/dashboard" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <Link 
                  to="/auth" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sign In
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Support</h3>
            <ul className="space-y-2">
              <li>
                <a 
                  href="#" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Help Center
                </a>
              </li>
              <li>
                <a 
                  href="#" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Contact Us
                </a>
              </li>
              <li>
                <a 
                  href="#" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a 
                  href="#" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Get in Touch</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">support@imevent.com</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">+234 (704) 262-1555</span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Lagos State, NGA</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-8 pt-6 border-t border-[#00593F]">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span>© {currentYear} iShow Event Platform. All rights reserved.</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span>Connecting the world</span>
              <Heart className="h-4 w-4 text-red-500 fill-current" />
              <span>through events</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
