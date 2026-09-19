import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ShoppingBag, User, Search, Phone, MessageCircle, 
  Menu, X, Calendar, Home as HomeIcon, Eye, ShieldCheck,
  ChevronDown, Sun, Moon, Sparkles, MapPin, Clock, Truck,
  Glasses, Stethoscope, Compass, ArrowRight, Activity, Heart,
  ShoppingCart, Shield, LogOut, TrendingUp, ArrowUpRight, Loader2, Tag,
  Mail, MessageSquare, HelpCircle, Bot
} from 'lucide-react';
import api from '../../api/client';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useWishlist } from '../../context/WishlistContext';
import { BrandLogo } from '../common/BrandLogo';
import { SeasonalLogoWrapper } from '../theme/SeasonalLogoWrapper';
import { SupportChatWidget } from '../support/SupportChatWidget';

export const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { itemCount, cartTotal } = useCart();
  const { user, isAdmin, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const { wishlistCount } = useWishlist();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [totalSuggestions, setTotalSuggestions] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [supportChatOpen, setSupportChatOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setSearchOpen(false);
    setDropdownOpen(false);
    setUserDropdownOpen(false);
    setSuggestions([]);
  }, [location.pathname]);

  // Live letter-by-letter product suggestion auto-complete
  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setSuggestions([]);
      setTotalSuggestions(0);
      setLoadingSuggestions(false);
      return;
    }

    setLoadingSuggestions(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/products/suggest.php?q=${encodeURIComponent(query)}`);
        if (res.success && res.data) {
          setSuggestions(res.data.suggestions || []);
          setTotalSuggestions(res.data.total || 0);
        } else {
          setSuggestions([]);
          setTotalSuggestions(0);
        }
      } catch (err) {
        console.error('Failed to load search suggestions:', err);
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/catalog?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSuggestions([]);
    }
  };

  const handleSelectProduct = (productId) => {
    navigate(`/product/${productId}`);
    setSearchOpen(false);
    setSearchQuery('');
    setSuggestions([]);
  };

  const trendingSearches = [
    'Titanium Pure', 'Aviator Polarized', 'Blue Cut Computer', 
    'Kids SafeFlex', 'Geometric Hex', 'Reading Bifocal'
  ];

  const categories = [
    { name: 'All Eyewear', slug: '', icon: Glasses, desc: 'Complete catalog of designer frames' },
    { name: 'Prescription Glasses', slug: 'eyeglasses', icon: Glasses, desc: 'CR-39 & High-Index German optics' },
    { name: 'Polarized Sunglasses', slug: 'sunglasses', icon: Compass, desc: '100% UV400 ocean & road glare cut' },
    { name: 'Computer Blue-Cut', slug: 'computer-glasses', icon: Eye, desc: 'Digital screen fatigue protection' },
    { name: 'Reading & Bifocal', slug: 'reading-glasses', icon: Glasses, desc: 'Precision magnification powers' },
  ];

  const currentLogo = isDark 
    ? '/logo_horizontal_white.png' 
    : '/logo_horizontal.png';

  return (
    <>
      {/* Main Glass Header Bar — True iPhone iOS Glassmorphism */}
      <header className={`sticky top-0 z-40 transition-all duration-300 ${
        isDark ? 'navbar-glass-dark' : 'navbar-glass-light'
      } ${scrolled ? 'scrolled py-1' : 'py-2'}`}>
        <div className="w-full max-w-[1520px] mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-15 sm:h-16 md:h-18 gap-2 xl:gap-3 min-w-0">
            
            {/* 1. Left: Brand Identity Logo (Bigger & Animated with Natural Eye Blinking) */}
            <Link to="/" className="flex items-center group shrink min-w-0 focus:outline-none py-0.5">
              <div className="nav-logo-animated-wrapper">
                <SeasonalLogoWrapper>
                  <BrandLogo isDark={isDark} size="default" />
                </SeasonalLogoWrapper>
              </div>
            </Link>

            {/* 2. Middle: Desktop Navigation Links (Responsive luxury typographic nav) */}
            <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1.5 min-w-0">
              
              {/* Eyewear Dropdown */}
              <div className="relative shrink-0">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  onMouseEnter={() => setDropdownOpen(true)}
                  className={`h-9 px-2 xl:px-2.5 2xl:px-3 rounded-xl text-xs xl:text-xs 2xl:text-sm font-bold tracking-wide transition-all flex items-center gap-1 xl:gap-1.5 whitespace-nowrap shrink-0 ${
                    location.pathname.startsWith('/catalog')
                      ? 'text-brand-cyan bg-brand-cyan/10'
                      : isDark
                      ? 'text-slate-200 hover:text-brand-cyan hover:bg-white/5'
                      : 'text-slate-700 hover:text-brand-cyan hover:bg-sky-50'
                  }`}
                >
                  <Glasses className="w-3.5 h-3.5 text-brand-cyan shrink-0" />
                  <span>Eyewear</span>
                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div 
                    onMouseLeave={() => setDropdownOpen(false)}
                    className="nav-dropdown-solid absolute top-full left-0 mt-2 w-72 rounded-2xl shadow-2xl p-2 z-[100] transition-all text-slate-900 dark:text-white"
                  >
                    <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-cyan-600 dark:text-brand-cyan border-b border-slate-100 dark:border-white/10 mb-1">
                      Frame Collections
                    </div>
                    {categories.map((cat, i) => (
                      <Link
                        key={i}
                        to={cat.slug ? `/catalog?category=${cat.slug}` : '/catalog'}
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 p-2.5 rounded-xl transition-all hover:bg-sky-50 dark:hover:bg-white/10 text-slate-800 dark:text-slate-100 hover:text-sky-600 dark:hover:text-brand-cyan"
                      >
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-brand-cyan flex items-center justify-center shrink-0">
                          <cat.icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">{cat.name}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{cat.desc}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Eye Doctors */}
              <Link 
                to="/doctors" 
                className={`h-9 px-2 xl:px-2.5 2xl:px-3 rounded-xl text-xs xl:text-xs 2xl:text-sm font-bold tracking-wide transition-all flex items-center gap-1 xl:gap-1.5 whitespace-nowrap shrink-0 ${
                  location.pathname === '/doctors'
                    ? 'text-brand-cyan bg-brand-cyan/10'
                    : isDark
                    ? 'text-slate-200 hover:text-brand-cyan hover:bg-white/5'
                    : 'text-slate-700 hover:text-brand-cyan hover:bg-sky-50'
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Eye Doctors</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </Link>

              {/* Home Eye Checkup */}
              <Link 
                to="/home-eye-checkup" 
                className={`h-9 px-2 xl:px-2.5 2xl:px-3 rounded-xl text-xs xl:text-xs 2xl:text-sm font-bold tracking-wide transition-all flex items-center gap-1 xl:gap-1.5 whitespace-nowrap shrink-0 ${
                  location.pathname === '/home-eye-checkup'
                    ? 'text-brand-cyan bg-brand-cyan/10'
                    : isDark
                    ? 'text-slate-200 hover:text-brand-cyan hover:bg-white/5'
                    : 'text-slate-700 hover:text-brand-cyan hover:bg-sky-50'
                }`}
              >
                <HomeIcon className="w-3.5 h-3.5 text-brand-teal shrink-0" />
                <span>Home Eye Test</span>
              </Link>

              {/* Live Track */}
              <Link 
                to="/track-order" 
                className={`h-9 px-2 xl:px-2.5 2xl:px-3 rounded-xl text-xs xl:text-xs 2xl:text-sm font-bold tracking-wide transition-all flex items-center gap-1 xl:gap-1.5 whitespace-nowrap shrink-0 ${
                  location.pathname === '/track-order'
                    ? 'text-brand-cyan bg-brand-cyan/10'
                    : isDark
                    ? 'text-slate-200 hover:text-brand-cyan hover:bg-white/5'
                    : 'text-slate-700 hover:text-brand-cyan hover:bg-sky-50'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Live Track</span>
              </Link>
            </nav>

            {/* 3. Right: Action Buttons (Only Search, Profile, Hamburger on Mobile) */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 py-1">
              
              {/* 1. Search 3D Button */}
              <button 
                onClick={() => setSearchOpen(!searchOpen)}
                className="nav-3d-btn group"
                title="Search frames, lenses & styles"
                aria-label="Search"
              >
                <div className="nav-3d-tile nav-3d-tile-blue">
                  <Search className="w-4 h-4 text-white stroke-[2.5]" />
                </div>
              </button>

              {/* 2. Wishlist 3D Button (Tablet/Desktop only) */}
              <Link 
                to={user ? "/wishlist" : "/login?redirect=/wishlist"}
                className="hidden md:inline-flex nav-3d-btn group"
                title="Saved Wishlist"
                aria-label="Wishlist"
              >
                <div className="nav-3d-tile nav-3d-tile-red">
                  <Heart className={`w-4 h-4 text-white stroke-[2.4] ${wishlistCount > 0 ? 'fill-white' : ''}`} />
                </div>
                {wishlistCount > 0 && (
                  <span className="nav-3d-badge bg-rose-600">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              {/* 3. Shopping Cart 3D Button (Tablet/Desktop only) */}
              <Link 
                to={user ? "/cart" : "/login?redirect=/cart"}
                className="hidden md:inline-flex nav-3d-btn group"
                title="View Shopping Cart"
                aria-label="Cart"
              >
                <div className="nav-3d-tile nav-3d-tile-green">
                  <ShoppingBag className="w-4 h-4 text-white stroke-[2.4]" />
                </div>
                {itemCount > 0 && (
                  <span className="nav-3d-badge bg-emerald-600">
                    {itemCount}
                  </span>
                )}
              </Link>

              {/* 4. Theme Toggle 3D Button (Tablet/Desktop only) */}
              <button
                onClick={toggleTheme}
                className="hidden sm:inline-flex nav-3d-btn group"
                title={isDark ? 'Switch to Crisp Optical Light Theme' : 'Switch to Midnight Dark Theme'}
                aria-label="Toggle Theme"
              >
                <div className="nav-3d-tile nav-3d-tile-charcoal">
                  {isDark ? (
                    <Sun className="w-4 h-4 text-amber-300 stroke-[2.4]" />
                  ) : (
                    <Moon className="w-4 h-4 text-cyan-200 stroke-[2.4]" />
                  )}
                </div>
              </button>

              {/* STRICTLY ONLY WHEN ADMIN IS LOGGED IN ON DESKTOP: ADMIN PANEL & POS BILLING BUTTONS */}
              {user && isAdmin && (
                <>
                  <Link
                    to="/admin"
                    className="hidden lg:inline-flex nav-3d-btn group"
                    title="Open Admin Executive Dashboard"
                  >
                    <div className="nav-3d-tile nav-3d-tile-blue">
                      <Shield className="w-4 h-4 text-white stroke-[2.4]" />
                    </div>
                  </Link>

                  <Link
                    to="/admin/pos"
                    className="hidden lg:inline-flex nav-3d-btn group"
                    title="Open Optical POS Billing Counter"
                  >
                    <div className="nav-3d-tile nav-3d-tile-amber">
                      <ShoppingCart className="w-4 h-4 text-white stroke-[2.4]" />
                    </div>
                  </Link>
                </>
              )}

              {/* 5. User Account / Profile 3D Button */}
              {user ? (
                <div className="relative shrink-0">
                  <button 
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="nav-3d-btn group"
                    title="My Profile & Account"
                    aria-label="Account"
                  >
                    <div className="nav-3d-tile nav-3d-tile-purple overflow-hidden relative">
                      {user.avatar_url ? (
                        <img 
                          src={user.avatar_url} 
                          alt={user.full_name || 'Account'} 
                          className="w-full h-full object-cover rounded-[8px]" 
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.parentElement?.querySelector('.avatar-fallback-text');
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <span className={`avatar-fallback-text text-xs font-black text-white ${user.avatar_url ? 'hidden' : 'flex'} items-center justify-center w-full h-full`}>
                        {user.full_name?.charAt(0) || 'U'}
                      </span>
                    </div>
                  </button>

                  {/* Profile Dropdown */}
                  {userDropdownOpen && (
                    <div 
                      onMouseLeave={() => setUserDropdownOpen(false)}
                      className="nav-dropdown-solid absolute right-0 top-full mt-2 w-64 rounded-2xl shadow-2xl p-2 z-[100] transition-all text-slate-900 dark:text-white"
                    >
                      <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 mb-1.5">
                        <div className="font-black text-xs text-slate-900 dark:text-white truncate">{user.full_name}</div>
                        <div className="text-[11px] text-cyan-700 dark:text-brand-cyan font-mono truncate">{user.email || user.phone}</div>
                        {isAdmin && (
                          <span className="mt-1.5 inline-block px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase tracking-wider">
                            Admin Staff
                          </span>
                        )}
                      </div>

                      {isAdmin ? (
                        <div className="space-y-0.5">
                          <Link
                            to="/admin"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-white/10 hover:text-sky-600 dark:hover:text-brand-cyan transition-colors"
                          >
                            <Shield className="w-4 h-4 text-cyan-600 dark:text-brand-cyan shrink-0" />
                            <span>Executive Dashboard</span>
                          </Link>
                          <Link
                            to="/admin/pos"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/15 transition-colors"
                          >
                            <ShoppingCart className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span>POS Billing Counter</span>
                          </Link>
                          <Link
                            to="/admin/appointments"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/15 transition-colors"
                          >
                            <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>Manage Appointments</span>
                          </Link>
                          <Link
                            to="/account"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-white/10 hover:text-sky-600 dark:hover:text-brand-cyan transition-colors"
                          >
                            <User className="w-4 h-4 text-cyan-600 dark:text-brand-cyan shrink-0" />
                            <span>Customer Profile View</span>
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <Link
                            to="/account?tab=orders"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-white/10 hover:text-sky-600 dark:hover:text-brand-cyan transition-colors"
                          >
                            <ShoppingBag className="w-4 h-4 text-cyan-600 dark:text-brand-cyan shrink-0" />
                            <span>My Eyewear Orders</span>
                          </Link>
                          <Link
                            to="/account?tab=bookings"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-white/10 hover:text-sky-600 dark:hover:text-brand-cyan transition-colors"
                          >
                            <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>My Bookings (Doctor &amp; Home)</span>
                          </Link>
                          <Link
                            to="/account?tab=addresses"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-white/10 hover:text-sky-600 dark:hover:text-brand-cyan transition-colors"
                          >
                            <MapPin className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span>Saved Addresses</span>
                          </Link>
                          <Link
                            to="/account?tab=prescriptions"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-white/10 hover:text-sky-600 dark:hover:text-brand-cyan transition-colors"
                          >
                            <Eye className="w-4 h-4 text-teal-600 dark:text-brand-teal shrink-0" />
                            <span>Prescription Vault</span>
                          </Link>
                        </div>
                      )}

                      {/* DEDICATED SUPPORT & DIRECT CONTACT SECTION UNDER PROFILE BUTTON */}
                      <div className="border-t border-slate-100 dark:border-white/10 my-2 pt-2 space-y-1.5">
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-2 flex items-center gap-1">
                          <HelpCircle className="w-3 h-3 text-brand-cyan" />
                          <span>Customer Support &amp; Care</span>
                        </div>

                        {/* Direct WhatsApp Button */}
                        <a
                          href="https://wa.me/919382293614?text=Hi%20Netra%20Unnayan%20Team,%20I%20need%20assistance%20with%20an%20eyewear%20order%20or%20eye%20care."
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center justify-between p-2 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/15 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <MessageCircle className="w-4 h-4 fill-emerald-500 text-emerald-500" />
                            <span>Direct WhatsApp</span>
                          </div>
                          <span className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-mono">1-Tap</span>
                        </a>

                        {/* Direct Email Button */}
                        <a
                          href="mailto:netraunnayan@gmail.com?subject=Netra%20Unnayan%20Support%20Inquiry"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center justify-between p-2 rounded-xl text-xs font-bold text-cyan-700 dark:text-brand-cyan hover:bg-cyan-50 dark:hover:bg-cyan-500/15 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-cyan-600 dark:text-brand-cyan" />
                            <span>Direct Email</span>
                          </div>
                          <span className="text-[10px] bg-brand-cyan/15 text-brand-cyan px-1.5 py-0.5 rounded font-mono">Mail</span>
                        </a>

                        {/* Smart AI Chatbot & Helpdesk Widget Trigger */}
                        <button
                          type="button"
                          onClick={() => { setSupportChatOpen(true); setUserDropdownOpen(false); }}
                          className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-brand-cyan/15 hover:text-brand-cyan transition-colors text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Bot className="w-4 h-4 text-brand-cyan" />
                            <span>AI Chatbot &amp; Live Desk</span>
                          </div>
                          <span className="text-[10px] bg-brand-cyan text-slate-950 font-black px-1.5 py-0.5 rounded">Chat</span>
                        </button>
                      </div>

                      <div className="border-t border-slate-100 dark:border-white/10 my-1.5" />
                      <button
                        onClick={() => { logout(); setUserDropdownOpen(false); }}
                        className="w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/15 text-left transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 shrink-0" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link 
                  to="/login" 
                  className="nav-3d-btn group"
                  title="Sign In / Register"
                  aria-label="Sign In"
                >
                  <div className="nav-3d-tile nav-3d-tile-purple">
                    <User className="w-4 h-4 text-white stroke-[2.4]" />
                  </div>
                </Link>
              )}

              {/* 6. Mobile Hamburger Toggle 3D Button */}
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden nav-3d-btn group"
                aria-label="Toggle mobile menu"
                title="Menu"
              >
                <div className="nav-3d-tile nav-3d-tile-amber">
                  {mobileMenuOpen ? (
                    <X className="w-4 h-4 text-white stroke-[2.8]" />
                  ) : (
                    <Menu className="w-4 h-4 text-white stroke-[2.8]" />
                  )}
                </div>
              </button>

            </div>
          </div>
        </div>

        {/* Expandable Search Overlay with Live Product Auto-Suggestions */}
        {searchOpen && (
          <div className="border-t shadow-2xl transition-all bg-white dark:bg-[#071322] border-slate-200 dark:border-slate-800">
            <div className="max-w-4xl mx-auto px-4 py-4 space-y-3">
              
              {/* Search Form */}
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 sm:gap-3">
                <div className="relative flex-1 flex items-center">
                  <div className="absolute left-3.5 text-brand-cyan shrink-0 pointer-events-none">
                    {loadingSuggestions ? (
                      <Loader2 className="w-5 h-5 animate-spin text-brand-cyan" />
                    ) : (
                      <Search className="w-5 h-5 text-brand-cyan" />
                    )}
                  </div>
                  <input 
                    type="text"
                    placeholder="Search by frame model, Japanese titanium, blue cut lenses, brand, or SKU..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    className={`w-full pl-11 pr-10 py-2.5 rounded-2xl text-xs sm:text-sm focus:outline-none transition-all border ${
                      isDark 
                        ? 'bg-white/5 border-white/15 text-white placeholder-slate-400 focus:border-brand-cyan/60 focus:bg-white/10' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-500 focus:border-brand-cyan focus:bg-white shadow-inner'
                    }`}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => { setSearchQuery(''); setSuggestions([]); }}
                      className="absolute right-3 text-slate-400 hover:text-slate-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <button 
                  type="submit" 
                  className="btn-primary py-2.5 px-4 sm:px-6 text-xs font-bold uppercase rounded-xl shrink-0 shadow-cyan-glow flex items-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Search</span>
                </button>

                <button 
                  type="button" 
                  onClick={() => setSearchOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors border border-transparent hover:border-slate-300 dark:hover:border-white/10"
                  title="Close search"
                >
                  <X className="w-5 h-5" />
                </button>
              </form>

              {/* Dynamic Suggestions Box */}
              {searchQuery.trim().length > 0 ? (
                <div className="rounded-2xl border p-3 max-h-[65vh] sm:max-h-[460px] overflow-y-auto space-y-2.5 transition-all shadow-2xl bg-white dark:bg-[#0A192F] border-slate-200 dark:border-white/10">
                  
                  {/* Suggestions Header */}
                  <div className="flex items-center justify-between px-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>
                      {loadingSuggestions ? 'Searching catalog...' : `Matching Products (${totalSuggestions})`}
                    </span>
                    {suggestions.length > 0 && (
                      <span className="text-[10px] text-brand-cyan font-semibold lowercase hidden sm:inline">
                        click to view details
                      </span>
                    )}
                  </div>

                  {/* Suggestion List */}
                  {suggestions.length > 0 ? (
                    <div className="grid grid-cols-1 gap-1.5">
                      {suggestions.map((item) => {
                        const hasDiscount = item.discount_price && parseFloat(item.discount_price) < parseFloat(item.price);
                        const displayPrice = hasDiscount ? item.discount_price : item.price;
                        return (
                          <div
                            key={item.id}
                            onClick={() => handleSelectProduct(item.id)}
                            className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all border ${
                              isDark 
                                ? 'bg-white/5 hover:bg-brand-cyan/10 border-white/5 hover:border-brand-cyan/30' 
                                : 'bg-white hover:bg-sky-50/80 border-slate-200/80 hover:border-sky-300 shadow-sm'
                            }`}
                          >
                            {/* Left: Thumbnail & Info */}
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden shrink-0 border p-1 flex items-center justify-center ${
                                isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'
                              }`}>
                                <img 
                                  src={item.thumbnail_url || '/placeholder_frame.png'} 
                                  alt={item.name}
                                  className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                                  onError={(e) => { e.target.onerror = null; e.target.src = '/logo_symbol.png'; }}
                                />
                              </div>
                              <div className="min-w-0">
                                <h4 className={`text-xs sm:text-sm font-bold truncate group-hover:text-brand-cyan transition-colors ${
                                  isDark ? 'text-white' : 'text-slate-900'
                                }`}>
                                  {item.name}
                                </h4>
                                <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[10px] sm:text-[11px] text-slate-400">
                                  {item.brand_name && (
                                    <span className="font-semibold text-slate-300 dark:text-slate-300">
                                      {item.brand_name}
                                    </span>
                                  )}
                                  {item.category_name && (
                                    <>
                                      <span>&bull;</span>
                                      <span className="px-1.5 py-0.2 rounded bg-brand-cyan/10 text-brand-cyan font-medium">
                                        {item.category_name}
                                      </span>
                                    </>
                                  )}
                                  {item.sku && (
                                    <span className="hidden md:inline font-mono text-slate-500">
                                      ({item.sku})
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right: Price & Navigation */}
                            <div className="flex items-center gap-3 shrink-0 text-right pl-3">
                              <div>
                                <div className="text-xs sm:text-sm font-extrabold text-brand-cyan">
                                  ₹{parseFloat(displayPrice || 0).toLocaleString('en-IN')}
                                </div>
                                {hasDiscount && (
                                  <div className="text-[10px] text-slate-400 line-through">
                                    ₹{parseFloat(item.price || 0).toLocaleString('en-IN')}
                                  </div>
                                )}
                              </div>
                              <div className="w-7 h-7 rounded-lg bg-brand-cyan/10 text-brand-cyan flex items-center justify-center group-hover:bg-brand-cyan group-hover:text-slate-950 transition-all shrink-0">
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* View All in Catalog Link */}
                      <button
                        type="button"
                        onClick={handleSearchSubmit}
                        className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2 transition-all mt-1 ${
                          isDark 
                            ? 'bg-brand-cyan/15 hover:bg-brand-cyan/25 text-brand-cyan border border-brand-cyan/30' 
                            : 'bg-sky-100 hover:bg-sky-200 text-sky-800 border border-sky-300'
                        }`}
                      >
                        <span>View all {totalSuggestions} results in Full Catalog</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : !loadingSuggestions ? (
                    <div className="py-8 text-center space-y-2">
                      <p className="text-xs text-slate-400">
                        No optical frames found matching <span className="font-semibold text-white">"{searchQuery}"</span>.
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Try searching by shape (Aviator, Round, Geometric) or lens type (Blue Cut, Polarized).
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : (
                /* Empty query: show Popular Trending Tags */
                <div className="pt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                    <TrendingUp className="w-3 h-3 text-brand-cyan" /> Trending:
                  </span>
                  {trendingSearches.map((term, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => { setSearchQuery(term); }}
                      className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all border ${
                        isDark 
                          ? 'bg-white/5 border-white/10 text-slate-300 hover:text-brand-cyan hover:border-brand-cyan/40 hover:bg-brand-cyan/10' 
                          : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-sky-700 hover:border-sky-300 hover:bg-sky-50'
                      }`}
                    >
                      {term}
                    </button>
                  ))}
                </div>
              )}

            </div>
          </div>
        )}

        {/* Mobile Flyout Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t px-4 sm:px-5 py-4 sm:py-5 space-y-3.5 max-h-[85vh] overflow-y-auto shadow-2xl transition-all bg-white dark:bg-[#060D17] border-slate-200 dark:border-white/10">
            
            {/* Quick Actions Bar in Mobile Drawer */}
            <div className="grid grid-cols-2 gap-2 pb-1">
              {/* Theme Toggle Button */}
              <button
                type="button"
                onClick={toggleTheme}
                className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                  isDark
                    ? 'bg-white/5 border-white/10 text-amber-300 hover:bg-white/10'
                    : 'bg-slate-50 border-slate-200 text-sky-700 hover:bg-sky-50'
                }`}
              >
                {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-sky-600" />}
                <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
              </button>

              {/* Wishlist Link */}
              <Link
                to={user ? "/wishlist" : "/login?redirect=/wishlist"}
                onClick={() => setMobileMenuOpen(false)}
                className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                  wishlistCount > 0
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                    : isDark
                    ? 'bg-white/5 border-white/10 text-slate-300'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <Heart className={`w-4 h-4 ${wishlistCount > 0 ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
                <span>Wishlist {wishlistCount > 0 ? `(${wishlistCount})` : ''}</span>
              </Link>
            </div>

            {/* ONLY WHEN ADMIN LOGIN: POS Billing banner in mobile drawer */}
            {user && isAdmin && (
              <Link
                to="/admin/pos"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-500 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/25"
              >
                <div className="flex items-center gap-2.5">
                  <ShoppingCart className="w-5 h-5" />
                  <span>Open POS Billing Counter</span>
                </div>
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}

            <div className="text-[11px] font-bold uppercase tracking-widest text-brand-cyan">
              Store Navigation
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              <Link 
                to="/catalog"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl bg-brand-cyan/10 text-brand-cyan font-bold text-sm"
              >
                <Glasses className="w-4 h-4" />
                <span>Explore All Eyewear</span>
              </Link>

              {categories.slice(1).map((cat, i) => (
                <Link
                  key={i}
                  to={`/catalog?category=${cat.slug}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 p-3 rounded-xl text-sm font-medium transition-colors ${
                    isDark ? 'text-slate-200 hover:bg-white/5' : 'text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <cat.icon className="w-4 h-4 text-brand-teal" />
                  <span>{cat.name}</span>
                </Link>
              ))}

              <div className="border-t border-slate-200 dark:border-white/10 my-2" />

              <Link 
                to="/doctors"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl text-sm font-bold text-emerald-600 dark:text-emerald-400"
              >
                <Stethoscope className="w-4 h-4" />
                <span>Consult Eye Doctor in Digha</span>
              </Link>

              <Link 
                to="/home-eye-checkup"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl text-sm font-bold text-brand-cyan"
              >
                <HomeIcon className="w-4 h-4" />
                <span>Book Free Home Eye Test</span>
              </Link>

              <Link 
                to="/track-order"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl text-sm font-bold text-amber-500"
              >
                <Activity className="w-4 h-4" />
                <span>Live Order Tracking</span>
              </Link>

              <Link 
                to="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 p-3 rounded-xl text-sm ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                <Phone className="w-4 h-4 text-brand-teal" />
                <span>Store Address &amp; Map</span>
              </Link>
            </div>

            {/* Mobile Auth Section */}
            <div className="pt-2 border-t border-slate-200 dark:border-white/10">
              {user ? (
                <div className="space-y-2">
                  <div className="text-xs text-slate-500 dark:text-slate-400 px-1">
                    Signed in as <strong className="text-slate-900 dark:text-white">{user.full_name}</strong>
                  </div>
                  {isAdmin ? (
                    <Link
                      to="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full btn-primary py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-cyan-glow"
                    >
                      <Shield className="w-4 h-4" />
                      <span>Admin Control Panel</span>
                    </Link>
                  ) : (
                    <Link
                      to="/account"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full btn-secondary py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2"
                    >
                      <User className="w-4 h-4" />
                      <span>My Account &amp; Prescriptions</span>
                    </Link>
                  )}
                  <button
                    onClick={() => { logout(); setMobileMenuOpen(false); }}
                    className="w-full p-2 text-xs text-rose-500 font-bold hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full btn-primary py-3 text-sm font-bold rounded-xl flex items-center justify-center gap-2 shadow-cyan-glow"
                >
                  <User className="w-4 h-4" />
                  <span>Customer &amp; Staff Login</span>
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Mobile Sticky Floating Dock - Ultra-Modern iPhone Frosted Glassmorphic Design */}
      <div className="md:hidden fixed bottom-3 inset-x-3 z-40 max-w-md mx-auto pointer-events-none">
        <nav className={`pointer-events-auto rounded-[26px] py-2 px-2 flex items-center justify-around transition-all duration-300 mobile-glass-dock ${
          isDark ? 'mobile-glass-dock-dark' : 'mobile-glass-dock-light'
        }`}>
          {[
            {
              id: 'home',
              label: 'Home',
              path: '/',
              icon: HomeIcon,
              isActive: location.pathname === '/'
            },
            {
              id: 'frames',
              label: 'Frames',
              path: '/catalog',
              icon: Glasses,
              isActive: location.pathname.startsWith('/catalog') || location.pathname.startsWith('/shop')
            },
            ...(user && isAdmin ? [
              {
                id: 'pos',
                label: 'POS Bill',
                path: '/admin/pos',
                icon: ShoppingCart,
                isActive: location.pathname === '/admin/pos',
                accent: 'amber'
              }
            ] : [
              {
                id: 'wishlist',
                label: 'Wishlist',
                path: user ? '/wishlist' : '/login?redirect=/wishlist',
                icon: Heart,
                isActive: location.pathname === '/wishlist',
                badge: wishlistCount,
                accent: 'rose'
              }
            ]),
            {
              id: 'cart',
              label: 'Cart',
              path: user ? '/cart' : '/login?redirect=/cart',
              icon: ShoppingBag,
              isActive: location.pathname === '/cart',
              badge: itemCount,
              accent: 'cyan'
            },
            {
              id: 'account',
              label: user ? (isAdmin ? 'Admin' : 'Account') : 'Login',
              path: user ? (isAdmin ? '/admin' : '/account') : '/login',
              icon: isAdmin ? Shield : User,
              isActive: location.pathname.startsWith('/account') || location.pathname.startsWith('/admin') || location.pathname === '/login',
              avatar: user?.avatar_url,
              accent: 'cyan'
            }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`relative flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-2xl text-[10px] font-black transition-all duration-200 select-none ${
                  item.isActive
                    ? item.accent === 'rose'
                      ? 'text-rose-400'
                      : item.accent === 'amber'
                      ? 'text-amber-300'
                      : 'text-brand-cyan'
                    : isDark
                    ? 'text-slate-300 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.isActive && (
                  <motion.div
                    layoutId="dock-liquid-drop"
                    className={`absolute inset-0 rounded-[20px] pointer-events-none -z-10 ${
                      item.accent === 'rose'
                        ? 'bg-rose-500/20 border border-rose-500/40 shadow-[0_0_16px_rgba(244,63,94,0.40)]'
                        : item.accent === 'amber'
                        ? 'bg-amber-500/20 border border-amber-500/40 shadow-[0_0_16px_rgba(245,158,11,0.45)]'
                        : 'bg-brand-cyan/20 border border-brand-cyan/40 shadow-[0_0_16px_rgba(0,180,216,0.45)]'
                    }`}
                    transition={{
                      type: 'spring',
                      stiffness: 420,
                      damping: 28,
                      mass: 0.7
                    }}
                  >
                    {/* Liquid Caustic Drop Top Specular */}
                    <div className="absolute top-1 left-2 right-2 h-[2px] rounded-full bg-white/45 blur-[0.5px]" />
                  </motion.div>
                )}

                <div className="relative flex items-center justify-center">
                  {item.avatar ? (
                    <img
                      src={item.avatar}
                      alt={user?.full_name || 'Avatar'}
                      className="w-5 h-5 rounded-full object-cover border border-cyan-400/60 shadow-xs"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.parentElement?.querySelector('.dock-fallback-icon');
                        if (fallback) fallback.style.display = 'inline-block';
                      }}
                    />
                  ) : null}
                  <span className={`dock-fallback-icon ${item.avatar ? 'hidden' : 'inline-block'}`}>
                    <Icon className={`w-5 h-5 ${item.id === 'wishlist' && item.badge > 0 ? 'fill-rose-500 text-rose-500' : ''}`} />
                  </span>
                  {item.badge > 0 && (
                    <span className={`absolute -top-1 -right-2 w-3.5 h-3.5 rounded-full text-white text-[8.5px] font-black flex items-center justify-center shadow-xs ${
                      item.accent === 'rose' ? 'bg-rose-500' : 'bg-brand-cyan text-slate-950'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </div>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Floating Support Chat Launch Button (Desktop & Tablet) */}
      {!supportChatOpen && (
        <button
          type="button"
          onClick={() => setSupportChatOpen(true)}
          className="fixed bottom-20 sm:bottom-6 right-5 z-40 p-3 sm:px-4 sm:py-3 rounded-2xl bg-gradient-to-r from-brand-cyan to-teal-400 text-slate-950 font-black shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 group cursor-pointer shadow-cyan-500/25"
          title="Open Netra Live Optical Support & Chatbot"
        >
          <div className="relative">
            <MessageSquare className="w-5 h-5 fill-slate-950 stroke-none" />
            <span className="w-2 h-2 rounded-full bg-emerald-700 absolute -top-0.5 -right-0.5 ring-2 ring-white animate-pulse" />
          </div>
          <span className="hidden sm:inline text-xs">Help &amp; Live Chat</span>
        </button>
      )}

      {/* Support Chat Widget Component */}
      {supportChatOpen && (
        <SupportChatWidget
          isOpen={supportChatOpen}
          onClose={() => setSupportChatOpen(false)}
        />
      )}
    </>
  );
};
