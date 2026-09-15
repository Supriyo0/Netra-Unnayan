import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Filter, Search, SlidersHorizontal, ArrowUpDown, 
  Check, X, Glasses, Sparkles, ChevronDown, Heart 
} from 'lucide-react';
import api from '../api/client';
import { VirtualTryOnModal } from '../components/optical/VirtualTryOnModal';
import { useWishlist } from '../context/WishlistContext';

export const CatalogPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Selected Filters
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [selectedShape, setSelectedShape] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [selectedGender, setSelectedGender] = useState('');
  const [rxOnly, setRxOnly] = useState(false);
  const [tryonOnly, setTryonOnly] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');

  // Try On Modal State
  const [tryOnProduct, setTryOnProduct] = useState(null);

  // Mobile Filter Drawer
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const { toggleWishlist, isInWishlist } = useWishlist();

  useEffect(() => {
    // Sync URL search params
    const cat = searchParams.get('category') || '';
    const q = searchParams.get('search') || '';
    setSelectedCategory(cat);
    setSearchQuery(q);
  }, [searchParams]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get('/categories');
        if (res.success) setCategories(res.data || []);
      } catch (e) {
        console.error(e);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedCategory) params.append('category', selectedCategory);
        if (selectedShape) params.append('shape', selectedShape);
        if (selectedSize) params.append('size', selectedSize);
        if (selectedMaterial) params.append('material', selectedMaterial);
        if (selectedGender) params.append('gender', selectedGender);
        if (rxOnly) params.append('prescription_only', '1');
        if (tryonOnly) params.append('tryon_only', '1');
        if (searchQuery) params.append('search', searchQuery);
        if (sortBy) params.append('sort', sortBy);
        params.append('limit', '24');

        const res = await api.get(`/products?${params.toString()}`);
        if (res.success) {
          setProducts(res.data?.products || []);
          setTotalCount(res.data?.pagination?.total || 0);
        }
      } catch (err) {
        console.error('Failed to load products:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [selectedCategory, selectedShape, selectedSize, selectedMaterial, selectedGender, rxOnly, tryonOnly, searchQuery, sortBy]);

  const handleResetFilters = () => {
    setSelectedCategory('');
    setSelectedShape('');
    setSelectedSize('');
    setSelectedMaterial('');
    setSelectedGender('');
    setRxOnly(false);
    setTryonOnly(false);
    setSearchQuery('');
    setSearchParams({});
  };

  const shapes = ['Rectangle', 'Round', 'Aviator', 'Wayfarer', 'Cat-Eye', 'Geometric', 'Square'];
  const sizes = ['Small', 'Medium', 'Large'];
  const materials = ['Titanium', 'Acetate', 'Stainless Steel', 'TR90', 'Ultem', 'Metal'];
  const genders = ['Men', 'Women', 'Unisex', 'Kids'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Page Title & Search Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            {selectedCategory ? `${selectedCategory.replace('-', ' ').toUpperCase()}` : 'Complete Eyewear Catalog'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Showing {products.length} of {totalCount} precision-engineered frames
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Quick Search Input */}
          <div className="relative flex-1 md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search frames, SKUs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full glass-input rounded-full pl-9 pr-4 py-2 text-xs"
            />
          </div>

          {/* Sort Selector */}
          <div className="relative shrink-0">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="glass-input rounded-full px-4 py-2 text-xs appearance-none pr-8 cursor-pointer font-medium"
            >
              <option value="newest" className="bg-slate-900 text-white">Newest Arrivals</option>
              <option value="popular" className="bg-slate-900 text-white">Most Popular</option>
              <option value="price_asc" className="bg-slate-900 text-white">Price: Low to High</option>
              <option value="price_desc" className="bg-slate-900 text-white">Price: High to Low</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Mobile Filter Trigger */}
          <button
            onClick={() => setMobileFilterOpen(true)}
            className="lg:hidden p-2 rounded-full glass-input text-brand-cyan"
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Catalog Layout (Sidebar + Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        
        {/* DESKTOP FILTER SIDEBAR */}
        <aside className="hidden lg:block glass-card rounded-2xl p-6 space-y-6 sticky top-24">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-cyan flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" /> Filters
            </span>
            <button 
              onClick={handleResetFilters}
              className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium"
            >
              Reset All
            </button>
          </div>

          {/* Category Filter */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-wide">Category</h4>
            <div className="space-y-1">
              <button
                onClick={() => { setSelectedCategory(''); setSearchParams({}); }}
                className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                  !selectedCategory ? 'bg-brand-cyan/20 text-brand-cyan font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                All Categories
              </button>
              {categories.map((c) => (
                <button
                  key={c.slug}
                  onClick={() => { setSelectedCategory(c.slug); setSearchParams({ category: c.slug }); }}
                  className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                    selectedCategory === c.slug ? 'bg-brand-cyan/20 text-brand-cyan font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Frame Shape */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-wide">Frame Shape</h4>
            <div className="flex flex-wrap gap-1.5">
              {shapes.map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedShape(selectedShape === s ? '' : s)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                    selectedShape === s
                      ? 'bg-brand-cyan text-slate-950 font-bold border-brand-cyan'
                      : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-white/30 bg-slate-50 dark:bg-transparent'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Frame Size */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-wide">Face Fit / Size</h4>
            <div className="grid grid-cols-3 gap-1.5">
              {sizes.map((sz) => (
                <button
                  key={sz}
                  onClick={() => setSelectedSize(selectedSize === sz ? '' : sz)}
                  className={`text-[11px] py-1.5 rounded-lg border text-center font-medium transition-all ${
                    selectedSize === sz
                      ? 'bg-brand-cyan text-slate-950 font-bold border-brand-cyan'
                      : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-white/30 bg-slate-50 dark:bg-transparent'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>

          {/* Frame Material */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-wide">Material</h4>
            <div className="flex flex-wrap gap-1.5">
              {materials.map((m) => (
                <button
                  key={m}
                  onClick={() => setSelectedMaterial(selectedMaterial === m ? '' : m)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                    selectedMaterial === m
                      ? 'bg-brand-cyan text-slate-950 font-bold border-brand-cyan'
                      : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-white/30 bg-slate-50 dark:bg-transparent'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Gender */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-wide">Gender</h4>
            <div className="grid grid-cols-2 gap-1.5">
              {genders.map((g) => (
                <button
                  key={g}
                  onClick={() => setSelectedGender(selectedGender === g ? '' : g)}
                  className={`text-[11px] py-1 rounded-lg border text-center font-medium transition-all ${
                    selectedGender === g
                      ? 'bg-brand-cyan text-slate-950 font-bold border-brand-cyan'
                      : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-white/30 bg-slate-50 dark:bg-transparent'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="pt-2 border-t border-slate-200 dark:border-white/10 space-y-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
              <input 
                type="checkbox"
                checked={rxOnly}
                onChange={(e) => setRxOnly(e.target.checked)}
                className="rounded accent-brand-cyan"
              />
              <span>Prescription Compatible Only</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
              <input 
                type="checkbox"
                checked={tryonOnly}
                onChange={(e) => setTryonOnly(e.target.checked)}
                className="rounded accent-brand-cyan"
              />
              <span>Supports 3D Virtual Try-On</span>
            </label>
          </div>
        </aside>

        {/* PRODUCTS GRID */}
        <main className="lg:col-span-3">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="glass-card rounded-2xl h-80 animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="glass-card rounded-3xl p-12 text-center space-y-4">
              <Glasses className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-lg font-bold text-white">No Frames Found Matching Your Filters</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Try clearing selected shape, material, or category filters to explore more options.
              </p>
              <button onClick={handleResetFilters} className="btn-secondary text-xs px-5 py-2">
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
              {products.map((p) => {
                const regular = Number(p.price);
                const sale = p.discount_price ? Number(p.discount_price) : regular;
                const discountPct = p.discount_percent || (regular > sale ? Math.round(((regular - sale) / regular) * 100) : 0);
                const isFavorited = isInWishlist(p.id);

                return (
                  <div
                    key={p.id}
                    className="group glass-card rounded-2xl overflow-hidden p-3 sm:p-4 flex flex-col justify-between hover:border-brand-cyan/40 hover:shadow-cyan-glow transition-all duration-300 relative"
                  >
                    <div>
                      {/* Image container */}
                      <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 dark:bg-[#070E1A] mb-3 flex items-center justify-center p-2.5">
                        {discountPct > 0 && (
                          <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full bg-red-500 text-white text-[9px] sm:text-[10px] font-extrabold tracking-wider shadow-sm">
                            {discountPct}% OFF
                          </span>
                        )}

                        {/* Wishlist Heart Toggle (Screen 4 & 9) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleWishlist(p);
                          }}
                          className={`absolute top-2 right-2 z-20 p-1.5 rounded-full backdrop-blur-md transition-all ${
                            isFavorited
                              ? 'bg-rose-500 text-white shadow-md'
                              : 'bg-black/40 text-white hover:bg-rose-500 hover:text-white'
                          }`}
                          title={isFavorited ? 'Remove from Wishlist' : 'Add to Wishlist'}
                        >
                          <Heart className={`w-3.5 h-3.5 ${isFavorited ? 'fill-white' : ''}`} />
                        </button>

                        <Link to={`/product/${p.slug || p.id}`} className="w-full h-full flex items-center justify-center">
                          <img 
                            src={p.primary_image || p.image_url || 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=800&auto=format&fit=crop&q=80'} 
                            alt={p.name}
                            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                          />
                        </Link>
                      </div>

                      {/* Color indicator swatch dots (Screen 4) */}
                      <div className="flex items-center gap-1 mb-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-white/40 inline-block" />
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-700 border border-white/40 inline-block" />
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-400 border border-white/40 inline-block" />
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-500 border border-white/40 inline-block" />
                      </div>

                      {/* Optical Dimensions & Specs */}
                      <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-mono">
                        <span>{p.dimensions_label || (p.lens_width ? `${p.lens_width} □ ${p.bridge_width || 18} — ${p.temple_length || 140}` : '52 □ 18 — 140')}</span>
                        <span className="capitalize">{p.frame_shape || 'Classic'}</span>
                      </div>

                      {/* Title */}
                      <Link to={`/product/${p.slug || p.id}`}>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-brand-cyan transition-colors line-clamp-1">
                          {p.name}
                        </h3>
                      </Link>

                      <div className="text-[10px] text-slate-400 mt-0.5">
                        SKU: <span className="font-mono">{p.sku}</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-2">
                      <div>
                        {discountPct > 0 && (
                          <div className="text-[10px] text-slate-400 line-through font-mono">
                            ₹{regular.toLocaleString('en-IN')}
                          </div>
                        )}
                        <div className="text-sm sm:text-base font-black text-slate-900 dark:text-white font-mono">
                          ₹{sale.toLocaleString('en-IN')}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {p.is_tryon_enabled === 1 && (
                          <button
                            type="button"
                            onClick={() => setTryOnProduct(p)}
                            className="p-1.5 sm:px-2 sm:py-1 rounded-lg border border-brand-cyan/40 bg-brand-cyan/10 text-brand-cyan text-[10px] font-bold hover:bg-brand-cyan hover:text-slate-950 transition-all flex items-center gap-1"
                            title="Virtual 3D Try-On"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span className="hidden sm:inline">Try On</span>
                          </button>
                        )}
                        <Link 
                          to={`/product/${p.slug || p.id}`}
                          className="btn-primary text-[11px] py-1.5 px-3 rounded-lg font-bold"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Virtual Try-On Modal */}
      {tryOnProduct && (
        <VirtualTryOnModal
          isOpen={!!tryOnProduct}
          onClose={() => setTryOnProduct(null)}
          product={tryOnProduct}
        />
      )}

      {/* Mobile Filter Drawer */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex bg-black/80 backdrop-blur-md lg:hidden">
          <div className="w-4/5 max-w-sm bg-[#0A192F] h-full p-6 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-sm font-bold text-white">Filter Eyewear</span>
              <button onClick={() => setMobileFilterOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Same category list for mobile */}
            <div>
              <h4 className="text-xs font-bold text-white mb-2">Category</h4>
              <div className="space-y-1">
                {categories.map((c) => (
                  <button
                    key={c.slug}
                    onClick={() => { setSelectedCategory(c.slug); setMobileFilterOpen(false); }}
                    className="w-full text-left text-xs py-1.5 text-slate-300"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={() => { handleResetFilters(); setMobileFilterOpen(false); }}
              className="w-full btn-secondary text-xs py-2"
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
