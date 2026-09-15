import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  ShoppingBag, User, Search, Phone, MessageCircle, 
  Menu, X, Calendar, Home as HomeIcon, Eye, ShieldCheck,
  ChevronDown, Sun, Moon, Sparkles, MapPin, Clock, Truck,
  Glasses, Stethoscope, Compass, ArrowRight, Activity, Heart,
  ShoppingCart, Shield, LogOut, TrendingUp, ArrowUpRight, Loader2, Tag
} from 'lucide-react';
import api from '../../api/client';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useWishlist } from '../../context/WishlistContext';

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
      {/* Main Glass Header Bar */}
      <header className={`sticky top-0 z-40 transition-all duration-300 ${
        isDark 
          ? 'bg-[#060D17]/95 backdrop-blur-xl border-b border-white/10' 
          : 'bg-white/95 backdrop-blur-xl border-b border-slate-200/90 shadow-sm'
      } ${scrolled ? 'shadow-md py-1' : 'py-2'}`}>
        <div className="w-full max-w-[1520px] mx-auto px-4 sm:px-8">
          <div className="flex items-center justify-between h-16 md:h-18 gap-4">
            
            {/* 1. Left: Brand Identity Logo */}
            <Link to="/" className="flex items-center gap-2 group shrink-0 focus:outline-none py-1">
              <img 
                src={currentLogo}
                alt="Netra Unnayan — Clarity You Can Trust" 
                className="h-9 sm:h-11 md:h-12 w-auto object-contain transition-transform duration-300 group-hover:scale-102"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/logo_symbol.png';
                }}
              />
            </Link>

            {/* 2. Middle: Desktop Navigation Links (Sophisticated luxury typographic nav) */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
              
              {/* Eyewear Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  onMouseEnter={() => setDropdownOpen(true)}
                  className={`h-9 px-3 rounded-xl text-xs xl:text-sm font-bold tracking-wide transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                    location.pathname.startsWith('/catalog')
                      ? 'text-brand-cyan bg-brand-cyan/10'
                      : isDark
                      ? 'text-slate-200 hover:text-brand-cyan hover:bg-white/5'
                      : 'text-slate-700 hover:text-brand-cyan hover:bg-sky-50'
                  }`}
                >
                  <Glasses className="w-4 h-4 text-brand-cyan shrink-0" />
                  <span>Eyewear Catalog</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div 
                    onMouseLeave={() => setDropdownOpen(false)}
                    className={`absolute top-full left-0 mt-2 w-72 rounded-2xl shadow-2xl border p-2 z-50 transition-all ${
                      isDark 
                        ? 'bg-[#0A192F]/98 backdrop-blur-2xl border-white/15 text-white' 
                        : 'bg-white/98 backdrop-blur-2xl border-slate-200 text-slate-900 shadow-xl'
                    }`}
                  >
                    <div className={`px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-brand-cyan border-b ${isDark ? 'border-white/10' : 'border-slate-200'} mb-1`}>
                      Frame Collections
                    </div>
                    {categories.map((cat, i) => (
                      <Link
                        key={i}
                        to={cat.slug ? `/catalog?category=${cat.slug}` : '/catalog'}
                        onClick={() => setDropdownOpen(false)}
                        className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${
                          isDark 
                            ? 'hover:bg-white/10 text-slate-200 hover:text-brand-cyan' 
                            : 'hover:bg-sky-50 text-slate-800 hover:text-sky-700'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-brand-cyan/10 text-brand-cyan flex items-center justify-center shrink-0">
                          <cat.icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold">{cat.name}</div>
                          <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'} font-normal`}>{cat.desc}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Eye Doctors */}
              <Link 
                to="/doctors" 
                className={`h-9 px-3 rounded-xl text-xs xl:text-sm font-bold tracking-wide transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  location.pathname === '/doctors'
                    ? 'text-brand-cyan bg-brand-cyan/10'
                    : isDark
                    ? 'text-slate-200 hover:text-brand-cyan hover:bg-white/5'
                    : 'text-slate-700 hover:text-brand-cyan hover:bg-sky-50'
                }`}
              >
                <Stethoscope className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Eye Doctors</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </Link>

              {/* Home Eye Checkup */}
              <Link 
                to="/home-eye-checkup" 
                className={`h-9 px-3 rounded-xl text-xs xl:text-sm font-bold tracking-wide transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  location.pathname === '/home-eye-checkup'
                    ? 'text-brand-cyan bg-brand-cyan/10'
                    : isDark
                    ? 'text-slate-200 hover:text-brand-cyan hover:bg-white/5'
                    : 'text-slate-700 hover:text-brand-cyan hover:bg-sky-50'
                }`}
              >
                <HomeIcon className="w-4 h-4 text-brand-teal shrink-0" />
                <span>Home Eye Test</span>
              </Link>

              {/* Live Track */}
              <Link 
                to="/track-order" 
                className={`h-9 px-3 rounded-xl text-xs xl:text-sm font-bold tracking-wide transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  location.pathname === '/track-order'
                    ? 'text-brand-cyan bg-brand-cyan/10'
                    : isDark
                    ? 'text-slate-200 hover:text-brand-cyan hover:bg-white/5'
                    : 'text-slate-700 hover:text-brand-cyan hover:bg-sky-50'
                }`}
              >
                <Activity className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Live Track</span>
              </Link>
            </nav>

            {/* 3. Right: Action Buttons (Search, Theme Toggle, Wishlist, Cart, STRICTLY ADMIN POS, Profile) */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 pr-1 sm:pr-2">
              
              {/* Search Toggle Icon */}
              <button 
                onClick={() => setSearchOpen(!searchOpen)}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all border shrink-0 ${
                  isDark 
                    ? 'text-slate-200 border-white/10 bg-white/5 hover:bg-white/10 hover:text-brand-cyan' 
                    : 'text-slate-700 border-slate-200 bg-white hover:bg-slate-50 hover:text-brand-cyan shadow-sm'
                }`}
                title="Search frames &amp; styles"
                aria-label="Search"
              >
                <Search className="w-4 h-4 text-brand-cyan" />
              </button>

              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all border shrink-0 ${
                  isDark
                    ? 'text-amber-400 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                    : 'text-sky-600 border-sky-300 bg-sky-50 hover:bg-sky-100 shadow-[0_0_12px_rgba(2,132,199,0.15)]'
                }`}
                title={isDark ? 'Switch to Crisp Optical Light Theme' : 'Switch to Midnight Dark Theme'}
                aria-label="Toggle Theme"
              >
                {isDark ? (
                  <Sun className="w-4 h-4 transform transition-transform hover:rotate-90 duration-300" />
                ) : (
                  <Moon className="w-4 h-4 transform transition-transform hover:-rotate-45 duration-300" />
                )}
              </button>

              {/* Wishlist Button (Protected: Strictly requires login) */}
              <Link 
                to={user ? "/wishlist" : "/login?redirect=/wishlist"}
                className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-all border shrink-0 ${
                  wishlistCount > 0
                    ? 'bg-rose-500/15 border-rose-500/40 text-rose-500'
                    : isDark
                    ? 'text-slate-200 border-white/10 bg-white/5 hover:bg-white/10 hover:text-rose-400'
                    : 'text-slate-700 border-slate-200 bg-white hover:bg-slate-50 hover:text-rose-600 shadow-sm'
                }`}
                title="View Wishlist"
                aria-label="Wishlist"
              >
                <Heart className={`w-4 h-4 ${wishlistCount > 0 ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center shadow-sm">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              {/* Shopping Cart Button (Protected: Strictly requires login) */}
              <Link 
                to={user ? "/cart" : "/login?redirect=/cart"}
                className={`h-9 px-2.5 sm:px-3 rounded-full flex items-center gap-1.5 transition-all border shrink-0 ${
                  itemCount > 0
                    ? 'bg-brand-cyan/15 border-brand-cyan/40 text-brand-cyan shadow-cyan-glow'
                    : isDark
                    ? 'text-slate-200 border-white/10 bg-white/5 hover:bg-white/10'
                    : 'text-slate-700 border-slate-200 bg-white hover:bg-slate-50 shadow-sm'
                }`}
                title="View Cart"
              >
                <ShoppingBag className="w-4 h-4 text-brand-cyan" />
                <span className="text-xs font-bold">
                  {itemCount > 0 ? `₹${parseFloat(cartTotal || 0).toLocaleString('en-IN')}` : 'Cart'}
                </span>
                {itemCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-brand-cyan text-slate-950 text-[10px] font-black flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Link>

              {/* STRICTLY ONLY WHEN ADMIN IS LOGGED IN: POS BILLING SECTION BUTTON */}
              {user && isAdmin && (
                <Link
                  to="/admin/pos"
                  className="hidden xl:inline-flex h-9 px-3 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black uppercase tracking-wider shadow-md shadow-amber-500/20 items-center gap-1.5 whitespace-nowrap shrink-0 transition-transform hover:-translate-y-0.5"
                  title="Open Optical POS Billing Counter"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>POS Counter</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                </Link>
              )}

              {/* User Account / Profile Button (With generous right padding, never touches edge) */}
              {user ? (
                <div className="relative shrink-0">
                  <button 
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className={`h-9 px-2.5 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                      isAdmin 
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-500 dark:text-amber-300'
                        : isDark
                        ? 'bg-white/5 border-white/15 text-slate-200 hover:bg-white/10'
                        : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50 shadow-sm'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center font-extrabold text-[11px] shrink-0 ${
                      isAdmin ? 'bg-amber-500 text-slate-950' : 'bg-brand-cyan/20 text-brand-cyan'
                    }`}>
                      {user.full_name?.charAt(0) || 'U'}
                    </div>
                    <span className="hidden md:inline font-bold max-w-[80px] truncate">
                      {user.full_name?.split(' ')[0] || 'Account'}
                    </span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {/* Profile Dropdown */}
                  {userDropdownOpen && (
                    <div 
                      onMouseLeave={() => setUserDropdownOpen(false)}
                      className={`absolute right-0 top-full mt-2 w-56 rounded-2xl shadow-2xl border p-2 z-50 transition-all ${
                        isDark 
                          ? 'bg-[#0A192F]/98 backdrop-blur-2xl border-white/15 text-white shadow-2xl' 
                          : 'bg-white/98 backdrop-blur-2xl border-slate-200 text-slate-900 shadow-2xl'
                      }`}
                    >
                      <div className="p-2.5 border-b border-slate-200 dark:border-white/10 mb-1">
                        <div className="font-extrabold text-xs text-slate-900 dark:text-white truncate">{user.full_name}</div>
                        <div className="text-[10px] text-brand-cyan font-mono truncate">{user.email || user.phone}</div>
                        {isAdmin && (
                          <span className="mt-1 inline-block px-2 py-0.5 rounded bg-amber-500/20 text-amber-500 dark:text-amber-400 text-[9px] font-extrabold uppercase">
                            Admin Staff
                          </span>
                        )}
                      </div>

                      {isAdmin ? (
                        <>
                          <Link
                            to="/admin"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-white/10 hover:text-brand-cyan"
                          >
                            <Shield className="w-4 h-4 text-brand-cyan" />
                            <span>Executive Dashboard</span>
                          </Link>
                          <Link
                            to="/admin/pos"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-white/10"
                          >
                            <ShoppingCart className="w-4 h-4 text-amber-500" />
                            <span>POS Billing Counter</span>
                          </Link>
                          <Link
                            to="/admin/appointments"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-white/10"
                          >
                            <Calendar className="w-4 h-4 text-emerald-500" />
                            <span>Manage Appointments</span>
                          </Link>
                          <Link
                            to="/account"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-white/10 hover:text-brand-cyan"
                          >
                            <User className="w-4 h-4 text-brand-cyan" />
                            <span>Customer Profile View</span>
                          </Link>
                        </>
                      ) : (
                        <>
                          <Link
                            to="/account?tab=orders"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-white/10 hover:text-brand-cyan"
                          >
                            <ShoppingBag className="w-4 h-4 text-brand-cyan" />
                            <span>My Eyewear Orders</span>
                          </Link>
                          <Link
                            to="/account?tab=bookings"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-white/10 hover:text-brand-cyan"
                          >
                            <Calendar className="w-4 h-4 text-emerald-400" />
                            <span>My Bookings (Doctor &amp; Home)</span>
                          </Link>
                          <Link
                            to="/account?tab=addresses"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-white/10 hover:text-brand-cyan"
                          >
                            <MapPin className="w-4 h-4 text-amber-400" />
                            <span>Saved Addresses</span>
                          </Link>
                          <Link
                            to="/account?tab=prescriptions"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-white/10 hover:text-brand-cyan"
                          >
                            <Eye className="w-4 h-4 text-brand-teal" />
                            <span>Prescription Vault</span>
                          </Link>
                        </>
                      )}

                      <div className="border-t border-slate-200 dark:border-white/10 my-1" />
                      <button
                        onClick={() => { logout(); setUserDropdownOpen(false); }}
                        className="w-full flex items-center gap-2.5 p-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link 
                  to="/login" 
                  className="h-9 px-3.5 rounded-xl text-xs font-bold bg-brand-cyan text-slate-950 hover:bg-brand-teal transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-sm"
                  title="Sign In"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </Link>
              )}

              {/* Mobile Hamburger Toggle */}
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`lg:hidden w-9 h-9 rounded-xl border flex items-center justify-center transition-colors shrink-0 ${
                  isDark ? 'border-white/10 text-slate-200 hover:bg-white/5' : 'border-slate-200 text-slate-700 bg-white'
                }`}
                aria-label="Open mobile menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

            </div>
          </div>
        </div>

        {/* Expandable Search Overlay with Live Product Auto-Suggestions */}
        {searchOpen && (
          <div className={`border-t shadow-2xl transition-all ${
            isDark ? 'bg-[#0A192F]/98 backdrop-blur-2xl border-white/10' : 'bg-white/98 backdrop-blur-2xl border-slate-200'
          }`}>
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
                <div className={`rounded-2xl border p-3 max-h-[65vh] sm:max-h-[460px] overflow-y-auto space-y-2.5 transition-all shadow-xl ${
                  isDark ? 'bg-[#060D17]/90 border-white/10' : 'bg-slate-50/90 border-slate-200'
                }`}>
                  
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
          <div className={`lg:hidden border-t px-5 py-5 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl transition-all ${
            isDark ? 'bg-[#060D17]/98 backdrop-blur-2xl border-white/10' : 'bg-white/98 backdrop-blur-2xl border-slate-200'
          }`}>
            
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

      {/* Mobile Sticky Bottom Bar */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-40 border-t flex items-center justify-around py-2 px-1 transition-all ${
        isDark ? 'bg-[#060D17]/95 backdrop-blur-2xl border-white/10' : 'bg-white/95 backdrop-blur-2xl border-slate-200 shadow-lg'
      }`}>
        <Link 
          to="/" 
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
            location.pathname === '/' ? 'text-brand-cyan' : isDark ? 'text-slate-400' : 'text-slate-600'
          }`}
        >
          <HomeIcon className="w-5 h-5" />
          <span>Home</span>
        </Link>

        <Link 
          to="/catalog" 
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
            location.pathname.startsWith('/catalog') ? 'text-brand-cyan' : isDark ? 'text-slate-400' : 'text-slate-600'
          }`}
        >
          <Glasses className="w-5 h-5" />
          <span>Frames</span>
        </Link>

        {/* ONLY IF ADMIN: show POS counter icon in bottom navigation! */}
        {user && isAdmin ? (
          <Link 
            to="/admin/pos" 
            className={`flex flex-col items-center gap-1 text-[10px] font-black ${
              location.pathname === '/admin/pos' ? 'text-amber-400' : 'text-amber-500'
            }`}
          >
            <ShoppingCart className="w-5 h-5" />
            <span>POS Bill</span>
          </Link>
        ) : (
          <Link 
            to={user ? "/wishlist" : "/login?redirect=/wishlist"} 
            className={`relative flex flex-col items-center gap-1 text-[10px] font-bold ${
              location.pathname === '/wishlist' ? 'text-brand-cyan' : isDark ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            <div className="relative">
              <Heart className={`w-5 h-5 ${wishlistCount > 0 ? 'fill-rose-500 text-rose-500' : ''}`} />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-2 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                  {wishlistCount}
                </span>
              )}
            </div>
            <span>Wishlist</span>
          </Link>
        )}

        <Link 
          to={user ? "/cart" : "/login?redirect=/cart"} 
          className={`relative flex flex-col items-center gap-1 text-[10px] font-bold ${
            location.pathname === '/cart' ? 'text-brand-cyan' : isDark ? 'text-slate-400' : 'text-slate-600'
          }`}
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-2 w-3.5 h-3.5 rounded-full bg-brand-cyan text-slate-950 text-[9px] font-black flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </div>
          <span>Cart</span>
        </Link>

        <Link 
          to={user ? (isAdmin ? '/admin' : '/account') : '/login'} 
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${
            location.pathname.startsWith('/account') || location.pathname.startsWith('/admin') || location.pathname === '/login' 
              ? 'text-brand-cyan' 
              : isDark ? 'text-slate-400' : 'text-slate-600'
          }`}
        >
          <User className="w-5 h-5" />
          <span>{user ? (isAdmin ? 'Admin' : 'Account') : 'Login'}</span>
        </Link>
      </nav>
    </>
  );
};
