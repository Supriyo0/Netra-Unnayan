import React, { useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';

export const FestiveAmbience = () => {
  const { seasonalTheme, festiveEffectsEnabled } = useTheme();

  if (!festiveEffectsEnabled || seasonalTheme === 'default') {
    return null;
  }

  // Pre-generate stable particle positions
  const particles = useMemo(() => {
    const count = seasonalTheme === 'christmas' ? 24 : 16;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${(i * 100) / count + (i % 3) * 2}%`,
      top: `${(i * 17) % 95}%`,
      delay: `${(i * 0.4) % 4}s`,
      duration: `${4 + (i % 5)}s`,
      size: `${6 + (i % 8)}px`,
      opacity: 0.15 + ((i % 4) * 0.1)
    }));
  }, [seasonalTheme]);

  const getParticleContent = () => {
    switch (seasonalTheme) {
      case 'durga_puja':
        return '✨';
      case 'christmas':
        return '❄️';
      case 'summer':
        return '☀️';
      case 'winter':
        return '❄️';
      case 'independence':
        return '🇮🇳';
      case 'diwali':
        return '🪔';
      default:
        return '✨';
    }
  };

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-10 overflow-hidden select-none"
      aria-hidden="true"
    >
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-float text-xs"
          style={{
            left: p.left,
            top: p.top,
            animationDelay: p.delay,
            animationDuration: p.duration,
            opacity: p.opacity,
            fontSize: p.size,
            filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.4))'
          }}
        >
          {getParticleContent()}
        </div>
      ))}
    </div>
  );
};
