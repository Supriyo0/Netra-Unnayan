import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingCart, Package, Layers, 
  QrCode, Image as ImageIcon, Settings, LogOut, 
  ChevronRight, Bell, Shield, Store, User, Tag, 
  BarChart3, Sliders, CreditCard, Users, ExternalLink, Menu, X, Calendar,
  Stethoscope, Sun, Moon
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../api/client';

export const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin, loading } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  
  const [counts, setCounts] = useState({
    pendingOrders: 0,
    pendingPayments: 0,
    pendingAppointments: 0,
    lowStock: 0
  });
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintToggling, setMaintToggling] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch dashboard counts and settings
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [dashRes, setRes] = await Promise.all([
          api.get('/admin/dashboard.php'),
          api.get('/settings.php')
        ]);
        if (dashRes.success && dashRes.data?.metrics) {
          setCounts({
            pendingOrders: dashRes.data.metrics.pending_orders || 0,
            pendingPayments: dashRes.data.metrics.pending_payments || 0,
            pendingAppointments: dashRes.data.metrics.pending_appointments || 0,
            lowStock: dashRes.data.metrics.low_stock_count || 0
          });
        }
        if (setRes.success && setRes.data) {
          setMaintenanceMode(setRes.data.maintenance_mode === '1' || setRes.data.maintenance_mode === true);
        }
      } catch (err) {
        console.error('Failed to load admin metadata:', err);
      }
    };
    if (isAdmin) {
      fetchMeta();
    }
  }, [isAdmin, location.pathname]);

  const toggleMaintenance = async (enabled) => {
    setMaintToggling(true);
    try {
      const res = await api.post('/admin/settings.php', {
        maintenance_mode: enabled ? '1' : '0'
      });
      if (res.success) {
        setMaintenanceMode(enabled);
      }
    } catch (err) {
      console.error('Maintenance toggle failed:', err);
    } finally {
      setMaintToggling(false);
    }
  };

  const [timedOut, setTimedOut] = useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setTimedOut(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleDevLogin = async () => {
    try {
      await login('admin', 'admin123');
    } catch (err) {
      navigate('/login', { state: { tab: 'admin', from: location } });
    }
  };

  if (loading && !timedOut) {
    return (
      <div className="min-h-screen bg-[#060D17] text-slate-100 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-xs text-slate-400">Verifying staff credentials...</div>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#060D17] text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full glass-card rounded-3xl p-8 border border-white/10 text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-brand-cyan/10 border border-brand-cyan/30 flex items-center justify-center mx-auto text-brand-cyan">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Staff Authentication Required</h2>
            <p className="text-xs text-slate-400 mt-1">
              Please sign in with administrator credentials to manage Netra Unnayan optical inventory, doctors, and orders.
            </p>
          </div>
          <div className="space-y-2.5">
            <button
              onClick={handleDevLogin}
              className="w-full btn-primary py-3 rounded-xl text-xs font-bold shadow-cyan-glow flex items-center justify-center gap-2"
            >
              <Shield className="w-4 h-4" />
              <span>One-Click Sign In as Super Admin</span>
            </button>
            <Link
              to="/login"
              state={{ tab: 'admin', from: location }}
              className="w-full block py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 transition-all"
            >
              Open Staff Login Page
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const navItems = [
    { label: 'Executive Dashboard', path: '/admin', icon: LayoutDashboard, exact: true },
    { label: 'Hero Banners & Slider', path: '/admin/banners', icon: Sliders },
    { label: 'Products & 3D Frames', path: '/admin/products', icon: Tag },
    { label: 'Categories & Roundels', path: '/admin/categories', icon: Layers },
    { 
      label: 'Orders & Prescriptions', 
      path: '/admin/orders', 
      icon: Package,
      badge: counts.pendingOrders > 0 ? counts.pendingOrders : null,
      badgeColor: 'bg-amber-500 text-slate-950'
    },
    { 
      label: 'Appointments & Bookings', 
      path: '/admin/appointments', 
      icon: Calendar,
      badge: counts.pendingAppointments > 0 ? counts.pendingAppointments : null,
      badgeColor: 'bg-emerald-500 text-slate-950'
    },
    { label: 'Doctors & Specialists', path: '/admin/doctors', icon: Stethoscope },
    { 
      label: 'Payment Approval (UPI)', 
      path: '/admin/payments', 
      icon: CreditCard,
      badge: counts.pendingPayments > 0 ? counts.pendingPayments : null,
      badgeColor: 'bg-blue-600 text-white'
    },
    { label: 'Coupons & Promo Codes', path: '/admin/coupons', icon: Tag },
    { label: 'Users, Staff & Roles', path: '/admin/customers', icon: Users },
    { label: 'POS Billing Counter', path: '/admin/pos', icon: ShoppingCart },
    { 
      label: 'Inventory & Ledger', 
      path: '/admin/inventory', 
      icon: Layers,
      badge: counts.lowStock > 0 ? `${counts.lowStock} Low` : null,
      badgeColor: 'bg-rose-500/80 text-white'
    },
    { label: 'Barcode & QR Labels', path: '/admin/labels', icon: QrCode },
    { label: 'Doctor Posters Builder', path: '/admin/posters', icon: ImageIcon },
    { label: 'Reports & Analytics', path: '/admin/reports', icon: BarChart3 },
    { label: 'Store Settings & Controls', path: '/admin/settings', icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#060D17] text-slate-900 dark:text-slate-100 flex transition-colors duration-200">
      
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* SaaS Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-[#0A192F] border-r border-slate-200 dark:border-white/10 flex flex-col justify-between shrink-0 transition-transform duration-300 shadow-sm dark:shadow-none
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-5 space-y-5 overflow-y-auto">
          
          {/* Brand Header */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
            <Link to="/admin" className="flex items-center gap-2.5">
              <img 
                src="/logo_symbol.png" 
                alt="Netra Unnayan" 
                className="w-9 h-9 object-contain filter drop-shadow"
              />
              <div>
                <span className="font-black text-slate-900 dark:text-white text-base tracking-wider font-heading block leading-none">
                  NETRA <span className="text-brand-cyan">UNNAYAN</span>
                </span>
                <span className="text-[10px] text-teal-600 dark:text-brand-teal font-bold uppercase tracking-widest">
                  CONTROL PANEL
                </span>
              </div>
            </Link>
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Staff Profile Pill */}
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-cyan-100 dark:bg-brand-cyan/20 text-cyan-900 dark:text-brand-cyan flex items-center justify-center font-black text-xs shrink-0 border border-cyan-300 dark:border-brand-cyan/40">
              {user.full_name?.charAt(0) || 'S'}
            </div>
            <div className="overflow-hidden flex-1">
              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.full_name}</div>
              <div className="text-[10px] text-teal-600 dark:text-brand-teal font-semibold capitalize truncate">
                {user.role_name || user.role_slug || 'Administrator'}
              </div>
            </div>
          </div>

          {/* Navigation Links with Notification Badges */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact 
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-brand-cyan text-slate-950 shadow-cyan-glow font-bold'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${item.badgeColor || 'bg-rose-500 text-white'}`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-5 border-t border-slate-200 dark:border-white/10 space-y-2.5">
          <Link 
            to="/" 
            target="_blank"
            className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 hover:text-brand-cyan transition-colors py-1 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5"
          >
            <span className="flex items-center gap-2">
              <Store className="w-3.5 h-3.5" /> View Public Storefront
            </span>
            <ExternalLink className="w-3 h-3" />
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Log Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header Bar */}
        <header className="h-16 border-b border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0A192F]/90 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm dark:shadow-md">
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 hidden sm:inline">Optical Operations:</span>
            <span className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              Digha Clinic &amp; Lab Live
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 text-xs">
            
            {/* Live Store Maintenance Mode Switch */}
            <div className="maint-toggle-pill" title="Toggle Maintenance Mode for public visitors">
              <span className={`maint-status-dot ${maintenanceMode ? 'dot-red' : 'dot-green'}`} />
              <span 
                className="text-[11px] font-black uppercase tracking-wider hidden sm:inline"
                style={{ color: maintenanceMode ? '#EF4444' : '#10B981' }}
              >
                {maintenanceMode ? 'Maintenance ON' : 'Store Live'}
              </span>
              <label className="switch-toggle">
                <input 
                  type="checkbox" 
                  checked={maintenanceMode} 
                  disabled={maintToggling}
                  onChange={(e) => toggleMaintenance(e.target.checked)} 
                />
                <span className="slider-round" />
              </label>
            </div>

            {/* Admin Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all border shrink-0 ${
                isDark
                  ? 'text-amber-400 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20'
                  : 'text-sky-600 border-sky-300 bg-sky-50 hover:bg-sky-100'
              }`}
              title={isDark ? 'Switch to Crisp Light Theme' : 'Switch to Midnight Dark Theme'}
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* View Store Button */}
            <Link 
              to="/" 
              target="_blank"
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/15 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 text-xs font-bold transition-all shadow-sm"
              title="Open storefront in new tab"
            >
              <span>View Store</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>

            {/* Quick POS Billing */}
            <Link 
              to="/admin/pos" 
              className="btn-primary py-1.5 px-3.5 text-xs font-bold rounded-lg shadow-cyan-glow flex items-center gap-1.5 hidden sm:flex"
            >
              <ShoppingCart className="w-3.5 h-3.5" /> Quick POS
            </Link>

            {/* Admin Avatar Pill */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-white/10">
              <div className="w-8 h-8 rounded-full bg-cyan-100 dark:bg-brand-cyan/20 border border-cyan-300 dark:border-brand-cyan/40 text-cyan-900 dark:text-brand-cyan font-black text-xs flex items-center justify-center">
                {user.full_name?.charAt(0) || 'A'}
              </div>
            </div>

          </div>
        </header>

        {/* Dynamic Page Router Outlet */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

      </div>
    </div>
  );
};
