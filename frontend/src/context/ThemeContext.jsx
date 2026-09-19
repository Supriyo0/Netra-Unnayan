import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

export const THEME_CONFIGS = {
  default: {
    id: 'default',
    name: 'Sapphire & Cyan (Official)',
    tagline: 'Luxury Optical White & Midnight Obsidian',
    bannerText: 'Welcome to Netra Unnayan • Precision Optical Eyewear & Clinic in Digha',
    badge: 'LUXURY OPTICAL',
    greetingBengali: 'স্পষ্ট দৃষ্টি, বিশ্বস্ত প্রতিষ্ঠান',
    greetingEnglish: 'Clarity You Can Trust',
    primaryColor: '#00B4D8',
    accentColor: '#0A2540',
    loadingTagline: 'CALIBRATING GERMAN OPTICAL APERTURE',
    iconEmoji: '👓'
  },
  durga_puja: {
    id: 'durga_puja',
    name: 'Durga Puja / Sharodotsav',
    tagline: 'Agomoni Crimson Red, Marigold Gold & Festive কাশফুল',
    bannerText: '✨ শুভ শারদীয়া! উৎসবের দিনগুলিতে পেয়ে যান স্পেশাল অফার ও ফ্রি আই চেকআপ • Netra Unnayan Digha',
    badge: 'শুভ শারদীয়া • PUJA SPECIAL',
    greetingBengali: 'শুভ শারদীয়া ও শুভ বিজয়ার প্রীতি ও শুভেচ্ছা',
    greetingEnglish: 'Celebrating Sharodotsav with Festive Clarity',
    primaryColor: '#DC2626',
    accentColor: '#F59E0B',
    loadingTagline: 'শুভ শারদীয়া • FESTIVE AGOMONI EYEWEAR READY',
    iconEmoji: '🪔'
  },
  christmas: {
    id: 'christmas',
    name: 'Christmas & New Year',
    tagline: 'Holiday Pine Green, Winter Berry Red & Snow Frost',
    bannerText: '🎄 Merry Christmas & Happy New Year! Discover Holiday Eyewear Collections • Free Home Visit',
    badge: 'HOLIDAY EDITION • 2026',
    greetingBengali: 'শুভ বড়দিন ও শুভ নববর্ষ',
    greetingEnglish: 'Merry Christmas & A Prosperous New Year',
    primaryColor: '#059669',
    accentColor: '#E11D48',
    loadingTagline: 'MERRY CHRISTMAS • WINTER CLARITY CALIBRATION',
    iconEmoji: '🎄'
  },
  summer: {
    id: 'summer',
    name: 'Summer Sunshine & Coastal',
    tagline: 'Sun Gold, Warm Coral & UV400 Polarized Protection',
    bannerText: '☀️ Beat the Beach Glare! 100% UV400 Polarized Sunglasses & BlueShield Eyewear Active in Digha',
    badge: 'SUMMER SUNSHINE • UV400',
    greetingBengali: 'গ্রীষ্মের রোদে চোখের সম্পূর্ণ সুরক্ষা',
    greetingEnglish: 'Summer Radiance with Maximum UV Protection',
    primaryColor: '#F59E0B',
    accentColor: '#0284C7',
    loadingTagline: 'SUMMER RADIANCE • POLARIZED UV PROTECTION LOADED',
    iconEmoji: '☀️'
  },
  winter: {
    id: 'winter',
    name: 'Winter Frost & Mist',
    tagline: 'Crystal Ice Blue, Mist Cyan & Anti-Fog Precision',
    bannerText: '❄️ Winter Optical Care: Anti-Fog Single Vision Lenses & Premium Titanium Frames',
    badge: 'WINTER FROST • ANTI-FOG',
    greetingBengali: 'শীতের কুয়াশায় পরিষ্কার দৃষ্টির অঙ্গীকার',
    greetingEnglish: 'Crisp Winter Clarity & Fog-Free Vision',
    primaryColor: '#0284C7',
    accentColor: '#38BDF8',
    loadingTagline: 'WINTER FROST • ANTI-FOG CLARITY READY',
    iconEmoji: '❄️'
  },
  independence: {
    id: 'independence',
    name: 'Independence & Republic Day',
    tagline: 'Proud Indian Tiranga: Deep Saffron, Pure White & India Green',
    bannerText: '🇮🇳 Proudly Serving Purba Medinipur with World-Class Eye Care • Vande Mataram',
    badge: 'INDEPENDENCE SPECIAL • TIRANGA',
    greetingBengali: 'স্বাধীনতা দিবসের আন্তরিক শুভেচ্ছা ও অভিনন্দন',
    greetingEnglish: 'Celebrating Independence with Pride & Vision',
    primaryColor: '#EA580C',
    accentColor: '#16A34A',
    loadingTagline: 'VANDE MATARAM • PROUDLY SERVING BENGAL',
    iconEmoji: '🇮🇳'
  },
  diwali: {
    id: 'diwali',
    name: 'Diwali & Festival of Lights',
    tagline: 'Luminous Purple, Glowing Diya Gold & Radiance',
    bannerText: '🪔 শুভ দীপাবলি! Let There Be Light & Clear Vision in Every Home • Special Offers Live',
    badge: 'FESTIVAL OF LIGHTS • DIWALI',
    greetingBengali: 'শুভ দীপাবলির আন্তরিক প্রীতি ও শুভেচ্ছা',
    greetingEnglish: 'Illuminate Your World with Perfect Vision',
    primaryColor: '#9333EA',
    accentColor: '#F59E0B',
    loadingTagline: 'FESTIVAL OF LIGHTS • RADIANT OPTICAL ESSENCE',
    iconEmoji: '🪔'
  }
};

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('nu_theme');
      if (saved === 'light' || saved === 'dark') return saved;
      return 'light'; // Default to white/light theme
    } catch {
      return 'light';
    }
  });

  const [seasonalTheme, setSeasonalTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('nu_seasonal_theme');
      if (saved && THEME_CONFIGS[saved]) return saved;
      return 'default';
    } catch {
      return 'default';
    }
  });

  const [festiveBannerEnabled, setFestiveBannerEnabled] = useState(true);
  const [festiveBannerCustomText, setFestiveBannerCustomText] = useState('');
  const [festiveEffectsEnabled, setFestiveEffectsEnabled] = useState(true);

  // Sync with remote settings on mount
  useEffect(() => {
    api.get('/settings.php').then(res => {
      if (res.success && res.data) {
        const remoteTheme = res.data.active_theme;
        if (remoteTheme && THEME_CONFIGS[remoteTheme]) {
          setSeasonalTheme(remoteTheme);
          try {
            localStorage.setItem('nu_seasonal_theme', remoteTheme);
          } catch {}
        }
        if (res.data.festive_banner_enabled !== undefined) {
          setFestiveBannerEnabled(res.data.festive_banner_enabled === '1' || res.data.festive_banner_enabled === true);
        }
        if (res.data.festive_banner_text) {
          setFestiveBannerCustomText(res.data.festive_banner_text);
        }
        if (res.data.festive_effects_enabled !== undefined) {
          setFestiveEffectsEnabled(res.data.festive_effects_enabled === '1' || res.data.festive_effects_enabled === true);
        }
      }
    }).catch(() => {});
  }, []);

  // Apply light/dark classes & season theme attribute to root
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
      body.classList.remove('dark');
      body.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
      body.classList.remove('light');
      body.classList.add('dark');
    }

    // Set seasonal data attribute
    root.setAttribute('data-season-theme', seasonalTheme);
    body.setAttribute('data-season-theme', seasonalTheme);

    try {
      localStorage.setItem('nu_theme', theme);
      localStorage.setItem('nu_seasonal_theme', seasonalTheme);
    } catch {}
  }, [theme, seasonalTheme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const updateSeasonalTheme = (themeKey) => {
    if (THEME_CONFIGS[themeKey]) {
      setSeasonalTheme(themeKey);
      try {
        localStorage.setItem('nu_seasonal_theme', themeKey);
      } catch {}
    }
  };

  const activeThemeDetails = THEME_CONFIGS[seasonalTheme] || THEME_CONFIGS.default;

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      toggleTheme, 
      isDark: theme === 'dark', 
      isLight: theme === 'light',
      seasonalTheme,
      setSeasonalTheme: updateSeasonalTheme,
      activeThemeDetails,
      themeConfigs: THEME_CONFIGS,
      festiveBannerEnabled,
      festiveBannerCustomText,
      festiveEffectsEnabled
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: 'light',
      toggleTheme: () => {},
      isDark: false,
      isLight: true,
      seasonalTheme: 'default',
      setSeasonalTheme: () => {},
      activeThemeDetails: THEME_CONFIGS.default,
      themeConfigs: THEME_CONFIGS,
      festiveBannerEnabled: false,
      festiveBannerCustomText: '',
      festiveEffectsEnabled: false
    };
  }
  return ctx;
};
