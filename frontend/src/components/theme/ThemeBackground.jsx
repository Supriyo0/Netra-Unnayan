import React from 'react';
import { useTheme } from '../../context/ThemeContext';

/**
 * ThemeBackground — Central ambient background canvas
 * Renders high-end seasonal gradients and soft atmospheric lighting.
 * Sits behind all UI content with pointer-events-none.
 */
export const ThemeBackground = () => {
  const { seasonalTheme, activeTheme, isDark, safeMode } = useTheme();
  const palette = activeTheme.palette;

  if (safeMode) {
    return (
      <div 
        className="fixed inset-0 pointer-events-none -z-20 transition-colors duration-500"
        style={{ backgroundColor: isDark ? '#060D17' : '#FFFFFF' }}
      />
    );
  }

  return (
    <div 
      className="fixed inset-0 pointer-events-none -z-20 overflow-hidden transition-all duration-700 select-none"
      aria-hidden="true"
      style={{
        background: isDark
          ? `radial-gradient(ellipse at 50% 0%, ${palette.secondary}40 0%, #060D17 70%)`
          : `radial-gradient(ellipse at 50% 0%, ${palette.bgEnd} 0%, ${palette.bgStart} 80%)`
      }}
    >
      {/* 1. Subtle Atmospheric Ambient Spheres */}
      {seasonalTheme === 'durga_puja' && (
        <>
          {/* Golden sunlight glow from top-right */}
          <div 
            className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(245, 158, 11, 0.14) 0%, rgba(220, 38, 38, 0.04) 50%, transparent 75%)',
              filter: 'blur(70px)'
            }}
          />
          {/* Warm ivory soft mist bottom-left */}
          <div 
            className="absolute -bottom-40 -left-40 w-[550px] h-[550px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(254, 240, 138, 0.16) 0%, transparent 70%)',
              filter: 'blur(80px)'
            }}
          />
        </>
      )}

      {seasonalTheme === 'diwali' && (
        <>
          {/* Warm gold ambient aura top center */}
          <div 
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(245, 158, 11, 0.20) 0%, rgba(147, 51, 234, 0.10) 45%, transparent 70%)',
              filter: 'blur(80px)'
            }}
          />
          {/* Micro star points */}
          <div 
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage: 'radial-gradient(rgba(251, 191, 36, 0.7) 1px, transparent 1px), radial-gradient(rgba(255, 255, 255, 0.5) 1px, transparent 1px)',
              backgroundSize: '80px 80px, 140px 140px',
              backgroundPosition: '0 0, 40px 40px'
            }}
          />
        </>
      )}

      {seasonalTheme === 'christmas' && (
        <>
          {/* Snowy winter aurora top-left */}
          <div 
            className="absolute -top-20 -left-20 w-[650px] h-[650px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(5, 150, 105, 0.12) 0%, rgba(225, 29, 72, 0.06) 45%, transparent 70%)',
              filter: 'blur(80px)'
            }}
          />
          {/* Icy blue mist */}
          <div 
            className="absolute top-1/3 -right-20 w-[500px] h-[500px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, transparent 65%)',
              filter: 'blur(75px)'
            }}
          />
        </>
      )}

      {seasonalTheme === 'summer' && (
        <>
          {/* Crisp cyan & warm sun gold radial */}
          <div 
            className="absolute top-[-100px] right-[-100px] w-[700px] h-[700px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(245, 158, 11, 0.14) 0%, rgba(2, 132, 199, 0.12) 45%, transparent 70%)',
              filter: 'blur(90px)'
            }}
          />
        </>
      )}

      {seasonalTheme === 'winter' && (
        <>
          {/* Frosted silver mist */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse at 50% 20%, rgba(56, 189, 248, 0.10) 0%, transparent 60%)',
              filter: 'blur(60px)'
            }}
          />
        </>
      )}

      {seasonalTheme === 'independence' && (
        <>
          {/* Saffron glow top, Green aura bottom */}
          <div 
            className="absolute -top-32 left-0 right-0 h-[380px]"
            style={{
              background: 'radial-gradient(ellipse at 50% 0%, rgba(234, 88, 12, 0.14) 0%, transparent 75%)',
              filter: 'blur(70px)'
            }}
          />
          <div 
            className="absolute -bottom-32 left-0 right-0 h-[380px]"
            style={{
              background: 'radial-gradient(ellipse at 50% 100%, rgba(22, 163, 74, 0.10) 0%, transparent 75%)',
              filter: 'blur(70px)'
            }}
          />
        </>
      )}

      {seasonalTheme === 'republic' && (
        <>
          <div 
            className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[450px]"
            style={{
              background: 'radial-gradient(circle, rgba(29, 78, 216, 0.10) 0%, rgba(234, 88, 12, 0.08) 50%, transparent 75%)',
              filter: 'blur(80px)'
            }}
          />
        </>
      )}

      {seasonalTheme === 'spring' && (
        <>
          <div 
            className="absolute -top-24 right-0 w-[600px] h-[600px]"
            style={{
              background: 'radial-gradient(circle, rgba(234, 179, 8, 0.14) 0%, rgba(236, 72, 153, 0.08) 45%, transparent 70%)',
              filter: 'blur(80px)'
            }}
          />
        </>
      )}

      {seasonalTheme === 'monsoon' && (
        <>
          <div 
            className="absolute top-0 left-0 right-0 h-[450px]"
            style={{
              background: 'radial-gradient(ellipse at 50% 0%, rgba(13, 148, 136, 0.12) 0%, rgba(2, 132, 199, 0.08) 60%, transparent 80%)',
              filter: 'blur(80px)'
            }}
          />
        </>
      )}

      {seasonalTheme === 'default' && (
        <>
          <div 
            className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(0, 180, 216, 0.08) 0%, transparent 65%)',
              filter: 'blur(80px)'
            }}
          />
        </>
      )}
    </div>
  );
};
