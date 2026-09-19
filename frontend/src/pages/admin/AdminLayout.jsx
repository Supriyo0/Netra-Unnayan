import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingCart, Package, Layers, 
  QrCode, Image as ImageIcon, Settings, LogOut, 
  ChevronRight, Bell, Shield, Store, User, Tag, 
  BarChart3, Sliders, CreditCard, Users, ExternalLink, Menu, X, Calendar,
  Stethoscope, Sun, Moon, UserCheck, Palette
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

  const navGroups = [
    {
      title: 'CORE OPERATIONS',
      items: [
        { label: 'Executive Dashboard', path: '/admin', icon: LayoutDashboard, exact: true },
        { label: 'POS Billing Counter', path: '/admin/pos', icon: ShoppingCart },
        { 
          label: 'Orders & Prescriptions', 
          path: '/admin/orders', 
          icon: Package,
          badge: counts.pendingOrders > 0 ? counts.pendingOrders : null,
          badgeColor: 'bg-amber-500 text-slate-950 font-black'
        },
        { label: 'Staff Sales & Billing', path: '/admin/staff-sales', icon: UserCheck }
      ]
    },
    {
      title: 'OPTICAL & CLINICAL',
      items: [
        { 
          label: 'Appointments & Bookings', 
          path: '/admin/appointments', 
          icon: Calendar,
          badge: counts.pendingAppointments > 0 ? counts.pendingAppointments : null,
          badgeColor: 'bg-emerald-500 text-slate-950 font-black'
        },
        { label: 'Doctors & Specialists', path: '/admin/doctors', icon: Stethoscope },
        { 
          label: 'Payment Approval (UPI)', 
          path: '/admin/payments', 
          icon: CreditCard,
          badge: counts.pendingPayments > 0 ? counts.pendingPayments : null,
          badgeColor: 'bg-blue-600 text-white font-black'
        }
      ]
    },
    {
      title: 'CATALOG & MERCHANDISING',
      items: [
        { label: 'Products & 3D Frames', path: '/admin/products', icon: Tag },
        { 
          label: 'Inventory & Ledger', 
          path: '/admin/inventory', 
          icon: Layers,
          badge: counts.lowStock > 0 ? `${counts.lowStock} Low` : null,
          badgeColor: 'bg-rose-500 text-white font-bold'
        },
        { label: 'Barcode & QR Labels', path: '/admin/labels', icon: QrCode },
        { label: 'Categories & Roundels', path: '/admin/categories', icon: Layers },
        { label: 'Hero Banners & Slider', path: '/admin/banners', icon: Sliders },
        { label: 'Appearance & Themes', path: '/admin/themes', icon: Palette }
      ]
    },
    {
      title: 'INTELLIGENCE & SYSTEM',
      items: [
        { label: 'Reports & Analytics', path: '/admin/reports', icon: BarChart3 },
        { label: 'Doctor Posters Builder', path: '/admin/posters', icon: ImageIcon },
        { label: 'Coupons & Promo Codes', path: '/admin/coupons', icon: Tag },
        { label: 'Users, Staff & Roles', path: '/admin/customers', icon: Users },
        { label: 'Store Settings & Controls', path: '/admin/settings', icon: Settings }
      ]
    }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#060D17] text-slate-900 dark:text-slate-100 flex flex-col md:flex-row transition-colors duration-200">
      
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 md:hidden animate-fadeIn"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* SaaS Sidebar Desktop & Slideout Drawer on Mobile */}
      <aside className={`
        fixed md:sticky top-0 inset-y-0 left-0 z-50 w-72 bg-white dark:bg-[#0A192F] border-r border-slate-200 dark:border-white/10 flex flex-col justify-between shrink-0 transition-transform duration-300 shadow-xl md:shadow-none h-screen
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-4 space-y-4 overflow-y-auto scrollbar-thin flex-1">
          
          {/* Brand Header */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
            <Link to="/admin" className="flex items-center gap-2.5 group">
              <img 
                src="/logo_symbol.png" 
                alt="Netra Unnayan" 
                className="w-9 h-9 object-contain filter drop-shadow group-hover:scale-105 transition-transform"
              />
              <div>
                <span className="font-black text-slate-900 dark:text-white text-base tracking-wider font-heading block leading-none">
                  NETRA <span className="text-brand-cyan">UNNAYAN</span>
                </span>
                <span className="text-[10px] text-teal-600 dark:text-brand-teal font-extrabold uppercase tracking-widest flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  CONTROL PANEL
                </span>
              </div>
            </Link>
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Staff Profile Pill */}
          <div className="p-3 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-cyan to-brand-teal text-slate-950 flex items-center justify-center font-black text-xs shrink-0 shadow-md">
              {user.full_name?.charAt(0) || 'A'}
            </div>
            <div className="overflow-hidden flex-1">
              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.full_name || 'Staff User'}</div>
              <div className="text-[10px] text-teal-600 dark:text-brand-teal font-bold uppercase tracking-wider truncate">
                {user.role_name || user.role_slug || 'Administrator'}
              </div>
            </div>
          </div>

          {/* Grouped Navigation Links */}
          <div className="space-y-4 pt-1">
            {navGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1">
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-3 pb-1">
                  {group.title}
                </div>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.exact 
                    ? location.pathname === item.path
                    : location.pathname.startsWith(item.path);

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all group ${
                        isActive
                          ? 'bg-gradient-to-r from-brand-cyan to-brand-teal text-slate-950 font-black shadow-cyan-glow'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110 text-slate-400 dark:text-slate-400 group-hover:text-brand-cyan'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>

                      {item.badge && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 shadow-xs ${item.badgeColor || 'bg-rose-500 text-white'}`}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-white/10 space-y-2 bg-slate-50 dark:bg-slate-950/40">
          <Link 
            to="/" 
            target="_blank"
            className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 hover:text-brand-cyan transition-colors py-1.5 px-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 font-semibold"
          >
            <span className="flex items-center gap-2">
              <Store className="w-4 h-4 text-brand-cyan" /> View Public Storefront
            </span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out from Desk
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        
        {/* Top Header Bar */}
        <header className="h-16 border-b border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0A192F]/90 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm dark:shadow-md">
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                Digha Clinic &amp; Mobile Lab
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 text-xs">
            
            {/* Live Store Maintenance Mode Switch */}
            <div className="maint-toggle-pill hidden sm:flex" title="Toggle Maintenance Mode for public visitors">
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
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border shrink-0 ${
                isDark
                  ? 'text-amber-400 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20'
                  : 'text-sky-600 border-sky-300 bg-sky-50 hover:bg-sky-100'
              }`}
              title={isDark ? 'Switch to Crisp Light Theme' : 'Switch to Midnight Dark Theme'}
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Quick POS Billing */}
            <Link 
              to="/admin/pos" 
              className="btn-primary py-1.5 px-3 sm:px-3.5 text-xs font-bold rounded-xl shadow-cyan-glow flex items-center gap-1.5"
            >
              <ShoppingCart className="w-3.5 h-3.5" /> 
              <span className="hidden sm:inline">Quick POS</span>
            </Link>

            {/* View Store Button */}
            <Link 
              to="/" 
              target="_blank"
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/15 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hidden lg:flex items-center gap-1 text-xs font-bold transition-all shadow-sm"
              title="Open storefront in new tab"
            >
              <span>Store</span>
              <ExternalLink className="w-3 h-3" />
            </Link>

          </div>
        </header>

        {/* Dynamic Page Router Outlet */}
        <main className="flex-1 p-3 sm:p-5 lg:p-7 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        {/* Mobile Bottom Quick Navigation Dock */}
        <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-[#0A192F]/95 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 px-2 py-1.5 flex items-center justify-around shadow-2xl">
          <Link 
            to="/admin" 
            className={`flex flex-col items-center py-1 px-2 text-[10px] font-bold ${
              location.pathname === '/admin' ? 'text-brand-cyan' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 mb-0.5" />
            <span>Dashboard</span>
          </Link>

          <Link 
            to="/admin/pos" 
            className={`flex flex-col items-center py-1 px-2 text-[10px] font-bold ${
              location.pathname === '/admin/pos' ? 'text-brand-cyan' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <ShoppingCart className="w-4 h-4 mb-0.5" />
            <span>POS</span>
          </Link>

          <Link 
            to="/admin/orders" 
            className={`flex flex-col items-center py-1 px-2 text-[10px] font-bold relative ${
              location.pathname.startsWith('/admin/orders') ? 'text-brand-cyan' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Package className="w-4 h-4 mb-0.5" />
            <span>Orders</span>
            {counts.pendingOrders > 0 && (
              <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-amber-500" />
            )}
          </Link>

          <Link 
            to="/admin/appointments" 
            className={`flex flex-col items-center py-1 px-2 text-[10px] font-bold relative ${
              location.pathname.startsWith('/admin/appointments') ? 'text-brand-cyan' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Calendar className="w-4 h-4 mb-0.5" />
            <span>Bookings</span>
            {counts.pendingAppointments > 0 && (
              <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </Link>

          <Link 
            to="/admin/staff-sales" 
            className={`flex flex-col items-center py-1 px-2 text-[10px] font-bold ${
              location.pathname.startsWith('/admin/staff-sales') ? 'text-brand-cyan' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <UserCheck className="w-4 h-4 mb-0.5" />
            <span>Staff</span>
          </Link>

          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center py-1 px-2 text-[10px] font-bold text-slate-500 dark:text-slate-400"
          >
            <Menu className="w-4 h-4 mb-0.5" />
            <span>More</span>
          </button>
        </div>

      </div>
    </div>
  );
};
