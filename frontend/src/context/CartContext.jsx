import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';
import { AuthPromptModal } from '../components/common/AuthPromptModal';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [targetProductName, setTargetProductName] = useState('');

  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem('nu_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [couponCode, setCouponCode] = useState('');
  const [couponFeedback, setCouponFeedback] = useState(null);
  const [totals, setTotals] = useState({
    subtotal: 0,
    discount_amount: 0,
    shipping_fee: 0,
    free_shipping_threshold: 999,
    tax_amount: 0,
    total_amount: 0
  });
  const [isCalculating, setIsCalculating] = useState(false);

  // Synchronize with server calculation
  const recalculateCart = useCallback(async (currentItems, cCode) => {
    if (!currentItems || currentItems.length === 0) {
      setTotals({
        subtotal: 0,
        discount_amount: 0,
        shipping_fee: 0,
        free_shipping_threshold: 999,
        tax_amount: 0,
        total_amount: 0
      });
      setCouponFeedback(null);
      return;
    }

    setIsCalculating(true);
    try {
      const payload = {
        items: currentItems.map(i => ({
          product_id: i.product_id,
          quantity: i.quantity,
          lens_type: i.lens_type,
          lens_price: i.lens_price
        })),
        coupon_code: cCode || ''
      };
      const res = await api.post('/cart/calculate.php', payload);
      if (res.success && res.data) {
        setTotals({
          subtotal: res.data.subtotal,
          discount_amount: res.data.discount_amount,
          shipping_fee: res.data.shipping_fee,
          free_shipping_threshold: res.data.free_shipping_threshold,
          tax_amount: res.data.tax_amount,
          total_amount: res.data.total_amount
        });
        if (res.data.coupon_applied) {
          setCouponFeedback(res.data.coupon_applied);
        } else if (cCode) {
          setCouponFeedback({ invalid: true, message: 'Coupon could not be applied.' });
        } else {
          setCouponFeedback(null);
        }
      }
    } catch (err) {
      console.error('Server cart recalculation error:', err);
    } finally {
      setIsCalculating(false);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('nu_cart', JSON.stringify(items));
    } catch {}
    recalculateCart(items, couponCode);
  }, [items, couponCode, recalculateCart]);

  const isInCart = useCallback((productId) => {
    if (!productId) return false;
    return items.some((i) => String(i.product_id) === String(productId) || String(i.id) === String(productId));
  }, [items]);

  const addToCart = (product, quantity = 1, lensOptions = null, prescription = null, options = {}) => {
    if (!user) {
      setTargetProductName(product?.name || '');
      setAuthModalOpen(true);
      return { success: false, reason: 'auth_required' };
    }

    if (!product || !product.id) return { success: false };

    // Prevent adding 1 product multiple times
    const alreadyExists = items.some((i) => String(i.product_id) === String(product.id));
    if (alreadyExists) {
      return { success: false, alreadyInCart: true, message: 'This eyewear is already in your cart!' };
    }

    const regularPrice = Number(product.price);
    const unitPrice = product.discount_price !== null && product.discount_price !== undefined 
      ? Number(product.discount_price) 
      : regularPrice;

    const lensType = lensOptions?.lens_type || '';
    const lensPrice = lensOptions?.lens_price ? Number(lensOptions.lens_price) : 0;
    const selectedSize = options?.selected_size || options?.size || product.frame_size || 'Medium';
    const selectedColor = options?.selected_color || options?.color || product.frame_color || 'Matte Black';
    const primaryImg = product.primary_image || (product.images?.[0]?.image_url) || product.image_url || '';

    setItems((prev) => [
      ...prev,
      {
        product_id: product.id,
        name: product.name,
        sku: product.sku,
        unit_price: unitPrice,
        regular_price: regularPrice,
        image_url: primaryImg,
        quantity: 1,
        lens_type: lensType,
        lens_price: lensPrice,
        prescription: prescription || null,
        frame_size: selectedSize,
        selected_size: selectedSize,
        frame_color: selectedColor,
        selected_color: selectedColor,
        frame_shape: product.frame_shape,
        dimensions_label: product.dimensions_label
      }
    ]);

    return { success: true, alreadyInCart: false };
  };

  const removeFromCart = (index) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateQuantity = (index, newQty) => {
    if (newQty <= 0) {
      removeFromCart(index);
      return;
    }
    // Limit to 1 unit per item as requested
    setItems((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index].quantity = Math.min(1, newQty);
      }
      return updated;
    });
  };

  const applyCoupon = (code) => {
    const trimmed = code.trim().toUpperCase();
    setCouponCode(trimmed);
  };

  const removeCoupon = () => {
    setCouponCode('');
    setCouponFeedback(null);
  };

  const clearCart = () => {
    setItems([]);
    setCouponCode('');
    setCouponFeedback(null);
    localStorage.removeItem('nu_cart');
  };

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const clientSubtotal = items.reduce(
    (sum, item) => sum + (Number(item.unit_price || 0) + Number(item.lens_price || 0)) * Number(item.quantity || 1),
    0
  );
  const cartTotal = totals.total_amount > 0 ? totals.total_amount : clientSubtotal;

  return (
    <CartContext.Provider value={{
      items,
      itemCount,
      cartTotal,
      clientSubtotal,
      totals,
      couponCode,
      couponFeedback,
      isCalculating,
      isInCart,
      addToCart,
      removeFromCart,
      updateQuantity,
      applyCoupon,
      removeCoupon,
      clearCart
    }}>
      {children}
      <AuthPromptModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        actionType="cart"
        productName={targetProductName}
      />
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
};
