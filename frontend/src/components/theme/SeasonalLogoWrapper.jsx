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

      {/* 2. DURGA PUJA: Authentic Terracotta Clay Pradip & Silky Feathery Kash Sprig gracefully above logo */}
      {seasonalTheme === 'durga_puja' && (
        <>
          {/* Terracotta Pradip with glowing flame placed right above the eye icon */}
          <div 
            className="absolute -top-3.5 left-2.5 sm:left-3.5 z-20 pointer-events-none select-none drop-shadow-md transition-transform duration-300 group-hover:scale-110"
            style={{ width: 22, height: 20 }}
            aria-hidden="true"
          >
            <svg viewBox="0 0 100 95" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              {/* Flame Glow */}
              <circle cx="50" cy="28" r="22" fill="#FDE047" opacity="0.6" style={{ animation: 'diya-flicker 2.2s infinite ease-in-out' }} />
              {/* Terracotta Clay Base */}
              <path d="M12 55 C20 85 80 85 88 55 C70 65 30 65 12 55 Z" fill="#C2410C" stroke="#7C2D12" strokeWidth="2" />
              <ellipse cx="50" cy="55" rx="38" ry="8" fill="#EA580C" stroke="#7C2D12" strokeWidth="1.5" />
              <ellipse cx="50" cy="56" rx="30" ry="5.5" fill="#F59E0B" />
              {/* Flickering Flame */}
              <g style={{ animation: 'diya-flicker 2.4s infinite ease-in-out', transformOrigin: '50px 42px' }}>
                <line x1="50" y1="50" x2="50" y2="40" stroke="#451A03" strokeWidth="2" strokeLinecap="round" />
                <path d="M50 8 C40 24 35 38 50 42 C65 38 60 24 50 8 Z" fill="#F59E0B" />
                <path d="M50 14 C44 25 42 33 50 37 C58 33 56 25 50 14 Z" fill="#FEF08A" />
                <ellipse cx="50" cy="32" rx="2.5" ry="4.5" fill="#FFFFFF" opacity="0.9" />
              </g>
            </svg>
          </div>

          {/* Delicate Silky Kash Flower plume behind the logo */}
          <div 
            className="absolute -top-3 -left-3 z-[-1] pointer-events-none select-none opacity-90"
            style={{ width: 34, height: 38 }}
            aria-hidden="true"
          >
            <svg viewBox="0 0 50 55" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <path d="M12 50 Q22 24 34 8" stroke="#84CC16" strokeWidth="2" strokeLinecap="round" opacity="0.75" />
              {/* Feather wisps */}
              {Array.from({ length: 8 }).map((_, i) => (
                <g key={i}>
                  <line 
                    x1={34 - i * 2.8} 
                    y1={8 + i * 5} 
                    x2={34 - i * 2.8 - (i % 2 === 0 ? 8 : -8)} 
                    y2={8 + i * 5 - 3} 
                    stroke="#FFFFFF" 
                    strokeWidth="1.8" 
                    strokeLinecap="round"
                    opacity="0.95"
                  />
                  <ellipse 
                    cx={34 - i * 2.8 - (i % 2 === 0 ? 4 : -4)} 
                    cy={8 + i * 5 - 1.5} 
                    rx="4.5" 
                    ry="1.4" 
                    transform={`rotate(${i % 2 === 0 ? -30 : 30} ${34 - i * 2.8 - (i % 2 === 0 ? 4 : -4)} ${8 + i * 5 - 1.5})`}
                    fill="#FFFFFF"
                    opacity="0.85"
                  />
                </g>
              ))}
            </svg>
          </div>
        </>
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
