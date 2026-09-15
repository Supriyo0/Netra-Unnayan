import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, MessageCircle, ShieldCheck, Clock, Award, ExternalLink } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const Footer = () => {
  const { isDark } = useTheme();

  return (
    <footer className={`border-t text-sm mt-6 sm:mt-10 pb-20 md:pb-6 transition-colors ${
      isDark ? 'bg-[#050A12] border-white/10 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 sm:gap-8 lg:gap-10">
          
          {/* Brand Column */}
          <div className="col-span-2 lg:col-span-2 space-y-3">
            <Link to="/" className="inline-block">
              <img 
                src={isDark ? '/logo_horizontal_white.png' : '/logo_horizontal.png'} 
                alt="Netra Unnayan" 
                className="h-10 sm:h-12 w-auto object-contain"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/logo_symbol.png';
                }}
              />
            </Link>
            <p className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm leading-relaxed max-w-sm">
              <strong className="text-slate-900 dark:text-white">Netra Unnayan</strong> is Purba Medinipur's premier optical store and eye-care clinical center. Combining German lens edging accuracy with luxury designer frames and certified home eye checkups.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-cyan/10 text-brand-cyan text-[11px] font-semibold border border-brand-cyan/20">
                <ShieldCheck className="w-3 h-3" /> 100% Certified Lenses
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-teal/10 text-brand-teal text-[11px] font-semibold border border-brand-teal/20">
                <Award className="w-3 h-3" /> Optical Precision
              </span>
            </div>
          </div>

          {/* Optical Shop Links */}
          <div className="col-span-1 space-y-2.5">
            <h4 className="text-slate-900 dark:text-white font-bold tracking-wide uppercase text-xs">Eyewear Catalog</h4>
            <ul className="space-y-1.5 text-xs">
              <li><Link to="/shop?category=eyeglasses" className="hover:text-brand-cyan transition-colors">Prescription Glasses</Link></li>
              <li><Link to="/shop?category=sunglasses" className="hover:text-brand-cyan transition-colors">Polarized Sunglasses</Link></li>
              <li><Link to="/shop?category=computer-glasses" className="hover:text-brand-cyan transition-colors">Computer Anti-Glare</Link></li>
              <li><Link to="/shop?category=blue-light-glasses" className="hover:text-brand-cyan transition-colors">Blue Light Glasses</Link></li>
              <li><Link to="/shop?category=reading-glasses" className="hover:text-brand-cyan transition-colors">Ergonomic Reading</Link></li>
              <li><Link to="/shop?category=kids-glasses" className="hover:text-brand-cyan transition-colors">Flexible Kids Frames</Link></li>
              <li><Link to="/shop?category=premium-frames" className="hover:text-brand-cyan transition-colors">Aerospace Titanium</Link></li>
            </ul>
          </div>

          {/* Clinical & Services */}
          <div className="col-span-1 space-y-2.5">
            <h4 className="text-slate-900 dark:text-white font-bold tracking-wide uppercase text-xs">Clinical Services</h4>
            <ul className="space-y-1.5 text-xs">
              <li><Link to="/doctors" className="hover:text-brand-cyan transition-colors">Doctor Appointment</Link></li>
              <li><Link to="/home-eye-checkup" className="hover:text-brand-cyan transition-colors">Home Eye Checkup</Link></li>
              <li><Link to="/doctor-posters" className="hover:text-brand-cyan transition-colors">Doctor Posters & Camps</Link></li>
              <li><Link to="/track-order" className="hover:text-brand-cyan transition-colors">Live Order Tracker</Link></li>
              <li><Link to="/about" className="hover:text-brand-cyan transition-colors">About Netra Unnayan</Link></li>
              <li><Link to="/contact" className="hover:text-brand-cyan transition-colors">Directions & Map</Link></li>
            </ul>
          </div>

          {/* Store Location & Contact */}
          <div className="col-span-2 lg:col-span-1 space-y-2.5">
            <h4 className="text-slate-900 dark:text-white font-bold tracking-wide uppercase text-xs">Clinic & Store</h4>
            <div className="space-y-1.5 text-xs">
              <p className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-brand-cyan shrink-0 mt-0.5" />
                <span>
                  Digha Bypass Rd, Jatimati, Digha, West Bengal 721428
                </span>
              </p>
              
              {/* Compact Embedded Mini Map */}
              <div className="w-full h-24 sm:h-28 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-xs relative my-1.5 bg-slate-900">
                <iframe
                  title="Netra Unnayan Mini Map"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14787.21448892182!2d87.5025!3d21.6275!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a032fb77c44e6b5%3A0x86b0337bfa5a938c!2sDigha%20Bypass%20Rd%2C%20Jatimati%2C%20Digha%2C%20West%20Bengal%20721428!5e0!3m2!1sen!2sin!4v1714000000000!5m2!1sen!2sin"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full h-full filter brightness-95 contrast-105"
                />
              </div>

              <a 
                href="https://maps.app.goo.gl/TBLLEac73RdPyqLq6?g_st=ac"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-brand-cyan hover:underline font-semibold"
              >
                Open Full Google Maps <ExternalLink className="w-3 h-3" />
              </a>
              <p className="flex items-center gap-2 pt-0.5">
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
        <div className="border-t border-slate-200 dark:border-white/10 mt-6 sm:mt-8 pt-4 sm:pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-3 gap-y-1 text-slate-600 dark:text-slate-400 text-[11px] sm:text-xs">
            <Link to="/terms" className="hover:text-slate-900 dark:hover:text-slate-200">Terms of Service</Link>
            <span>&bull;</span>
            <Link to="/return-policy" className="hover:text-slate-900 dark:hover:text-slate-200">Return Policy</Link>
            <span>&bull;</span>
            <Link to="/refund-policy" className="hover:text-slate-900 dark:hover:text-slate-200">Refund Policy</Link>
            <span>&bull;</span>
            <Link to="/privacy" className="hover:text-slate-900 dark:hover:text-slate-200">Privacy Policy</Link>
          </div>
          <div className="text-slate-500 text-center md:text-right text-[11px] sm:text-xs">
            &copy; {new Date().getFullYear()} Netra Unnayan. Clarity You Can Trust. <br className="sm:hidden" />
            <span>Purba Medinipur Jurisdiction, WB.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
