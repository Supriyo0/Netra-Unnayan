import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { FestiveBanner } from './FestiveBanner';
import { ThemeBackground } from '../theme/ThemeBackground';
import { ThemeDecorations } from '../theme/ThemeDecorations';

export const StorefrontLayout = () => {
  const { pathname } = useLocation();

  // Smooth scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col selection:bg-brand-cyan selection:text-slate-950 transition-colors duration-200 relative">
      <ThemeBackground />
      <ThemeDecorations />
      <FestiveBanner />
      <Navbar />
      <main className="flex-1 pb-16 md:pb-12 relative z-10">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
