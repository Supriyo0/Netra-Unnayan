import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { NetraSymbolSVG } from './BrandLogo';

/**
 * Netra Unnayan — Premium Cinematic Loading Screen
 *
 * Uses the pure SVG logo symbol (transparent background — ZERO white-circle patches).
 *
 * Eye-opening sequence:
 *  Stage 0  (0ms)    → Eye fully closed (scaleY ≈ 0.03) — thin glowing slit
 *  Stage 1  (500ms)  → Attempt 1: eyelid flutters to 30%, falls back shut
 *  Stage 2  (920ms)  → Fully closed again (rest beat)
 *  Stage 3  (1200ms) → Attempt 2: eyelid pushes to 62%, falls back shut
 *  Stage 4  (1700ms) → Fully closed again
 *  Stage 5  (2000ms) → FULL AWAKENING: opens completely, iris spins, flare sweeps,
 *                       brand text slides in
 *  Stage 6  (3300ms) → Fade out → reveal storefront
 */
export const LoadingScreen = ({ onComplete }) => {
  const { isDark } = useTheme();
  const [stage, setStage] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 500),
      setTimeout(() => setStage(2), 920),
      setTimeout(() => setStage(3), 1200),
      setTimeout(() => setStage(4), 1680),
      setTimeout(() => setStage(5), 2000),
      setTimeout(() => {
        setStage(6);
        setVisible(false);
        setTimeout(() => { if (onComplete) onComplete(); }, 580);
      }, 3300),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  // scaleY for the eye SVG at each stage (simulates eyelid)
  const scaleY = { 0: 0.03, 1: 0.30, 2: 0.03, 3: 0.62, 4: 0.03, 5: 1.0, 6: 1.0 }[stage] ?? 0.03;
  const isOpen = stage >= 5;
  const isClosed = scaleY < 0.12;

  // Transition timing
  const eyeTransition = {
    duration: isClosed ? 0.17 : isOpen ? 0.55 : 0.36,
    ease: isClosed ? [0.4, 0, 0.6, 1] : isOpen ? [0.16, 1, 0.3, 1] : [0.16, 1, 0.3, 1],
  };

  // Status text per stage
  const statusText = [
    'Initialising optical systems…',
    'Opening visual cortex…',
    'Stabilising corneal axis…',
    'Refining focal depth…',
    'Calibrating iris aperture…',
    '✦  Clarity Unlocked · 20 / 20 Ready  ✦',
    '',
  ][stage] ?? '';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="nu-splash"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.05,
            filter: 'blur(12px)',
            transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
          }}
          className="fixed inset-0 w-screen h-screen z-[999999] flex flex-col items-center justify-center overflow-hidden select-none"
          style={{
            background: isDark
              ? 'radial-gradient(ellipse at 50% 38%, #071828 0%, #030c18 55%, #020810 100%)'
              : 'radial-gradient(ellipse at 50% 38%, #E8F5FD 0%, #D4EDFB 45%, #C6E7F8 100%)',
          }}
        >

          {/* ── AMBIENT GLOW ──────────────────────────────────── */}
          <div
            className="absolute pointer-events-none"
            style={{
              width: 560, height: 560, borderRadius: '50%',
              background: isDark
                ? 'radial-gradient(circle, rgba(0,110,200,0.20) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(0,170,220,0.22) 0%, transparent 70%)',
              filter: 'blur(50px)',
              animation: 'pulseGlow 3s ease-in-out infinite',
            }}
          />

          {/* Optical grid */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: isDark
                ? 'linear-gradient(rgba(0,180,216,0.055) 1px,transparent 1px),linear-gradient(90deg,rgba(0,180,216,0.055) 1px,transparent 1px)'
                : 'linear-gradient(rgba(2,130,198,0.065) 1px,transparent 1px),linear-gradient(90deg,rgba(2,130,198,0.065) 1px,transparent 1px)',
              backgroundSize: '44px 44px',
            }}
          />

          {/* ── MAIN CONTENT ─────────────────────────────────── */}
          <div className="relative z-10 flex flex-col items-center gap-7 px-6 w-full max-w-sm">

            {/* EYE LOGO — scaleY animation (SVG is transparent: no circle patch!) */}
            <div className="relative flex items-center justify-center" style={{ width: 'min(300px, 78vw)' }}>

              {/* Outer glow ring — activates when fully open */}
              <motion.div
                className="absolute inset-0 pointer-events-none rounded-full"
                animate={{
                  boxShadow: isOpen
                    ? '0 0 0 1px rgba(0,180,216,0.25), 0 0 50px 18px rgba(0,180,216,0.18), 0 0 100px 35px rgba(0,100,200,0.10)'
                    : '0 0 0 0 transparent',
                }}
                transition={{ duration: 0.7 }}
              />

              {/* THE EYE — scaleY eyelid animation on transparent SVG */}
              <motion.div
                animate={{ scaleY }}
                transition={eyeTransition}
                style={{
                  transformOrigin: 'center center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <NetraSymbolSVG
                  size={280}
                  spin={true}
                  style={{
                    width: 'min(280px, 78vw)',
                    height: 'auto',
                    filter: isOpen
                      ? 'drop-shadow(0 0 22px rgba(0,180,216,0.55)) brightness(1.08)'
                      : 'brightness(0.82)',
                    transition: 'filter 0.5s ease',
                  }}
                />
              </motion.div>

              {/* Eyelid crease line — shows when eye is shut */}
              <AnimatePresence>
                {isClosed && (
                  <motion.div
                    key="crease"
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    exit={{ opacity: 0, scaleX: 0 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      position: 'absolute',
                      left: '8%', right: '8%',
                      top: '50%', height: 3,
                      borderRadius: 9999,
                      background: 'linear-gradient(90deg, transparent, #00B4D8 25%, #00F5D4 50%, #00B4D8 75%, transparent)',
                      boxShadow: '0 0 12px #00B4D8, 0 0 28px rgba(0,180,216,0.45)',
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Lens flare sweep on full awakening */}
              <AnimatePresence>
                {isOpen && stage < 6 && (
                  <motion.div
                    key="flare"
                    initial={{ x: '-130%', opacity: 0 }}
                    animate={{ x: '160%', opacity: [0, 0.85, 0] }}
                    transition={{ duration: 0.9, ease: 'easeInOut', delay: 0.08 }}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '30%',
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.72), transparent)',
                      transform: 'skewX(-18deg)',
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* BRAND NAME + TAGLINE */}
            <motion.div
              className="flex flex-col items-center text-center gap-1.5"
              animate={{
                opacity: isOpen ? 1 : 0.18,
                y: isOpen ? 0 : 10,
              }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: isOpen ? 0.12 : 0 }}
            >
              {/* NETRA UNNAYAN */}
              <div
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 'clamp(1.75rem, 6.5vw, 2.6rem)',
                  fontWeight: 900,
                  letterSpacing: '-0.01em',
                  lineHeight: 1,
                }}
              >
                <span style={{ color: isDark ? '#FFFFFF' : '#061730' }}>NETRA </span>
                <span style={{
                  background: 'linear-gradient(120deg, #0077B6 0%, #00B4D8 50%, #00D4F4 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>UNNAYAN</span>
              </div>

              {/* Divider + tagline */}
              <motion.div
                className="flex items-center gap-2.5"
                animate={{ opacity: isOpen ? 1 : 0 }}
                transition={{ delay: isOpen ? 0.3 : 0, duration: 0.45 }}
              >
                <div style={{ height: 1, width: 28, background: 'linear-gradient(90deg, transparent, #00B4D8)' }} />
                <span style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 'clamp(0.62rem, 2.2vw, 0.78rem)',
                  fontWeight: 700,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: isDark ? '#94A3B8' : '#475569',
                }}>
                  Clarity You Can Trust
                </span>
                <div style={{ height: 1, width: 28, background: 'linear-gradient(90deg, #00B4D8, transparent)' }} />
              </motion.div>
            </motion.div>

            {/* Status line */}
            <motion.p
              animate={{ opacity: isOpen ? 0.85 : 0.45 }}
              transition={{ duration: 0.4 }}
              style={{
                fontFamily: 'monospace',
                fontSize: '0.63rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: '#00B4D8',
                marginTop: -10,
              }}
            >
              {statusText}
            </motion.p>

            {/* Progress dots */}
            <motion.div
              className="flex gap-2"
              animate={{ opacity: isOpen ? 1 : 0.35 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  style={{
                    height: 6,
                    width: i === 1 ? 20 : 6,
                    borderRadius: 9999,
                    background: isOpen
                      ? 'linear-gradient(90deg, #00B4D8, #00F5D4)'
                      : (isDark ? '#1B3A5C' : '#9EC8E0'),
                    boxShadow: isOpen ? '0 0 8px rgba(0,180,216,0.6)' : 'none',
                    transition: 'all 0.45s ease',
                  }}
                  animate={{ scale: isOpen ? [1, 1.18, 1] : 1 }}
                  transition={{ repeat: isOpen ? Infinity : 0, duration: 1.5, delay: i * 0.18 }}
                />
              ))}
            </motion.div>
          </div>

          {/* Corner optical reticle */}
          <div
            className="absolute bottom-5 right-5 pointer-events-none"
            style={{ opacity: 0.22 }}
          >
            <svg width="38" height="38" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="17" stroke="#00B4D8" strokeWidth="1" strokeDasharray="4 3" />
              <circle cx="20" cy="20" r="5"  stroke="#00B4D8" strokeWidth="1" />
              <line x1="20" y1="3"  x2="20" y2="11" stroke="#00B4D8" strokeWidth="1" />
              <line x1="20" y1="29" x2="20" y2="37" stroke="#00B4D8" strokeWidth="1" />
              <line x1="3"  y1="20" x2="11" y2="20" stroke="#00B4D8" strokeWidth="1" />
              <line x1="29" y1="20" x2="37" y2="20" stroke="#00B4D8" strokeWidth="1" />
            </svg>
          </div>

        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoadingScreen;
