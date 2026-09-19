import React, { useState } from 'react';
import { Sparkles, X, Gift, Flame, Sun, Snowflake, Flag, Heart } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const FestiveBanner = () => {
  const { seasonalTheme, activeThemeDetails, festiveBannerEnabled, festiveBannerCustomText } = useTheme();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !festiveBannerEnabled) return null;

  const bannerMessage = festiveBannerCustomText || activeThemeDetails?.bannerText;
  if (!bannerMessage) return null;

  // Seasonal theme visual styling
  const getBannerStyle = () => {
    switch (seasonalTheme) {
      case 'durga_puja':
        return 'bg-gradient-to-r from-red-700 via-amber-600 to-red-800 text-amber-50 border-b border-amber-400/30';
      case 'christmas':
        return 'bg-gradient-to-r from-emerald-800 via-red-700 to-emerald-900 text-emerald-50 border-b border-white/20';
      case 'summer':
        return 'bg-gradient-to-r from-amber-500 via-orange-500 to-cyan-600 text-white border-b border-white/20';
      case 'winter':
        return 'bg-gradient-to-r from-sky-800 via-indigo-900 to-cyan-900 text-cyan-50 border-b border-cyan-400/30';
      case 'independence':
        return 'bg-gradient-to-r from-orange-600 via-slate-900 to-emerald-700 text-white border-b border-amber-400/40';
      case 'diwali':
        return 'bg-gradient-to-r from-purple-900 via-amber-700 to-purple-950 text-amber-100 border-b border-amber-300/40';
      default:
        return 'bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-slate-200 border-b border-cyan-500/30';
    }
  };

  const getThemeIcon = () => {
    switch (seasonalTheme) {
      case 'durga_puja':
        return <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />;
      case 'christmas':
        return <Gift className="w-3.5 h-3.5 text-red-200" />;
      case 'summer':
        return <Sun className="w-3.5 h-3.5 text-amber-200 animate-spin" style={{ animationDuration: '8s' }} />;
      case 'winter':
        return <Snowflake className="w-3.5 h-3.5 text-cyan-200" />;
      case 'independence':
        return <Flag className="w-3.5 h-3.5 text-orange-300" />;
      case 'diwali':
        return <Flame className="w-3.5 h-3.5 text-amber-300 animate-pulse" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-cyan-400" />;
    }
  };

  return (
    <div className={`relative z-50 px-3 py-2 text-center text-xs font-semibold shadow-md transition-all ${getBannerStyle()}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 sm:gap-3 flex-wrap pr-6">
        <div className="flex items-center gap-1.5 shrink-0">
          {getThemeIcon()}
          <span className="px-2 py-0.5 rounded-full bg-black/30 backdrop-blur-sm text-[10px] font-black uppercase tracking-wider text-amber-300">
            {activeThemeDetails?.badge || 'OFFER'}
          </span>
        </div>

        <span className="truncate max-w-[90vw] sm:max-w-none text-xs">
          {bannerMessage}
        </span>

        <span className="hidden md:inline-block opacity-80 text-[11px] font-normal italic">
          — {activeThemeDetails?.greetingBengali}
        </span>
      </div>

      <button
        onClick={() => setDismissed(true)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-white/70 hover:text-white hover:bg-black/20 transition-colors"
        aria-label="Dismiss banner"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
