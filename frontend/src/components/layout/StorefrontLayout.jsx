import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { FestiveBanner } from './FestiveBanner';
import { FestiveAmbience } from '../common/FestiveAmbience';

export const StorefrontLayout = () => {
  const { pathname } = useLocation();

  // Smooth scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#060D17] text-slate-900 dark:text-slate-100 flex flex-col selection:bg-brand-cyan selection:text-slate-950 transition-colors duration-200 relative">
      <FestiveAmbience />
      <FestiveBanner />
      <Navbar />
      <main className="flex-1 pb-16 md:pb-12">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
