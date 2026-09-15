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

export const ProductDetailPage = () => {
  const params = useParams();
  const identifier = String(params.identifier || params.id || params.slug || '');
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const [product, setProduct] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState('Matte Black');
  const [selectedSize, setSelectedSize] = useState('Medium');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shareCopied, setShareCopied] = useState(false);

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
        <h2 className="text-xl font-bold text-white">Product Not Found</h2>
        <p className="text-xs text-slate-400">{error || 'This optical frame may have been archived or does not exist.'}</p>
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
      <nav className="flex items-center gap-2 text-xs text-slate-400">
        <Link to="/" className="hover:text-white">Home</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to="/shop" className="hover:text-white">Eyewear</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to={`/shop?category=${product.category_slug}`} className="hover:text-white">
          {product.category_name}
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-white truncate max-w-xs">{product.name}</span>
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
        <div className="lg:col-span-5 space-y-6">
          
          {/* Brand, Title & Reviews */}
          <div>
            <div className="flex items-center justify-between text-xs text-brand-cyan font-bold tracking-wider uppercase mb-1">
              <span>{product.brand_name || 'Netra Signature'}</span>
              <span className="font-mono text-slate-400">{product.sku}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">
              {product.name}
            </h1>
            
            {/* Reviews badge */}
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-1 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-lg text-amber-500 dark:text-amber-300 text-xs font-bold">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>4.8</span>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">128 verified optometrist reviews</span>
              <span className="text-slate-400 dark:text-slate-600">•</span>
              <span className="text-xs text-brand-cyan font-semibold">In Stock</span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* Pricing Box */}
          <div className="glass-card rounded-2xl p-4 flex items-center justify-between border-2 border-slate-200 dark:border-white/10 shadow-sm">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white">₹{effectiveTotal * quantity}</span>
                {discountPct > 0 && (
                  <span className="text-sm text-slate-400 line-through">₹{regularPrice * quantity}</span>
                )}
              </div>
              <p className="text-[11px] text-brand-teal font-medium mt-0.5">
                {configuredLens ? `Includes ${configuredLens.lens_type} (+₹${configuredLens.lens_price})` : 'Inclusive of Optical GST & Premium Hard Case'}
              </p>
            </div>

            <div className="text-right">
              {product.stock_quantity > 0 ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-400">
                  <CheckCircle className="w-3.5 h-3.5" /> In Stock ({product.stock_quantity} available)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-400">
                  <ShieldAlert className="w-3.5 h-3.5" /> Out of Stock
                </span>
              )}
            </div>
          </div>

          {/* Size Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide flex items-center justify-between">
              <span>Select Size: <span className="text-brand-cyan font-semibold">{selectedSize}</span></span>
              <button 
                type="button"
                onClick={() => setSizeModalOpen(true)}
                className="text-[11px] text-brand-cyan hover:underline font-normal lowercase tracking-normal"
              >
                size guide &rarr;
              </button>
            </label>
            <div className="flex items-center gap-2.5 flex-wrap">
              {availableSizesList.map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setSelectedSize(sz)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                    selectedSize === sz
                      ? 'border-brand-cyan bg-brand-cyan text-slate-950 shadow-cyan-glow font-extrabold'
                      : 'border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 bg-white/5 hover:border-brand-cyan/50'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide flex items-center justify-between">
              <span>Select Color: <span className="text-brand-cyan font-semibold">{selectedColor}</span></span>
            </label>
            <div className="flex items-center gap-2.5 flex-wrap">
              {availableColorsList.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setSelectedColor(c.name)}
                  className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                    selectedColor === c.name
                      ? 'border-brand-cyan bg-brand-cyan/10 text-slate-900 dark:text-white shadow-cyan-glow font-bold'
                      : 'border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-white/20'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0 shadow-sm"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sizing & Dimensions Box with Modal Trigger */}
          <div className="glass-card rounded-2xl p-4 space-y-3 border-2 border-slate-200 dark:border-white/10 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">Frame Geometry</span>
              <button 
                type="button"
                onClick={() => setSizeModalOpen(true)}
                className="text-xs text-brand-cyan hover:underline flex items-center gap-1 font-semibold"
              >
                <HelpCircle className="w-3.5 h-3.5" /> Sizing Guide &amp; Fit Tool
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 flex items-center justify-between font-mono text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400 text-[10px] block uppercase">Dimensions (mm)</span>
                <strong className="text-slate-900 dark:text-white text-base tracking-wider">{product.dimensions_label || 'Standard Fit'}</strong>
              </div>
              <span className="px-3 py-1 rounded-lg bg-brand-cyan/15 text-brand-cyan font-bold border border-brand-cyan/30 text-xs">
                {product.frame_size} Fit
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-500 dark:text-slate-400 text-center">
              <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5">Shape: <strong className="text-slate-900 dark:text-white capitalize">{product.frame_shape}</strong></div>
              <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5">Material: <strong className="text-slate-900 dark:text-white">{product.frame_material}</strong></div>
              <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5">Gender: <strong className="text-slate-900 dark:text-white">{product.gender}</strong></div>
            </div>
          </div>

          {/* Prescription Lens Configurator Trigger */}
          {product.is_prescription_compatible === 1 && (
            <div className="glass-card-glow rounded-2xl p-4 space-y-3 border-2 border-brand-cyan/30 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-brand-cyan" /> Prescription Lenses
                </span>
                {configuredLens ? (
                  <span className="text-xs text-teal-500 dark:text-teal-400 font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Attached
                  </span>
                ) : (
                  <span className="text-xs text-slate-500 dark:text-slate-400">Zero Power or Prescription</span>
                )}
              </div>

              {/* Prescription Required? Toggle Tabs */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setRxRequired(false);
                    setConfiguredLens(null);
                    setAttachedRx(null);
                  }}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    !rxRequired
                      ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/40 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Zero Power / Fashion
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRxRequired(true);
                    setRxModalOpen(true);
                  }}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    rxRequired
                      ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/40 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Prescription Power
                </button>
              </div>

              {configuredLens ? (
                <div className="p-3 rounded-xl bg-teal-950/30 border border-teal-500/30 text-xs text-teal-200 flex justify-between items-center">
                  <div>
                    <strong>{configuredLens.lens_type}</strong>
                    <div className="text-[11px] text-slate-300 mt-0.5">Method: {attachedRx?.method || 'Values Entered'}</div>
                  </div>
                  <button 
                    onClick={() => setRxModalOpen(true)}
                    className="text-brand-cyan hover:underline font-bold text-xs"
                  >
                    Edit Rx
                  </button>
                </div>
              ) : rxRequired ? (
                <button
                  type="button"
                  onClick={() => setRxModalOpen(true)}
                  className="w-full btn-secondary text-xs py-2.5 text-center flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-brand-cyan" /> Configure Prescription &amp; Anti-Glare Lenses
                </button>
              ) : null}
            </div>
          )}

          {/* Quantity & Action Buttons */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              {/* Quantity Counter */}
              <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-950/60 border border-slate-300 dark:border-white/10 p-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-10 text-center font-bold text-slate-900 dark:text-white text-sm">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(product.stock_quantity || 10, quantity + 1))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Add to Cart */}
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={product.stock_quantity <= 0}
                className="flex-1 btn-secondary py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <ShoppingBag className="w-4 h-4" /> Add to Cart
              </button>

              {/* Buy Now */}
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={product.stock_quantity <= 0}
                className="flex-1 btn-primary py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Zap className="w-4 h-4" /> Buy Now
              </button>
            </div>

            {addedToast && (
              <div className="p-3 rounded-xl bg-teal-500/20 border border-teal-400/40 text-teal-200 text-xs text-center flex items-center justify-center gap-2 animate-bounce">
                <Check className="w-4 h-4" /> Added {quantity} item(s) to your shopping cart!
              </div>
            )}
          </div>

          {/* 4 Trust Guarantee Badges */}
          <div className="grid grid-cols-2 gap-3 border-t border-slate-200 dark:border-white/10 pt-4">
            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5">
              <Award className="w-4 h-4 text-brand-cyan shrink-0" />
              <div className="text-[11px]">
                <div className="font-bold text-slate-900 dark:text-white">1-Year Warranty</div>
                <div className="text-slate-500 dark:text-slate-400 text-[10px]">Frame &amp; hinges</div>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5">
              <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
              <div className="text-[11px]">
                <div className="font-bold text-slate-900 dark:text-white">Lab Precision</div>
                <div className="text-slate-500 dark:text-slate-400 text-[10px]">German lens cutting</div>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5">
              <RotateCcw className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="text-[11px]">
                <div className="font-bold text-slate-900 dark:text-white">7-Day Exchange</div>
                <div className="text-slate-500 dark:text-slate-400 text-[10px]">Hassle-free swap</div>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5">
              <Truck className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="text-[11px]">
                <div className="font-bold text-slate-900 dark:text-white">Free Fast Shipping</div>
                <div className="text-slate-500 dark:text-slate-400 text-[10px]">Orders above ₹999</div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Sizing Modal */}
      <SizeGuideModal
        isOpen={sizeModalOpen}
        onClose={() => setSizeModalOpen(false)}
        currentProduct={product}
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
