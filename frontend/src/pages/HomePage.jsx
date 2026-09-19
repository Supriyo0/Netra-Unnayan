import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, Shield, ArrowRight, Eye, Calendar, Award, 
  MapPin, CheckCircle2, ChevronRight, Star, Glasses,
  Truck, RotateCcw, ChevronLeft, ShoppingBag, Heart,
  Activity, Compass, Stethoscope, Camera, Home as HomeIcon,
  Tag, Copy, Check, Clock
} from 'lucide-react';
import api from '../api/client';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useTheme } from '../context/ThemeContext';

export const HomePage = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [heroBanners, setHeroBanners] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [active3DCardIdx, setActive3DCardIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [couponCopied, setCouponCopied] = useState(false);
  const [activeCoupon, setActiveCoupon] = useState(null);
  const [storeSettings, setStoreSettings] = useState({
    home_visit_enabled: '1',
    doctor_appointments_enabled: '1',
    offers_slider_enabled: '1'
  });

  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { isDark, content, seasonalTheme } = useTheme();

  const handleCopyCoupon = (code) => {
    if (!code) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCouponCopied(true);
      setTimeout(() => setCouponCopied(false), 2200);
    }
  };

  const defaultBanners = [
    {
      id: 1,
      title: 'CLARITY YOU CAN TRUST: JAPAN TITANIUM FRAMES',
      subtitle: 'Engineered from surgical-grade Beta Titanium. Featherlight 8-gram weight, zero temple pressure, German optical edging.',
      tag: 'LUXURY DROP 2026',
      button_text: 'SHOP TITANIUM COLLECTION',
      button_url: '/catalog?category=eyeglasses',
      image: 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=1200&auto=format&fit=crop&q=80',
      featured_products: [
        {
          id: 1,
          name: 'Netra Sovereign Aviator',
          sku: 'NU-TITAN-001',
          price: 1499,
          mrp: 2499,
          category: 'TITANIUM',
          image_url: 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=600&auto=format&fit=crop&q=80'
        },
        {
          id: 2,
          name: 'AirFlex TR90 Ergonomic',
          sku: 'NU-TR90-002',
          price: 1299,
          mrp: 1999,
          category: 'ULTRALIGHT',
          image_url: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=600&auto=format&fit=crop&q=80'
        },
        {
          id: 3,
          name: 'BluGuard Hexa Shield',
          sku: 'NU-BLU-003',
          price: 1799,
          mrp: 2799,
          category: 'BLUE-CUT',
          image_url: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&auto=format&fit=crop&q=80'
        }
      ]
    },
    {
      id: 2,
      title: 'BLUZERO™ COMPUTER FATIGUE LENSES',
      subtitle: 'Block 98% harmful 420nm digital blue light. Eliminate eye strain, headaches, and dry eyes during extended screen work.',
      tag: 'DIGITAL WELLNESS',
      button_text: 'EXPLORE BLUE-CUT',
      button_url: '/catalog?category=computer-glasses',
      image: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=1200&auto=format&fit=crop&q=80',
      featured_products: [
        {
          id: 3,
          name: 'BluGuard Hexa Shield',
          sku: 'NU-BLU-003',
          price: 1799,
          mrp: 2799,
          category: 'BLUE-CUT',
          image_url: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&auto=format&fit=crop&q=80'
        },
        {
          id: 1,
          name: 'Netra Sovereign Aviator',
          sku: 'NU-TITAN-001',
          price: 1499,
          mrp: 2499,
          category: 'TITANIUM',
          image_url: 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=600&auto=format&fit=crop&q=80'
        },
        {
          id: 2,
          name: 'AirFlex TR90 Ergonomic',
          sku: 'NU-TR90-002',
          price: 1299,
          mrp: 1999,
          category: 'ULTRALIGHT',
          image_url: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=600&auto=format&fit=crop&q=80'
        }
      ]
    },
    {
      id: 3,
      title: 'EXPERT EYE DOCTOR APPOINTMENTS IN DIGHA',
      subtitle: 'Consult senior visiting ophthalmologists and surgical specialists at our Jatimati Bypass clinical facility. Zero waiting time.',
      tag: 'CLINICAL EYE CARE',
      button_text: 'BOOK APPOINTMENT',
      button_url: '/doctors',
      image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=1200&auto=format&fit=crop&q=80',
      featured_products: [
        {
          id: 4,
          name: 'Clinic Consultation Slot',
          sku: 'DOC-SLOT-001',
          price: 500,
          mrp: 800,
          category: 'CLINICAL',
          image_url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=600&auto=format&fit=crop&q=80'
        },
        {
          id: 1,
          name: 'Netra Sovereign Aviator',
          sku: 'NU-TITAN-001',
          price: 1499,
          mrp: 2499,
          category: 'TITANIUM',
          image_url: 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=600&auto=format&fit=crop&q=80'
        },
        {
          id: 3,
          name: 'BluGuard Hexa Shield',
          sku: 'NU-BLU-003',
          price: 1799,
          mrp: 2799,
          category: 'BLUE-CUT',
          image_url: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&auto=format&fit=crop&q=80'
        }
      ]
    }
  ];

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        const [bannerRes, prodRes, catRes, docRes, settingsRes, couponsRes] = await Promise.all([
          api.get('/banners.php'),
          api.get('/products?category=best-sellers-signature-drops&limit=8').then(res => {
            if (res.success && res.data?.products?.length > 0) return res;
            return api.get('/products?featured=1&limit=8');
          }),
          api.get('/categories'),
          api.get('/doctors'),
          api.get('/settings.php').catch(() => ({ success: false })),
          api.get('/coupons.php').catch(() => ({ success: false }))
        ]);
        if (bannerRes.success && bannerRes.data && bannerRes.data.length > 0) {
          setHeroBanners(bannerRes.data);
        } else {
          setHeroBanners(defaultBanners);
        }
        if (prodRes.success) setFeaturedProducts(prodRes.data?.products || []);
        if (catRes.success) setCategories(catRes.data || []);
        if (docRes.success) setDoctors(docRes.data || []);
        if (settingsRes?.success && settingsRes.data) setStoreSettings(settingsRes.data);
        if (couponsRes?.success && Array.isArray(couponsRes.data) && couponsRes.data.length > 0) {
          setActiveCoupon(couponsRes.data[0]);
        } else {
          setActiveCoupon(null);
        }
      } catch (err) {
        console.error('Failed to load homepage data:', err);
        setHeroBanners(defaultBanners);
      } finally {
        setLoading(false);
      }
    };
    loadHomeData();
  }, []);

  const activeBanners = heroBanners.length > 0 ? heroBanners : defaultBanners;

  // Auto Slider Effect for Hero Banners
  useEffect(() => {
    if (isPaused || activeBanners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % activeBanners.length);
      setActive3DCardIdx(0);
    }, 4800);
    return () => clearInterval(interval);
  }, [isPaused, activeBanners.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % activeBanners.length);
    setActive3DCardIdx(0);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + activeBanners.length) % activeBanners.length);
    setActive3DCardIdx(0);
  };

  const slide = activeBanners[currentSlide] || activeBanners[0] || defaultBanners[0];
  const slideProducts = (slide.featured_products && slide.featured_products.length > 0) 
    ? slide.featured_products 
    : (defaultBanners[0].featured_products || []);

  const defaultTrustFeatures = [
    { icon: 'Shield', title: 'JAPAN TITANIUM', desc: '100% Certified Japanese Beta-Titanium' },
    { icon: 'Eye', title: 'GERMAN OPTICS', desc: 'Digital Blue & UV400 Anti-Glare Cut' },
    { icon: 'RotateCcw', title: '14-DAY REPLACEMENT', desc: 'Zero-Risk Optical Frame Exchange' },
    { icon: 'Truck', title: 'SECURE CHECKOUT', desc: 'Instant UPI QR & Verified COD Orders' }
  ];

  let activeTrustFeatures = defaultTrustFeatures;
  if (storeSettings?.trust_features) {
    try {
      const parsed = typeof storeSettings.trust_features === 'string'
        ? JSON.parse(storeSettings.trust_features)
        : storeSettings.trust_features;
      if (Array.isArray(parsed) && parsed.length > 0) {
        activeTrustFeatures = parsed;
      }
    } catch (e) {
      // fallback
    }
  }

  const renderTrustIcon = (iconName, idx) => {
    switch (iconName || idx) {
      case 'Shield':
      case 0:
        return <Shield className="w-5 h-5 sm:w-6 sm:h-6" />;
      case 'Eye':
      case 1:
        return <Eye className="w-5 h-5 sm:w-6 sm:h-6 text-brand-teal" />;
      case 'RotateCcw':
      case 2:
        return <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />;
      case 'Truck':
      case 3:
      default:
        return <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />;
    }
  };

  const getRoundelIcon = (iconName) => {
    switch ((iconName || '').toLowerCase()) {
      case 'glasses':
        return Glasses;
      case 'compass':
        return Compass;
      case 'eye':
        return Eye;
      case 'stethoscope':
        return Stethoscope;
      case 'home':
      case 'homeicon':
        return HomeIcon;
      case 'shield':
        return Shield;
      case 'sparkles':
        return Sparkles;
      case 'star':
        return Star;
      case 'award':
        return Award;
      case 'tag':
        return Tag;
      case 'camera':
        return Camera;
      case 'heart':
        return Heart;
      case 'truck':
        return Truck;
      case 'rotateccw':
        return RotateCcw;
      default:
        return Glasses;
    }
  };

  const defaultRoundelCategories = [
    { id: 'cat_1', name: 'Japanese Titanium', slug: 'eyeglasses', isLink: '/catalog?category=eyeglasses', icon: 'Glasses', image: 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=400&auto=format&fit=crop&q=80', sub: '8g Ultralight', is_active: 1 },
    { id: 'cat_2', name: 'UV400 Polarized', slug: 'sunglasses', isLink: '/catalog?category=sunglasses', icon: 'Compass', image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&auto=format&fit=crop&q=80', sub: 'Ocean Glare Cut', is_active: 1 },
    { id: 'cat_3', name: 'BluZero™ Screen', slug: 'computer-glasses', isLink: '/catalog?category=computer-glasses', icon: 'Eye', image: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=400&auto=format&fit=crop&q=80', sub: '98% Blue Block', is_active: 1 },
    { id: 'cat_4', name: 'Reading & Bifocal', slug: 'reading-glasses', isLink: '/catalog?category=reading-glasses', icon: 'Glasses', image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&auto=format&fit=crop&q=80', sub: 'CR-39 Optics', is_active: 1 },
    { id: 'cat_5', name: 'Digha Eye Clinic', slug: 'doctors', isLink: '/doctors', icon: 'Stethoscope', image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80', sub: 'Senior Surgeons', is_active: 1 },
    { id: 'cat_6', name: 'Free Home Test', slug: 'home-eye-checkup', isLink: '/home-eye-checkup', icon: 'Home', image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400&auto=format&fit=crop&q=80', sub: 'Doorstep Checkup', is_active: 1 }
  ];

  let activeRoundelCategories = defaultRoundelCategories;
  if (storeSettings?.curated_categories) {
    try {
      const parsed = typeof storeSettings.curated_categories === 'string'
        ? JSON.parse(storeSettings.curated_categories)
        : storeSettings.curated_categories;
      if (Array.isArray(parsed) && parsed.length > 0) {
        const filtered = parsed.filter(c => c.is_active !== 0 && c.is_active !== '0' && c.is_active !== false);
        if (filtered.length > 0) {
          activeRoundelCategories = filtered;
        }
      }
    } catch (e) {
      console.warn('Failed to parse curated_categories setting:', e);
    }
  }

  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > 45) {
      nextSlide();
    } else if (distance < -45) {
      prevSlide();
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  return (
    <div className="space-y-8 lg:space-y-10 pb-12">
      
      {/* =========================================================================
          1. STOREFRONT HERO SLIDER WITH 3D PRODUCT SHOWCASE CAROUSEL
          SEAMLESSLY TAILORED FOR BOTH LIGHT AND DARK THEMES
         ========================================================================= */}
      <section 
        className="relative overflow-hidden pt-2 pb-2 lg:py-2 select-none"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="w-full max-w-[1520px] mx-auto px-4 sm:px-8">
          
          <div className={`hero-banner-card relative rounded-2xl sm:rounded-3xl overflow-hidden p-4 sm:p-10 lg:p-12 transition-all duration-700 border-2 ${
            isDark
              ? 'bg-gradient-to-br from-[#070E1A] via-[#0A192F] to-[#040912] border-brand-cyan/45 shadow-2xl text-white'
              : 'bg-gradient-to-br from-white via-sky-50/40 to-slate-50 border-slate-300 shadow-[0_15px_45px_rgba(0,180,216,0.12)] text-slate-900'
          }`}>
            
            {/* Custom Banner Background Layer with Zoom & Position */}
            {(slide.background_image_url || slide.image) && (
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <img
                  src={slide.background_image_url || slide.image}
                  alt={slide.title || 'Banner Background'}
                  className="w-full h-full object-cover transition-all duration-700"
                  style={{
                    objectPosition: slide.background_position || 'center center',
                    transform: `scale(${Math.max(1, (slide.background_zoom || 100) / 100)})`
                  }}
                  onError={(e) => {
                    // Fallback if local path or broken URL
                    if (slide.image && e.currentTarget.src !== slide.image) {
                      e.currentTarget.src = slide.image;
                    }
                  }}
                />
              </div>
            )}
            {/* Dynamic Soft Vignette Gradient Overlay (Crisp typography on left, bright picture on right) */}
            <div 
              className={`absolute inset-0 transition-opacity duration-700 pointer-events-none ${
                isDark
                  ? 'bg-gradient-to-r from-[#070E1A]/90 via-[#0A192F]/55 to-black/20'
                  : 'bg-gradient-to-r from-white/92 via-sky-50/60 to-white/20'
              }`}
              style={{
                opacity: Math.min(0.75, Math.max(0.15, 
                  (slide.background_opacity !== undefined && slide.background_opacity !== null)
                    ? (parseFloat(slide.background_opacity) > 1 
                        ? parseFloat(slide.background_opacity) / 100 
                        : parseFloat(slide.background_opacity))
                    : 0.35
                ))
              }}
            />

            {/* Carousel Navigation Arrows */}
            <button
              onClick={prevSlide}
              aria-label="Previous Slide"
              className={`absolute left-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-xl hidden sm:flex border ${
                isDark 
                  ? 'bg-black/60 hover:bg-brand-cyan hover:text-black border-white/20 text-white' 
                  : 'bg-white/80 hover:bg-brand-cyan hover:text-white border-slate-300 text-slate-800'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextSlide}
              aria-label="Next Slide"
              className={`absolute right-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-xl hidden sm:flex border ${
                isDark 
                  ? 'bg-black/60 hover:bg-brand-cyan hover:text-black border-white/20 text-white' 
                  : 'bg-white/80 hover:bg-brand-cyan hover:text-white border-slate-300 text-slate-800'
              }`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Slide Content Grid - Side-by-side Landscape Rectangle on all screen sizes */}
            <div key={currentSlide} className="hero-slide-content relative z-10 grid grid-cols-12 gap-2 sm:gap-8 lg:gap-12 items-center">
              
              {/* Left Column: Tag, Headline & CTAs */}
              <div className="col-span-7 space-y-1.5 sm:space-y-4 lg:space-y-5 text-left">
                
                <div className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-3.5 sm:py-1.5 rounded-full text-[9px] sm:text-xs font-black uppercase tracking-wider backdrop-blur-md shadow-sm border ${
                  isDark
                    ? 'bg-brand-cyan/20 border-brand-cyan/40 text-brand-cyan'
                    : 'bg-sky-100 border-sky-300 text-sky-800'
                }`}>
                  <Sparkles className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 shrink-0" />
                  <span className="truncate">
                    {(currentSlide === 0 && seasonalTheme !== 'default' && content?.announcementBadge) 
                      ? content.announcementBadge 
                      : (slide.tag || 'CLARITY YOU CAN TRUST')}
                  </span>
                </div>

                <h1 className={`hero-banner-title text-xs sm:text-2xl lg:text-5xl font-black tracking-tight leading-tight font-heading line-clamp-2 ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  {(currentSlide === 0 && seasonalTheme !== 'default' && content?.heroTitle) 
                    ? content.heroTitle 
                    : slide.title}
                </h1>

                <p className={`hero-banner-sub text-[10px] sm:text-xs lg:text-base max-w-xl font-normal leading-snug sm:leading-relaxed line-clamp-2 sm:line-clamp-3 ${
                  isDark ? 'text-slate-300' : 'text-slate-600'
                }`}>
                  {(currentSlide === 0 && seasonalTheme !== 'default' && content?.heroSubtitle) 
                    ? content.heroSubtitle 
                    : slide.subtitle}
                </p>

                <div className="flex flex-wrap items-center justify-start gap-1.5 sm:gap-3 pt-0.5 sm:pt-1">
                  <Link 
                    to={(currentSlide === 0 && seasonalTheme !== 'default' && content?.heroCtaLink) ? content.heroCtaLink : (slide.button_url || '/catalog')} 
                    className="hero-banner-btn btn-primary text-[10px] sm:text-sm py-1.5 sm:py-3 px-2.5 sm:px-6 shadow-cyan-glow font-black uppercase tracking-wider flex items-center gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl"
                  >
                    <Glasses className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>
                      {(currentSlide === 0 && seasonalTheme !== 'default' && content?.heroCtaText) 
                        ? content.heroCtaText 
                        : (slide.button_text || 'EXPLORE')}
                    </span>
                  </Link>

                  <Link 
                    to="/doctors" 
                    className={`hero-banner-btn text-[10px] sm:text-sm py-1.5 sm:py-3 px-2 sm:px-5 font-bold flex items-center gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl transition-all border ${
                      isDark
                        ? 'bg-white/10 hover:bg-white/15 border-white/20 text-white'
                        : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-800 shadow-sm'
                    }`}
                  >
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-500" />
                    <span>Doctor</span>
                  </Link>
                </div>

                {/* Carousel Indicators / Dots */}
                <div className="flex items-center justify-start gap-1.5 pt-1 sm:pt-2">
                  {activeBanners.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setCurrentSlide(idx); setActive3DCardIdx(0); }}
                      aria-label={`Slide ${idx + 1}`}
                      className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                        currentSlide === idx 
                          ? 'w-6 sm:w-8 bg-brand-cyan shadow-sm' 
                          : isDark ? 'w-1.5 sm:w-2 bg-white/25 hover:bg-white/50' : 'w-1.5 sm:w-2 bg-slate-300 hover:bg-slate-400'
                      }`}
                    />
                  ))}
                </div>

              </div>

              {/* Right Column: 3D Product Showcase Stack (Center + Left + Right Peeking) */}
              <div className="col-span-5 relative flex justify-center items-center py-1">
                <div className="hero-3d-showcase-container">
                  {slideProducts.map((prod, pIdx) => {
                    const totalP = slideProducts.length;
                    let posClass = 'pos-hidden';
                    if (pIdx === active3DCardIdx) {
                      posClass = 'pos-center';
                    } else if (pIdx === (active3DCardIdx + 1) % totalP) {
                      posClass = 'pos-right';
                    } else if (pIdx === (active3DCardIdx - 1 + totalP) % totalP) {
                      posClass = 'pos-left';
                    }

                    return (
                      <div
                        key={prod.id || pIdx}
                        onClick={() => setActive3DCardIdx(pIdx)}
                        className={`hero-3d-stack-card ${posClass} ${
                          isDark 
                            ? 'bg-[#0A192F]/95 border-brand-cyan/35 text-white' 
                            : 'bg-white border-slate-200/90 text-slate-900 shadow-xl'
                        }`}
                        title={posClass !== 'pos-center' ? 'Click to inspect in 3D' : prod.name}
                      >
                        <div>
                          <div className="hero-3d-header">
                            <span className="hero-3d-icon-badge">★</span>
                            <span className="hero-3d-cat-tag">{prod.category || 'TITANIUM'}</span>
                          </div>
                          <div className="hero-3d-title">
                            {prod.name}
                          </div>
                        </div>

                        <div className="hero-3d-img-box">
                          <img 
                            src={prod.image_url || '/logo_symbol.png'} 
                            alt={prod.name}
                            onError={(e) => { e.target.src = '/logo_symbol.png'; }}
                          />
                        </div>

                        <div className="hero-3d-footer">
                          <div>
                            <div className="hero-3d-price">₹{prod.price}</div>
                            {prod.mrp && prod.mrp > prod.price && (
                              <div className="text-[11px] text-slate-400 line-through font-mono">
                                ₹{prod.mrp}
                              </div>
                            )}
                          </div>
                          <Link 
                            to={`/catalog?search=${encodeURIComponent(prod.name)}`}
                            className="hero-3d-btn"
                          >
                            <span>VIEW</span> &rarr;
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. DYNAMIC CIRCULAR CATEGORY ROUNDELS (Matching The Stitch Co)
         ========================================================================= */}
      <section className="w-full max-w-[1520px] mx-auto px-4 sm:px-8 categories-section-wrap">
        <div className="categories-header-row">
          <div>
            <h2 className="categories-section-heading">CURATED OPTICAL CATEGORIES</h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Tap a roundel to browse specialized eyewear chasses and clinical services
            </p>
          </div>
          <Link to="/catalog" className="section-view-all">
            <span>View All</span> &rarr;
          </Link>
        </div>

        <div className="categories-scroll-track">
          {activeRoundelCategories.map((cat, idx) => {
            const Icon = typeof cat.icon === 'function' ? cat.icon : getRoundelIcon(cat.icon);
            const targetUrl = cat.isLink || (cat.slug ? (cat.slug.startsWith('/') ? cat.slug : `/catalog?category=${cat.slug}`) : '/catalog');
            const imageUrl = cat.image || cat.image_url || 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=400&auto=format&fit=crop&q=80';
            const catName = cat.name || cat.title || 'Category';
            const catSub = cat.sub || cat.subtitle || '';
            return (
              <Link 
                key={cat.id || idx} 
                to={targetUrl}
                className="category-roundel-item group"
              >
                <div className={`category-roundel-avatar ${idx === 0 ? 'active' : ''}`}>
                  <span className="category-badge-icon">
                    <Icon className="w-3.5 h-3.5 text-slate-950" />
                  </span>
                  <img 
                    src={imageUrl} 
                    alt={catName} 
                    loading="lazy" 
                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=400&auto=format&fit=crop&q=80'; }}
                  />
                </div>
                <span className="category-roundel-name">{catName}</span>
                {catSub && <span className="category-roundel-sub">{catSub}</span>}
              </Link>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          3. COMPACT 4-COLUMN TRUST FEATURES BAR (Matching The Stitch Co)
         ========================================================================= */}
      <div className="w-full max-w-[1520px] mx-auto px-4 sm:px-8 trust-bar-container">
        <div className="trust-bar-grid">
          {activeTrustFeatures.map((feat, idx) => (
            <div key={idx} className="trust-bar-col">
              <span className="trust-col-icon">
                {renderTrustIcon(feat.icon, idx)}
              </span>
              <div className="min-w-0">
                <h4 className="trust-col-title truncate">{feat.title}</h4>
                <span className="trust-col-desc line-clamp-1">{feat.desc || feat.subtitle || feat.description}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* =========================================================================
          4. BEST SELLERS PRODUCT GRID (Matching The Stitch Co Liquid Cards)
         ========================================================================= */}
      <section className="w-full max-w-[1520px] mx-auto px-4 sm:px-8 bestsellers-section">
        <div className="bestsellers-header-row">
          <div>
            <h2 className="bestsellers-title">BEST SELLERS &amp; SIGNATURE DROPS</h2>
            <span className="bestsellers-sub">Precision Crafted Japanese Titanium &amp; Italian Acetate</span>
          </div>
          <Link to="/shop?category=best-sellers-signature-drops" className="section-view-all">
            <span>Explore All Signature Drops</span> &gt;
          </Link>
        </div>

        <div className="products-grid">
          {featuredProducts.map((p) => {
            const regular = Number(p.price);
            const sale = p.discount_price ? Number(p.discount_price) : regular;
            const discountPct = p.discount_percent || Math.round(((regular - sale) / regular) * 100) || 0;
            const inWish = isInWishlist(p.id);

            return (
              <div key={p.id} className="product-card group">
                <div className="product-media">
                  {discountPct > 0 ? (
                    <span className="product-badge">{discountPct}% OFF</span>
                  ) : (
                    <span className="product-badge">NEW DROP</span>
                  )}

                  <button
                    onClick={() => toggleWishlist(p)}
                    className={`wishlist-toggle-btn ${inWish ? 'active' : ''}`}
                    title={inWish ? 'Remove from Wishlist' : 'Add to Wishlist'}
                    aria-label="Wishlist"
                  >
                    <Heart className={`w-4 h-4 ${inWish ? 'fill-rose-500 text-rose-500' : ''}`} />
                  </button>

                  <Link to={`/product/${p.slug || p.sku || p.id}`}>
                    <img 
                      src={p.primary_image || 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=600&auto=format&fit=crop&q=80'} 
                      alt={p.name}
                      loading="lazy"
                    />
                  </Link>
                </div>

                <div className="product-info">
                  <span className="product-sku">{p.sku}</span>
                  <h3 className="product-name">
                    <Link to={`/product/${p.slug || p.sku || p.id}`}>{p.name}</Link>
                  </h3>

                  <div className="product-pricing">
                    <span className="price-current">₹{sale}</span>
                    {regular > sale && (
                      <>
                        <span className="price-mrp">₹{regular}</span>
                        <span className="price-discount">{discountPct}% OFF</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <button 
                      onClick={() => addToCart(p, 1)}
                      className="add-to-cart-btn flex-1"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>ADD TO CART</span>
                    </button>
                    <Link
                      to={`/product/${p.slug || p.sku || p.id}`}
                      className={`p-2.5 rounded-xl text-brand-cyan font-extrabold text-xs transition-colors border ${
                        isDark ? 'bg-white/10 hover:bg-brand-cyan/20 border-white/10' : 'bg-slate-100 hover:bg-sky-100 border-slate-200'
                      }`}
                      title="Try On 3D"
                    >
                      <Camera className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* View All Signature Drops Button */}
        <div className="flex justify-center pt-8 pb-2">
          <Link 
            to="/shop?category=best-sellers-signature-drops" 
            className="btn-primary inline-flex items-center gap-2.5 px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider shadow-cyan-glow transition-transform hover:scale-105"
          >
            <span>View All Best Sellers &amp; Signature Drops</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* =========================================================================
          5. COMPACT TRIO HORIZONTAL ROW:
             - Special Offer & Coupon
             - Doctor Clinic Booking (if doctor available)
             - Home Eye Checkup Visit
         ========================================================================= */}
      <section className="w-full max-w-[1520px] mx-auto px-4 sm:px-8">
        <div className="flex overflow-x-auto lg:grid lg:grid-cols-3 gap-4 lg:gap-6 items-stretch no-scrollbar snap-x snap-mandatory pb-3">

          {/* CARD 1: DYNAMIC ACTIVE COUPON OR QUALITY GUARANTEE */}
          {activeCoupon ? (
            <div className={`w-[85vw] sm:w-[380px] lg:w-auto shrink-0 snap-center rounded-3xl p-5 sm:p-7 border-2 transition-all flex flex-col justify-between relative overflow-hidden group shadow-md hover:shadow-xl ${
              isDark 
                ? 'bg-gradient-to-br from-[#1c150c] via-[#0A192F] to-[#060D17] border-amber-500/35 text-white hover:border-amber-400/60' 
                : 'bg-gradient-to-br from-amber-50/80 via-white to-orange-50/50 border-amber-300 text-slate-900 hover:border-amber-400'
            }`}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[11px] font-extrabold tracking-wider uppercase border border-amber-500/30">
                    <Tag className="w-3.5 h-3.5 text-amber-500" /> Special Promo
                  </span>
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 font-mono">
                    {activeCoupon.discount_type === 'PERCENTAGE' ? `${Number(activeCoupon.discount_value)}% OFF` : `Flat ₹${Number(activeCoupon.discount_value)} OFF`}
                  </span>
                </div>

                <div>
                  <h3 className={`text-xl font-extrabold leading-tight font-heading ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {activeCoupon.discount_type === 'PERCENTAGE' ? `${Number(activeCoupon.discount_value)}% Storewide Discount` : `Flat ₹${Number(activeCoupon.discount_value)} Off Eyewear`}
                  </h3>
                  <p className={`text-xs mt-1.5 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    {Number(activeCoupon.min_order_amount) > 0 
                      ? `Valid on all optical frames and lens orders above ₹${Number(activeCoupon.min_order_amount)}. Apply code at checkout.`
                      : 'Valid across all designer frames, sunglasses, and precision lenses. Apply code at checkout.'}
                  </p>
                </div>

                {/* Coupon voucher pill */}
                <div className={`p-3 rounded-2xl border-2 border-dashed flex items-center justify-between gap-3 ${
                  isDark 
                    ? 'bg-black/40 border-amber-500/40 text-white' 
                    : 'bg-amber-100/60 border-amber-300 text-slate-900'
                }`}>
                  <div>
                    <span className="text-[10px] text-amber-600 dark:text-amber-300 font-bold block uppercase tracking-wider">Coupon Code</span>
                    <strong className="font-mono font-black text-sm text-slate-900 dark:text-white tracking-widest">{activeCoupon.code}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyCoupon(activeCoupon.code)}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
                    title={`Copy coupon code ${activeCoupon.code}`}
                  >
                    {couponCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-5 border-t border-amber-500/20 mt-4">
                <Link 
                  to="/catalog" 
                  className="w-full py-2.5 px-4 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md"
                >
                  <span>Shop Frames &amp; Apply</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <div className={`w-[85vw] sm:w-[380px] lg:w-auto shrink-0 snap-center rounded-3xl p-5 sm:p-7 border-2 transition-all flex flex-col justify-between relative overflow-hidden group shadow-md hover:shadow-xl ${
              isDark 
                ? 'bg-gradient-to-br from-[#1c150c] via-[#0A192F] to-[#060D17] border-amber-500/35 text-white hover:border-amber-400/60' 
                : 'bg-gradient-to-br from-amber-50/80 via-white to-orange-50/50 border-amber-300 text-slate-900 hover:border-amber-400'
            }`}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[11px] font-extrabold tracking-wider uppercase border border-amber-500/30">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Optical Excellence
                  </span>
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 font-mono">
                    100% Certified
                  </span>
                </div>

                <div>
                  <h3 className={`text-xl font-extrabold leading-tight font-heading ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    German Optics &amp; Lens Precision
                  </h3>
                  <p className={`text-xs mt-1.5 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    Every prescription frame is edged with micron accuracy. Complimentary anti-reflective coating &amp; premium travel case included.
                  </p>
                </div>

                {/* Benefits pill */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className={`p-2.5 rounded-xl border ${
                    isDark ? 'bg-black/40 border-amber-500/30 text-white' : 'bg-amber-100/50 border-amber-200 text-slate-800'
                  }`}>
                    <div className="font-bold text-xs text-amber-500 dark:text-amber-300">Anti-Glare Lens</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Free with frame</div>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${
                    isDark ? 'bg-black/40 border-amber-500/30 text-white' : 'bg-amber-100/50 border-amber-200 text-slate-800'
                  }`}>
                    <div className="font-bold text-xs text-amber-600 dark:text-amber-400">14-Day Return</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Zero-risk trial</div>
                  </div>
                </div>
              </div>

              <div className="pt-5 border-t border-amber-500/20 mt-4">
                <Link 
                  to="/catalog" 
                  className="w-full py-2.5 px-4 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md font-bold"
                >
                  <span>Explore Eyewear Catalog</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* CARD 2: CLINICAL EYE DOCTOR BOOKING (Checked for Availability) */}
          <div className={`w-[85vw] sm:w-[380px] lg:w-auto shrink-0 snap-center rounded-3xl p-5 sm:p-7 border-2 transition-all flex flex-col justify-between relative overflow-hidden group shadow-md hover:shadow-xl ${
            isDark 
              ? 'bg-gradient-to-br from-[#071c15] via-[#0A192F] to-[#060D17] border-emerald-500/35 text-white hover:border-emerald-400/60' 
              : 'bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/50 border-emerald-300 text-slate-900 hover:border-emerald-400'
          }`}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-extrabold tracking-wider uppercase border border-emerald-500/30">
                  <Stethoscope className="w-3.5 h-3.5 text-emerald-500" /> Clinical Eye Care
                </span>
                {doctors.length > 0 && storeSettings.doctor_appointments_enabled !== '0' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Doctor Available
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                    Next Slot Soon
                  </span>
                )}
              </div>

              <div>
                <h3 className={`text-xl font-extrabold leading-tight font-heading ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Doctor Clinic Consultation
                </h3>
                <p className={`text-xs mt-1.5 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Consult senior ophthalmic surgeons at our Digha Bypass clinic. Micro-refraction &amp; dilated fundus review.
                </p>
              </div>

              {/* Active Doctor Snapshot if Available */}
              {doctors.length > 0 && storeSettings.doctor_appointments_enabled !== '0' ? (
                <div className={`p-3 rounded-2xl border flex items-center gap-3 ${
                  isDark ? 'bg-slate-900/80 border-emerald-500/30' : 'bg-emerald-100/40 border-emerald-200'
                }`}>
                  <img 
                    src={doctors[0].photo_url || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80'} 
                    alt={doctors[0].name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-emerald-400 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-xs truncate text-slate-900 dark:text-white">{doctors[0].name}</h4>
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-300 font-medium truncate">{doctors[0].specialization}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Consultation: ₹{doctors[0].consultation_fee} • Zero Waiting</div>
                  </div>
                </div>
              ) : (
                <div className={`p-3 rounded-2xl border text-xs leading-relaxed ${
                  isDark ? 'bg-slate-900/60 border-white/10 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'
                }`}>
                  <p className="font-medium">Regular visiting specialists on weekends. Pre-book your token to skip queue.</p>
                </div>
              )}
            </div>

            <div className="pt-5 border-t border-emerald-500/20 mt-4">
              <Link 
                to="/doctors" 
                className="btn-primary w-full py-2.5 px-4 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-cyan-glow"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Book Clinic Slot</span>
              </Link>
            </div>
          </div>

          {/* CARD 3: EYE CHECKUP HOME VISIT */}
          <div className={`w-[85vw] sm:w-[380px] lg:w-auto shrink-0 snap-center rounded-3xl p-5 sm:p-7 border-2 transition-all flex flex-col justify-between relative overflow-hidden group shadow-md hover:shadow-xl ${
            isDark 
              ? 'bg-gradient-to-br from-[#061826] via-[#0A192F] to-[#060D17] border-brand-cyan/35 text-white hover:border-brand-cyan/60' 
              : 'bg-gradient-to-br from-sky-50/80 via-white to-cyan-50/50 border-sky-300 text-slate-900 hover:border-sky-400'
          }`}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-cyan/15 text-brand-cyan text-[11px] font-extrabold tracking-wider uppercase border border-brand-cyan/30">
                  <HomeIcon className="w-3.5 h-3.5 text-brand-cyan" /> Doorstep Service
                </span>
                <span className="text-[11px] font-black uppercase tracking-wider text-brand-cyan font-mono bg-brand-cyan/10 border border-brand-cyan/20 px-2 py-0.5 rounded-full">
                  ₹299 ONLY
                </span>
              </div>

              <div>
                <h3 className={`text-xl font-extrabold leading-tight font-heading ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Home Eye Test &amp; Frame Trial
                </h3>
                <p className={`text-xs mt-1.5 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Can't visit our clinic? Certified optometrists bring digital autorefractometers and 100+ frames right to your home.
                </p>
              </div>

              {/* Service Highlights */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className={`p-2.5 rounded-xl border ${
                  isDark ? 'bg-slate-900/60 border-white/10 text-white' : 'bg-sky-100/50 border-sky-200 text-slate-800'
                }`}>
                  <div className="font-bold text-xs text-brand-cyan">12-Step Test</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Digital refraction</div>
                </div>
                <div className={`p-2.5 rounded-xl border ${
                  isDark ? 'bg-slate-900/60 border-white/10 text-white' : 'bg-sky-100/50 border-sky-200 text-slate-800'
                }`}>
                  <div className="font-bold text-xs text-teal-600 dark:text-teal-400">100+ Frames</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Doorstep trial</div>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                <MapPin className="w-3.5 h-3.5 text-brand-cyan shrink-0" />
                <span className="truncate">Digha • Contai • Ramnagar • Mandarmani</span>
              </div>
            </div>

            <div className="pt-5 border-t border-brand-cyan/20 mt-4">
              <Link 
                to="/home-eye-checkup" 
                className="btn-primary w-full py-2.5 px-4 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-cyan-glow"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Book Home Visit</span>
              </Link>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
};
