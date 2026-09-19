import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Sliders, Plus, Edit3, Trash2, CheckCircle2, 
  AlertCircle, Eye, RefreshCw, Sparkles, Move, 
  ExternalLink, Layers, Image as ImageIcon, Upload, ZoomIn, ZoomOut
} from 'lucide-react';
import api from '../../api/client';
import { uploadToImgBB } from '../../utils/imgbb';

export const AdminBannersPage = () => {
  const [banners, setBanners] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [tag, setTag] = useState('PREMIUM EYEWEAR');
  const [buttonText, setButtonText] = useState('EXPLORE COLLECTION');
  const [buttonUrl, setButtonUrl] = useState('/shop');
  const [image, setImage] = useState('');
  const [gradient, setGradient] = useState('from-[#060D17] via-[#0A192F] to-[#040912]');
  const [displayOrder, setDisplayOrder] = useState(1);
  const [isActive, setIsActive] = useState(1);
  const [selectedProductIds, setSelectedProductIds] = useState([]);

  // Banner Background Controls
  const [bgImageUrl, setBgImageUrl] = useState('');
  const [bgZoom, setBgZoom] = useState(100);
  const [bgPosition, setBgPosition] = useState('center center');
  const [bgOpacity, setBgOpacity] = useState(0.8);
  const [uploadingBg, setUploadingBg] = useState(false);
  const bgFileInputRef = useRef(null);

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');

  const fetchBannersAndProducts = async () => {
    setLoading(true);
    try {
      const [bannerRes, prodRes] = await Promise.all([
        api.get('/admin/banners.php'),
        api.get('/admin/products.php')
      ]);

      if (bannerRes.success && bannerRes.data?.banners) {
        setBanners(bannerRes.data.banners);
      }
      if (prodRes.success && prodRes.data?.products) {
        setProducts(prodRes.data.products);
      }
    } catch (err) {
      console.error('Failed to load banner settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBannersAndProducts();
  }, []);

  const openAddModal = () => {
    setEditingBanner(null);
    setTitle('');
    setSubtitle('');
    setTag('NEW DROP 2026');
    setButtonText('EXPLORE COLLECTION');
    setButtonUrl('/shop');
    setImage('https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=1200&auto=format&fit=crop&q=80');
    setGradient('from-[#060D17] via-[#0A192F] to-[#040912]');
    setDisplayOrder(banners.length + 1);
    setIsActive(1);
    setSelectedProductIds([]);
    setBgImageUrl('');
    setBgZoom(100);
    setBgPosition('center center');
    setBgOpacity(0.25);
    setFeedback('');
    setModalOpen(true);
  };

  const openEditModal = (banner) => {
    setEditingBanner(banner);
    setTitle(banner.title || '');
    setSubtitle(banner.subtitle || '');
    setTag(banner.tag || 'PREMIUM EYEWEAR');
    setButtonText(banner.button_text || 'EXPLORE FRAMES');
    setButtonUrl(banner.button_url || '/shop');
    setImage(banner.image || '');
    setGradient(banner.gradient || 'from-[#060D17] via-[#0A192F] to-[#040912]');
    setDisplayOrder(banner.display_order || 1);
    setIsActive(banner.is_active || 1);
    setSelectedProductIds(banner.featured_product_ids || []);
    setBgImageUrl(banner.background_image_url || banner.image || '');
    setBgZoom(banner.background_zoom ? parseFloat(banner.background_zoom) : 100);
    setBgPosition(banner.background_position || 'center center');
    const rawOp = banner.background_opacity !== undefined && banner.background_opacity !== null ? parseFloat(banner.background_opacity) : 25;
    setBgOpacity(rawOp > 1 ? rawOp / 100 : (rawOp === 0 ? 0 : rawOp || 0.25));
    setFeedback('');
    setModalOpen(true);
  };

  const handleBgFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingBg(true);
    try {
      const res = await uploadToImgBB(file);
      if (res.success && res.url) {
        setBgImageUrl(res.url);
      } else {
        alert(res.message || 'Failed to upload background image to ImgBB');
      }
    } catch (err) {
      alert('ImgBB upload error: ' + err.message);
    } finally {
      setUploadingBg(false);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      const res = await api.post('/admin/banners.php', { toggle_id: id });
      if (res.success) {
        setBanners(banners.map(b => b.id === id ? { ...b, is_active: b.is_active === 1 ? 0 : 1 } : b));
      }
    } catch (err) {
      alert('Failed to toggle status');
    }
  };

  const handleDeleteBanner = async (id) => {
    if (!window.confirm('Delete this hero slider banner?')) return;
    try {
      const res = await api.delete(`/admin/banners.php?id=${id}`);
      if (res.success) {
        setBanners(banners.filter(b => b.id !== id));
      }
    } catch (err) {
      alert('Failed to delete banner');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Title is required');
      return;
    }

    setSubmitting(true);
    setFeedback('');
    try {
      const payload = {
        id: editingBanner ? editingBanner.id : undefined,
        title: title.trim(),
        subtitle: subtitle.trim(),
        tag: tag.trim(),
        button_text: buttonText.trim(),
        button_url: buttonUrl.trim(),
        image: image.trim(),
        gradient: gradient.trim(),
        display_order: parseInt(displayOrder) || 1,
        is_active: isActive,
        featured_products: selectedProductIds,
        background_image_url: bgImageUrl.trim(),
        background_zoom: bgZoom,
        background_position: bgPosition,
        background_opacity: Math.round(bgOpacity * 100)
      };

      const res = await api.post('/admin/banners.php', payload);
      if (res.success) {
        setFeedback('Hero banner successfully saved!');
        setTimeout(() => {
          setModalOpen(false);
          fetchBannersAndProducts();
        }, 1200);
      } else {
        alert(res.message || 'Error saving banner');
      }
    } catch (err) {
      alert(err.message || 'Failed to submit banner');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleProductSelect = (pid) => {
    if (selectedProductIds.includes(pid)) {
      setSelectedProductIds(selectedProductIds.filter(id => id !== pid));
    } else {
      if (selectedProductIds.length >= 3) {
        alert('Maximum 3 featured products can be attached to one slide');
        return;
      }
      setSelectedProductIds([...selectedProductIds, pid]);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <span className="text-xs uppercase font-extrabold tracking-wider text-brand-cyan">
            Storefront Visual Merchandising
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Homepage Hero Banners &amp; Promo Slider
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage auto-rotating hero slides, featured 3D frame carousels, and seasonal marketing campaigns.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin/categories?tab=roundels"
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all text-xs flex items-center gap-1.5"
            title="Manage Circular Category Roundels"
          >
            <Layers className="w-4 h-4 text-brand-cyan" />
            <span className="hidden sm:inline">Curated Roundels</span>
          </Link>
          <button
            onClick={fetchBannersAndProducts}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-cyan' : ''}`} />
          </button>
          <button
            onClick={openAddModal}
            className="btn-primary text-xs py-2.5 px-4 font-bold rounded-xl flex items-center gap-2 shadow-cyan-glow"
          >
            <Plus className="w-4 h-4" /> Add Hero Slide
          </button>
        </div>
      </div>

      {/* Banner Type Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-[#060D17] border border-white/10 rounded-2xl w-fit">
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-brand-cyan to-brand-teal text-slate-950 shadow-md">
          <Sliders className="w-4 h-4" />
          <span>Hero Carousel Slides ({banners.length})</span>
        </div>

        <Link
          to="/admin/categories?tab=roundels"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-all"
        >
          <Layers className="w-4 h-4 text-brand-cyan" />
          <span>Curated Category Roundels Studio &rarr;</span>
        </Link>
      </div>

      {/* Banners Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-2 p-12 text-center text-slate-400">
            <div className="w-8 h-8 rounded-full border-2 border-brand-cyan border-t-transparent animate-spin mx-auto mb-2" />
            Loading hero banners...
          </div>
        ) : banners.length === 0 ? (
          <div className="col-span-2 p-12 text-center text-slate-400 glass-card rounded-2xl">
            No hero banners configured yet. Click "Add Hero Slide" above to create your first slide!
          </div>
        ) : (
          banners.map((b) => (
            <div 
              key={b.id}
              className={`glass-card rounded-2xl overflow-hidden border transition-all ${
                b.is_active === 1 ? 'border-brand-cyan/30' : 'border-white/10 opacity-60'
              }`}
            >
              {/* Banner Preview Canvas */}
              <div 
                className="relative h-48 p-6 flex flex-col justify-between bg-cover bg-center overflow-hidden"
                style={{
                  backgroundImage: `linear-gradient(rgba(6, 13, 23, 0.75), rgba(6, 13, 23, 0.9)), url(${b.image || '/logo_symbol.png'})`
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-brand-cyan/20 border border-brand-cyan/40 text-brand-cyan font-extrabold text-[10px] tracking-wider uppercase">
                    {b.tag || 'PROMO'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-slate-300 font-bold">
                      Order: #{b.display_order}
                    </span>
                    <button
                      onClick={() => handleToggleStatus(b.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        b.is_active === 1
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {b.is_active === 1 ? 'Active' : 'Disabled'}
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-black text-white leading-tight line-clamp-1">
                    {b.title}
                  </h3>
                  <p className="text-xs text-slate-300 line-clamp-2 mt-1">
                    {b.subtitle}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] font-bold text-brand-teal flex items-center gap-1">
                    CTA: {b.button_text} &rarr;
                  </span>
                  {b.featured_product_ids?.length > 0 && (
                    <span className="text-[10px] text-slate-400 bg-white/10 px-2 py-0.5 rounded">
                      {b.featured_product_ids.length} 3D Frames Attached
                    </span>
                  )}
                </div>
              </div>

              {/* Action Bar */}
              <div className="p-3 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
                <div className="text-[11px] text-slate-400 font-mono">
                  Link: <span className="text-slate-200">{b.button_url}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(b)}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
                    title="Edit Slide"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteBanner(b.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                    title="Delete Slide"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Banner Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#0A192F] border border-white/15 rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-5 shadow-2xl">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand-cyan" />
                {editingBanner ? 'Edit Hero Slider Banner' : 'Create New Hero Slider Banner'}
              </h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {feedback && (
              <div className="p-3 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-200 text-xs text-center flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> {feedback}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Headline Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. JAPAN BETA-TITANIUM OPTICAL FRAMES"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Subtitle / Marketing Description</label>
                <textarea
                  rows="2"
                  placeholder="e.g. Featherlight 8-gram weight, zero temple pressure, German optical edging."
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full glass-input rounded-xl px-3.5 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Top Badge Tag</label>
                  <input
                    type="text"
                    placeholder="e.g. LUXURY DROP 2026"
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    className="w-full glass-input rounded-xl px-3.5 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Display Order (Sort)</label>
                  <input
                    type="number"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(e.target.value)}
                    className="w-full glass-input rounded-xl px-3.5 py-2 text-xs font-mono text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Button Call to Action</label>
                  <input
                    type="text"
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                    className="w-full glass-input rounded-xl px-3.5 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Button Destination URL</label>
                  <input
                    type="text"
                    value={buttonUrl}
                    onChange={(e) => setButtonUrl(e.target.value)}
                    className="w-full glass-input rounded-xl px-3.5 py-2 text-xs"
                  />
                </div>
              </div>

              {/* Banner Background Customization Section */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-bold flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-brand-cyan" />
                    <span>Banner Background Image &amp; Visual Canvas</span>
                  </label>
                  {bgImageUrl && (
                    <button
                      type="button"
                      onClick={() => setBgImageUrl('')}
                      className="text-[10px] text-rose-400 hover:underline"
                    >
                      Clear Image
                    </button>
                  )}
                </div>

                {/* Upload or URL Row */}
                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={bgFileInputRef}
                    onChange={handleBgFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => bgFileInputRef.current?.click()}
                    disabled={uploadingBg}
                    className="px-3 py-2 rounded-xl bg-brand-cyan/20 hover:bg-brand-cyan/30 text-brand-cyan border border-brand-cyan/40 font-bold flex items-center gap-1.5 shrink-0 transition-all disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingBg ? 'Uploading...' : 'Upload Picture'}</span>
                  </button>
                  <input
                    type="text"
                    placeholder="Or paste background image URL (e.g. https://...)"
                    value={bgImageUrl}
                    onChange={(e) => setBgImageUrl(e.target.value)}
                    className="flex-1 glass-input rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                {/* Live Real-Time Interactive Canvas Preview */}
                <div className="relative rounded-2xl overflow-hidden border border-white/20 h-40 shadow-inner flex flex-col justify-between p-4 bg-slate-950">
                  {bgImageUrl ? (
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      <img
                        src={bgImageUrl}
                        alt="Preview Background"
                        className="w-full h-full object-cover transition-all duration-300"
                        style={{
                          objectPosition: bgPosition,
                          transform: `scale(${Math.max(1, bgZoom / 100)})`
                        }}
                      />
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-900 to-slate-800" />
                  )}

                  {/* Darkening / Gradient Overlay Layer */}
                  <div 
                    className="absolute inset-0 bg-gradient-to-r from-[#070E1A]/90 via-[#0A192F]/55 to-black/20 pointer-events-none transition-opacity duration-200"
                    style={{ opacity: Math.min(0.75, Math.max(0.15, bgOpacity)) }}
                  />

                  {/* Foreground mock text on preview */}
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-brand-cyan text-slate-950 font-extrabold text-[9px] uppercase tracking-wider">
                      {tag || 'PREVIEW'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-300 bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm">
                      Zoom: {bgZoom}% | Pos: {bgPosition}
                    </span>
                  </div>
                  <div className="relative z-10">
                    <h4 className="text-white font-extrabold text-sm line-clamp-1 drop-shadow-md">
                      {title || 'Headline Title Preview'}
                    </h4>
                    <p className="text-slate-300 text-[10px] line-clamp-1 mt-0.5 drop-shadow">
                      {subtitle || 'Subtitle / promotional statement preview'}
                    </p>
                  </div>
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="text-[10px] text-brand-teal font-bold bg-black/50 px-2 py-0.5 rounded">
                      CTA: {buttonText} &rarr;
                    </span>
                    <span className="text-[9px] text-slate-400">
                      Live Storefront Simulation
                    </span>
                  </div>
                </div>

                {/* Zoom & Adjustment Sliders Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/10">
                  {/* Zoom Slider */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-300 font-semibold">
                      <span className="flex items-center gap-1">
                        <ZoomIn className="w-3 h-3 text-brand-cyan" /> Zoom
                      </span>
                      <span className="font-mono text-brand-cyan">{bgZoom}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="250"
                      step="5"
                      value={bgZoom}
                      onChange={(e) => setBgZoom(parseInt(e.target.value))}
                      className="w-full accent-brand-cyan cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                    />
                    <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                      <span>50% (Out)</span>
                      <span>100%</span>
                      <span>250% (In)</span>
                    </div>
                  </div>

                  {/* Position Dropdown */}
                  <div className="space-y-1">
                    <label className="block text-[11px] text-slate-300 font-semibold flex items-center gap-1">
                      <Move className="w-3 h-3 text-brand-teal" /> Alignment
                    </label>
                    <select
                      value={bgPosition}
                      onChange={(e) => setBgPosition(e.target.value)}
                      className="w-full glass-input rounded-xl px-2.5 py-1.5 text-xs text-white bg-slate-900"
                    >
                      <option value="center center">Center (Default)</option>
                      <option value="top center">Top Center</option>
                      <option value="bottom center">Bottom Center</option>
                      <option value="center left">Center Left</option>
                      <option value="center right">Center Right</option>
                      <option value="top left">Top Left</option>
                      <option value="top right">Top Right</option>
                    </select>
                  </div>

                  {/* Darkening / Overlay Opacity Slider */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-300 font-semibold">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3 text-amber-400" /> Tint / Dim
                      </span>
                      <span className="font-mono text-amber-400">{Math.round(bgOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.10"
                      max="0.70"
                      step="0.05"
                      value={bgOpacity}
                      onChange={(e) => setBgOpacity(parseFloat(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                    />
                    <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                      <span>10% (Bright)</span>
                      <span>25% (Balanced)</span>
                      <span>70% (Deep)</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Attach 3D Featured Products */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <label className="block text-slate-300 font-bold flex items-center justify-between">
                  <span>Attach 3D Showcase Products (Max 3)</span>
                  <span className="text-brand-cyan">{selectedProductIds.length}/3 Selected</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1">
                  {products.map((p) => {
                    const selected = selectedProductIds.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => toggleProductSelect(p.id)}
                        className={`p-2 rounded-xl border cursor-pointer flex items-center gap-2 transition-all ${
                          selected
                            ? 'bg-brand-cyan/20 border-brand-cyan shadow-sm text-white'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                        }`}
                      >
                        <div className="w-8 h-8 rounded bg-black/40 p-0.5 shrink-0 flex items-center justify-center">
                          <img 
                            src={p.primary_image || '/logo_symbol.png'} 
                            alt={p.name} 
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                        <div className="overflow-hidden">
                          <div className="font-bold text-[11px] truncate">{p.name}</div>
                          <div className="text-[10px] text-brand-teal font-mono">₹{p.price}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="banner-active"
                  checked={isActive === 1}
                  onChange={(e) => setIsActive(e.target.checked ? 1 : 0)}
                  className="accent-brand-cyan w-4 h-4"
                />
                <label htmlFor="banner-active" className="text-slate-300 font-semibold cursor-pointer">
                  Activate this banner on storefront
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-secondary py-2.5 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-cyan-glow disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Banner'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
