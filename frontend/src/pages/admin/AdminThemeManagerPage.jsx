import React, { useState, useEffect, useMemo } from 'react';
import { 
  Palette, Sparkles, Calendar, Clock, Eye, Play, Copy, 
  Trash2, Plus, CheckCircle2, AlertCircle, Shield, Sliders,
  RefreshCw, Smartphone, Tablet, Monitor, X, Save, ArrowRight,
  Sun, Snowflake, Flame, Gift, Flag, Flower2, CloudRain, Check, AlertTriangle
} from 'lucide-react';
import api from '../../api/client';
import { useTheme, BUILT_IN_THEMES, calculateLuminance, getContrastText } from '../../context/ThemeContext';
import { BrandLogo } from '../../components/common/BrandLogo';
import { SeasonalLogoWrapper } from '../../components/theme/SeasonalLogoWrapper';

export const AdminThemeManagerPage = () => {
  const { 
    activeTheme, 
    seasonalTheme, 
    safeMode, 
    setSafeMode, 
    setSeasonalTheme, 
    refreshTheme, 
    setPreviewThemeSlug, 
    setPreviewOverrides 
  } = useTheme();

  // State
  const [themesList, setThemesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSlug, setActiveSlug] = useState(seasonalTheme);
  const [autoScheduling, setAutoScheduling] = useState(true);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [filterType, setFilterType] = useState('ALL'); // ALL, FESTIVAL, SEASONAL, CUSTOM

  // Modal / Editor State
  const [editingTheme, setEditingTheme] = useState(null);
  const [editorTab, setEditorTab] = useState('GENERAL'); // GENERAL, COLORS, CONTENT_EN, CONTENT_BN, DECORATIONS, SCHEDULE
  const [previewViewport, setPreviewViewport] = useState('DESKTOP'); // DESKTOP, TABLET, MOBILE
  const [isSaving, setIsSaving] = useState(false);

  // Fetch all themes from Admin API
  const fetchThemes = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/themes.php?action=list');
      if (res.success && res.data) {
        setThemesList(res.data.themes || []);
        setActiveSlug(res.data.active_theme || 'default');
        setAutoScheduling(res.data.auto_scheduling !== undefined ? res.data.auto_scheduling : true);
      } else {
        // Fallback: build list from BUILT_IN_THEMES
        setThemesList(Object.values(BUILT_IN_THEMES).map(t => ({
          ...t,
          is_system: 1,
          status: t.slug === seasonalTheme ? 'ACTIVE' : 'DRAFT',
          primary_color: t.palette.primary,
          secondary_color: t.palette.secondary,
          accent_color: t.palette.accent,
          bg_gradient_start: t.palette.bgStart,
          bg_gradient_end: t.palette.bgEnd,
          surface_color: t.palette.surface,
          text_primary: t.palette.textPrimary,
          button_bg: t.palette.button,
          button_text: t.palette.buttonText
        })));
      }
    } catch (err) {
      console.warn('Using built-in themes for admin display:', err);
      setThemesList(Object.values(BUILT_IN_THEMES).map(t => ({
        ...t,
        is_system: 1,
        status: t.slug === seasonalTheme ? 'ACTIVE' : 'DRAFT',
        primary_color: t.palette.primary,
        secondary_color: t.palette.secondary,
        accent_color: t.palette.accent,
        bg_gradient_start: t.palette.bgStart,
        bg_gradient_end: t.palette.bgEnd,
        surface_color: t.palette.surface,
        text_primary: t.palette.textPrimary,
        button_bg: t.palette.button,
        button_text: t.palette.buttonText
      })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThemes();
  }, []);

  // Activate Theme Live
  const handleActivate = async (slug) => {
    try {
      setFeedback({ type: '', message: '' });
      const res = await api.post('/admin/themes.php', { action: 'activate', slug });
      if (res.success) {
        setActiveSlug(slug);
        setSeasonalTheme(slug);
        setPreviewThemeSlug(null);
        setPreviewOverrides(null);
        setFeedback({ type: 'success', message: `Theme '${slug}' successfully activated live on storefront!` });
        fetchThemes();
        refreshTheme();
      }
    } catch (err) {
      // Local fallback activation
      setActiveSlug(slug);
      setSeasonalTheme(slug);
      setFeedback({ type: 'success', message: `Theme '${slug}' activated in local preview session.` });
    }
  };

  // Toggle Emergency Force Safe Mode
  const handleToggleSafeMode = async () => {
    const nextVal = !safeMode;
    try {
      const res = await api.post('/admin/themes.php', { action: 'toggle_safe_mode', enabled: nextVal });
      if (res.success) {
        setSafeMode(nextVal);
        setFeedback({ 
          type: nextVal ? 'warning' : 'success', 
          message: nextVal ? 'EMERGENCY SAFE MODE ENABLED: All decorative overlays & animations disabled.' : 'Safe Mode disabled: Visual animations restored.' 
        });
      }
    } catch (err) {
      setSafeMode(nextVal);
    }
  };

  // Toggle Auto-Scheduling
  const handleToggleAutoScheduling = async () => {
    const nextVal = !autoScheduling;
    try {
      const res = await api.post('/admin/themes.php', { action: 'toggle_auto_scheduling', enabled: nextVal });
      if (res.success) {
        setAutoScheduling(nextVal);
        setFeedback({ type: 'success', message: nextVal ? 'Auto Theme Scheduling ENABLED' : 'Auto Theme Scheduling DISABLED' });
      }
    } catch (err) {
      setAutoScheduling(nextVal);
    }
  };

  // Duplicate Theme
  const handleDuplicate = async (themeId) => {
    try {
      const res = await api.post('/admin/themes.php', { action: 'duplicate', theme_id: themeId });
      if (res.success) {
        setFeedback({ type: 'success', message: 'Theme duplicated successfully!' });
        fetchThemes();
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Duplicate failed' });
    }
  };

  // Delete Custom Theme
  const handleDelete = async (themeId, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete '${name}'?`)) return;
    try {
      const res = await api.post('/admin/themes.php', { action: 'delete', theme_id: themeId });
      if (res.success) {
        setFeedback({ type: 'success', message: `Theme '${name}' deleted.` });
        fetchThemes();
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Delete failed' });
    }
  };

  // Open Visual Studio Editor
  const handleOpenEditor = async (theme) => {
    const base = BUILT_IN_THEMES[theme.slug] || BUILT_IN_THEMES.default;
    try {
      const res = await api.get(`/admin/themes.php?action=detail&slug=${theme.slug}`);
      if (res.success && res.data) {
        setEditingTheme({
          id: res.data.theme.id,
          slug: res.data.theme.slug,
          name: res.data.theme.name,
          description: res.data.theme.description || '',
          status: res.data.theme.status || 'DRAFT',
          is_system: res.data.theme.is_system,
          settings: {
            ...base.palette,
            ...base.decorations,
            ...(res.data.settings || {})
          },
          content: {
            en: { ...base.content.en, ...(res.data.content?.en || {}) },
            bn: { ...base.content.bn, ...(res.data.content?.bn || {}) }
          },
          schedule: res.data.schedule || {
            start_date: '',
            end_date: '',
            auto_activate: 1
          }
        });
      } else {
        throw new Error('Fallback to local');
      }
    } catch {
      setEditingTheme({
        id: theme.id || 0,
        slug: theme.slug,
        name: theme.name,
        description: theme.description || '',
        status: theme.status || 'DRAFT',
        is_system: theme.is_system,
        settings: {
          primary_color: theme.primary_color || base.palette.primary,
          secondary_color: theme.secondary_color || base.palette.secondary,
          accent_color: theme.accent_color || base.palette.accent,
          bg_gradient_start: theme.bg_gradient_start || base.palette.bgStart,
          bg_gradient_end: theme.bg_gradient_end || base.palette.bgEnd,
          surface_color: theme.surface_color || base.palette.surface,
          text_primary: theme.text_primary || base.palette.textPrimary,
          text_secondary: base.palette.textSecondary,
          text_muted: base.palette.textMuted,
          heading_color: base.palette.heading,
          border_color: base.palette.border,
          button_bg: theme.button_bg || base.palette.button,
          button_text: theme.button_text || base.palette.buttonText,
          button_hover_bg: base.palette.buttonHover,
          particles_enabled: base.decorations.particles ? 1 : 0,
          decorations_enabled: base.decorations.decorations ? 1 : 0,
          kash_flowers_enabled: base.decorations.kashFlowers ? 1 : 0,
          diyas_enabled: base.decorations.diyas ? 1 : 0,
          snow_enabled: base.decorations.snow ? 1 : 0,
          petals_enabled: base.decorations.petals ? 1 : 0,
          rain_enabled: base.decorations.rain ? 1 : 0,
          santa_enabled: base.decorations.santa ? 1 : 0,
          chakra_enabled: base.decorations.chakra ? 1 : 0,
          animation_intensity: base.decorations.intensity,
          animation_speed: base.decorations.speed,
          loading_duration_ms: base.decorations.loadingDuration
        },
        content: {
          en: { ...base.content.en },
          bn: { ...base.content.bn }
        },
        schedule: {
          start_date: '',
          end_date: '',
          auto_activate: 1
        }
      });
    }

    // Set Live Preview Override
    setPreviewThemeSlug(theme.slug);
  };

  // Close Editor & Discard Live Preview
  const handleCloseEditor = () => {
    setEditingTheme(null);
    setPreviewThemeSlug(null);
    setPreviewOverrides(null);
  };

  // Create New Custom Theme
  const handleCreateNewTheme = () => {
    const defaultSlug = 'custom_' + Date.now();
    const base = BUILT_IN_THEMES.default;
    setEditingTheme({
      id: 0,
      slug: defaultSlug,
      name: 'New Custom Theme',
      description: 'Custom seasonal theme designed in Netra Theme Studio.',
      status: 'DRAFT',
      is_system: 0,
      settings: {
        primary_color: '#00B4D8',
        secondary_color: '#0A192F',
        accent_color: '#00F5D4',
        bg_gradient_start: '#FFFFFF',
        bg_gradient_end: '#F8FAFC',
        surface_color: '#FFFFFF',
        text_primary: '#0F172A',
        text_secondary: '#334155',
        text_muted: '#64748B',
        heading_color: '#0A192F',
        border_color: '#E2E8F0',
        button_bg: '#00B4D8',
        button_text: '#FFFFFF',
        button_hover_bg: '#0284C7',
        particles_enabled: 1,
        decorations_enabled: 1,
        kash_flowers_enabled: 0,
        diyas_enabled: 0,
        snow_enabled: 0,
        petals_enabled: 0,
        rain_enabled: 0,
        santa_enabled: 0,
        chakra_enabled: 0,
        animation_intensity: 'subtle',
        animation_speed: 1.0,
        loading_duration_ms: 2000
      },
      content: {
        en: {
          announcementBadge: 'SPECIAL EDITION',
          announcementText: 'Special Eyewear Drop • Netra Unnayan Precision Optics',
          festivalGreeting: 'Clarity You Can Trust',
          heroTitle: 'CELEBRATE WITH PRECISION OPTICAL EXCELLENCE',
          heroSubtitle: 'Handcrafted Japanese Titanium and German Precision Lenses.',
          heroCtaText: 'Explore Collection',
          heroCtaLink: '/catalog',
          productBadge: 'Special Drop',
          loadingGreeting: 'NETRA UNNAYAN',
          loadingTagline: 'CALIBRATING PRECISION VISION...',
          footerMessage: 'Crafted for Visionary Clarity • Netra Unnayan'
        },
        bn: {
          announcementBadge: 'বিশেষ অফার',
          announcementText: 'নেত্র উন্নয়ন — দিঘার বিশ্বস্ত অপটিক্যাল ও চক্ষু পরিচর্যা কেন্দ্র',
          festivalGreeting: 'স্পষ্ট দৃষ্টি, বিশ্বস্ত প্রতিষ্ঠান',
          heroTitle: 'স্পষ্ট দৃষ্টি ও নির্ভরযোগ্য চক্ষু সেবা',
          heroSubtitle: 'প্রিমিয়াম জাপানি টাইটানিয়াম ফ্রেম ও নিখুঁত জার্মান লেন্স প্রযুক্তি।',
          heroCtaText: 'কালেকশন দেখুন',
          heroCtaLink: '/catalog',
          productBadge: 'স্পেশাল',
          loadingGreeting: 'নেত্র উন্নয়ন',
          loadingTagline: 'অপটিক্যাল ভিশন প্রস্তুত হচ্ছে...',
          footerMessage: 'বিশ্বস্ত দৃষ্টির অঙ্গীকার • নেত্র উন্নয়ন'
        }
      },
      schedule: {
        start_date: '',
        end_date: '',
        auto_activate: 1
      }
    });
    setPreviewThemeSlug('default');
  };

  // Save Theme Updates
  const handleSaveTheme = async () => {
    if (!editingTheme) return;
    try {
      setIsSaving(true);
      const payload = {
        action: editingTheme.id ? 'update' : 'create',
        theme_id: editingTheme.id,
        slug: editingTheme.slug,
        name: editingTheme.name,
        description: editingTheme.description,
        status: editingTheme.status,
        settings: editingTheme.settings,
        content: editingTheme.content,
        schedule: editingTheme.schedule
      };
      const res = await api.post('/admin/themes.php', payload);
      if (res.success) {
        setFeedback({ type: 'success', message: `Theme '${editingTheme.name}' saved successfully!` });
        fetchThemes();
        refreshTheme();
        handleCloseEditor();
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save theme' });
    } finally {
      setIsSaving(false);
    }
  };

  // Live contrast evaluation
  const bgLuminance = useMemo(() => {
    if (!editingTheme?.settings?.bg_gradient_start) return 0.5;
    return calculateLuminance(editingTheme.settings.bg_gradient_start);
  }, [editingTheme?.settings?.bg_gradient_start]);

  const textContrastWarning = useMemo(() => {
    if (!editingTheme?.settings?.text_primary || !editingTheme?.settings?.bg_gradient_start) return null;
    const bgLum = calculateLuminance(editingTheme.settings.bg_gradient_start);
    const textLum = calculateLuminance(editingTheme.settings.text_primary);
    const ratio = (Math.max(bgLum, textLum) + 0.05) / (Math.min(bgLum, textLum) + 0.05);
    if (ratio < 4.5) {
      return `Warning: Contrast ratio is ${ratio.toFixed(1)}:1 (WCAG recommends 4.5:1). Text may be hard to read!`;
    }
    return null;
  }, [editingTheme?.settings?.text_primary, editingTheme?.settings?.bg_gradient_start]);

  // Filtered themes list
  const filteredThemes = useMemo(() => {
    if (filterType === 'FESTIVAL') return themesList.filter(t => t.type === 'festival');
    if (filterType === 'SEASONAL') return themesList.filter(t => t.type === 'seasonal');
    if (filterType === 'CUSTOM') return themesList.filter(t => !t.is_system);
    return themesList;
  }, [themesList, filterType]);

  const getThemeIcon = (slug) => {
    switch (slug) {
      case 'durga_puja': return <Sparkles className="w-4 h-4 text-amber-500" />;
      case 'diwali': return <Flame className="w-4 h-4 text-amber-400" />;
      case 'christmas': return <Gift className="w-4 h-4 text-rose-500" />;
      case 'summer': return <Sun className="w-4 h-4 text-amber-500" />;
      case 'winter': return <Snowflake className="w-4 h-4 text-sky-400" />;
      case 'independence':
      case 'republic': return <Flag className="w-4 h-4 text-orange-500" />;
      case 'spring': return <Flower2 className="w-4 h-4 text-pink-400" />;
      case 'monsoon': return <CloudRain className="w-4 h-4 text-teal-400" />;
      default: return <Palette className="w-4 h-4 text-brand-cyan" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      
      {/* 1. TOP HEADER & EMERGENCY SAFETY CONTROLS */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 relative overflow-hidden">
        {/* Background atmospheric glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-cyan/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-brand-cyan/20 border border-brand-cyan/40 flex items-center justify-center text-brand-cyan shadow-cyan-glow">
                <Palette className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
                  <span>Seasonal Theme Studio</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[10px] uppercase tracking-wider font-bold">
                    Production Engine
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Full-site visual atmosphere, seasonal animations, contrast guard, and automated scheduling.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons & Safety Switches */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Automated Scheduling Toggle */}
            <button
              onClick={handleToggleAutoScheduling}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                autoScheduling 
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
              }`}
              title="When enabled, scheduled themes activate automatically according to start & end dates"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Auto-Scheduling: {autoScheduling ? 'ON' : 'OFF'}</span>
            </button>

            {/* Emergency FORCE SAFE MODE Toggle */}
            <button
              onClick={handleToggleSafeMode}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all flex items-center gap-2 ${
                safeMode
                  ? 'bg-rose-600 text-white border-rose-400 shadow-rose-glow animate-pulse'
                  : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
              }`}
              title="Instantly disables all festive particles, background animations, and floating decorations across the website"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{safeMode ? '⚠️ SAFE MODE ACTIVE' : 'FORCE SAFE MODE'}</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert Toast */}
        {feedback.message && (
          <div className={`mt-5 p-3.5 rounded-xl border flex items-center gap-3 text-xs font-semibold animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : feedback.type === 'warning'
              ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
              : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
          }`}>
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{feedback.message}</span>
            <button onClick={() => setFeedback({ type: '', message: '' })} className="ml-auto p-1 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 2. FILTER BAR & STATS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/5 border border-white/10 text-xs w-fit">
          {[
            { id: 'ALL', label: 'All Themes' },
            { id: 'FESTIVAL', label: 'Festivals' },
            { id: 'SEASONAL', label: 'Seasonal' },
            { id: 'CUSTOM', label: 'Custom' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                filterType === tab.id
                  ? 'bg-brand-cyan text-slate-950 shadow-cyan-glow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span>Currently Live:</span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold font-mono">
              {activeSlug.toUpperCase()}
            </span>
          </div>

          <button
            onClick={handleCreateNewTheme}
            className="btn-primary py-2 px-4 rounded-xl text-xs font-bold shadow-cyan-glow flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Theme</span>
          </button>
        </div>
      </div>

      {/* 3. THEMES GRID CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredThemes.map(t => {
          const isLive = activeSlug === t.slug;
          const bgStart = t.bg_gradient_start || t.palette?.bgStart || '#FFFFFF';
          const bgEnd = t.bg_gradient_end || t.palette?.bgEnd || '#F8FAFC';
          const primary = t.primary_color || t.palette?.primary || '#00B4D8';
          const accent = t.accent_color || t.palette?.accent || '#00F5D4';

          return (
            <div 
              key={t.slug}
              className={`rounded-3xl p-6 border transition-all duration-300 relative flex flex-col justify-between overflow-hidden group ${
                isLive
                  ? 'bg-slate-900/95 border-emerald-500/60 shadow-[0_12px_40px_rgba(16,185,129,0.18)] ring-2 ring-emerald-500/40'
                  : 'bg-slate-900/70 border-white/10 hover:border-white/20 hover:bg-slate-900/90 shadow-xl'
              }`}
            >
              <div>
                {/* Live Badge & Type */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                      {getThemeIcon(t.slug)}
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                        {t.type}
                      </span>
                    </div>
                  </div>

                  {isLive ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-emerald-glow">
                      <Check className="w-3 h-3 stroke-[3]" /> LIVE ON STOREFRONT
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400 text-[10px] font-bold uppercase">
                      {t.status || 'DRAFT'}
                    </span>
                  )}
                </div>

                {/* Theme Name & Description */}
                <h3 className="text-base font-bold text-white tracking-tight group-hover:text-brand-cyan transition-colors">
                  {t.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-2">
                  {t.description}
                </p>

                {/* Color Palette Preview Swatch */}
                <div className="mt-4 p-3 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>Palette Mood</span>
                    <span className="text-white font-bold">{primary}</span>
                  </div>
                  <div className="h-4 w-full rounded-lg overflow-hidden flex border border-white/10 shadow-inner">
                    <div className="h-full flex-1" style={{ background: bgStart }} title="Background Start" />
                    <div className="h-full flex-1" style={{ background: bgEnd }} title="Background End" />
                    <div className="h-full flex-1" style={{ background: primary }} title="Primary Accent" />
                    <div className="h-full flex-1" style={{ background: accent }} title="Secondary Accent" />
                  </div>
                </div>

                {/* Schedule Window (if configured) */}
                {t.schedule_start && t.schedule_end && (
                  <div className="mt-3 p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/20 text-[11px] text-cyan-300 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                    <span className="truncate">
                      {new Date(t.schedule_start).toLocaleDateString('en-IN')} – {new Date(t.schedule_end).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-5 border-t border-white/10 mt-5 flex items-center justify-between gap-2">
                {!isLive ? (
                  <button
                    onClick={() => handleActivate(t.slug)}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-all"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Activate Live</span>
                  </button>
                ) : (
                  <div className="flex-1 py-2 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold text-center">
                    ✓ Currently Serving Customers
                  </div>
                )}

                <button
                  onClick={() => handleOpenEditor(t)}
                  className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-all"
                  title="Open Visual Studio Editor"
                >
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Customize</span>
                </button>

                <button
                  onClick={() => handleDuplicate(t.id)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all"
                  title="Duplicate Theme"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>

                {!t.is_system && (
                  <button
                    onClick={() => handleDelete(t.id, t.name)}
                    className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-all"
                    title="Delete Custom Theme"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* =========================================================================
          4. VISUAL STUDIO & SPLIT-SCREEN LIVE PREVIEW MODAL
          ========================================================================= */}
      {editingTheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xl animate-fade-in">
          <div className="w-full max-w-7xl h-[94vh] bg-[#070E1A] border border-white/20 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            
            {/* Studio Top Navigation Bar */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-cyan/20 border border-brand-cyan/40 flex items-center justify-center text-brand-cyan">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                    <span>Theme Studio:</span>
                    <span className="text-brand-cyan">{editingTheme.name}</span>
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Live split-screen preview. Edits apply immediately in the preview monitor on the right.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveTheme}
                  disabled={isSaving}
                  className="btn-primary py-2 px-5 rounded-xl text-xs font-bold shadow-cyan-glow flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
                </button>

                <button
                  onClick={handleCloseEditor}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Studio Body: Split-Screen Left / Right */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
              
              {/* LEFT COLUMN: Controls & Tabbed Editor (5 Cols) */}
              <div className="lg:col-span-6 xl:col-span-5 border-r border-white/10 flex flex-col h-full overflow-hidden bg-slate-900/50">
                {/* Tabs */}
                <div className="flex items-center gap-1 p-3 border-b border-white/10 overflow-x-auto text-xs shrink-0">
                  {[
                    { id: 'GENERAL', label: 'General' },
                    { id: 'COLORS', label: 'Colors & Contrast' },
                    { id: 'CONTENT_EN', label: 'English Copy' },
                    { id: 'CONTENT_BN', label: 'Bengali Copy (বাংলা)' },
                    { id: 'DECORATIONS', label: 'Decorations' },
                    { id: 'SCHEDULE', label: 'Scheduling' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setEditorTab(tab.id)}
                      className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                        editorTab === tab.id
                          ? 'bg-brand-cyan text-slate-950 shadow'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab Content Panel */}
                <div className="flex-1 p-6 overflow-y-auto space-y-5 text-xs">
                  
                  {/* TAB 1: GENERAL */}
                  {editorTab === 'GENERAL' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-slate-300 font-bold mb-1">Theme Name *</label>
                        <input
                          type="text"
                          value={editingTheme.name}
                          onChange={(e) => setEditingTheme(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full glass-input rounded-xl p-3 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 font-bold mb-1">Theme Description</label>
                        <textarea
                          rows="2"
                          value={editingTheme.description}
                          onChange={(e) => setEditingTheme(prev => ({ ...prev, description: e.target.value }))}
                          className="w-full glass-input rounded-xl p-3 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 font-bold mb-1">Theme Status</label>
                        <select
                          value={editingTheme.status}
                          onChange={(e) => setEditingTheme(prev => ({ ...prev, status: e.target.value }))}
                          className="w-full glass-input rounded-xl p-3 text-xs text-white bg-[#0A192F]"
                        >
                          <option value="DRAFT">DRAFT</option>
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="SCHEDULED">SCHEDULED</option>
                          <option value="DISABLED">DISABLED</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: COLORS & CONTRAST TOKENS */}
                  {editorTab === 'COLORS' && (
                    <div className="space-y-4">
                      {textContrastWarning && (
                        <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>{textContrastWarning}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-300 font-bold mb-1">Background Start</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={editingTheme.settings.bg_gradient_start}
                              onChange={(e) => setEditingTheme(prev => ({
                                ...prev,
                                settings: { ...prev.settings, bg_gradient_start: e.target.value }
                              }))}
                              className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0"
                            />
                            <input
                              type="text"
                              value={editingTheme.settings.bg_gradient_start}
                              onChange={(e) => setEditingTheme(prev => ({
                                ...prev,
                                settings: { ...prev.settings, bg_gradient_start: e.target.value }
                              }))}
                              className="flex-1 glass-input rounded-xl px-2.5 py-1.5 text-xs font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-slate-300 font-bold mb-1">Background End</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={editingTheme.settings.bg_gradient_end}
                              onChange={(e) => setEditingTheme(prev => ({
                                ...prev,
                                settings: { ...prev.settings, bg_gradient_end: e.target.value }
                              }))}
                              className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0"
                            />
                            <input
                              type="text"
                              value={editingTheme.settings.bg_gradient_end}
                              onChange={(e) => setEditingTheme(prev => ({
                                ...prev,
                                settings: { ...prev.settings, bg_gradient_end: e.target.value }
                              }))}
                              className="flex-1 glass-input rounded-xl px-2.5 py-1.5 text-xs font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-slate-300 font-bold mb-1">Primary Color (Accent)</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={editingTheme.settings.primary_color}
                              onChange={(e) => setEditingTheme(prev => ({
                                ...prev,
                                settings: { ...prev.settings, primary_color: e.target.value }
                              }))}
                              className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0"
                            />
                            <input
                              type="text"
                              value={editingTheme.settings.primary_color}
                              onChange={(e) => setEditingTheme(prev => ({
                                ...prev,
                                settings: { ...prev.settings, primary_color: e.target.value }
                              }))}
                              className="flex-1 glass-input rounded-xl px-2.5 py-1.5 text-xs font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-slate-300 font-bold mb-1">Accent Secondary</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={editingTheme.settings.accent_color}
                              onChange={(e) => setEditingTheme(prev => ({
                                ...prev,
                                settings: { ...prev.settings, accent_color: e.target.value }
                              }))}
                              className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0"
                            />
                            <input
                              type="text"
                              value={editingTheme.settings.accent_color}
                              onChange={(e) => setEditingTheme(prev => ({
                                ...prev,
                                settings: { ...prev.settings, accent_color: e.target.value }
                              }))}
                              className="flex-1 glass-input rounded-xl px-2.5 py-1.5 text-xs font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-slate-300 font-bold mb-1">Primary Text Color</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={editingTheme.settings.text_primary}
                              onChange={(e) => setEditingTheme(prev => ({
                                ...prev,
                                settings: { ...prev.settings, text_primary: e.target.value }
                              }))}
                              className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0"
                            />
                            <input
                              type="text"
                              value={editingTheme.settings.text_primary}
                              onChange={(e) => setEditingTheme(prev => ({
                                ...prev,
                                settings: { ...prev.settings, text_primary: e.target.value }
                              }))}
                              className="flex-1 glass-input rounded-xl px-2.5 py-1.5 text-xs font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-slate-300 font-bold mb-1">Button Background</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={editingTheme.settings.button_bg}
                              onChange={(e) => setEditingTheme(prev => ({
                                ...prev,
                                settings: { ...prev.settings, button_bg: e.target.value }
                              }))}
                              className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0"
                            />
                            <input
                              type="text"
                              value={editingTheme.settings.button_bg}
                              onChange={(e) => setEditingTheme(prev => ({
                                ...prev,
                                settings: { ...prev.settings, button_bg: e.target.value }
                              }))}
                              className="flex-1 glass-input rounded-xl px-2.5 py-1.5 text-xs font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: ENGLISH CONTENT */}
                  {editorTab === 'CONTENT_EN' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-slate-300 font-bold mb-1">Announcement Badge (Top Bar)</label>
                        <input
                          type="text"
                          value={editingTheme.content.en.announcementBadge || ''}
                          onChange={(e) => setEditingTheme(prev => ({
                            ...prev,
                            content: { ...prev.content, en: { ...prev.content.en, announcementBadge: e.target.value } }
                          }))}
                          className="w-full glass-input rounded-xl p-2.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 font-bold mb-1">Announcement Text (Top Ribbon)</label>
                        <input
                          type="text"
                          value={editingTheme.content.en.announcementText || ''}
                          onChange={(e) => setEditingTheme(prev => ({
                            ...prev,
                            content: { ...prev.content, en: { ...prev.content.en, announcementText: e.target.value } }
                          }))}
                          className="w-full glass-input rounded-xl p-2.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 font-bold mb-1">Hero Heading Title</label>
                        <input
                          type="text"
                          value={editingTheme.content.en.heroTitle || ''}
                          onChange={(e) => setEditingTheme(prev => ({
                            ...prev,
                            content: { ...prev.content, en: { ...prev.content.en, heroTitle: e.target.value } }
                          }))}
                          className="w-full glass-input rounded-xl p-2.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 font-bold mb-1">Hero Subtitle</label>
                        <textarea
                          rows="2"
                          value={editingTheme.content.en.heroSubtitle || ''}
                          onChange={(e) => setEditingTheme(prev => ({
                            ...prev,
                            content: { ...prev.content, en: { ...prev.content.en, heroSubtitle: e.target.value } }
                          }))}
                          className="w-full glass-input rounded-xl p-2.5 text-xs text-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-300 font-bold mb-1">Hero CTA Button Text</label>
                          <input
                            type="text"
                            value={editingTheme.content.en.heroCtaText || ''}
                            onChange={(e) => setEditingTheme(prev => ({
                              ...prev,
                              content: { ...prev.content, en: { ...prev.content.en, heroCtaText: e.target.value } }
                            }))}
                            className="w-full glass-input rounded-xl p-2.5 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-300 font-bold mb-1">Product Card Badge</label>
                          <input
                            type="text"
                            value={editingTheme.content.en.productBadge || ''}
                            onChange={(e) => setEditingTheme(prev => ({
                              ...prev,
                              content: { ...prev.content, en: { ...prev.content.en, productBadge: e.target.value } }
                            }))}
                            className="w-full glass-input rounded-xl p-2.5 text-xs text-white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-slate-300 font-bold mb-1">Loading Screen Tagline</label>
                        <input
                          type="text"
                          value={editingTheme.content.en.loadingTagline || ''}
                          onChange={(e) => setEditingTheme(prev => ({
                            ...prev,
                            content: { ...prev.content, en: { ...prev.content.en, loadingTagline: e.target.value } }
                          }))}
                          className="w-full glass-input rounded-xl p-2.5 text-xs text-white font-mono"
                        />
                      </div>
                    </div>
                  )}

                  {/* TAB 4: BENGALI CONTENT (বাংলা) */}
                  {editorTab === 'CONTENT_BN' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-slate-300 font-bold mb-1">অ্যানাউন্সমেন্ট ব্যাজ (বাংলা)</label>
                        <input
                          type="text"
                          value={editingTheme.content.bn.announcementBadge || ''}
                          onChange={(e) => setEditingTheme(prev => ({
                            ...prev,
                            content: { ...prev.content, bn: { ...prev.content.bn, announcementBadge: e.target.value } }
                          }))}
                          className="w-full glass-input rounded-xl p-2.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 font-bold mb-1">অ্যানাউন্সমেন্ট টেক্সট (বাংলা)</label>
                        <input
                          type="text"
                          value={editingTheme.content.bn.announcementText || ''}
                          onChange={(e) => setEditingTheme(prev => ({
                            ...prev,
                            content: { ...prev.content, bn: { ...prev.content.bn, announcementText: e.target.value } }
                          }))}
                          className="w-full glass-input rounded-xl p-2.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 font-bold mb-1">হিরো হেডিং (বাংলা)</label>
                        <input
                          type="text"
                          value={editingTheme.content.bn.heroTitle || ''}
                          onChange={(e) => setEditingTheme(prev => ({
                            ...prev,
                            content: { ...prev.content, bn: { ...prev.content.bn, heroTitle: e.target.value } }
                          }))}
                          className="w-full glass-input rounded-xl p-2.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 font-bold mb-1">হিরো সাবটাইটেল (বাংলা)</label>
                        <textarea
                          rows="2"
                          value={editingTheme.content.bn.heroSubtitle || ''}
                          onChange={(e) => setEditingTheme(prev => ({
                            ...prev,
                            content: { ...prev.content, bn: { ...prev.content.bn, heroSubtitle: e.target.value } }
                          }))}
                          className="w-full glass-input rounded-xl p-2.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 font-bold mb-1">উৎসবের শুভেচ্ছা / উৎসব বাণী (বাংলা)</label>
                        <input
                          type="text"
                          value={editingTheme.content.bn.festivalGreeting || ''}
                          onChange={(e) => setEditingTheme(prev => ({
                            ...prev,
                            content: { ...prev.content, bn: { ...prev.content.bn, festivalGreeting: e.target.value } }
                          }))}
                          className="w-full glass-input rounded-xl p-2.5 text-xs text-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* TAB 5: DECORATIONS & MOTION */}
                  {editorTab === 'DECORATIONS' && (
                    <div className="space-y-4">
                      <div className="space-y-2.5">
                        <span className="block text-slate-300 font-bold">Seasonal Decorative Elements</span>
                        {[
                          { key: 'kash_flowers_enabled', label: '🌾 Kash Flowers (কাশফুল - Swaying Reeds)' },
                          { key: 'diyas_enabled', label: '🪔 Traditional Clay Diyas (প্রদীপ - Flickering Flames)' },
                          { key: 'snow_enabled', label: '❄️ Gentle Falling Snow' },
                          { key: 'petals_enabled', label: '🌸 Drifting Basanta Flower Petals' },
                          { key: 'rain_enabled', label: '🌧️ Monsoon Rain Drizzle & Drops' },
                          { key: 'santa_enabled', label: '🎅 Christmas Santa Sleigh & Hat' },
                          { key: 'chakra_enabled', label: '🇮🇳 Ashoka Chakra Geometry' }
                        ].map(item => (
                          <label key={item.key} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/5 cursor-pointer hover:bg-white/[0.06]">
                            <input
                              type="checkbox"
                              checked={Boolean(editingTheme.settings[item.key])}
                              onChange={(e) => setEditingTheme(prev => ({
                                ...prev,
                                settings: { ...prev.settings, [item.key]: e.target.checked ? 1 : 0 }
                              }))}
                              className="rounded border-white/20 text-brand-cyan focus:ring-0"
                            />
                            <span className="text-xs text-white font-medium">{item.label}</span>
                          </label>
                        ))}
                      </div>

                      <div className="pt-2">
                        <label className="block text-slate-300 font-bold mb-1">Loading Screen Duration: {editingTheme.settings.loading_duration_ms || 2000}ms</label>
                        <input
                          type="range"
                          min="1000"
                          max="4000"
                          step="200"
                          value={editingTheme.settings.loading_duration_ms || 2000}
                          onChange={(e) => setEditingTheme(prev => ({
                            ...prev,
                            settings: { ...prev.settings, loading_duration_ms: parseInt(e.target.value) }
                          }))}
                          className="w-full accent-brand-cyan"
                        />
                      </div>
                    </div>
                  )}

                  {/* TAB 6: SCHEDULING */}
                  {editorTab === 'SCHEDULE' && (
                    <div className="space-y-4">
                      <p className="text-slate-400 text-xs leading-relaxed">
                        Configure automatic activation dates. When the start time arrives, this theme will automatically go live on the storefront. Once expired, the site cleanly returns to the Default Theme.
                      </p>

                      <div>
                        <label className="block text-slate-300 font-bold mb-1">Start Date &amp; Time</label>
                        <input
                          type="datetime-local"
                          value={editingTheme.schedule?.start_date ? editingTheme.schedule.start_date.replace(' ', 'T').substring(0, 16) : ''}
                          onChange={(e) => setEditingTheme(prev => ({
                            ...prev,
                            schedule: { ...prev.schedule, start_date: e.target.value.replace('T', ' ') + ':00' }
                          }))}
                          className="w-full glass-input rounded-xl p-3 text-xs text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-300 font-bold mb-1">End Date &amp; Time (Expiration)</label>
                        <input
                          type="datetime-local"
                          value={editingTheme.schedule?.end_date ? editingTheme.schedule.end_date.replace(' ', 'T').substring(0, 16) : ''}
                          onChange={(e) => setEditingTheme(prev => ({
                            ...prev,
                            schedule: { ...prev.schedule, end_date: e.target.value.replace('T', ' ') + ':00' }
                          }))}
                          className="w-full glass-input rounded-xl p-3 text-xs text-white"
                        />
                      </div>

                      <label className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(editingTheme.schedule?.auto_activate)}
                          onChange={(e) => setEditingTheme(prev => ({
                            ...prev,
                            schedule: { ...prev.schedule, auto_activate: e.target.checked ? 1 : 0 }
                          }))}
                          className="rounded border-white/20 text-brand-cyan"
                        />
                        <span className="text-xs text-white font-medium">Auto-activate during scheduled window</span>
                      </label>
                    </div>
                  )}

                </div>
              </div>

              {/* RIGHT COLUMN: Live Split-Screen Viewport Monitor (7 Cols) */}
              <div className="lg:col-span-6 xl:col-span-7 flex flex-col h-full overflow-hidden bg-black/60">
                {/* Viewport Toolbar */}
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-black/30">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>Preview Viewport:</span>
                    <span className="font-bold text-brand-cyan">{previewViewport}</span>
                  </div>

                  <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
                    <button
                      onClick={() => setPreviewViewport('DESKTOP')}
                      className={`p-1.5 rounded-lg transition-all ${
                        previewViewport === 'DESKTOP' ? 'bg-brand-cyan text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                      title="Desktop Preview (100%)"
                    >
                      <Monitor className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPreviewViewport('TABLET')}
                      className={`p-1.5 rounded-lg transition-all ${
                        previewViewport === 'TABLET' ? 'bg-brand-cyan text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                      title="Tablet Preview (768px)"
                    >
                      <Tablet className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPreviewViewport('MOBILE')}
                      className={`p-1.5 rounded-lg transition-all ${
                        previewViewport === 'MOBILE' ? 'bg-brand-cyan text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                      title="Mobile Preview (375px)"
                    >
                      <Smartphone className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Simulated Responsive Storefront Container */}
                <div className="flex-1 p-4 overflow-y-auto flex items-start justify-center bg-slate-950/80">
                  <div 
                    className="transition-all duration-300 shadow-2xl rounded-2xl overflow-hidden border border-white/20 flex flex-col"
                    style={{
                      width: previewViewport === 'MOBILE' ? '375px' : previewViewport === 'TABLET' ? '680px' : '100%',
                      minHeight: '520px',
                      background: `linear-gradient(135deg, ${editingTheme.settings.bg_gradient_start || '#FFFFFF'}, ${editingTheme.settings.bg_gradient_end || '#F8FAFC'})`,
                      color: editingTheme.settings.text_primary || '#0F172A'
                    }}
                  >
                    {/* 1. Simulated Festive Announcement Banner */}
                    <div 
                      className="px-3 py-2 text-center text-xs font-semibold shadow-md flex items-center justify-center gap-2"
                      style={{
                        background: `linear-gradient(90deg, ${editingTheme.settings.primary_color}, ${editingTheme.settings.accent_color})`,
                        color: '#FFFFFF'
                      }}
                    >
                      <span className="px-2 py-0.5 rounded-full bg-black/30 text-[10px] font-black uppercase">
                        {editingTheme.content.en.announcementBadge || 'OFFER'}
                      </span>
                      <span className="truncate text-xs font-bold">
                        {editingTheme.content.en.announcementText || 'Welcome to Netra Unnayan'}
                      </span>
                    </div>

                    {/* 2. Simulated Navbar with Sacred Logo Wrapper */}
                    <div className="px-4 py-3 border-b border-black/10 flex items-center justify-between bg-white/70 backdrop-blur-md">
                      <div className="flex items-center gap-2">
                        <SeasonalLogoWrapper>
                          <BrandLogo size="compact" />
                        </SeasonalLogoWrapper>
                      </div>

                      <div className="flex items-center gap-3 text-xs font-bold text-slate-800">
                        <span className="hidden sm:inline">Eyewear</span>
                        <span className="hidden sm:inline">Doctors</span>
                        <div 
                          className="px-3 py-1.5 rounded-xl text-white font-bold text-[11px] shadow-sm"
                          style={{ background: editingTheme.settings.button_bg }}
                        >
                          Cart (0)
                        </div>
                      </div>
                    </div>

                    {/* 3. Simulated Hero Section with Theme Headline */}
                    <div className="p-6 sm:p-8 space-y-4">
                      <div className="space-y-2">
                        <span 
                          className="inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
                          style={{
                            background: `${editingTheme.settings.primary_color}20`,
                            color: editingTheme.settings.primary_color
                          }}
                        >
                          {editingTheme.content.en.announcementBadge || 'SEASONAL DROP'}
                        </span>
                        <h1 
                          className="text-xl sm:text-2xl font-black tracking-tight leading-snug"
                          style={{ color: editingTheme.settings.heading_color || editingTheme.settings.text_primary }}
                        >
                          {editingTheme.content.en.heroTitle || 'Precision Optical Care'}
                        </h1>
                        <p className="text-xs leading-relaxed opacity-85">
                          {editingTheme.content.en.heroSubtitle || 'Discover eyewear crafted for your festive celebrations.'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button 
                          className="px-4 py-2 rounded-xl text-xs font-black uppercase shadow tracking-wider text-white"
                          style={{ background: editingTheme.settings.button_bg }}
                        >
                          {editingTheme.content.en.heroCtaText || 'Explore Now'}
                        </button>
                        <span className="text-xs italic opacity-75">
                          — {editingTheme.content.bn.festivalGreeting}
                        </span>
                      </div>

                      {/* 4. Simulated Product Card with Theme Badge */}
                      <div className="pt-4 border-t border-black/10">
                        <div className="p-4 rounded-2xl bg-white/80 border border-black/10 shadow-sm max-w-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span 
                              className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase text-white shadow-xs"
                              style={{ background: editingTheme.settings.primary_color }}
                            >
                              {editingTheme.content.en.productBadge || 'Special'}
                            </span>
                            <span className="text-xs font-mono font-bold text-slate-800">₹1,499</span>
                          </div>
                          <div className="h-16 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-400">
                            [ Product Optical Frame ]
                          </div>
                          <p className="text-xs font-bold text-slate-900 truncate">Netra Titanium Aviator</p>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
