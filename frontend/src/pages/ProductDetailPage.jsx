import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Sparkles, CheckCircle, ShieldAlert, Truck, RotateCcw, 
  HelpCircle, QrCode, ShoppingBag, Zap, Heart, Share2, 
  Check, FileText, ChevronRight, MessageCircle, Star, Plus, Minus, Camera, Award, ShieldCheck
} from 'lucide-react';
import api from '../api/client';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { SizeGuideModal } from '../components/optical/SizeGuideModal';
import { PrescriptionModal } from '../components/optical/PrescriptionModal';
import { VirtualTryOnModal } from '../components/optical/VirtualTryOnModal';
import { useTheme } from '../context/ThemeContext';

export const ProductDetailPage = () => {
  const params = useParams();
  const identifier = String(params.identifier || params.id || params.slug || '');
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { isDark } = useTheme();

  const [product, setProduct] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState('Matte Black');
  const [selectedSize, setSelectedSize] = useState('Medium');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  // Modals
  const [sizeModalOpen, setSizeModalOpen] = useState(false);
  const [rxModalOpen, setRxModalOpen] = useState(false);
  const [tryOnModalOpen, setTryOnModalOpen] = useState(false);

  // Prescription / Lens configured state
  const [configuredLens, setConfiguredLens] = useState(null);
  const [attachedRx, setAttachedRx] = useState(null);
  const [addedToast, setAddedToast] = useState(false);
  const [rxRequired, setRxRequired] = useState(false);

  // Dynamic available sizes parsed from product
  const availableSizesList = React.useMemo(() => {
    if (!product) return ['Small', 'Medium', 'Large'];
    if (product.available_sizes) {
      if (Array.isArray(product.available_sizes)) return product.available_sizes;
      if (typeof product.available_sizes === 'string') {
        try {
          const p = JSON.parse(product.available_sizes);
          if (Array.isArray(p) && p.length > 0) return p;
        } catch {}
        const splitted = product.available_sizes.split(',').map(s => s.trim()).filter(Boolean);
        if (splitted.length > 0) return splitted;
      }
    }
    return product.frame_size ? [product.frame_size] : ['Small', 'Medium', 'Large'];
  }, [product]);

  // Dynamic available colors parsed from product
  const availableColorsList = React.useMemo(() => {
    const colorHexMap = {
      'black': '#0f172a',
      'matte black': '#1e293b',
      'tortoise': '#78350f',
      'tortoise amber': '#78350f',
      'gold': '#eab308',
      'rose gold': '#f43f5e',
      'silver': '#94a3b8',
      'gunmetal': '#475569',
      'gunmetal grey': '#475569',
      'crystal': '#e2e8f0',
      'transparent crystal': '#cbd5e1',
      'navy blue': '#1e3a8a',
      'blue': '#2563eb'
    };

    let rawList = [];
    if (product?.available_colors) {
      if (Array.isArray(product.available_colors)) {
        rawList = product.available_colors;
      } else if (typeof product.available_colors === 'string') {
        try {
          const p = JSON.parse(product.available_colors);
          if (Array.isArray(p) && p.length > 0) rawList = p;
        } catch {}
        if (rawList.length === 0) {
          rawList = product.available_colors.split(',').map(c => c.trim()).filter(Boolean);
        }
      }
    }
    if (rawList.length === 0) {
      rawList = product?.frame_color ? [product.frame_color] : ['Matte Black', 'Tortoise Amber', 'Gunmetal Grey', 'Rose Gold'];
    }

    return rawList.map(name => ({
      name,
      hex: colorHexMap[name.toLowerCase()] || '#475569'
    }));
  }, [product]);

  useEffect(() => {
    if (availableSizesList.length > 0 && !availableSizesList.includes(selectedSize)) {
      setSelectedSize(availableSizesList[0]);
    }
  }, [availableSizesList]);

  useEffect(() => {
    if (availableColorsList.length > 0 && !availableColorsList.some(c => c.name === selectedColor)) {
      setSelectedColor(availableColorsList[0].name);
    }
  }, [availableColorsList]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!identifier) {
          setError('No product specified');
          setLoading(false);
          return;
        }
        // Try looking up by SKU, numeric ID, or slug
        let res;
        if (identifier.startsWith('NU-') || identifier.startsWith('nu-')) {
          res = await api.get(`/products/by_sku.php?sku=${encodeURIComponent(identifier)}`);
        } else if (/^\d+$/.test(identifier)) {
          res = await api.get(`/products/detail.php?id=${encodeURIComponent(identifier)}`);
        } else {
          res = await api.get(`/products/detail.php?slug=${encodeURIComponent(identifier)}`);
        }
        if (res.success && res.data) {
          setProduct(res.data);
          setActiveImage(0);
        } else {
          setError(res.message || 'Product not found');
        }
      } catch (err) {
        setError(err.message || 'Product could not be loaded');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [identifier]);

  // Fetch Related Products based on category
  useEffect(() => {
    if (!product?.id) return;
    const fetchRelated = async () => {
      setRelatedLoading(true);
      try {
        let endpoint = '/products?limit=12';
        if (product.category_slug) {
          endpoint = `/products?category=${encodeURIComponent(product.category_slug)}&limit=12`;
        } else if (product.category_id) {
          endpoint = `/products?category_id=${encodeURIComponent(product.category_id)}&limit=12`;
        }
        const res = await api.get(endpoint);
        if (res.success && Array.isArray(res.data)) {
          // Filter out current active product
          const list = res.data.filter(p => Number(p.id) !== Number(product.id));
          setRelatedProducts(list.slice(0, 6));
        }
      } catch (err) {
        console.warn('Failed to fetch related products:', err);
      } finally {
        setRelatedLoading(false);
      }
    };
    fetchRelated();
  }, [product?.id, product?.category_slug, product?.category_id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex items-center justify-center min-h-[50vh]">
        <div className="w-12 h-12 rounded-full border-2 border-brand-cyan border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Product Not Found</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">{error || 'This optical frame may have been archived or does not exist.'}</p>
        <Link to="/shop" className="btn-primary text-xs px-6 py-2.5 inline-flex">
          Browse All Eyewear
        </Link>
      </div>
    );
  }

  const regularPrice = Number(product.price);
  const salePrice = product.discount_price ? Number(product.discount_price) : regularPrice;
  const discountPct = product.discount_percent || 0;
  const lensAddonPrice = configuredLens ? Number(configuredLens.lens_price) : 0;
  const effectiveTotal = salePrice + lensAddonPrice;

  const handleAddToCart = () => {
    addToCart(product, quantity, configuredLens, attachedRx, { selected_size: selectedSize, selected_color: selectedColor });
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 3000);
  };

  const handleBuyNow = () => {
    addToCart(product, quantity, configuredLens, attachedRx, { selected_size: selectedSize, selected_color: selectedColor });
    navigate('/checkout');
  };

  const images = product.images || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Link to="/" className="hover:text-brand-cyan transition-colors">Home</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to="/shop" className="hover:text-brand-cyan transition-colors">Eyewear</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to={`/shop?category=${product.category_slug}`} className="hover:text-brand-cyan transition-colors">
          {product.category_name}
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-900 dark:text-white font-medium truncate max-w-xs">{product.name}</span>
      </nav>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* LEFT COLUMN: Interactive Gallery */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative aspect-[4/3] rounded-3xl overflow-hidden glass-card p-6 flex items-center justify-center bg-slate-100 dark:bg-[#070E1A] border-2 border-slate-300 dark:border-white/15 shadow-sm">
            {discountPct > 0 && (
              <span className="absolute top-4 left-4 z-10 px-3 py-1 rounded-full bg-red-500 text-white text-xs font-bold tracking-wider shadow-lg">
                {discountPct}% OFF
              </span>
            )}
            
            {/* Top Right Quick Actions: Try-On + Wishlist + Share */}
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              {product.is_tryon_enabled === 1 && (
                <button
                  type="button"
                  onClick={() => setTryOnModalOpen(true)}
                  className="btn-primary text-xs py-1.5 px-3 rounded-full shadow-cyan-glow flex items-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" /> Try On 3D
                </button>
              )}
              <button
                type="button"
                onClick={() => toggleWishlist(product)}
                className={`p-2 rounded-full backdrop-blur-md border transition-all ${
                  isInWishlist(product.id)
                    ? 'bg-rose-500/20 border-rose-500/50 text-rose-500'
                    : 'bg-black/40 border-white/10 text-white hover:text-rose-400'
                }`}
                title="Save to Wishlist"
              >
                <Heart className={`w-4 h-4 ${isInWishlist(product.id) ? 'fill-current' : ''}`} />
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="p-2 rounded-full bg-black/40 border border-white/10 text-white hover:text-brand-cyan backdrop-blur-md transition-all relative"
                title="Share Frame"
              >
                <Share2 className="w-4 h-4" />
                {shareCopied && (
                  <span className="absolute -bottom-7 right-0 text-[10px] bg-slate-900 border border-white/20 text-brand-cyan px-2 py-0.5 rounded shadow-lg whitespace-nowrap">
                    Link copied!
                  </span>
                )}
              </button>
            </div>

            <img 
              src={images[activeImage]?.image_url || product.primary_image || '/logo_symbol.png'} 
              alt={product.name}
              className="max-h-full max-w-full object-contain filter drop-shadow-[0_15px_30px_rgba(0,0,0,0.6)]"
            />
          </div>

          {/* Thumbnail Strip */}
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`w-20 h-16 rounded-xl overflow-hidden p-1.5 glass-card shrink-0 border-2 transition-all ${
                    activeImage === idx ? 'border-brand-cyan shadow-cyan-glow' : 'border-slate-300 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/30'
                  }`}
                >
                  <img src={img.image_url} alt="angle" className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          )}

          {/* Public QR Code Scanner Box */}
          <div className="glass-card rounded-2xl p-4 flex items-center justify-between gap-4 border-2 border-slate-200 dark:border-white/10 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white p-1 shrink-0 flex items-center justify-center border border-slate-200">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(window.location.href)}`} 
                  alt="QR Code" 
                  className="w-full h-full"
                />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-brand-cyan" /> Scan QR to View on Mobile
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Instant camera redirection to this exact SKU: <strong className="font-mono text-slate-800 dark:text-slate-200">{product.sku}</strong>
                </p>
              </div>
            </div>
            <a 
              href={`https://wa.me/919382293614?text=${encodeURIComponent(`Hello Netra Unnayan, I am inquiring about product ${product.name} (SKU: ${product.sku}).`)}`}
              target="_blank" 
              rel="noreferrer"
              className="btn-secondary text-xs py-1.5 px-3 shrink-0"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-400" /> Inquire
            </a>
          </div>
        </div>

        {/* RIGHT COLUMN: Product Info & Configuration */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Brand, Title & Reviews */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-brand-cyan tracking-widest uppercase">
                {product.brand_name || 'Netra Signature'}
              </span>
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-md">
                {product.sku}
              </span>
            </div>
            
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">
              {product.name}
            </h1>
            
            {/* Reviews + Stock row */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 px-2 py-0.5 rounded-lg">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} className={`w-3 h-3 ${i <= 4 ? 'fill-amber-400 text-amber-400' : 'fill-amber-200 text-amber-200 dark:fill-amber-800 dark:text-amber-800'}`} />
                ))}
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300 ml-1">4.8</span>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">128 reviews</span>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              {product.stock_quantity > 0 ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="w-3.5 h-3.5" /> In Stock
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-semibold text-rose-500">
                  <ShieldAlert className="w-3.5 h-3.5" /> Out of Stock
                </span>
              )}
            </div>

            {product.description && (
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                {product.description}
              </p>
            )}
          </div>

          {/* Price */}
          <div className="flex items-end justify-between bg-gradient-to-r from-sky-50 to-teal-50/50 dark:from-white/[0.04] dark:to-brand-cyan/[0.03] rounded-2xl px-4 py-3.5 border border-sky-200 dark:border-brand-cyan/20">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  ₹{effectiveTotal * quantity}
                </span>
                {discountPct > 0 && (
                  <span className="text-base text-slate-400 line-through">₹{regularPrice * quantity}</span>
                )}
                {discountPct > 0 && (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-1.5 py-0.5 rounded-md">
                    {discountPct}% OFF
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {configuredLens
                  ? <span className="text-brand-teal font-semibold">✓ Includes {configuredLens.lens_type} (+₹{configuredLens.lens_price})</span>
                  : 'Incl. hard case & lens cloth'
                }
              </p>
            </div>
            {discountPct > 0 && (
              <div className="text-right">
                <div className="text-[10px] text-slate-500 dark:text-slate-400">You save</div>
                <div className="text-base font-black text-emerald-600 dark:text-emerald-400">₹{(regularPrice - salePrice) * quantity}</div>
              </div>
            )}
          </div>

          {/* Size Selector */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                Frame Size
              </span>
              <button
                type="button"
                onClick={() => setSizeModalOpen(true)}
                className="text-[11px] font-semibold text-brand-cyan hover:text-brand-teal transition-colors flex items-center gap-1 underline underline-offset-2"
              >
                <HelpCircle className="w-3.5 h-3.5" /> Size Guide
              </button>
            </div>
            
            {/* Size toggle pills */}
            <div className="flex items-center bg-slate-100 dark:bg-white/5 rounded-xl p-1 gap-1 border border-slate-200 dark:border-white/10">
              {availableSizesList.map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setSelectedSize(sz)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                    selectedSize === sz
                      ? 'bg-white dark:bg-[#0A192F] text-brand-cyan shadow-sm border border-brand-cyan/40'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>

            {/* Dynamic frame dimensions (updates with selected size) */}
            {(() => {
              const baseLens = product.lens_width || 52;
              const baseBridge = product.bridge_width || 18;
              const baseTemple = product.temple_length || 140;
              let lens = baseLens, bridge = baseBridge, temple = baseTemple;
              if (selectedSize === 'Small') { lens = Math.max(46, baseLens - 3); bridge = Math.max(15, baseBridge - 1); temple = Math.max(130, baseTemple - 5); }
              else if (selectedSize === 'Large') { lens = baseLens + 3; bridge = baseBridge + 1; temple = baseTemple + 5; }
              return (
                <div className="flex items-center justify-between bg-white dark:bg-white/[0.03] rounded-xl px-3.5 py-2.5 border border-slate-200 dark:border-white/10 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-brand-cyan shrink-0" />
                    <span className="font-mono font-bold text-slate-900 dark:text-white tracking-wider">
                      {lens} □ {bridge} — {temple} mm
                    </span>
                  </div>
                  <span className="text-slate-500 dark:text-slate-400 text-[10px]">
                    {product.frame_shape ? `${product.frame_shape} · ` : ''}{selectedSize}
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Color Selector */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                Colour
              </span>
              <span className="text-xs font-semibold text-brand-cyan">{selectedColor}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {availableColorsList.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  title={c.name}
                  onClick={() => setSelectedColor(c.name)}
                  className={`relative w-8 h-8 rounded-full border-2 transition-all duration-200 hover:scale-110 ${
                    selectedColor === c.name
                      ? 'border-brand-cyan scale-110 ring-2 ring-brand-cyan/30 ring-offset-1'
                      : 'border-slate-300 dark:border-white/20'
                  }`}
                  style={{ backgroundColor: c.hex }}
                >
                  {selectedColor === c.name && (
                    <Check className="absolute inset-0 m-auto w-3 h-3 text-white drop-shadow" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Prescription / Lenses Section */}
          {product.is_prescription_compatible === 1 && (
            <div className={`rounded-2xl border-2 overflow-hidden transition-all ${
              rxRequired
                ? 'border-brand-cyan/40 bg-sky-50/50 dark:bg-brand-cyan/[0.04]'
                : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02]'
            }`}>
              <div className="px-4 pt-4 pb-2">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-brand-cyan shrink-0" />
                    Do you need prescription lenses?
                  </span>
                  {configuredLens && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Set
                    </span>
                  )}
                </div>

                {/* Toggle: No / Yes */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setRxRequired(false); setConfiguredLens(null); setAttachedRx(null); }}
                    className={`py-2.5 rounded-xl text-xs font-bold transition-all border ${
                      !rxRequired
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm'
                        : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 bg-transparent hover:border-slate-400 dark:hover:border-white/30'
                    }`}
                  >
                    👓 No, plain frame
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRxRequired(true); setRxModalOpen(true); }}
                    className={`py-2.5 rounded-xl text-xs font-bold transition-all border ${
                      rxRequired
                        ? 'bg-brand-cyan text-slate-950 border-brand-cyan shadow-sm'
                        : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 bg-transparent hover:border-brand-cyan/40 hover:text-brand-cyan'
                    }`}
                  >
                    🔍 Yes, add my power
                  </button>
                </div>
              </div>

              {/* Configured lens summary or CTA */}
              {rxRequired && (
                <div className="px-4 pb-4 pt-1">
                  {configuredLens ? (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-500/30">
                      <div>
                        <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300">{configuredLens.lens_type}</div>
                        <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">{attachedRx?.method || 'Prescription entered'} · +₹{configuredLens.lens_price}</div>
                      </div>
                      <button onClick={() => setRxModalOpen(true)} className="text-brand-cyan text-xs font-bold hover:underline">
                        Change
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setRxModalOpen(true)}
                      className="w-full py-2.5 rounded-xl bg-brand-cyan/10 dark:bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan text-xs font-bold flex items-center justify-center gap-2 hover:bg-brand-cyan/20 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Enter my prescription →
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Quantity & Action Buttons */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {/* Qty */}
              <div className="flex items-center rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 overflow-hidden shrink-0">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-10 text-center font-bold text-slate-900 dark:text-white text-sm">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(product.stock_quantity || 10, quantity + 1))}
                  className="w-10 h-10 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Add to Cart */}
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={product.stock_quantity <= 0}
                className="flex-1 py-3 rounded-xl border-2 border-brand-cyan text-brand-cyan font-bold text-sm flex items-center justify-center gap-2 hover:bg-brand-cyan hover:text-slate-950 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ShoppingBag className="w-4 h-4" /> Add to Cart
              </button>
            </div>

            {/* Buy Now */}
            <button
              type="button"
              onClick={handleBuyNow}
              disabled={product.stock_quantity <= 0}
              className="w-full btn-primary py-3.5 text-sm font-black flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Zap className="w-4 h-4" /> Buy Now
            </button>

            {addedToast && (
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-teal-500/10 border border-emerald-200 dark:border-teal-400/30 text-emerald-700 dark:text-teal-300 text-xs text-center flex items-center justify-center gap-2">
                <Check className="w-4 h-4" /> Added {quantity} item(s) to your cart!
              </div>
            )}
          </div>

          {/* Trust Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
            {[
              { icon: <Award className="w-4 h-4 text-brand-cyan" />, title: '1-Yr Warranty', sub: 'Frame & hinges' },
              { icon: <ShieldCheck className="w-4 h-4 text-teal-500" />, title: 'Lab Precision', sub: 'German lenses' },
              { icon: <RotateCcw className="w-4 h-4 text-amber-500" />, title: '7-Day Swap', sub: 'Easy exchange' },
              { icon: <Truck className="w-4 h-4 text-emerald-500" />, title: 'Free Shipping', sub: 'Orders ₹999+' },
            ].map((b, i) => (
              <div key={i} className="flex flex-col items-center text-center p-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 gap-1">
                {b.icon}
                <div className="text-[10px] font-bold text-slate-900 dark:text-white">{b.title}</div>
                <div className="text-[9px] text-slate-500 dark:text-slate-500">{b.sub}</div>
              </div>
            ))}
          </div>

          {/* Related Eyewear in sidebar */}
          {relatedProducts.length > 0 && (
            <div className="pt-2 border-t border-slate-200 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand-cyan" />
                  You May Also Like
                </span>
                <Link
                  to={product.category_slug ? `/shop?category=${product.category_slug}` : '/shop'}
                  className="text-[11px] text-brand-cyan hover:underline font-medium"
                >
                  See all →
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {relatedProducts.slice(0, 2).map((rel) => {
                  const relReg = Number(rel.price);
                  const relSale = rel.discount_price ? Number(rel.discount_price) : relReg;
                  return (
                    <Link
                      key={rel.id}
                      to={`/product/${rel.slug || rel.sku || rel.id}`}
                      className="group p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:border-brand-cyan/50 hover:shadow-sm transition-all flex items-center gap-2"
                    >
                      <img
                        src={rel.primary_image || 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=200&auto=format&fit=crop&q=80'}
                        alt={rel.name}
                        className="w-12 h-12 rounded-lg object-cover shrink-0 group-hover:scale-105 transition-transform"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-brand-cyan transition-colors">
                          {rel.name}
                        </div>
                        <div className="text-xs font-bold text-brand-cyan mt-0.5">₹{relSale}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* WhatsApp Contact Button */}
          <a
            href={`https://wa.me/919382293614?text=${encodeURIComponent(`Hello Netra Unnayan! 👋\n\nI'm interested in:\n*${product.name}* (SKU: ${product.sku})\n\nCould you help me?`)}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-3 w-full py-3.5 rounded-2xl font-bold text-sm transition-all duration-300 bg-[#25D366] hover:bg-[#20BD5A] text-white shadow-md hover:shadow-green-400/20 hover:scale-[1.01] active:scale-95"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white shrink-0" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Chat on WhatsApp
          </a>
        </div>
      </div>

      {/* Full-width Related & Recommended Eyewear Grid */}
      {relatedProducts.length > 0 && (
        <section className="mt-16 pt-12 border-t border-slate-200 dark:border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20 mb-2">
                <Sparkles className="w-3.5 h-3.5" /> Curated Eyewear
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Related Eyewear You May Also Like
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Handcrafted frames sharing the same optical category, aesthetic proportions, and craftsmanship
              </p>
            </div>
            <Link
              to={product.category_slug ? `/shop?category=${product.category_slug}` : '/shop'}
              className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-brand-cyan hover:underline shrink-0"
            >
              <span>Explore Entire Collection</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {relatedProducts.map((rel) => {
              const relReg = Number(rel.price);
              const relSale = rel.discount_price ? Number(rel.discount_price) : relReg;
              const relDiscountPct = rel.discount_percent || Math.round(((relReg - relSale) / relReg) * 100) || 0;
              const inWish = isInWishlist(rel.id);

              return (
                <div
                  key={rel.id}
                  className="group glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 hover:border-brand-cyan/50 transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-900/60 p-4 flex items-center justify-center overflow-hidden">
                    {relDiscountPct > 0 ? (
                      <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider bg-rose-500 text-white shadow-sm z-10">
                        {relDiscountPct}% OFF
                      </span>
                    ) : (
                      <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider bg-brand-cyan text-slate-950 shadow-sm z-10">
                        CURATED
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleWishlist(rel)}
                      className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center transition-all z-10 ${
                        inWish
                          ? 'bg-rose-500 text-white shadow-md'
                          : 'bg-white/80 dark:bg-black/50 text-slate-600 dark:text-slate-300 hover:text-rose-500 border border-slate-200 dark:border-white/10'
                      }`}
                      title={inWish ? 'Remove from Wishlist' : 'Add to Wishlist'}
                    >
                      <Heart className={`w-3.5 h-3.5 ${inWish ? 'fill-white' : ''}`} />
                    </button>

                    <Link to={`/product/${rel.slug || rel.sku || rel.id}`} className="w-full h-full flex items-center justify-center">
                      <img
                        src={rel.primary_image || 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=500&auto=format&fit=crop&q=80'}
                        alt={rel.name}
                        loading="lazy"
                        className="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform duration-500"
                      />
                    </Link>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                        {rel.sku || 'NETRA EYEWEAR'}
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1 group-hover:text-brand-cyan transition-colors">
                        <Link to={`/product/${rel.slug || rel.sku || rel.id}`}>{rel.name}</Link>
                      </h3>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 capitalize mt-0.5">
                        {rel.frame_shape || 'Standard'} · {rel.gender || 'Unisex'}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-base font-extrabold text-slate-900 dark:text-white">₹{relSale}</span>
                        {relReg > relSale && (
                          <span className="text-xs text-slate-400 line-through">₹{relReg}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-white/5">
                        <button
                          type="button"
                          onClick={() => addToCart(rel, 1)}
                          className="flex-1 btn-secondary py-2 text-xs font-bold flex items-center justify-center gap-1.5"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" /> Add
                        </button>
                        <Link
                          to={`/product/${rel.slug || rel.sku || rel.id}`}
                          className="btn-primary py-2 px-3 text-xs font-bold flex items-center justify-center"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Sizing Modal */}
      <SizeGuideModal
        isOpen={sizeModalOpen}
        onClose={() => setSizeModalOpen(false)}
        currentProduct={product}
        selectedSize={selectedSize}
        onSelectSize={(sz) => setSelectedSize(sz)}
      />

      {/* Prescription Configurator Modal */}
      <PrescriptionModal
        isOpen={rxModalOpen}
        onClose={() => setRxModalOpen(false)}
        onSave={({ lensOptions, prescription }) => {
          setConfiguredLens(lensOptions);
          setAttachedRx(prescription);
        }}
        product={product}
      />

      {/* Virtual Try-On Modal */}
      <VirtualTryOnModal
        isOpen={tryOnModalOpen}
        onClose={() => setTryOnModalOpen(false)}
        product={product}
      />

    </div>
  );
};
