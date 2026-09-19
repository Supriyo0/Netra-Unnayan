import React from 'react';
import { useTheme } from '../../context/ThemeContext';

/**
 * SeasonalLogoWrapper — Non-destructive sacred logo seasonal adornment
 * Upholds the core rule:
 * NEVER permanently modify the official Netra Unnayan SVG logo.
 * Attaches subtle external seasonal overlays (Santa hat, Kash flowers, glowing diya, tricolor sweep).
 */
export const SeasonalLogoWrapper = ({ children, className = '' }) => {
  const { seasonalTheme, safeMode } = useTheme();

  if (safeMode || seasonalTheme === 'default') {
    return <div className={`relative inline-flex items-center ${className}`}>{children}</div>;
  }

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      {/* 1. CHRISTMAS: Miniature festive Santa hat perched gently above logo */}
      {seasonalTheme === 'christmas' && (
        <div 
          className="absolute -top-3 left-3 sm:left-4 z-10 pointer-events-none select-none transition-transform hover:scale-110"
          style={{ width: 22, height: 22 }}
          aria-hidden="true"
        >
          <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow">
            {/* Red cone bent slightly to right */}
            <path d="M6 30 Q16 6 32 14" stroke="#DC2626" strokeWidth="8" strokeLinecap="round" />
            <path d="M10 28 L28 16 L22 28 Z" fill="#DC2626" />
            {/* White fluffy trim */}
            <rect x="4" y="27" width="22" height="6" rx="3" fill="#FFFFFF" />
            {/* White fluffy pom-pom on tip */}
            <circle cx="33" cy="14" r="4.5" fill="#FFFFFF" />
          </svg>
        </div>
      )}

      {/* 2. DURGA PUJA: Subtle Kash flower sprig peeking behind the eye apex */}
      {seasonalTheme === 'durga_puja' && (
        <div 
          className="absolute -top-2 -left-2 z-[-1] pointer-events-none select-none opacity-85"
          style={{ width: 28, height: 32 }}
          aria-hidden="true"
        >
          <svg viewBox="0 0 40 45" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <path d="M10 40 Q18 20 28 6" stroke="#84CC16" strokeWidth="1.8" strokeLinecap="round" />
            {Array.from({ length: 6 }).map((_, i) => (
              <ellipse
                key={i}
                cx={26 - i * 2.5}
                cy={8 + i * 5}
                rx={4}
                ry={1.5}
                transform={`rotate(${i % 2 === 0 ? -25 : 30} ${26 - i * 2.5} ${8 + i * 5})`}
                fill="#FFFFFF"
                stroke="#E2E8F0"
                strokeWidth="0.5"
              />
            ))}
          </svg>
        </div>
      )}

      {/* 3. DIWALI: Golden micro diya aura glowing beside logo */}
      {seasonalTheme === 'diwali' && (
        <div 
          className="absolute -bottom-1 -right-1 z-10 pointer-events-none select-none drop-shadow"
          style={{ width: 18, height: 16 }}
          aria-hidden="true"
        >
          <svg viewBox="0 0 30 26" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <path d="M4 14 C8 24 22 24 26 14 Z" fill="#B45309" stroke="#78350F" strokeWidth="1" />
            <ellipse cx="15" cy="14" rx="11" ry="2.5" fill="#F59E0B" />
            <path d="M15 2 C12 8 10 12 15 13 C20 12 18 8 15 2 Z" fill="#FBBF24" />
          </svg>
        </div>
      )}

      {/* 4. INDEPENDENCE & REPUBLIC: Subtle Tricolor accent ring indicator */}
      {(seasonalTheme === 'independence' || seasonalTheme === 'republic') && (
        <div 
          className="absolute -inset-1 rounded-2xl pointer-events-none opacity-40 z-[-1]"
          style={{
            background: 'linear-gradient(135deg, rgba(234, 88, 12, 0.4) 0%, rgba(255, 255, 255, 0.1) 50%, rgba(22, 163, 74, 0.4) 100%)',
            filter: 'blur(3px)'
          }}
          aria-hidden="true"
        />
      )}

      {/* 5. WINTER: Frosted crystalline sheen */}
      {seasonalTheme === 'winter' && (
        <div 
          className="absolute -top-1 -right-1 text-[10px] text-cyan-300 pointer-events-none opacity-80"
          aria-hidden="true"
        >
          ❄
        </div>
      )}

      {/* UNTOUCHED SACRED LOGO CHILDREN */}
      {children}
    </div>
  );
};
