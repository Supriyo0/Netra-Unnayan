import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

/**
 * Animated Santa in Sleigh for Christmas loading scene
 */
const AnimatedSantaSleigh = () => (
  <div 
    className="absolute top-1/2 -translate-y-1/2 left-0 pointer-events-none z-30"
    style={{
      width: 140,
      height: 70,
      animation: 'santa-glide 3.6s ease-in-out forwards'
    }}
  >
    <svg viewBox="0 0 160 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
      {/* Sleigh Runner (Gold) */}
      <path d="M10 65 Q40 75 110 65 Q135 60 145 45" stroke="#F59E0B" strokeWidth="4" strokeLinecap="round" />
      <line x1="35" y1="65" x2="45" y2="48" stroke="#D97706" strokeWidth="2.5" />
      <line x1="85" y1="65" x2="90" y2="48" stroke="#D97706" strokeWidth="2.5" />
      {/* Sleigh Carriage (Red & Gold) */}
      <path d="M20 48 C30 25 100 25 115 48 Z" fill="#DC2626" stroke="#B91C1C" strokeWidth="2" />
      <rect x="25" y="44" width="85" height="4" rx="2" fill="#F59E0B" />
      {/* Gift Sacks */}
      <circle cx="45" cy="35" r="14" fill="#059669" />
      <circle cx="65" cy="32" r="12" fill="#EAB308" />
      {/* Santa Claus */}
      {/* Coat */}
      <circle cx="92" cy="36" r="14" fill="#DC2626" />
      {/* Beard */}
      <path d="M85 36 C85 46 99 46 99 36 Z" fill="#FFFFFF" />
      {/* Face */}
      <circle cx="92" cy="30" r="7" fill="#FCD34D" />
      {/* Santa Hat */}
      <path d="M86 27 Q92 12 104 22" stroke="#DC2626" strokeWidth="6" strokeLinecap="round" />
      <rect x="85" y="25" width="14" height="4" rx="2" fill="#FFFFFF" />
      <circle cx="105" cy="22" r="3" fill="#FFFFFF" />
    </svg>
  </div>
);

/**
 * SeasonalLoadingScreen (Production Theme Engine Loader)
 * Adapts visual scene to active theme while protecting the sacred Netra Unnayan logo.
 */
