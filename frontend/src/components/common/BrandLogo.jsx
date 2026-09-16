import React from 'react';

/**
 * NetraSymbolSVG — Pure inline SVG reconstruction of the official Netra Unnayan logo symbol.
 *
 * Accurately traces: almond eye shape, 3 concentric inner outlines, large iris with 8
 * camera aperture blades, teal ribbon-style arrow curving upper-right.
 * TRUE transparent background — no white patches on any surface.
 *
 * @param {number}  size     Width in px (height auto-calculated from aspect ratio)
 * @param {boolean} spin     Whether the aperture rotates (default true)
 * @param {string}  className Extra CSS classes
 */
export const NetraSymbolSVG = ({ size = 60, spin = true, className = '' }) => {
  // Aspect ratio of the icon (width:height ≈ 1.15:1 based on the logo)
  const w = size;
  const h = Math.round(size * 0.88);

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 460 404"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Netra Unnayan logo icon"
      style={{ overflow: 'visible' }}
    >
      <defs>
        {/* Eye body: dark navy → medium blue gradient */}
        <linearGradient id="nuEyeBody" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#081845" />
          <stop offset="42%"  stopColor="#1652B8" />
          <stop offset="100%" stopColor="#1E6BD5" />
        </linearGradient>

        {/* Arrow: deep blue → bright teal */}
        <linearGradient id="nuArrow" x1="5%" y1="95%" x2="95%" y2="5%">
          <stop offset="0%"   stopColor="#1565C0" />
          <stop offset="48%"  stopColor="#00B8DC" />
          <stop offset="100%" stopColor="#00EEFF" />
        </linearGradient>

        {/* Aperture blade fill */}
        <linearGradient id="nuBlade" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#040C22" />
          <stop offset="55%"  stopColor="#0D3E94" />
          <stop offset="100%" stopColor="#1A68C8" />
        </linearGradient>

        {/* Pupil / inner iris radial highlight */}
        <radialGradient id="nuPupil" cx="38%" cy="38%" r="54%">
          <stop offset="0%"   stopColor="#FFFFFF"  stopOpacity="1"   />
          <stop offset="18%"  stopColor="#A0F8FF"  stopOpacity="0.95"/>
          <stop offset="44%"  stopColor="#1E88E5"  stopOpacity="0.9" />
          <stop offset="100%" stopColor="#040C22"  stopOpacity="1"   />
        </radialGradient>

        {/* Arrow inner ribbon highlight */}
        <linearGradient id="nuArrowHi" x1="5%" y1="95%" x2="95%" y2="5%">
          <stop offset="0%"   stopColor="rgba(255,255,255,0)"   />
          <stop offset="55%"  stopColor="rgba(255,255,255,0.32)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.55)" />
        </linearGradient>
      </defs>

      {/* ═══════════════════════════════════════════════
          1.  EYE OUTER BODY  —  almond / mandorla shape
          Left tip: (18,202)   Right tip: (390,202)
          Top apex: ~y=40      Bottom apex: ~y=364
          ═══════════════════════════════════════════════ */}
      <path
        d="M 18,202
           C 60,72  295,28  392,202
           C 295,376 60,332  18,202 Z"
        fill="url(#nuEyeBody)"
      />

      {/* Concentric inner eye outlines — 3 layers for 3-D depth effect */}
      <path
        d="M 46,202 C 84,86 278,46 366,202 C 278,358 84,318 46,202 Z"
        fill="none" stroke="rgba(255,255,255,0.24)" strokeWidth="3"
      />
      <path
        d="M 76,202 C 108,105 262,70 340,202 C 262,334 108,299 76,202 Z"
        fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="2.2"
      />
      <path
        d="M 108,202 C 134,126 246,96 314,202 C 246,308 134,278 108,202 Z"
        fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="1.6"
      />

      {/* ═══════════════════════════════════════════
          2.  IRIS OUTER RING
          Center: (208,202)  Radius: 114
          ═══════════════════════════════════════════ */}
      <circle cx="208" cy="202" r="114" fill="#060D26" stroke="#1652B8" strokeWidth="3.5" />

      {/* ═══════════════════════════════════════════
          3.  APERTURE BLADES  — 8 blades, spinning
          Each blade: triangle from center outward
          ═══════════════════════════════════════════ */}
      <g
        style={{
          transformOrigin: '208px 202px',
          animation: spin ? 'nu-aperture-continuous-spin 7.5s linear infinite' : 'none',
        }}
      >
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <path
            key={deg}
            d="M 208,202 L 222,96 L 254,118 Z"
            fill="url(#nuBlade)"
            stroke="#1A68C8"
            strokeWidth="0.8"
            strokeOpacity="0.5"
            transform={`rotate(${deg} 208 202)`}
          />
        ))}
      </g>

      {/* Inner iris ring to hide blade bases */}
      <circle cx="208" cy="202" r="48" fill="#060D26" />

      {/* ═══════════════════════════════════════════
          4.  PUPIL — bright radial highlight
          ═══════════════════════════════════════════ */}
      <circle cx="208" cy="202" r="44" fill="url(#nuPupil)" />

      {/* Specular catchlights */}
      <ellipse cx="194" cy="188" rx="10" ry="7"  fill="white" opacity="0.90" />
      <ellipse cx="218" cy="212" rx="4"  ry="3"  fill="white" opacity="0.38" />

      {/* ═══════════════════════════════════════════
          5.  TEAL ARROW  — curves from iris area → upper-right
          Tail origin: (235,185) → Tip: (418,28)
          ═══════════════════════════════════════════ */}

      {/* Arrow curved base connector (tail from eye interior) */}
      <path
        d="M 212,198 Q 224,182 238,172"
        fill="none"
        stroke="url(#nuArrow)"
        strokeWidth="26"
        strokeLinecap="round"
      />

      {/* Arrow main shaft */}
      <path
        d="M 238,172 L 400,34"
        stroke="url(#nuArrow)"
        strokeWidth="26"
        strokeLinecap="butt"
      />

      {/* Arrow ribbon inner highlight (3-D ribbon effect) */}
      <path
        d="M 240,170 L 398,36"
        stroke="url(#nuArrowHi)"
        strokeWidth="9"
        strokeLinecap="round"
      />

      {/* Arrow secondary outer curved line (the loop-around the eye bottom) */}
      <path
        d="M 230,215 Q 320,265 355,210 Q 385,162 400,118"
        fill="none"
        stroke="url(#nuArrow)"
        strokeWidth="12"
        strokeLinecap="round"
        opacity="0.85"
      />
      {/* Same line, inner ribbon */}
      <path
        d="M 230,215 Q 320,265 355,210 Q 385,162 400,118"
        fill="none"
        stroke="rgba(255,255,255,0.30)"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* Arrowhead — solid teal triangle */}
      <polygon points="415,18 378,50 404,66" fill="#00EEFF" />

    </svg>
  );
};

