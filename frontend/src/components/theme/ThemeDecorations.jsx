import React, { useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';

/**
 * Realistic Botanical Bengali Terracotta Pradip / Diya (মাটির প্রদীপ)
 * Handcrafted clay form, etched rim detailing, glowing ghee pool, and dynamic flickering flame.
 */
export const TerracottaPradip = ({ className = '', size = 44, flameGlow = true }) => (
  <div 
    className={`relative inline-block select-none ${className}`} 
    style={{ width: size, height: size * 0.95 }}
    aria-hidden="true"
  >
    <svg viewBox="0 0 120 110" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
      <defs>
        {/* Clay base 3D gradient */}
        <radialGradient id="pradipClayGrad" cx="50%" cy="75%" r="65%">
          <stop offset="0%" stopColor="#EA580C" />
          <stop offset="45%" stopColor="#C2410C" />
          <stop offset="85%" stopColor="#9A3412" />
          <stop offset="100%" stopColor="#7C2D12" />
        </radialGradient>

        {/* Clay rim highlight */}
        <linearGradient id="pradipRim" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#9A3412" />
          <stop offset="50%" stopColor="#FDBA74" />
          <stop offset="100%" stopColor="#7C2D12" />
        </linearGradient>

        {/* Ghee pool with glowing warmth */}
        <radialGradient id="gheePool" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="55%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </radialGradient>

        {/* Outer Flame Glow */}
        <radialGradient id="flameHalo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FDE047" stopOpacity="0.8" />
          <stop offset="40%" stopColor="#F59E0B" stopOpacity="0.5" />
          <stop offset="80%" stopColor="#EA580C" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#EA580C" stopOpacity="0" />
        </radialGradient>

        {/* Outer Flame */}
        <linearGradient id="flameOuterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="30%" stopColor="#FBBF24" />
          <stop offset="70%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#DC2626" />
        </linearGradient>
      </defs>

      {/* Radiant ambient glow halo behind flame */}
      {flameGlow && (
        <circle 
          cx="60" 
          cy="32" 
          r="28" 
          fill="url(#flameHalo)" 
          style={{ animation: 'diya-flicker 2.2s infinite ease-in-out' }}
        />
      )}

      {/* Terracotta Clay Bottom Base */}
      <path 
        d="M14 62 C22 96 98 96 106 62 C88 74 32 74 14 62 Z" 
        fill="url(#pradipClayGrad)" 
        stroke="#431407" 
        strokeWidth="1.8" 
      />

      {/* Diya Bowl Outer Rim */}
      <ellipse cx="60" cy="62" rx="46" ry="11" fill="url(#pradipRim)" stroke="#7C2D12" strokeWidth="1.5" />

      {/* Ghee Oil Pool */}
      <ellipse cx="60" cy="63" rx="39" ry="7.5" fill="url(#gheePool)" />

      {/* Terracotta Traditional Beak Point */}
      <path d="M54 62 Q60 55 66 62 Z" fill="#9A3412" />

      {/* Flickering Flame with Organic Motion */}
      <g style={{ animation: 'diya-flicker 2.4s infinite ease-in-out', transformOrigin: '60px 48px' }}>
        {/* Flame Base Wick */}
        <line x1="60" y1="56" x2="60" y2="46" stroke="#451A03" strokeWidth="2.5" strokeLinecap="round" />
        {/* Outer Teardrop Flame */}
        <path 
          d="M60 8 C48 28 42 44 60 48 C78 44 72 28 60 8 Z" 
          fill="url(#flameOuterGrad)" 
        />
        {/* Inner Bright Golden Flame */}
        <path 
          d="M60 16 C53 29 50 39 60 44 C70 39 67 29 60 16 Z" 
          fill="#FEF9C3" 
        />
        {/* Inner Pure White Hot Core */}
        <ellipse cx="60" cy="38" rx="3.5" ry="6" fill="#FFFFFF" opacity="0.95" />
      </g>
    </svg>
  </div>
);

/**
 * Ultra-Realistic Botanical Feathery Kash Flowers (সৌম্য শরতের কাশফুল)
 * Multi-layered botanical plumes, silky feathery filaments, slender swaying bamboo stalks.
 */
export const BotanicalKashReeds = ({ position = 'left', className = '' }) => {
  const isLeft = position === 'left';
  return (
    <div 
      className={`fixed bottom-0 ${isLeft ? 'left-0 sm:left-2 md:left-6' : 'right-0 sm:right-2 md:right-6'} z-10 pointer-events-none select-none ${className}`}
      style={{
        width: 170,
        height: 310,
        transform: isLeft ? 'none' : 'scaleX(-1)',
        filter: 'drop-shadow(0 4px 14px rgba(245, 158, 11, 0.08))'
      }}
      aria-hidden="true"
    >
      <svg 
        viewBox="0 0 200 360" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        className="w-full h-full"
        style={{
          animation: isLeft ? 'kash-sway 6.2s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite' : 'kash-sway 5.6s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite reverse',
          transformOrigin: 'bottom center'
        }}
      >
        <defs>
          {/* Silky white plume feather gradient */}
          <linearGradient id="kashPlumeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.98" />
            <stop offset="45%" stopColor="#FFFDF7" stopOpacity="0.92" />
            <stop offset="85%" stopColor="#FEF3C7" stopOpacity="0.80" />
            <stop offset="100%" stopColor="#E2E8F0" stopOpacity="0.65" />
          </linearGradient>

          {/* Stalk gradient (olive ochre) */}
          <linearGradient id="kashStalkGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#65A30D" />
            <stop offset="60%" stopColor="#84CC16" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>

          {/* Soft feathery tuft filter */}
          <filter id="kashSoftGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ════ STALK 1: Tall Center Plume ════ */}
        <path d="M95 360 Q105 200 115 50" stroke="url(#kashStalkGrad)" strokeWidth="3" strokeLinecap="round" opacity="0.75" />
        
        {/* Plume 1 Feathery Wisps (Natural branching filaments) */}
        <g filter="url(#kashSoftGlow)">
          {Array.from({ length: 26 }).map((_, i) => {
            const t = i / 25;
            const cy = 50 + t * 160;
            const cx = 115 - t * 15 + Math.sin(i * 0.8) * 4;
            const spread = Math.sin(t * Math.PI) * 22 + 6;
            const angleL = -32 - i * 1.2;
            const angleR = 34 + i * 1.1;

            return (
              <g key={`kash1-layer-${i}`}>
                {/* Left wispy plume barb */}
                <path
                  d={`M ${cx} ${cy} Q ${cx - spread * 0.6} ${cy - 8} ${cx - spread} ${cy - 2}`}
                  stroke="#FFFFFF"
                  strokeWidth={2.4 - t * 1.2}
                  strokeLinecap="round"
                  opacity={0.95 - t * 0.25}
                />
                <ellipse
                  cx={cx - spread * 0.7}
                  cy={cy - 5}
                  rx={spread * 0.45}
                  ry={2.2}
                  transform={`rotate(${angleL} ${cx - spread * 0.7} ${cy - 5})`}
                  fill="url(#kashPlumeGrad)"
                  opacity={0.88 - t * 0.2}
                />

                {/* Right wispy plume barb */}
                <path
                  d={`M ${cx} ${cy} Q ${cx + spread * 0.6} ${cy - 7} ${cx + spread} ${cy - 1}`}
                  stroke="#FFFDF7"
                  strokeWidth={2.2 - t * 1.1}
                  strokeLinecap="round"
                  opacity={0.92 - t * 0.25}
                />
                <ellipse
                  cx={cx + spread * 0.7}
                  cy={cy - 4}
                  rx={spread * 0.48}
                  ry={2.2}
                  transform={`rotate(${angleR} ${cx + spread * 0.7} ${cy - 4})`}
                  fill="url(#kashPlumeGrad)"
                  opacity={0.85 - t * 0.2}
                />

                {/* Center fluffy core seed */}
                <circle cx={cx} cy={cy} r={2.5 - t * 0.8} fill="#FFFFFF" opacity={0.9} />
              </g>
            );
          })}
        </g>

        {/* ════ STALK 2: Left Leaning Plume ════ */}
        <path d="M70 360 Q50 220 40 100" stroke="url(#kashStalkGrad)" strokeWidth="2.5" strokeLinecap="round" opacity="0.65" />
        <g filter="url(#kashSoftGlow)">
          {Array.from({ length: 20 }).map((_, i) => {
            const t = i / 19;
            const cy = 100 + t * 140;
            const cx = 40 + t * 18 + Math.sin(i * 0.7) * 3;
            const spread = Math.sin(t * Math.PI) * 18 + 5;

            return (
              <g key={`kash2-layer-${i}`}>
                <path
                  d={`M ${cx} ${cy} Q ${cx - spread * 0.5} ${cy - 6} ${cx - spread} ${cy}`}
                  stroke="#FFFFFF"
                  strokeWidth={2.0 - t * 0.9}
                  strokeLinecap="round"
                  opacity={0.9 - t * 0.2}
                />
                <ellipse
                  cx={cx - spread * 0.6}
                  cy={cy - 3}
                  rx={spread * 0.42}
                  ry={2.0}
                  transform={`rotate(${-28 - i * 1.4} ${cx - spread * 0.6} ${cy - 3})`}
                  fill="url(#kashPlumeGrad)"
                  opacity={0.82}
                />
                <ellipse
                  cx={cx + spread * 0.5}
                  cy={cy - 2}
                  rx={spread * 0.38}
                  ry={1.8}
                  transform={`rotate(${26 + i * 1.2} ${cx + spread * 0.5} ${cy - 2})`}
                  fill="url(#kashPlumeGrad)"
                  opacity={0.8}
                />
              </g>
            );
          })}
        </g>

        {/* ════ STALK 3: Right Arcing Plume ════ */}
        <path d="M120 360 Q145 230 165 90" stroke="url(#kashStalkGrad)" strokeWidth="2.6" strokeLinecap="round" opacity="0.7" />
        <g filter="url(#kashSoftGlow)">
          {Array.from({ length: 22 }).map((_, i) => {
            const t = i / 21;
            const cy = 90 + t * 150;
            const cx = 165 - t * 28 + Math.sin(i * 0.6) * 3;
            const spread = Math.sin(t * Math.PI) * 20 + 5;

            return (
              <g key={`kash3-layer-${i}`}>
                <path
                  d={`M ${cx} ${cy} Q ${cx + spread * 0.6} ${cy - 6} ${cx + spread} ${cy}`}
                  stroke="#FFFFFF"
                  strokeWidth={2.2 - t * 1.0}
                  strokeLinecap="round"
                  opacity={0.92 - t * 0.2}
                />
                <ellipse
                  cx={cx + spread * 0.65}
                  cy={cy - 3}
                  rx={spread * 0.45}
                  ry={2.0}
                  transform={`rotate(${32 + i * 1.3} ${cx + spread * 0.65} ${cy - 3})`}
                  fill="url(#kashPlumeGrad)"
                  opacity={0.86}
                />
                <ellipse
                  cx={cx - spread * 0.55}
                  cy={cy - 3}
                  rx={spread * 0.4}
                  ry={1.8}
                  transform={`rotate(${-26 - i * 1.1} ${cx - spread * 0.55} ${cy - 3})`}
                  fill="url(#kashPlumeGrad)"
                  opacity={0.82}
                />
              </g>
            );
          })}
        </g>

        {/* Slender Autumn Grass Leaves at Base */}
        <path d="M40 360 Q30 290 10 260" stroke="#65A30D" strokeWidth="2.2" strokeLinecap="round" opacity="0.6" />
        <path d="M60 360 Q75 300 90 270" stroke="#84CC16" strokeWidth="2.0" strokeLinecap="round" opacity="0.55" />
        <path d="M140 360 Q160 310 185 285" stroke="#65A30D" strokeWidth="2.2" strokeLinecap="round" opacity="0.6" />
      </svg>
    </div>
  );
};

/**
 * ThemeDecorations — Master responsive decorative engine
 * Renders non-intrusive seasonal accents (Kash flowers, Diyas, Snow, Petals, Rain, Tricolor ribbon).
 * Positioned in safe areas without obstructing product names, prices, or checkout buttons.
 */
export const ThemeDecorations = () => {
  const { seasonalTheme, decorations, safeMode } = useTheme();

  // Stable particle positions
  const particles = useMemo(() => {
    if (!decorations?.particles || safeMode) return [];
    const count = seasonalTheme === 'christmas' || seasonalTheme === 'winter' ? 24 : 14;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${(i * 100) / count + (i % 4) * 2.5}%`,
      delay: `${(i * 0.5) % 7}s`,
      duration: `${6 + (i % 6)}s`,
      size: `${8 + (i % 10)}px`,
      opacity: 0.35 + ((i % 4) * 0.15)
    }));
  }, [decorations?.particles, seasonalTheme, safeMode]);

  if (safeMode || !decorations?.decorations) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-20 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* 1. DURGA PUJA: Subtle Festive Atmosphere */}
      {seasonalTheme === 'durga_puja' && decorations?.kashFlowers && (
        <>
          {/* Subtle floating autumn breeze particles */}
          <div className="absolute inset-0 pointer-events-none">
            {particles.map((p) => (
              <div
                key={`kash-drop-${p.id}`}
                className="absolute select-none text-white drop-shadow"
                style={{
                  left: p.left,
                  top: '-30px',
                  opacity: p.opacity,
                  animation: `petal-drift ${parseFloat(p.duration) * 1.3}s ease-in-out infinite`,
                  animationDelay: p.delay
                }}
              >
                {/* Feathery Kash Seed Tuft */}
                <svg width="24" height="24" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 28 L15 12" stroke="#D97706" strokeWidth="1.2" strokeLinecap="round" />
                  <circle cx="15" cy="28" r="1.5" fill="#92400E" />
                  {/* Fluffy white filaments spreading like dandelion/kash seed */}
                  <path d="M15 12 Q8 6 4 2" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" opacity="0.9" />
                  <path d="M15 12 Q11 4 10 0" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" opacity="0.85" />
                  <path d="M15 12 Q15 3 15 0" stroke="#FFFDF5" strokeWidth="1.4" strokeLinecap="round" opacity="0.95" />
                  <path d="M15 12 Q19 4 20 0" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" opacity="0.85" />
                  <path d="M15 12 Q22 6 26 2" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" opacity="0.9" />
                  <circle cx="15" cy="12" r="2" fill="#FEF08A" opacity="0.9" />
                </svg>
              </div>
            ))}
          </div>

          {/* Glowing Traditional Terracotta Clay Pradip in Screen Bottom Corners */}
          <div className="fixed bottom-3 left-3 sm:left-6 z-20 drop-shadow-xl hidden sm:block">
            <TerracottaPradip size={46} />
          </div>
          <div className="fixed bottom-3 right-3 sm:right-6 z-20 drop-shadow-xl hidden sm:block">
            <TerracottaPradip size={46} />
          </div>
        </>
      )}

      {/* 2. DIWALI: Flickering Terracotta Diyas in bottom corners */}
      {seasonalTheme === 'diwali' && decorations?.diyas && (
        <>
          <div className="fixed bottom-4 left-4 sm:left-8 z-20 drop-shadow-2xl">
            <TerracottaPradip size={50} />
          </div>
          <div className="fixed bottom-4 right-4 sm:right-8 z-20 drop-shadow-2xl">
            <TerracottaPradip size={50} />
          </div>
        </>
      )}

      {/* 3. CHRISTMAS & WINTER: Gentle falling snowflakes */}
      {decorations?.snow && (
        <div className="absolute inset-0">
          {particles.map((p) => (
            <div
              key={`snow-${p.id}`}
              className="absolute text-cyan-200/80 select-none"
              style={{
                left: p.left,
                top: '-15px',
                fontSize: p.size,
                opacity: p.opacity,
                animation: `gentle-snowfall ${p.duration} linear infinite`,
                animationDelay: p.delay,
                filter: 'drop-shadow(0 0 3px rgba(255,255,255,0.85))'
              }}
            >
              ❄
            </div>
          ))}
        </div>
      )}

      {/* 4. SPRING / BASANTA: Gentle drifting flower petals */}
      {decorations?.petals && (
        <div className="absolute inset-0">
          {particles.map((p) => (
            <div
              key={`petal-${p.id}`}
              className="absolute select-none"
              style={{
                left: p.left,
                top: '-20px',
                fontSize: p.size,
                opacity: p.opacity,
                animation: `petal-drift ${p.duration} ease-in-out infinite`,
                animationDelay: p.delay,
                filter: 'drop-shadow(0 0 3px rgba(236,72,153,0.4))'
              }}
            >
              🌸
            </div>
          ))}
        </div>
      )}

      {/* 5. MONSOON: Subtle vertical raindrops */}
      {decorations?.rain && (
        <div className="absolute inset-0 opacity-40">
          {particles.map((p) => (
            <div
              key={`rain-${p.id}`}
              className="absolute w-[1.5px] bg-gradient-to-b from-transparent via-cyan-400 to-transparent rounded-full select-none"
              style={{
                left: p.left,
                top: '-30px',
                height: `${24 + (p.id % 4) * 12}px`,
                animation: `rain-drizzle ${parseFloat(p.duration) * 0.4}s linear infinite`,
                animationDelay: p.delay
              }}
            />
          ))}
        </div>
      )}

      {/* 6. INDEPENDENCE & REPUBLIC DAY: Rotating Ashoka Chakra watermark in corner */}
      {decorations?.chakra && (
        <div 
          className="fixed -bottom-16 -right-16 w-56 h-56 rounded-full opacity-[0.07] pointer-events-none"
          style={{ animation: 'chakra-slow-spin 40s linear infinite' }}
        >
          <svg viewBox="0 0 100 100" fill="none" stroke="#1D4ED8" strokeWidth="1.5" className="w-full h-full">
            <circle cx="50" cy="50" r="46" />
            <circle cx="50" cy="50" r="10" fill="#1D4ED8" />
            {Array.from({ length: 24 }).map((_, i) => (
              <line
                key={`spoke-${i}`}
                x1="50"
                y1="50"
                x2="50"
                y2="4"
                transform={`rotate(${i * 15} 50 50)`}
                stroke="#1D4ED8"
                strokeWidth="1.2"
              />
            ))}
          </svg>
        </div>
      )}
    </div>
  );
};
