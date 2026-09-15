import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const LoadingScreen = ({ onComplete }) => {
  const [stage, setStage] = useState(0);

  const statusMessages = [
    'ALIGNING OPTICAL APERTURE...',
    'CALIBRATING SPHERE & CYLINDER MATRICES...',
    'SYNCHRONIZING CLINICAL LENS VAULT...',
    'INITIALIZING ULTRA-HD 3D ENGINE...',
    'CLARITY UNLOCKED • READY'
  ];

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 60);
    const t2 = setTimeout(() => setStage(2), 380);
    const t3 = setTimeout(() => setStage(3), 720);
    const t4 = setTimeout(() => setStage(4), 1050);
    const t5 = setTimeout(() => {
      setStage(5);
      if (onComplete) onComplete();
    }, 1450);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {stage < 5 && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.03, filter: 'blur(8px)', transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050B14] text-white transition-colors overflow-hidden select-none"
        >
          {/* Ambient Sapphire & Cyan Diffused Lens Auroras */}
          <div className="absolute w-[600px] h-[600px] bg-gradient-to-tr from-[#0077B6]/20 via-[#00B4D8]/15 to-[#00F5D4]/10 rounded-full blur-[140px] pointer-events-none animate-pulse" />
          <div className="absolute w-[350px] h-[350px] bg-sky-500/10 rounded-full blur-[90px] pointer-events-none" />

          {/* Precision Grid Background Lines */}
          <div 
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: 'linear-gradient(rgba(0,180,216,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(0,180,216,0.8) 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }}
          />

          <div className="relative flex flex-col items-center max-w-md px-6 z-10">
            
            {/* =========================================================================
                HIGH-END OPTICAL APERTURE & LENS CALIBRATION RETICLE
               ========================================================================= */}
            <motion.div
              initial={{ opacity: 0, scale: 0.82 }}
              animate={stage >= 1 ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-44 h-44 flex items-center justify-center mb-7"
            >
              {/* Outer Glowing Precision Gauge Ring */}
              <svg className="w-full h-full" viewBox="0 0 160 160">
                <defs>
                  <linearGradient id="neonCyanArc" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00F5D4" stopOpacity="1" />
                    <stop offset="50%" stopColor="#00B4D8" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#0077B6" stopOpacity="0.1" />
                  </linearGradient>

                  <linearGradient id="sapphireRing" x1="100%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.8" />
                    <stop offset="60%" stopColor="#0284C7" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#00F5D4" stopOpacity="0.1" />
                  </linearGradient>

                  <filter id="lensGlow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="3.5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Outer Base Calibration Track */}
                <circle
                  cx="80"
                  cy="80"
                  r="72"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.07)"
                  strokeWidth="1.5"
                />

                {/* Primary Outer Rotating Luminous Arc */}
                <motion.circle
                  cx="80"
                  cy="80"
                  r="72"
                  fill="none"
                  stroke="url(#neonCyanArc)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray="180 270"
                  filter="url(#lensGlow)"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                  style={{ transformOrigin: '80px 80px' }}
                />

                {/* Dial Degree Tick Marks (12 Precision Notches) */}
                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
                  <line
                    key={deg}
                    x1="80"
                    y1="12"
                    x2="80"
                    y2={deg % 90 === 0 ? "18" : "15"}
                    stroke={deg % 90 === 0 ? "#00F5D4" : "rgba(255, 255, 255, 0.25)"}
                    strokeWidth={deg % 90 === 0 ? "2" : "1"}
                    strokeLinecap="round"
                    transform={`rotate(${deg} 80 80)`}
                  />
                ))}

                {/* Middle Counter-Rotating Dashed Reticle */}
                <motion.circle
                  cx="80"
                  cy="80"
                  r="58"
                  fill="none"
                  stroke="#00B4D8"
                  strokeWidth="1.5"
                  strokeDasharray="4 8"
                  strokeOpacity="0.6"
                  animate={{ rotate: -360 }}
                  transition={{ repeat: Infinity, duration: 3.5, ease: 'linear' }}
                  style={{ transformOrigin: '80px 80px' }}
                />

                {/* Inner Optical Lens Core */}
                <motion.circle
                  cx="80"
                  cy="80"
                  r="45"
                  fill="rgba(0, 180, 216, 0.05)"
                  stroke="url(#sapphireRing)"
                  strokeWidth="2"
                  strokeDasharray="120 160"
                  strokeLinecap="round"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2.6, ease: 'linear' }}
                  style={{ transformOrigin: '80px 80px' }}
                />

                {/* Laser Alignment Crosshairs */}
                <line x1="80" y1="30" x2="80" y2="40" stroke="#00F5D4" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
                <line x1="80" y1="120" x2="80" y2="130" stroke="#00F5D4" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
                <line x1="30" y1="80" x2="40" y2="80" stroke="#00F5D4" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
                <line x1="120" y1="80" x2="130" y2="80" stroke="#00F5D4" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
              </svg>

              {/* Central Eye Pupil & Breathing Brand Symbol */}
              <div className="absolute inset-0 flex items-center justify-center p-10">
                <motion.img
                  src="/logo_symbol.png"
                  alt="Netra Eye Core"
                  className="w-full h-full object-contain filter drop-shadow-[0_0_20px_rgba(0,180,216,0.9)]"
                  animate={{
                    scale: [1, 1.08, 1],
                    filter: [
                      'drop-shadow(0 0 16px rgba(0,180,216,0.7))',
                      'drop-shadow(0 0 28px rgba(0,245,212,0.95))',
                      'drop-shadow(0 0 16px rgba(0,180,216,0.7))'
                    ]
                  }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>

              {/* Pulsing Outer Ultrasonic Resonance Ring */}
              <motion.div
                className="absolute inset-0 rounded-full border border-brand-cyan/40 pointer-events-none"
                animate={{ scale: [1, 1.35], opacity: [0.7, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
              />
            </motion.div>

            {/* Typography & High-End Optical Branding */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={stage >= 1 ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="text-center space-y-1.5"
            >
              <h1 className="text-2xl sm:text-3xl font-black tracking-[0.25em] text-white font-heading uppercase">
                NETRA <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-cyan to-teal-400">UNNAYAN</span>
              </h1>
              
              <div className="flex items-center justify-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-ping" />
                <p className="text-[11px] font-bold tracking-[0.28em] text-slate-300 uppercase">
                  Clarity You Can Trust
                </p>
                <span className="w-1.5 h-1.5 rounded-full bg-brand-teal" />
              </div>
            </motion.div>

            {/* Optical HUD Progress Gauge & Telemetry */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={stage >= 1 ? { opacity: 1 } : {}}
              className="mt-6 w-64 text-center space-y-2.5"
            >
              <div className="relative w-full bg-white/10 h-2 rounded-full overflow-hidden p-0.5 border border-white/10 shadow-inner">
                <motion.div
                  initial={{ width: '5%' }}
                  animate={{ 
                    width: stage >= 4 ? '100%' : stage >= 3 ? '78%' : stage >= 2 ? '50%' : '24%' 
                  }}
                  transition={{ duration: 0.4, ease: 'easeInOut' }}
                  className="relative h-full rounded-full bg-gradient-to-r from-brand-cyan via-teal-400 to-sky-300 shadow-[0_0_14px_rgba(0,180,216,0.8)]"
                >
                  {/* Leading Laser Spark */}
                  <div className="absolute right-0 top-0 bottom-0 w-2 rounded-full bg-white shadow-[0_0_8px_#FFFFFF]" />
                </motion.div>
              </div>

              {/* Dynamic Status Text */}
              <div className="flex items-center justify-between text-[10px] font-mono tracking-wider text-slate-400 font-semibold px-1">
                <span className="text-brand-cyan truncate max-w-[200px]">
                  {statusMessages[Math.min(stage, statusMessages.length - 1)]}
                </span>
                <span className="text-white font-bold">
                  {stage >= 4 ? '100%' : stage >= 3 ? '78%' : stage >= 2 ? '50%' : '24%'}
                </span>
              </div>
            </motion.div>

            {/* Subtle Clinical Coordinates Pill */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={stage >= 2 ? { opacity: 1 } : {}}
              className="mt-5 text-[9px] font-mono text-slate-500 uppercase tracking-widest flex items-center gap-1.5"
            >
              <span>Digha Flagship Optical Lab</span>
              <span>&bull;</span>
              <span>ISO 9001:2015 Spec Ready</span>
            </motion.div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