/**
 * BrandLogo — Official Netra Unnayan Logo (Mobile & Desktop)
 *
 * Displays our actual logo from root image.png with brand name "NETRA UNNAYAN"
 * and tag line "CLARITY YOU CAN TRUST".
 */
export const BrandLogo = ({ isDark = false, className = '', size = 'default' }) => {
  const hSize =
    size === 'sm' ? 'h-8 sm:h-9 md:h-11'
    : size === 'lg' ? 'h-12 sm:h-14 md:h-17'
    : 'h-10 sm:h-11 md:h-13 lg:h-14';

  return (
    <div className={`relative inline-flex items-center select-none group py-0.5 ${className}`}>
      <img
        src="/image.png"
        alt="Netra Unnayan — Clarity You Can Trust"
        className={`${hSize} w-auto max-w-[210px] sm:max-w-xs md:max-w-none object-contain shrink-0 transition-transform duration-300 group-hover:scale-[1.02]`}
        style={{ 
          filter: isDark 
            ? 'drop-shadow(0 2px 10px rgba(0, 180, 216, 0.35)) brightness(1.05)' 
            : 'drop-shadow(0 1px 4px rgba(0, 0, 0, 0.08))' 
        }}
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = '/logo_official.png';
        }}
      />
    </div>
  );
};

// Keep old export for any remaining references
export const NetraRotatingIris = ({ size = 36, className = '' }) => (
  <NetraSymbolSVG size={size} spin={true} className={className} />
);

export default BrandLogo;
