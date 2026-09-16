import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Netra Unnayan — Official White Theme Loading Screen
 *
 * Clean, elegant, optical white design utilizing the actual logo (/image.png)
 * with brand name and tagline. No blink animations, no artificial eyelid delays.
 */
export const LoadingScreen = ({ onComplete }) => {
  const [progress, setProgress] = useState(12);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Smooth progress increment
    const p1 = setTimeout(() => setProgress(45), 350);
    const p2 = setTimeout(() => setProgress(78), 850);
    const p3 = setTimeout(() => setProgress(100), 1350);
    const p4 = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 450);
    }, 1750);

    return () => {
      clearTimeout(p1);
      clearTimeout(p2);
      clearTimeout(p3);
      clearTimeout(p4);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="nu-white-loader"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.02,
            filter: 'blur(8px)',
            transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
          }}
          className="fixed inset-0 w-screen h-screen z-[999999] flex flex-col items-center justify-center select-none overflow-hidden"
          style={{
            background: 'radial-gradient(ellipse at 50% 45%, #FFFFFF 0%, #F8FAFC 65%, #EFF6FF 100%)',
          }}
        >
          {/* Subtle soft ambient light */}
          <div
            className="absolute pointer-events-none"
            style={{
              width: 520,
              height: 520,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0, 180, 216, 0.12) 0%, rgba(2, 132, 199, 0.04) 50%, transparent 75%)',
              filter: 'blur(60px)',
            }}
          />

          {/* Optical subtle grid pattern */}
          <div
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              backgroundImage: 'linear-gradient(rgba(2, 132, 199, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(2, 132, 199, 0.05) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />

          {/* Main Card Container */}
          <div className="relative z-10 flex flex-col items-center gap-6 px-6 max-w-sm sm:max-w-md w-full text-center">
            
            {/* Actual Logo with Brand Name & Tag Line */}
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="relative p-3 rounded-2xl"
            >
              <img
                src="/image.png"
                alt="Netra Unnayan — Clarity You Can Trust"
                className="w-auto h-20 sm:h-24 md:h-28 max-w-[280px] sm:max-w-[340px] md:max-w-[380px] object-contain mx-auto drop-shadow-md"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = '/logo_official.png';
                }}
              />
            </motion.div>

            {/* Progress Bar */}
            <div className="w-52 sm:w-64 space-y-2 mt-1">
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/80 shadow-inner">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #0284C7 0%, #00B4D8 60%, #0D9488 100%)',
                    boxShadow: '0 0 10px rgba(0, 180, 216, 0.5)',
                  }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                />
              </div>

              {/* Status indicator */}
              <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-slate-500 pt-0.5">
                <span className="tracking-wider uppercase text-cyan-700">Loading experience</span>
                <span className="font-bold text-slate-700">{progress}%</span>
              </div>
            </div>

            {/* Quality badge footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-slate-200/80 shadow-sm mt-2 text-[11px] text-slate-600 font-medium"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Certified German Optics &bull; Doorstep Care</span>
            </motion.div>

          </div>

          {/* Corner Optical Mark */}
          <div className="absolute bottom-6 right-6 pointer-events-none opacity-30 text-slate-400">
            <svg width="34" height="34" viewBox="0 0 40 40" fill="none">
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
