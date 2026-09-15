import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, MessageCircle, ShieldCheck, Clock, Award, ExternalLink } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const Footer = () => {
  const { isDark } = useTheme();

  return (
    <footer className={`border-t text-sm mt-8 sm:mt-12 pb-24 sm:pb-8 transition-colors ${
      isDark ? 'bg-[#050A12] border-white/10 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="inline-block">
              <img 
                src={isDark ? '/logo_horizontal_white.png' : '/logo_horizontal.png'} 
                alt="Netra Unnayan" 
                className="h-12 w-auto object-contain"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/logo_symbol.png';
                }}
              />
            </Link>
            <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed max-w-sm">
              <strong className="text-slate-900 dark:text-white">Netra Unnayan</strong> is Purba Medinipur's premier optical store and eye-care clinical center. Combining German lens edging accuracy with luxury designer frames and certified home eye checkups.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-cyan/10 text-brand-cyan text-xs font-semibold border border-brand-cyan/20">
                <ShieldCheck className="w-3.5 h-3.5" /> 100% Certified Lenses
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-teal/10 text-brand-teal text-xs font-semibold border border-brand-teal/20">
                <Award className="w-3.5 h-3.5" /> Optical Precision
              </span>
            </div>
          </div>

          {/* Optical Shop Links */}
          <div className="space-y-3">
            <h4 className="text-slate-900 dark:text-white font-bold tracking-wide uppercase text-xs">Eyewear Catalog</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/shop?category=eyeglasses" className="hover:text-brand-cyan transition-colors">Prescription Eyeglasses</Link></li>
              <li><Link to="/shop?category=sunglasses" className="hover:text-brand-cyan transition-colors">Polarized Sunglasses</Link></li>
              <li><Link to="/shop?category=computer-glasses" className="hover:text-brand-cyan transition-colors">Computer Anti-Glare</Link></li>
              <li><Link to="/shop?category=blue-light-glasses" className="hover:text-brand-cyan transition-colors">Blue Light Glasses</Link></li>
              <li><Link to="/shop?category=reading-glasses" className="hover:text-brand-cyan transition-colors">Ergonomic Reading</Link></li>
              <li><Link to="/shop?category=kids-glasses" className="hover:text-brand-cyan transition-colors">Flexible Kids Eyewear</Link></li>
              <li><Link to="/shop?category=premium-frames" className="hover:text-brand-cyan transition-colors">Aerospace Titanium</Link></li>
            </ul>
          </div>

          {/* Clinical & Services */}
          <div className="space-y-3">
            <h4 className="text-slate-900 dark:text-white font-bold tracking-wide uppercase text-xs">Clinical Services</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/doctors" className="hover:text-brand-cyan transition-colors">Book Doctor Appointment</Link></li>
              <li><Link to="/home-eye-checkup" className="hover:text-brand-cyan transition-colors">Book Home Eye Checkup</Link></li>
              <li><Link to="/doctor-posters" className="hover:text-brand-cyan transition-colors">Doctor Posters & Camps</Link></li>
              <li><Link to="/track-order" className="hover:text-brand-cyan transition-colors">Live Order Tracker</Link></li>
              <li><Link to="/about" className="hover:text-brand-cyan transition-colors">About Netra Unnayan</Link></li>
              <li><Link to="/contact" className="hover:text-brand-cyan transition-colors">Store Directions & Map</Link></li>
            </ul>
          </div>

          {/* Store Location & Contact */}
          <div className="space-y-3">
            <h4 className="text-slate-900 dark:text-white font-bold tracking-wide uppercase text-xs">Clinic & Store</h4>
            <div className="space-y-2.5 text-xs">
              <p className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-brand-cyan shrink-0 mt-0.5" />
                <span>
                  Digha Bypass Rd, Jatimati, Digha, West Bengal 721428
                </span>
              </p>
              <a 
                href="https://maps.app.goo.gl/TBLLEac73RdPyqLq6?g_st=ac"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-brand-cyan hover:underline font-semibold"
              >
                View on Google Maps <ExternalLink className="w-3 h-3" />
              </a>
              <p className="flex items-center gap-2 pt-1">
                <Phone className="w-4 h-4 text-brand-teal shrink-0" />
                <span>+91 9382293614</span>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-brand-cyan shrink-0" />
                <span>netraunnayan7@gmail.com</span>
              </p>
              <p className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                <span>Open Mon–Sun: 9:30 AM – 8:30 PM</span>
              </p>
            </div>
          </div>
        </div>

        {/* Legal Policies & Jurisdiction Bar */}
        <div className="border-t border-slate-200 dark:border-white/10 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-4 text-slate-600 dark:text-slate-400">
            <Link to="/terms" className="hover:text-slate-900 dark:hover:text-slate-200">Terms of Service</Link>
            <span>&bull;</span>
            <Link to="/return-policy" className="hover:text-slate-900 dark:hover:text-slate-200">Return & Replacement Policy</Link>
            <span>&bull;</span>
            <Link to="/refund-policy" className="hover:text-slate-900 dark:hover:text-slate-200">Refund & Cancellation Policy</Link>
            <span>&bull;</span>
            <Link to="/privacy" className="hover:text-slate-900 dark:hover:text-slate-200">Privacy Policy</Link>
          </div>
          <div className="text-slate-500 text-center md:text-right">
            &copy; {new Date().getFullYear()} Netra Unnayan. Clarity You Can Trust. <br className="sm:hidden" />
            <span className="text-[11px]">Purba Medinipur Jurisdiction, West Bengal.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
