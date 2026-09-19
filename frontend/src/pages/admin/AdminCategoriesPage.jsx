import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Layers, Plus, Trash2, Edit, CheckCircle2, XCircle, 
  Eye, RefreshCw, Sparkles, Image as ImageIcon, ArrowUpRight,
  Glasses, Compass, Stethoscope, Home as HomeIcon, Shield, Star,
  Award, Tag, Heart, Camera, ArrowLeft, ArrowRight, Save,
  Sliders, MoveLeft, MoveRight, ExternalLink, RotateCcw
} from 'lucide-react';
import api from '../../api/client';
import { ImageUploadDropzone } from '../../components/common/ImageUploadDropzone';

const AVAILABLE_ICONS = [
  { id: 'Glasses', label: 'Eyeglasses', icon: Glasses },
  { id: 'Compass', label: 'Sunglasses', icon: Compass },
  { id: 'Eye', label: 'Vision / BlueCut', icon: Eye },
  { id: 'Stethoscope', label: 'Clinic / Doctors', icon: Stethoscope },
  { id: 'Home', label: 'Home Checkup', icon: HomeIcon },
  { id: 'Shield', label: 'Protection', icon: Shield },
  { id: 'Sparkles', label: 'Special Drop', icon: Sparkles },
  { id: 'Star', label: 'Premium / VIP', icon: Star },
  { id: 'Award', label: 'Certified / Top', icon: Award },
  { id: 'Tag', label: 'Offers / Sale', icon: Tag },
  { id: 'Heart', label: 'Favorites', icon: Heart },
  { id: 'Camera', label: '3D Try-On', icon: Camera }
];

