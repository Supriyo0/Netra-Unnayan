import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Netra Unnayan — Official White Theme Loading Screen
 *
 * Clean, elegant, optical white design utilizing the actual logo (/image.png)
 * with brand name and tagline. No blink animations, no artificial eyelid delays.
 */
/**
 * Netra Unnayan — Ultra-Premium White Theme Loading Screen
 *
 * Luxury optical white aesthetic featuring the official animated transparent logo
 * with smooth aperture & light flare, brand typography, optical lens reticle,
 * and high-precision status calibration.
 */
export const LoadingScreen = ({ onComplete }) => {
  const [progress, setProgress] = useState(15);
  const [statusText, setStatusText] = useState('CALIBRATING OPTICAL ENGINE');
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Smooth progress progression with luxury status captions
    const t1 = setTimeout(() => {
      setProgress(48);
      setStatusText('INITIALIZING GERMAN PRECISION OPTICS');
    }, 400);

    const t2 = setTimeout(() => {
      setProgress(82);
      setStatusText('PREPARING LUXURY EYEWEAR CATALOG');
    }, 950);

    const t3 = setTimeout(() => {
      setProgress(100);
      setStatusText('EXPERIENCE NETRA UNNAYAN');
    }, 1450);

    const t4 = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 500);
    }, 1850);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="nu-premium-white-loader"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.03,
            filter: 'blur(10px)',
            transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
          }}
          className="fixed inset-0 w-screen h-screen z-[999999] flex flex-col items-center justify-center select-none overflow-hidden"
          style={{
            background: 'radial-gradient(ellipse at 50% 42%, #FFFFFF 0%, #F8FAFC 55%, #F0F7FF 100%)',
          }}
        >
          {/* 1. Soft luxury optical lens glow behind logo */}
          <div
            className="absolute pointer-events-none"
            style={{
              width: 580,
              height: 580,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0, 180, 216, 0.15) 0%, rgba(2, 132, 199, 0.05) 45%, transparent 70%)',
              filter: 'blur(70px)',
            }}
          />

          {/* 2. Micro geometric grid backdrop */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.42]"
            style={{
              backgroundImage: 'linear-gradient(rgba(2, 132, 199, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(2, 132, 199, 0.06) 1px, transparent 1px)',
              backgroundSize: '36px 36px',
            }}
          />

          {/* 3. Main Center Stage */}
          <div className="relative z-10 flex flex-col items-center max-w-sm sm:max-w-md w-full px-6 text-center">
            
            {/* Animated Transparent Logo Presentation */}
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="relative mb-5 flex flex-col items-center"
            >
              {/* Subtle radiant halo behind logo */}
              <div className="absolute inset-0 -m-6 bg-gradient-to-r from-cyan-400/10 via-sky-300/20 to-blue-500/10 rounded-full blur-2xl pointer-events-none" />

              <picture>
                <source srcSet="/logo_animated.webp" type="image/webp" />
                <img
                  src="/logo_animated.gif"
                  alt="Netra Unnayan Logo"
                  className="relative z-10 w-auto h-24 sm:h-28 md:h-32 object-contain mx-auto"
                  style={{
                    filter: 'drop-shadow(0 12px 28px rgba(2, 132, 199, 0.22)) drop-shadow(0 2px 6px rgba(0, 0, 0, 0.06))',
                  }}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/image.png';
                  }}
                />
              </picture>
            </motion.div>

            {/* Brand Typography */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.6 }}
              className="flex flex-col items-center mb-7"
            >
              <h1 className="text-2xl sm:text-3xl font-black font-heading tracking-tight text-[#041E42] leading-none">
                NETRA UNNAYAN
              </h1>
              <p className="text-[10px] sm:text-[11px] font-extrabold uppercase font-sans tracking-[0.26em] text-[#0284C7] mt-1.5">
                CLARITY YOU CAN TRUST
              </p>
            </motion.div>

            {/* High-Precision Progress Bar */}
            <div className="w-56 sm:w-68 space-y-2">
              <div className="h-1.5 w-full bg-slate-200/70 rounded-full overflow-hidden p-[1px] shadow-inner backdrop-blur-sm">
                <motion.div
                  className="h-full rounded-full relative"
                  style={{
                    background: 'linear-gradient(90deg, #0284C7 0%, #00B4D8 60%, #0D9488 100%)',
                    boxShadow: '0 0 14px rgba(0, 180, 216, 0.65)',
                  }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                >
                  {/* Glowing forward spark on progress bar */}
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#fff]" />
                </motion.div>
              </div>

              {/* Status and Percentage Indicator */}
              <div className="flex items-center justify-between text-[10.5px] font-mono font-semibold pt-0.5">
                <span className="tracking-wider uppercase text-cyan-800/80 transition-all duration-300">
                  {statusText}
                </span>
                <span className="font-bold text-slate-800">{progress}%</span>
              </div>
            </div>

            {/* Certified Optical Quality Footer Pill */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/90 border border-slate-200/90 shadow-sm mt-7 text-[11px] text-slate-600 font-medium"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              <span>Certified German Optics &bull; Doorstep Care</span>
            </motion.div>

          </div>

          {/* Corner Optical Reticle */}
          <div className="absolute bottom-6 right-6 pointer-events-none opacity-30 text-slate-400">
            <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="16" stroke="#0284C7" strokeWidth="1.2" strokeDasharray="3 3" />
              <circle cx="20" cy="20" r="5" stroke="#0284C7" strokeWidth="1.2" />
              <line x1="20" y1="2" x2="20" y2="9" stroke="#0284C7" strokeWidth="1.2" />
              <line x1="20" y1="31" x2="20" y2="38" stroke="#0284C7" strokeWidth="1.2" />
              <line x1="2" y1="20" x2="9" y2="20" stroke="#0284C7" strokeWidth="1.2" />
              <line x1="31" y1="20" x2="38" y2="20" stroke="#0284C7" strokeWidth="1.2" />
            </svg>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoadingScreen;
