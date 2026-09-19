import React, { useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';

/**
 * Animated SVG Traditional Clay Diya (প্রদীপ) with natural flickering flame
 */
const AnimatedDiya = ({ className = '', size = 38 }) => (
  <div className={`relative inline-block ${className}`} style={{ width: size, height: size * 0.9 }}>
    <svg viewBox="0 0 100 90" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Terracotta Clay Base */}
      <path 
        d="M10 50 C20 78 80 78 90 50 C75 58 25 58 10 50 Z" 
        fill="url(#terracottaGrad)" 
        stroke="#78350F" 
        strokeWidth="2" 
      />
      {/* Diya Rim */}
      <ellipse cx="50" cy="50" rx="40" ry="8" fill="#B45309" stroke="#92400E" strokeWidth="1.5" />
      {/* Ghee Oil Pool */}
      <ellipse cx="50" cy="51" rx="34" ry="5.5" fill="#F59E0B" opacity="0.85" />
      
      {/* Flickering Flame (CSS Keyframed) */}
      <g style={{ animation: 'diya-flicker 2.4s infinite ease-in-out', transformOrigin: '50px 38px' }}>
        {/* Outer Flame Glow */}
        <path d="M50 8 C40 26 36 38 50 42 C64 38 60 26 50 8 Z" fill="url(#flameOuter)" />
        {/* Inner Bright Flame Core */}
        <path d="M50 16 C44 28 42 36 50 39 C58 36 56 28 50 16 Z" fill="#FFFBEB" />
      </g>
      
      <defs>
        <linearGradient id="terracottaGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#C2410C" />
          <stop offset="100%" stopColor="#7C2D12" />
        </linearGradient>
        <linearGradient id="flameOuter" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="60%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#DC2626" />
        </linearGradient>
      </defs>
    </svg>
  </div>
);

/**
 * Animated Kash Flowers (কাশফুল) for Durga Puja / Sharodotsav
 * Delicate white-silvery feathery reeds swaying in autumn breeze
 */
const AnimatedKashReeds = ({ position = 'left' }) => {
  const isLeft = position === 'left';
  return (
    <div 
      className={`fixed bottom-0 ${isLeft ? 'left-0 sm:left-4' : 'right-0 sm:right-4'} z-10 pointer-events-none select-none opacity-80 sm:opacity-95`}
      style={{
        width: 140,
        height: 220,
        transform: isLeft ? 'none' : 'scaleX(-1)'
      }}
      aria-hidden="true"
    >
      <svg 
        viewBox="0 0 160 240" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        className="w-full h-full"
        style={{
          animation: 'kash-sway 6s ease-in-out infinite',
          transformOrigin: 'bottom center'
        }}
      >
        {/* Stalk 1 (tall central) */}
        <path d="M70 240 Q75 120 85 40" stroke="#84CC16" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
        {/* Kash Feathers Stalk 1 */}
        {Array.from({ length: 14 }).map((_, i) => (
          <ellipse
            key={`kash1-${i}`}
            cx={85 + Math.sin(i) * 6}
            cy={40 + i * 5}
            rx={8 + (i % 3) * 2}
            ry={2.5}
            transform={`rotate(${i % 2 === 0 ? -25 : 25} ${85 + Math.sin(i) * 6} ${40 + i * 5})`}
            fill="#FFFFFF"
            stroke="#F1F5F9"
            strokeWidth="0.8"
            opacity={0.92 - i * 0.03}
          />
        ))}

        {/* Stalk 2 (shorter, swaying left) */}
        <path d="M50 240 Q40 140 30 80" stroke="#65A30D" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        {Array.from({ length: 11 }).map((_, i) => (
          <ellipse
            key={`kash2-${i}`}
            cx={30 + Math.sin(i) * 5}
            cy={80 + i * 6}
            rx={7 + (i % 2) * 2}
            ry={2.2}
            transform={`rotate(${i % 2 === 0 ? -30 : 20} ${30 + Math.sin(i) * 5} ${80 + i * 6})`}
            fill="#F8FAFC"
            stroke="#E2E8F0"
            strokeWidth="0.6"
            opacity={0.88 - i * 0.04}
          />
        ))}

        {/* Stalk 3 (curving right) */}
        <path d="M90 240 Q105 150 120 70" stroke="#84CC16" strokeWidth="2.2" strokeLinecap="round" opacity="0.55" />
        {Array.from({ length: 12 }).map((_, i) => (
          <ellipse
            key={`kash3-${i}`}
            cx={120 + Math.sin(i) * 5}
            cy={70 + i * 6}
            rx={7.5 + (i % 2) * 2}
            ry={2.2}
            transform={`rotate(${i % 2 === 0 ? -15 : 35} ${120 + Math.sin(i) * 5} ${70 + i * 6})`}
            fill="#FFFFFF"
            stroke="#CBD5E1"
            strokeWidth="0.7"
            opacity={0.9 - i * 0.03}
          />
        ))}
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
    if (!decorations.particles || safeMode) return [];
    const count = seasonalTheme === 'christmas' || seasonalTheme === 'winter' ? 26 : 14;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${(i * 100) / count + (i % 4) * 2}%`,
      delay: `${(i * 0.4) % 6}s`,
      duration: `${5 + (i % 5)}s`,
      size: `${6 + (i % 8)}px`,
      opacity: 0.25 + ((i % 4) * 0.12)
    }));
  }, [decorations.particles, seasonalTheme, safeMode]);

  if (safeMode || !decorations.decorations) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-20 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* 1. DURGA PUJA: Kash Flowers in bottom corners + Subtle Diya in corner */}
      {decorations.kashFlowers && (
        <>
          <AnimatedKashReeds position="left" />
          <AnimatedKashReeds position="right" />
          {/* Subtle glowing diya in bottom-left corner */}
          <div className="fixed bottom-4 left-4 hidden sm:block z-20 opacity-90 drop-shadow-lg">
            <AnimatedDiya size={42} />
          </div>
        </>
      )}

      {/* 2. DIWALI: Flickering Diyas in screen bottom corners */}
      {decorations.diyas && seasonalTheme === 'diwali' && (
        <>
          <div className="fixed bottom-4 left-4 sm:left-8 z-20 drop-shadow-xl">
            <AnimatedDiya size={46} />
          </div>
          <div className="fixed bottom-4 right-4 sm:right-8 z-20 drop-shadow-xl">
            <AnimatedDiya size={46} />
          </div>
        </>
      )}

      {/* 3. CHRISTMAS & WINTER: Gentle falling snowflakes */}
      {decorations.snow && (
        <div className="absolute inset-0">
          {particles.map((p) => (
            <div
              key={`snow-${p.id}`}
              className="absolute text-cyan-200/70 select-none"
              style={{
                left: p.left,
                top: '-15px',
                fontSize: p.size,
                opacity: p.opacity,
                animation: `gentle-snowfall ${p.duration} linear infinite`,
                animationDelay: p.delay,
                filter: 'drop-shadow(0 0 3px rgba(255,255,255,0.8))'
              }}
            >
              ❄
            </div>
          ))}
        </div>
      )}

      {/* 4. SPRING / BASANTA: Gentle drifting flower petals */}
      {decorations.petals && (
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
      {decorations.rain && (
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

      {/* 6. INDEPENDENCE & REPUBLIC DAY: Subtle rotating Ashoka Chakra watermark in corner */}
      {decorations.chakra && (
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