const DEFAULT_ROUNDELS = [
  { id: 'cat_1', name: 'Japanese Titanium', slug: 'eyeglasses', isLink: '/catalog?category=eyeglasses', icon: 'Glasses', image: 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=400&auto=format&fit=crop&q=80', sub: '8g Ultralight', is_active: 1 },
  { id: 'cat_2', name: 'UV400 Polarized', slug: 'sunglasses', isLink: '/catalog?category=sunglasses', icon: 'Compass', image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&auto=format&fit=crop&q=80', sub: 'Ocean Glare Cut', is_active: 1 },
  { id: 'cat_3', name: 'BluZero™ Screen', slug: 'computer-glasses', isLink: '/catalog?category=computer-glasses', icon: 'Eye', image: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=400&auto=format&fit=crop&q=80', sub: '98% Blue Block', is_active: 1 },
  { id: 'cat_4', name: 'Reading & Bifocal', slug: 'reading-glasses', isLink: '/catalog?category=reading-glasses', icon: 'Glasses', image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&auto=format&fit=crop&q=80', sub: 'CR-39 Optics', is_active: 1 },
  { id: 'cat_5', name: 'Digha Eye Clinic', slug: 'doctors', isLink: '/doctors', icon: 'Stethoscope', image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80', sub: 'Senior Surgeons', is_active: 1 },
  { id: 'cat_6', name: 'Free Home Test', slug: 'home-eye-checkup', isLink: '/home-eye-checkup', icon: 'Home', image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400&auto=format&fit=crop&q=80', sub: 'Doorstep Checkup', is_active: 1 }
];

export const AdminCategoriesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'roundels';

  // State for Catalog Categories
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    image_url: '',
    display_order: 0,
    is_active: 1
  });
  const [savingCategory, setSavingCategory] = useState(false);

  // State for Homepage Roundels
  const [roundels, setRoundels] = useState(DEFAULT_ROUNDELS);
  const [loadingRoundels, setLoadingRoundels] = useState(true);
  const [savingRoundels, setSavingRoundels] = useState(false);
  const [editingRoundelIndex, setEditingRoundelIndex] = useState(null);

  const [message, setMessage] = useState(null);

  // Fetch Catalog Categories
  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const res = await api.get('/admin/categories.php');
      if (res.success) {
        setCategories(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  // Fetch Curated Roundels from Store Settings
  const fetchRoundels = async () => {
    setLoadingRoundels(true);
    try {
      const res = await api.get('/settings.php');
      if (res.success && res.data?.curated_categories) {
        const parsed = typeof res.data.curated_categories === 'string'
          ? JSON.parse(res.data.curated_categories)
          : res.data.curated_categories;
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRoundels(parsed);
        } else {
          setRoundels(DEFAULT_ROUNDELS);
        }
      } else {
        setRoundels(DEFAULT_ROUNDELS);
      }
    } catch (err) {
      console.error('Failed to load curated roundels:', err);
      setRoundels(DEFAULT_ROUNDELS);
    } finally {
      setLoadingRoundels(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchRoundels();
  }, []);

  const setTab = (tabName) => {
    setSearchParams({ tab: tabName });
    setMessage(null);
  };

  // ----------------------------------------------------
  // ROUNDELS ACTIONS
  // ----------------------------------------------------
  const handleSaveRoundels = async (updatedList = roundels) => {
    setSavingRoundels(true);
    setMessage(null);
    try {
      const res = await api.post('/admin/settings.php', {
        curated_categories: JSON.stringify(updatedList)
      });
      if (res.success) {
        setMessage({ type: 'success', text: 'Curated Homepage Roundels updated and live on Storefront!' });
        setRoundels(updatedList);
      } else {
        setMessage({ type: 'error', text: res.error || 'Failed to save roundel settings.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || err.message });
    } finally {
      setSavingRoundels(false);
    }
  };

  const handleUpdateRoundelField = (idx, field, value) => {
    const updated = [...roundels];
    updated[idx] = { ...updated[idx], [field]: value };
    setRoundels(updated);
  };

  const handleAddRoundel = () => {
    const newId = `cat_${Date.now()}`;
    const newRoundel = {
      id: newId,
      name: 'New Eyewear Class',
      slug: 'new-collection',
      isLink: '/catalog?category=eyeglasses',
      icon: 'Glasses',
      image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&auto=format&fit=crop&q=80',
      sub: 'Trending Frame',
      is_active: 1
    };
    const updated = [...roundels, newRoundel];
    setRoundels(updated);
    setEditingRoundelIndex(updated.length - 1);
  };

  const handleDeleteRoundel = (idx) => {
    if (!window.confirm(`Delete roundel "${roundels[idx]?.name}"?`)) return;
    const updated = roundels.filter((_, i) => i !== idx);
    setRoundels(updated);
    if (editingRoundelIndex === idx) setEditingRoundelIndex(null);
  };

  const handleMoveRoundel = (idx, direction) => {
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= roundels.length) return;
    const updated = [...roundels];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    setRoundels(updated);
    if (editingRoundelIndex === idx) setEditingRoundelIndex(targetIdx);
  };

  const handleResetRoundels = () => {
    if (!window.confirm('Reset roundels to default Netra Unnayan optical categories?')) return;
    setRoundels(DEFAULT_ROUNDELS);
    handleSaveRoundels(DEFAULT_ROUNDELS);
  };

  const renderIconComponent = (iconName) => {
    const found = AVAILABLE_ICONS.find(i => i.id.toLowerCase() === (iconName || '').toLowerCase());
    const IconComp = found ? found.icon : Glasses;
    return <IconComp className="w-4 h-4" />;
  };

  // ----------------------------------------------------
  // CATALOG CATEGORIES ACTIONS
  // ----------------------------------------------------
  const openCreateModal = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      image_url: '',
      display_order: categories.length + 1,
      is_active: 1
    });
    setShowModal(true);
  };

  const openEditModal = (cat) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name || '',
      slug: cat.slug || '',
      description: cat.description || '',
      image_url: cat.image_url || '',
      display_order: cat.display_order || 0,
      is_active: cat.is_active ? 1 : 0
    });
    setShowModal(true);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    setSavingCategory(true);
    setMessage(null);
    try {
      const payload = {
        action: editingCategory ? 'update' : 'create',
        ...(editingCategory ? { id: editingCategory.id } : {}),
        ...formData
      };
      const res = await api.post('/admin/categories.php', payload);
      if (res.success) {
        setMessage({ type: 'success', text: res.message || 'Category saved successfully!' });
        setShowModal(false);
        fetchCategories();
      } else {
        setMessage({ type: 'error', text: res.error || 'Failed to save category.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || err.message });
    } finally {
      setSavingCategory(false);
    }
  };

  const toggleCategoryStatus = async (id, currentStatus) => {
    try {
      const res = await api.post('/admin/categories.php', {
        action: 'toggle_status',
        id,
        is_active: currentStatus ? 0 : 1
      });
      if (res.success) {
        fetchCategories();
      }
    } catch (err) {
      console.error('Status toggle failed:', err);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Are you sure you want to delete this catalog category?')) return;
    try {
      let res;
      try {
        res = await api.delete(`/admin/categories.php?id=${id}`);
      } catch {
        res = await api.post('/admin/categories.php', { action: 'delete', id });
      }
      if (res && res.success) {
        setMessage({ type: 'success', text: 'Category deleted successfully.' });
        fetchCategories();
      } else {
        setMessage({ type: 'error', text: res?.message || 'Failed to delete category.' });
      }
    } catch (err) {
      console.error('Delete failed:', err);
      setMessage({ type: 'error', text: err.response?.data?.message || err.message });
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-extrabold tracking-wider text-brand-cyan">
              Storefront Visual Merchandising
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-heading flex items-center gap-2.5 mt-1">
            <Layers className="w-7 h-7 text-brand-cyan" />
            Categories &amp; Storefront Roundels Studio
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Customize circular homepage category avatars, subtitles, banner pictures, and product catalog filters.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link
            to="/admin/banners"
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all text-xs flex items-center gap-1.5"
            title="Go to Hero Carousel Banners"
          >
            <Sliders className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Hero Banners</span>
          </Link>

          {activeTab === 'roundels' ? (
            <>
              <button
                onClick={handleResetRoundels}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-slate-200 transition-all text-xs flex items-center gap-1.5"
                title="Reset to default categories"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">Reset Defaults</span>
              </button>
              <button
                onClick={handleAddRoundel}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white transition-all text-xs flex items-center gap-1.5 font-bold"
              >
                <Plus className="w-4 h-4 text-brand-cyan" />
                <span>Add Roundel</span>
              </button>
              <button
                onClick={() => handleSaveRoundels(roundels)}
                disabled={savingRoundels}
                className="btn-primary py-2.5 px-5 rounded-xl text-xs font-bold shadow-cyan-glow flex items-center gap-2"
              >
                <Save className={`w-4 h-4 ${savingRoundels ? 'animate-spin' : ''}`} />
                <span>{savingRoundels ? 'Saving Live...' : 'Save Roundels Live'}</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={fetchCategories}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all text-xs flex items-center gap-1.5"
                title="Refresh Categories"
              >
                <RefreshCw className={`w-4 h-4 ${loadingCategories ? 'animate-spin text-brand-cyan' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                onClick={openCreateModal}
                className="btn-primary py-2.5 px-4 rounded-xl text-xs font-bold shadow-cyan-glow flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Catalog Category</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 p-1.5 bg-[#060D17] border border-white/10 rounded-2xl w-fit">
        <button
          onClick={() => setTab('roundels')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'roundels'
              ? 'bg-gradient-to-r from-brand-cyan to-brand-teal text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Curated Homepage Roundels ({roundels.length})</span>
        </button>

        <button
          onClick={() => setTab('catalog')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'catalog'
              ? 'bg-gradient-to-r from-brand-cyan to-brand-teal text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Catalog Categories ({categories.length})</span>
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between ${
          message.type === 'success' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white font-bold">&times;</button>
        </div>
      )}

      {/* =========================================================================
          TAB 1: CURATED HOMEPAGE ROUNDELS (CIRCULAR BANNERS)
         ========================================================================= */}
      {activeTab === 'roundels' && (
        <div className="space-y-6">
          
          {/* Live Storefront Preview Strip */}
          <div className="bg-[#0A192F] border border-brand-cyan/20 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-brand-cyan">
                  Live Storefront Preview
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Shows exact circular avatars rendered on the Customer Homepage
              </span>
            </div>

            <div className="flex items-center gap-6 overflow-x-auto pb-3 pt-2 scrollbar-thin">
              {roundels.map((cat, idx) => {
                const isActive = cat.is_active !== 0 && cat.is_active !== '0' && cat.is_active !== false;
                return (
                  <div 
                    key={cat.id || idx} 
                    onClick={() => setEditingRoundelIndex(idx)}
                    className={`flex flex-col items-center text-center cursor-pointer transition-all flex-shrink-0 group ${
                      editingRoundelIndex === idx ? 'scale-105' : 'hover:scale-102'
                    } ${!isActive ? 'opacity-40' : ''}`}
                    style={{ minWidth: '110px' }}
                  >
                    <div className={`relative w-20 h-20 rounded-full border-2 p-0.5 transition-all ${
                      editingRoundelIndex === idx 
                        ? 'border-brand-cyan shadow-[0_0_15px_rgba(6,182,212,0.6)]' 
                        : 'border-white/20 group-hover:border-brand-cyan/50'
                    }`}>
                      <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-brand-cyan text-slate-950 flex items-center justify-center shadow-md">
                        {renderIconComponent(cat.icon)}
                      </span>
                      <img 
                        src={cat.image || 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=400&auto=format&fit=crop&q=80'} 
                        alt={cat.name} 
                        className="w-full h-full object-cover rounded-full bg-slate-900"
                        onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=400&auto=format&fit=crop&q=80'; }}
                      />
                    </div>
                    <span className="text-xs font-bold text-white mt-2 group-hover:text-brand-cyan transition-colors max-w-[120px] truncate">
                      {cat.name || 'Untitled'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium max-w-[120px] truncate">
                      {cat.sub || 'No subtitle'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Roundels Editor Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {roundels.map((cat, idx) => {
              const isSelected = editingRoundelIndex === idx;
              const isActive = cat.is_active !== 0 && cat.is_active !== '0' && cat.is_active !== false;

              return (
                <div 
                  key={cat.id || idx}
                  className={`bg-[#0A192F] rounded-2xl border transition-all p-5 space-y-4 ${
                    isSelected ? 'border-brand-cyan shadow-lg bg-[#0d203b]' : 'border-white/10 hover:border-white/20'
                  } ${!isActive ? 'opacity-60' : ''}`}
                >
                  {/* Card Header & Reorder */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-brand-cyan/20 border border-brand-cyan/40 text-brand-cyan font-mono text-[11px] font-bold">
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        {cat.name || `Roundel #${idx + 1}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleMoveRoundel(idx, -1)}
                        disabled={idx === 0}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-slate-300 text-xs"
                        title="Move Left / Up"
                      >
                        <MoveLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveRoundel(idx, 1)}
                        disabled={idx === roundels.length - 1}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-slate-300 text-xs"
                        title="Move Right / Down"
                      >
                        <MoveRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateRoundelField(idx, 'is_active', isActive ? 0 : 1)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 ${
                          isActive 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-700 text-slate-400'
                        }`}
                      >
                        {isActive ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        <span>{isActive ? 'Active' : 'Hidden'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRoundel(idx)}
                        className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white text-xs transition-colors"
                        title="Delete Roundel"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Visual Roundel Preview & Dropzone */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                    <div className="sm:col-span-4 flex flex-col items-center justify-center p-3 rounded-xl bg-[#060D17] border border-white/10">
                      <div className="relative w-20 h-20 rounded-full border-2 border-brand-cyan/60 p-0.5 overflow-hidden shadow-inner">
                        <img 
                          src={cat.image || 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=400&auto=format&fit=crop&q=80'} 
                          alt={cat.name} 
                          className="w-full h-full object-cover rounded-full"
                          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=400&auto=format&fit=crop&q=80'; }}
                        />
                      </div>
                      <span className="text-[10px] text-brand-cyan font-bold mt-2 text-center">
                        Circular Preview
                      </span>
                    </div>

                    <div className="sm:col-span-8 space-y-2">
                      <label className="text-[11px] font-bold text-slate-300 block">
                        Roundel Banner Image (Upload or Paste URL)
                      </label>
                      <ImageUploadDropzone
                        value={cat.image}
                        onChange={(url) => handleUpdateRoundelField(idx, 'image', url)}
                        label="Change Roundel Image"
                        sublabel="PNG, JPG (Uploads to Cloud)"
                        prefix="roundel"
                        heightClass="h-20"
                      />
                      <input
                        type="text"
                        value={cat.image || ''}
                        onChange={(e) => handleUpdateRoundelField(idx, 'image', e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full px-3 py-1.5 rounded-lg bg-[#060D17] border border-white/10 text-white text-[11px] focus:border-brand-cyan focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Metadata Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        Roundel Name / Title *
                      </label>
                      <input
                        type="text"
                        value={cat.name || ''}
                        onChange={(e) => handleUpdateRoundelField(idx, 'name', e.target.value)}
                        placeholder="e.g. Japanese Titanium"
                        className="w-full px-3 py-2 rounded-xl bg-[#060D17] border border-white/10 text-white text-xs font-bold focus:border-brand-cyan focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        Subtitle / Tagline (Under Name)
                      </label>
                      <input
                        type="text"
                        value={cat.sub || ''}
                        onChange={(e) => handleUpdateRoundelField(idx, 'sub', e.target.value)}
                        placeholder="e.g. 8g Ultralight, Ocean Glare Cut"
                        className="w-full px-3 py-2 rounded-xl bg-[#060D17] border border-white/10 text-white text-xs focus:border-brand-cyan focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Destination Link & Icon Picker */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        Click Action / Route Link
                      </label>
                      <input
                        type="text"
                        value={cat.isLink || cat.slug || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleUpdateRoundelField(idx, 'isLink', val);
                          handleUpdateRoundelField(idx, 'slug', val);
                        }}
                        placeholder="e.g. /catalog?category=eyeglasses, /doctors"
                        className="w-full px-3 py-2 rounded-xl bg-[#060D17] border border-white/10 text-white text-xs font-mono focus:border-brand-cyan focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        Badge Icon
                      </label>
                      <select
                        value={cat.icon || 'Glasses'}
                        onChange={(e) => handleUpdateRoundelField(idx, 'icon', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#060D17] border border-white/10 text-white text-xs focus:border-brand-cyan focus:outline-none"
                      >
                        {AVAILABLE_ICONS.map((iconOpt) => (
                          <option key={iconOpt.id} value={iconOpt.id}>
                            {iconOpt.label} ({iconOpt.id})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Save Bar */}
          <div className="p-4 rounded-2xl bg-[#060D17] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-white">Save All Homepage Roundels</div>
              <div className="text-[11px] text-slate-400">Instantly syncs changes to the live storefront homepage.</div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleAddRoundel}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 text-brand-cyan" />
                <span>Add Another Roundel</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveRoundels(roundels)}
                disabled={savingRoundels}
                className="btn-primary py-2 px-6 rounded-xl text-xs font-bold shadow-cyan-glow flex items-center gap-2"
              >
                <Save className={`w-4 h-4 ${savingRoundels ? 'animate-spin' : ''}`} />
                <span>{savingRoundels ? 'Saving Changes...' : 'Save & Publish Live'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: FULL CATALOG CATEGORIES (DATABASE TABLE)
         ========================================================================= */}
      {activeTab === 'catalog' && (
        <div className="bg-[#0A192F] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Active Catalog Categories ({categories.length})
            </span>
            <span className="text-[11px] text-slate-400">
              Used in product filters, catalog dropdowns, and inventory classification
            </span>
          </div>

          {loadingCategories ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <div className="w-8 h-8 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="text-xs">Loading categories catalog...</div>
            </div>
          ) : categories.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <Layers className="w-12 h-12 mx-auto text-slate-600" />
              <div className="text-sm font-bold text-slate-300">No categories created yet</div>
              <p className="text-xs text-slate-500">Add your first category to power storefront roundels and product filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-white/[0.02] text-slate-400 border-b border-white/10 uppercase tracking-wider font-semibold text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Order</th>
                    <th className="py-3 px-4">Image</th>
                    <th className="py-3 px-4">Category Name &amp; Slug</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {categories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-brand-cyan">
                        #{cat.display_order}
                      </td>
                      <td className="py-3 px-4">
                        <div className="w-12 h-12 rounded-full border-2 border-brand-cyan/40 bg-[#060D17] overflow-hidden flex items-center justify-center p-0.5">
                          {cat.image_url ? (
                            <img 
                              src={cat.image_url} 
                              alt={cat.name} 
                              className="w-full h-full object-cover rounded-full"
                              onError={(e) => { e.target.src = '/logo_symbol.png'; }}
                            />
                          ) : (
                            <Layers className="w-5 h-5 text-brand-cyan" />
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-white text-sm">{cat.name}</div>
                        <div className="text-[11px] font-mono text-slate-400">/{cat.slug}</div>
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-slate-400">
                        {cat.description || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => toggleCategoryStatus(cat.id, cat.is_active)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            cat.is_active
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-700/50 text-slate-400 border border-white/10'
                          }`}
                        >
                          {cat.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          <span>{cat.is_active ? 'Live' : 'Hidden'}</span>
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(cat)}
                            className="p-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-600 text-cyan-700 dark:text-cyan-300 hover:text-white dark:hover:text-slate-950 border border-cyan-500/30 transition-all cursor-pointer shadow-xs"
                            title="Edit Category"
                          >
                            <Edit className="w-4 h-4 stroke-[2.2]" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-600 text-rose-600 dark:text-rose-300 hover:text-white dark:hover:text-white border border-rose-500/40 transition-all cursor-pointer shadow-xs"
                            title="Delete Category"
                          >
                            <Trash2 className="w-4 h-4 stroke-[2.2]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Modal for Catalog Categories */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0A192F] border border-white/15 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white font-heading">
                {editingCategory ? 'Edit Catalog Category' : 'Add New Catalog Category'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white text-xl leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Japanese Titanium, Blue Cut, Sunglasses"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#060D17] border border-white/10 text-white text-xs focus:border-brand-cyan focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  URL Slug (Optional, auto-generated)
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="e.g. japanese-titanium"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#060D17] border border-white/10 text-white text-xs focus:border-brand-cyan focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Category Image *
                </label>
                <div className="mb-2">
                  <ImageUploadDropzone
                    value={formData.image_url}
                    onChange={(url) => setFormData({ ...formData, image_url: url })}
                    label="Upload Category Image"
                    sublabel="Click or drag PNG/JPG to upload to server"
                    prefix="category"
                  />
                </div>
                <input
                  type="text"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="Or paste image URL (https://...)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#060D17] border border-white/10 text-white text-xs focus:border-brand-cyan focus:outline-none"
                />
                {formData.image_url && (
                  <div className="mt-2 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full border-2 border-brand-cyan bg-[#060D17] overflow-hidden">
                      <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[11px] text-slate-400">Image Live Preview</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Description / Subtitle
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ultra-lightweight Japanese aerospace grade frames..."
                  className="w-full px-3.5 py-2 rounded-xl bg-[#060D17] border border-white/10 text-white text-xs focus:border-brand-cyan focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#060D17] border border-white/10 text-white text-xs focus:border-brand-cyan focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Visibility Status
                  </label>
                  <select
                    value={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: parseInt(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#060D17] border border-white/10 text-white text-xs focus:border-brand-cyan focus:outline-none"
                  >
                    <option value={1}>Live / Visible</option>
                    <option value={0}>Draft / Hidden</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCategory}
                  className="btn-primary px-5 py-2 rounded-xl text-xs font-bold shadow-cyan-glow flex items-center gap-2"
                >
                  {savingCategory ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