export const LoadingScreen = ({ onComplete }) => {
  const { seasonalTheme, activeTheme, content, safeMode } = useTheme();
  const [progress, setProgress] = useState(20);
  const [statusText, setStatusText] = useState('CALIBRATING OPTICAL ENGINE');
  const [visible, setVisible] = useState(true);

  const onCompleteRef = React.useRef(onComplete);
  onCompleteRef.current = onComplete;

  const duration = Math.min(activeTheme?.decorations?.loadingDuration || 1800, 2600);

  useEffect(() => {
    let completed = false;
    const finish = () => {
      if (completed) return;
      completed = true;
      setVisible(false);
      setTimeout(() => {
        if (typeof onCompleteRef.current === 'function') {
          onCompleteRef.current();
        }
      }, 300);
    };

    // Stage 1: Initial calibration
    const t1 = setTimeout(() => {
      setProgress(50);
      setStatusText(content?.loadingGreeting || activeTheme?.name?.toUpperCase() || 'NETRA UNNAYAN');
    }, duration * 0.25);

    // Stage 2: Tagline
    const t2 = setTimeout(() => {
      setProgress(85);
      setStatusText(content?.loadingTagline || 'EXPERIENCE VISIONARY CLARITY');
    }, duration * 0.55);

    // Stage 3: Ready & Fade out
    const t3 = setTimeout(() => {
      setProgress(100);
      setStatusText('EXPERIENCE NETRA UNNAYAN');
      finish();
    }, duration);

    // Stage 4: Absolute failsafe (never allow screen to remain blocked)
    const failsafe = setTimeout(finish, 3200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(failsafe);
    };
  }, [duration]);

  // Scene Background per theme
  const getLoaderBackground = () => {
    if (safeMode) return 'radial-gradient(circle at 50% 50%, #FFFFFF 0%, #F8FAFC 100%)';
    switch (seasonalTheme) {
      case 'durga_puja':
        return 'radial-gradient(ellipse at 50% 45%, #FFFDF7 0%, #FEF8EB 55%, #FDF2D8 100%)';
      case 'diwali':
        return 'radial-gradient(ellipse at 50% 45%, #0F1E3D 0%, #0B1329 55%, #050A18 100%)';
      case 'christmas':
        return 'radial-gradient(ellipse at 50% 45%, #FFFFFF 0%, #F0FDF4 50%, #EFF6FF 100%)';
      case 'summer':
        return 'radial-gradient(ellipse at 50% 45%, #FFFFFF 0%, #F0F9FF 55%, #E0F2FE 100%)';
      case 'winter':
        return 'radial-gradient(ellipse at 50% 45%, #FFFFFF 0%, #F8FAFC 55%, #EFF6FF 100%)';
      case 'independence':
      case 'republic':
        return 'radial-gradient(ellipse at 50% 45%, #FFFDF8 0%, #FFFFFF 50%, #F0FDF4 100%)';
      case 'spring':
        return 'radial-gradient(ellipse at 50% 45%, #FEFCE8 0%, #FFFDF0 60%, #FFF7ED 100%)';
      case 'monsoon':
        return 'radial-gradient(ellipse at 50% 45%, #F0FDFA 0%, #F8FAFC 60%, #E2E8F0 100%)';
      default:
        return 'radial-gradient(ellipse at 50% 42%, #FFFFFF 0%, #F8FAFC 55%, #F0F7FF 100%)';
    }
  };

  const isDiwali = seasonalTheme === 'diwali' && !safeMode;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="nu-seasonal-loader"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.02,
            filter: 'blur(8px)',
            transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
          }}
          className="fixed inset-0 w-screen h-screen z-[999999] flex flex-col items-center justify-center select-none overflow-hidden"
          style={{ background: getLoaderBackground() }}
        >
          {/* THEME AMBIENT GLOW */}
          <div
            className="absolute pointer-events-none"
            style={{
              width: 580,
              height: 580,
              borderRadius: '50%',
              background: isDiwali
                ? 'radial-gradient(circle, rgba(245, 158, 11, 0.22) 0%, rgba(217, 119, 6, 0.08) 45%, transparent 70%)'
                : seasonalTheme === 'durga_puja'
                ? 'radial-gradient(circle, rgba(245, 158, 11, 0.20) 0%, rgba(220, 38, 38, 0.06) 45%, transparent 70%)'
                : 'radial-gradient(circle, rgba(0, 180, 216, 0.16) 0%, rgba(2, 132, 199, 0.05) 45%, transparent 70%)',
              filter: 'blur(75px)',
            }}
          />

          {/* CHRISTMAS SPECIAL: Santa Glides in Sleigh */}
          {seasonalTheme === 'christmas' && !safeMode && <AnimatedSantaSleigh />}

          {/* TRICOLOR LIGHT SWEEP FOR INDEPENDENCE / REPUBLIC */}
          {(seasonalTheme === 'independence' || seasonalTheme === 'republic') && !safeMode && (
            <motion.div 
              initial={{ x: '-100%', opacity: 0 }}
              animate={{ x: '100%', opacity: [0, 0.5, 0] }}
              transition={{ duration: 2.2, ease: 'easeInOut', repeat: Infinity }}
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(234, 88, 12, 0.2) 30%, rgba(255, 255, 255, 0.4) 50%, rgba(22, 163, 74, 0.2) 70%, transparent 100%)'
              }}
            />
          )}

          {/* MAIN STAGE */}
          <div className="relative z-10 flex flex-col items-center max-w-sm sm:max-w-md w-full px-6 text-center">
            
            {/* Official Netra Unnayan Logo & Branding */}
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex flex-col items-center mb-6"
            >
              {/* DURGA PUJA: Traditional Glowing Terracotta Pradip above logo */}
              {seasonalTheme === 'durga_puja' && !safeMode && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="mb-1 pointer-events-none"
                >
                  <div style={{ width: 34, height: 30 }}>
                    <svg viewBox="0 0 100 95" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
                      {/* Flame Radiant Glow */}
                      <circle cx="50" cy="28" r="24" fill="#FDE047" opacity="0.65" style={{ animation: 'diya-flicker 2.2s infinite ease-in-out' }} />
                      {/* Terracotta Clay Body */}
                      <path d="M12 55 C20 85 80 85 88 55 C70 65 30 65 12 55 Z" fill="#C2410C" stroke="#7C2D12" strokeWidth="2" />
                      <ellipse cx="50" cy="55" rx="38" ry="8" fill="#EA580C" stroke="#7C2D12" strokeWidth="1.5" />
                      <ellipse cx="50" cy="56" rx="30" ry="5.5" fill="#F59E0B" />
                      {/* Flickering Flame */}
                      <g style={{ animation: 'diya-flicker 2.4s infinite ease-in-out', transformOrigin: '50px 42px' }}>
                        <line x1="50" y1="50" x2="50" y2="40" stroke="#451A03" strokeWidth="2.5" strokeLinecap="round" />
                        <path d="M50 8 C40 24 35 38 50 42 C65 38 60 24 50 8 Z" fill="#F59E0B" />
                        <path d="M50 14 C44 25 42 33 50 37 C58 33 56 25 50 14 Z" fill="#FEF08A" />
                        <ellipse cx="50" cy="32" rx="2.5" ry="4.5" fill="#FFFFFF" opacity="0.95" />
                      </g>
                    </svg>
                  </div>
                </motion.div>
              )}

              {/* Official Animated Eye Logo */}
              <div className="relative flex items-center justify-center">
                <picture>
                  <source srcSet="/logo_animated.webp" type="image/webp" />
                  <img
                    src="/logo_animated.gif"
                    alt="Netra Unnayan Official Logo"
                    className="h-16 sm:h-20 w-auto object-contain drop-shadow-md"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/image.png';
                    }}
                  />
                </picture>
              </div>

              {/* Official Brand Typography */}
              <div className="mt-3 text-center">
                <span className={`text-xl sm:text-2xl font-black tracking-tight font-heading uppercase ${isDiwali ? 'text-white' : 'text-[#041E42]'}`}>
                  NETRA UNNAYAN
                </span>
                <p className={`text-[10px] sm:text-[11px] font-bold tracking-[0.24em] uppercase mt-0.5 ${isDiwali ? 'text-amber-300' : 'text-[#0284C7]'}`}>
                  CLARITY YOU CAN TRUST
                </p>
              </div>

              {/* DURGA PUJA SPECIAL: Festival Greeting Banner */}
              {seasonalTheme === 'durga_puja' && !safeMode && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="flex items-center justify-center gap-3 mt-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30"
                >
                  <span className="text-xs font-serif font-bold text-amber-900">
                    {content.festivalGreeting || 'শুভ শারদীয়া • আনন্দময়ীর আগমন'}
                  </span>
                </motion.div>
              )}

              {/* CHRISTMAS SPECIAL: Festive Season Banner */}
              {seasonalTheme === 'christmas' && !safeMode && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="flex items-center justify-center gap-2 mt-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/25"
                >
                  <span className="text-xs font-bold text-red-700 tracking-wider">
                    {content.festivalGreeting || 'MERRY CHRISTMAS • SEASON OF JOY'}
                  </span>
                </motion.div>
              )}

              {/* DIWALI SPECIAL: Glow Diya Banner */}
              {seasonalTheme === 'diwali' && !safeMode && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center justify-center gap-2 mt-2 text-amber-300 text-xs font-bold px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30"
                >
                  <span>✨</span>
                  <span>{content.festivalGreeting || 'শুভ দীপাবলি • HAPPY DIWALI'}</span>
                  <span>✨</span>
                </motion.div>
              )}
            </motion.div>

            {/* Progress Gauge */}
            <div className="w-full max-w-[280px] sm:max-w-[320px] mb-4">
              <div className={`h-1.5 w-full rounded-full overflow-hidden p-0.5 border ${
                isDiwali ? 'bg-white/10 border-amber-500/30' : 'bg-slate-200/80 border-slate-300/60'
              }`}>
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: isDiwali 
                      ? 'linear-gradient(90deg, #F59E0B, #FBBF24)'
                      : `linear-gradient(90deg, ${activeTheme.palette.primary}, ${activeTheme.palette.accent})`,
                    width: `${progress}%`,
                    transition: 'width 0.4s ease'
                  }}
                />
              </div>
            </div>

            {/* Dynamic Loading Text (Admin Controlled) */}
            <motion.p
              key={statusText}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-[11px] font-bold tracking-[0.18em] uppercase ${
                isDiwali ? 'text-amber-200' : 'text-slate-800'
              }`}
            >
              {statusText}
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
