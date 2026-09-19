import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Trash2, Plus, Minus, ArrowRight, ShoppingBag, 
  Tag, ShieldCheck, Truck, Check, AlertCircle, Gift, Sparkles, RefreshCw
} from 'lucide-react';
import api from '../api/client';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export const CartPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?redirect=/cart');
    }
  }, [user, authLoading, navigate]);

  const { 
    items, 
    totals, 
    couponCode, 
    couponFeedback, 
    isCalculating, 
    updateQuantity, 
    removeFromCart, 
    applyCoupon, 
    removeCoupon,
    clearCart 
  } = useCart();

  const [inputCoupon, setInputCoupon] = useState(couponCode || '');
  const [availableCoupons, setAvailableCoupons] = useState([
    {
      code: 'CLARITY10',
      discount_type: 'PERCENTAGE',
      discount_value: 10,
      min_order_amount: 1499,
      description: 'Get 10% instant discount on orders above ₹1,499'
    },
    {
      code: 'NETRA500',
      discount_type: 'FIXED',
      discount_value: 500,
      min_order_amount: 2999,
      description: 'Flat ₹500 off on premium titanium orders above ₹2,999'
    }
  ]);
  const [showCouponsList, setShowCouponsList] = useState(false);

  useEffect(() => {
    api.get('/coupons.php').then(res => {
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setAvailableCoupons(res.data);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (couponCode) {
      setInputCoupon(couponCode);
    }
  }, [couponCode]);

  const handleApplyCoupon = (e) => {
    e?.preventDefault();
    if (inputCoupon.trim()) {
      applyCoupon(inputCoupon.trim());
    }
  };

  const handleQuickApply = (code) => {
    setInputCoupon(code);
    applyCoupon(code);
  };

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-5">
        <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Your Optical Cart is Empty</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          Explore our collection of Japanese titanium frames, polarized sunglasses, and anti-glare computer lenses.
        </p>
        <Link to="/shop" className="btn-primary text-xs py-3 px-6 inline-flex font-bold">
          Browse All Eyewear
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Shopping Cart</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{items.length} item(s) selected for clinical fabrication</p>
        </div>
        <button 
          onClick={clearCart} 
          className="text-xs text-rose-500 hover:underline font-semibold"
        >
          Clear Cart
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Cart Items List */}
        <div className="lg:col-span-8 space-y-4">
          {items.map((item, idx) => {
            const linePrice = (item.unit_price + (item.lens_price || 0)) * item.quantity;

            return (
              <div 
                key={idx} 
                className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  {/* Thumbnail */}
                  <div className="w-20 h-20 rounded-xl bg-slate-50 dark:bg-[#070E1A] p-2 shrink-0 border border-slate-200 dark:border-white/10 flex items-center justify-center">
                    <img 
                      src={item.image_url || '/logo_symbol.png'} 
                      alt={item.name} 
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>

                  {/* Info */}
                  <div className="space-y-1">
                    <div className="text-[11px] font-mono text-slate-500">
                      SKU: {item.sku} &bull; Size: <strong className="text-brand-cyan">{item.selected_size || item.frame_size || 'Medium'}</strong>{item.selected_color && <span> &bull; Color: <strong className="text-white">{item.selected_color}</strong></span>}
                    </div>
                    <Link to={`/product/${item.sku}`} className="font-bold text-sm text-slate-900 dark:text-white hover:text-brand-cyan transition-colors line-clamp-1">
                      {item.name}
                    </Link>
                    
                    {item.lens_type && (
                      <div className="text-xs text-brand-teal font-semibold">
                        Lens: {item.lens_type} (+₹{item.lens_price})
                      </div>
                    )}

                    <div className="text-xs text-slate-600 dark:text-slate-300">
                      ₹{item.unit_price} each
                    </div>
                  </div>
                </div>

                {/* Quantity & Controls */}
                <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200 dark:border-white/10">
                  
                  {/* Stepper */}
                  <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-1">
                    <button 
                      onClick={() => updateQuantity(idx, item.quantity - 1)}
                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center text-xs font-bold text-slate-900 dark:text-white font-mono">
                      {item.quantity}
                    </span>
                    <button 
                      onClick={() => updateQuantity(idx, item.quantity + 1)}
                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Line Total */}
                  <div className="text-right min-w-[80px]">
                    <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                      ₹{linePrice}
                    </div>
                  </div>

                  {/* Delete Button */}
                  <button 
                    onClick={() => removeFromCart(idx)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Order Summary & Coupon Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-card rounded-2xl p-6 space-y-5">
            <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs border-b border-slate-200 dark:border-white/10 pb-3">
              Verified Order Summary
            </h3>

            {/* Coupon Code Input */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-brand-cyan" />
                  <span>Apply Promotional Coupon</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowCouponsList(!showCouponsList)}
                  className="text-[11px] text-brand-cyan hover:underline font-bold flex items-center gap-1"
                >
                  <Gift className="w-3 h-3" />
                  <span>{showCouponsList ? 'Hide Offers' : 'View Offers'}</span>
                </button>
              </div>

              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <input 
                  type="text"
                  placeholder="e.g. NETRA500, CLARITY10"
                  value={inputCoupon}
                  onChange={(e) => setInputCoupon(e.target.value.toUpperCase())}
                  className="flex-1 glass-input rounded-xl px-3 py-2 text-xs font-mono uppercase font-bold"
                />
                <button 
                  type="submit" 
                  disabled={isCalculating || !inputCoupon.trim()}
                  className="btn-secondary text-xs px-4 py-2 rounded-xl shrink-0 font-bold flex items-center gap-1 disabled:opacity-50"
                >
                  {isCalculating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Apply'}
                </button>
              </form>

              {couponFeedback && (
                <div className={`text-xs p-2.5 rounded-xl flex items-center justify-between font-semibold ${
                  couponFeedback.invalid 
                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30' 
                    : 'bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-500/30'
                }`}>
                  <span className="flex items-center gap-1.5 text-[11px]">
                    {couponFeedback.invalid ? <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" /> : <Check className="w-3.5 h-3.5 text-teal-500 shrink-0" />}
                    {couponFeedback.invalid ? couponFeedback.message : `Coupon applied: -₹${totals.discount_amount}`}
                  </span>
                  {!couponFeedback.invalid && (
                    <button 
                      type="button"
                      onClick={() => {
                        removeCoupon();
                        setInputCoupon('');
                      }} 
                      className="text-rose-500 hover:underline text-[10px] font-bold"
                    >
                      Remove
                    </button>
                  )}
                </div>
              )}

              {/* Available Coupons Accordion */}
              {showCouponsList && (
                <div className="pt-2 border-t border-slate-200 dark:border-white/10 space-y-2 animate-fadeIn">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Available Promo Coupons:
                  </div>
                  {availableCoupons.map((cpn) => {
                    const isCurrent = couponCode?.toUpperCase() === cpn.code?.toUpperCase();
                    return (
                      <div 
                        key={cpn.code} 
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-black text-brand-cyan text-xs px-2 py-0.5 rounded bg-brand-cyan/15 border border-brand-cyan/30">
                              {cpn.code}
                            </span>
                            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                              {cpn.discount_type === 'PERCENTAGE' ? `${cpn.discount_value}% OFF` : `₹${cpn.discount_value} FLAT OFF`}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            {cpn.description || `Min order ₹${cpn.min_order_amount || 0}`}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleQuickApply(cpn.code)}
                          disabled={isCurrent}
                          className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                            isCurrent
                              ? 'bg-emerald-500 text-slate-950 cursor-default font-extrabold'
                              : 'btn-secondary hover:bg-brand-cyan hover:text-slate-950'
                          }`}
                        >
                          {isCurrent ? 'Applied' : 'Apply'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Breakdown */}
            <div className="space-y-2.5 text-xs border-t border-slate-200 dark:border-white/10 pt-4">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Subtotal (Frames &amp; Lenses)</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">₹{totals.subtotal}</span>
              </div>

              {totals.discount_amount > 0 && (
                <div className="flex justify-between text-teal-600 dark:text-teal-400 font-semibold">
                  <span>Coupon Discount</span>
                  <span className="font-mono">-₹{totals.discount_amount}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Standard Delivery (Purba Medinipur)</span>
                <span className="font-mono font-medium">
                  {totals.shipping_fee === 0 ? (
                    <span className="text-teal-600 dark:text-teal-400 font-bold">FREE (Above ₹{totals.free_shipping_threshold})</span>
                  ) : (
                    `₹${totals.shipping_fee}`
                  )}
                </span>
              </div>

              <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                <span>Applicable Optical GST</span>
                <span>Included in prices</span>
              </div>

              <div className="border-t border-slate-200 dark:border-white/10 pt-3 flex justify-between items-baseline text-sm">
                <span className="font-bold text-slate-900 dark:text-white">Final Total</span>
                <span className="text-xl font-black text-brand-cyan font-mono">
                  ₹{totals.total_amount}
                </span>
              </div>
            </div>

            {/* Checkout Button */}
            <button
              onClick={() => navigate('/checkout')}
              disabled={isCalculating}
              className="w-full btn-primary py-3.5 text-sm font-bold flex items-center justify-center gap-2 rounded-xl shadow-cyan-glow disabled:opacity-50"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-[11px] text-slate-400 text-center space-y-1">
              <p className="flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                Server-Verified Pricing &bull; Safe Checkout
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
