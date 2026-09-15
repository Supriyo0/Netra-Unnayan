import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { LoadingScreen } from './components/common/LoadingScreen';

// Layouts
import { StorefrontLayout } from './components/layout/StorefrontLayout';
import { AdminLayout } from './pages/admin/AdminLayout';

// Storefront Pages
import { HomePage } from './pages/HomePage';
import { CatalogPage } from './pages/CatalogPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage } from './pages/CartPage';
import { WishlistPage } from './pages/WishlistPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderSuccessPage } from './pages/OrderSuccessPage';
import { OrderTrackingPage } from './pages/OrderTrackingPage';
import { DoctorsPage } from './pages/DoctorsPage';
import { HomeEyeCheckupPage } from './pages/HomeEyeCheckupPage';
import { DoctorPostersPage } from './pages/DoctorPostersPage';
import { AccountPage } from './pages/AccountPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { 
  AboutPage, 
  ContactPage, 
  TermsPage, 
  ReturnPolicyPage, 
  RefundPolicyPage, 
  PrivacyPolicyPage 
} from './pages/PolicyPages';

// Admin Suite Pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminBannersPage } from './pages/admin/AdminBannersPage';
import { AdminProductsPage } from './pages/admin/AdminProductsPage';
import { AdminAddProductPage } from './pages/admin/AdminAddProductPage';
import { AdminPosPage } from './pages/admin/AdminPosPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminInventoryPage from './pages/admin/AdminInventoryPage';
import AdminLabelsPage from './pages/admin/AdminLabelsPage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';
import AdminPostersPage from './pages/admin/AdminPostersPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import { AdminCategoriesPage } from './pages/admin/AdminCategoriesPage';
import { AdminPaymentsPage } from './pages/admin/AdminPaymentsPage';
import { AdminCouponsPage } from './pages/admin/AdminCouponsPage';
import { AdminCustomersPage } from './pages/admin/AdminCustomersPage';
import { AdminAppointmentsPage } from './pages/admin/AdminAppointmentsPage';
import { AdminDoctorsPage } from './pages/admin/AdminDoctorsPage';

function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-7xl font-extrabold text-brand-cyan mb-3 font-mono">404</h1>
      <h2 className="text-2xl font-bold text-white mb-2">Optical Path Lost</h2>
      <p className="text-slate-400 text-sm max-w-md mb-6">
        The page you are looking for does not exist or has been relocated to another optical department.
      </p>
      <a 
        href="/" 
        className="btn-primary py-2.5 px-6 rounded-xl text-xs font-bold shadow-cyan-glow"
      >
        Return to Netra Storefront
      </a>
    </div>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              {showSplash && <LoadingScreen onComplete={handleSplashComplete} />}
              <Routes>
                {/* Storefront Customer Routes */}
                <Route element={<StorefrontLayout />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/catalog" element={<CatalogPage />} />
                  <Route path="/shop" element={<CatalogPage />} />
                  <Route path="/product/:id" element={<ProductDetailPage />} />
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/wishlist" element={<WishlistPage />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/order-success" element={<OrderSuccessPage />} />
                  <Route path="/order-success/:orderNumber" element={<OrderSuccessPage />} />
                  <Route path="/track-order" element={<OrderTrackingPage />} />
                  <Route path="/order-tracking" element={<OrderTrackingPage />} />
                  <Route path="/doctors" element={<DoctorsPage />} />
                  <Route path="/home-eye-checkup" element={<HomeEyeCheckupPage />} />
                  <Route path="/doctor-posters" element={<DoctorPostersPage />} />
                  <Route path="/account" element={<AccountPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/returns" element={<ReturnPolicyPage />} />
                  <Route path="/refunds" element={<RefundPolicyPage />} />
                  <Route path="/privacy" element={<PrivacyPolicyPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>

                {/* Admin & POS Suite Routes */}
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboardPage />} />
                  <Route path="banners" element={<AdminBannersPage />} />
                  <Route path="products" element={<AdminProductsPage />} />
                  <Route path="products/new" element={<AdminAddProductPage />} />
                  <Route path="products/edit/:id" element={<AdminAddProductPage />} />
                  <Route path="categories" element={<AdminCategoriesPage />} />
                  <Route path="orders" element={<AdminOrdersPage />} />
                  <Route path="appointments" element={<AdminAppointmentsPage />} />
                  <Route path="doctors" element={<AdminDoctorsPage />} />
                  <Route path="payments" element={<AdminPaymentsPage />} />
                  <Route path="coupons" element={<AdminCouponsPage />} />
                  <Route path="customers" element={<AdminCustomersPage />} />
                  <Route path="pos" element={<AdminPosPage />} />
                  <Route path="inventory" element={<AdminInventoryPage />} />
                  <Route path="labels" element={<AdminLabelsPage />} />
                  <Route path="reports" element={<AdminReportsPage />} />
                  <Route path="posters" element={<AdminPostersPage />} />
                  <Route path="settings" element={<AdminSettingsPage />} />
                </Route>
              </Routes>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
