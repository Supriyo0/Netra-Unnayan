import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ShieldCheck, Truck, QrCode, CreditCard, Lock, 
  ArrowRight, AlertCircle, CheckCircle2, ChevronRight,
  Upload, Image as ImageIcon, X, Sparkles, MapPin, Plus, Check,
  FileText, MessageCircle, ExternalLink, Tag, Gift, Home,
  Building2, Navigation, Trash2, Edit3, RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import api from '../api/client';
import { uploadToImgBB } from '../utils/imgbb';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const { 
    items, 
    totals, 
    couponCode, 
    couponFeedback, 
    applyCoupon, 
    removeCoupon, 
    isCalculating, 
    clearCart 
  } = useCart();
  const { user } = useAuth();

  // Coupon state on checkout
  const [checkoutCouponInput, setCheckoutCouponInput] = useState(couponCode || '');
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

  // All shipping fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [paymentMode, setPaymentMode] = useState('COD'); // 'COD' or 'UPI'
  const [upiUtr, setUpiUtr] = useState('');
  const [paymentProof, setPaymentProof] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);

  // Saved addresses state
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [saveAddressToAccount, setSaveAddressToAccount] = useState(true);
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  // Quick Add New Address Modal
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [newAddrForm, setNewAddrForm] = useState({
    recipient_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    landmark: '',
    city: 'Digha',
    state: 'West Bengal',
    pincode: '721428',
    address_type: 'HOME',
    is_default: false
  });
  const [savingNewAddr, setSavingNewAddr] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Select address helper
  const selectAddress = (addr) => {
    if (!addr) return;
    setSelectedAddressId(addr.id);
    setUseNewAddress(false);
    if (addr.recipient_name) setCustomerName(addr.recipient_name);
    if (addr.phone) setCustomerPhone(addr.phone);
    setAddressLine1(addr.address_line1 || '');
    setAddressLine2(addr.address_line2 || '');
    setLandmark(addr.landmark || '');
    setCity(addr.city || 'Digha');
    setState(addr.state || 'West Bengal');
    setPincode(addr.pincode || '');
  };

  // Fetch available active coupons
  useEffect(() => {
    api.get('/coupons.php').then(res => {
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setAvailableCoupons(res.data);
      }
    }).catch(() => {});
  }, []);

  // Fetch saved addresses from server and prefill customer info from user account
  const fetchSavedAddresses = async () => {
    if (!user) return;
    setLoadingAddresses(true);
    try {
      if (!customerName && (user.full_name || user.name)) {
        setCustomerName(user.full_name || user.name || '');
      }
      if (!customerPhone && user.phone) {
        setCustomerPhone(user.phone || '');
      }
      if (!customerEmail && user.email) {
        setCustomerEmail(user.email || '');
      }

      const res = await api.get('/account/addresses.php');
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setSavedAddresses(res.data);
        // If customer has a default address, select it immediately
        const def = res.data.find(a => a.is_default == 1) || res.data[0];
        if (def) {
          selectAddress(def);
          setUseNewAddress(false);
        }
      } else {
        setUseNewAddress(true);
      }
    } catch {
      setUseNewAddress(true);
    } finally {
      setLoadingAddresses(false);
    }
  };

  useEffect(() => {
    fetchSavedAddresses();
  }, [user]);

  // Keep checkout coupon input in sync
  useEffect(() => {
    if (couponCode) {
      setCheckoutCouponInput(couponCode);
    }
  }, [couponCode]);

  const handleApplyCheckoutCoupon = (e) => {
    e?.preventDefault();
    if (checkoutCouponInput.trim()) {
      applyCoupon(checkoutCouponInput.trim());
    }
  };

  const handleQuickApplyCoupon = (code) => {
    setCheckoutCouponInput(code);
    applyCoupon(code);
  };

  const handleSaveNewAddressModal = async (e) => {
    e.preventDefault();
    if (!newAddrForm.recipient_name || !newAddrForm.phone || !newAddrForm.address_line1 || !newAddrForm.pincode) {
      alert('Please fill all required address fields.');
      return;
    }
    setSavingNewAddr(true);
    try {
      const res = await api.post('/account/addresses.php', newAddrForm);
      if (res.success) {
        await fetchSavedAddresses();
        setShowAddAddressModal(false);
        setNewAddrForm({
          recipient_name: '',
          phone: '',
          address_line1: '',
          address_line2: '',
          landmark: '',
          city: 'Digha',
          state: 'West Bengal',
          pincode: '721428',
          address_type: 'HOME',
          is_default: false
        });
      } else {
        alert(res.message || 'Failed to save address.');
      }
    } catch (err) {
      alert(err.message || 'Error saving address.');
    } finally {
      setSavingNewAddr(false);
    }
  };

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  const handleProofChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('Proof image must be smaller than 10MB');
      return;
    }
    setUploadingProof(true);
    try {
      const res = await uploadToImgBB(file);
      if (res.success && res.url) {
        setPaymentProof(res.url);
      } else {
        alert(res.message || 'Failed to upload proof to ImgBB cloud');
      }
    } catch (err) {
      alert('Upload error: ' + err.message);
    } finally {
      setUploadingProof(false);
    }
  };

  // Prescription handling at checkout
  const existingRx = items.find(i => i.prescription)?.prescription || null;
  const [checkoutRx, setCheckoutRx] = useState(existingRx);
  const [uploadingCheckoutRx, setUploadingCheckoutRx] = useState(false);

  useEffect(() => {
    if (!checkoutRx && existingRx) {
      setCheckoutRx(existingRx);
    }
  }, [existingRx]);

  const handleCheckoutRxUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingCheckoutRx(true);
    try {
      const res = await uploadToImgBB(file);
      if (res.success && res.url) {
        setCheckoutRx(prev => ({
          ...(prev || {}),
          method: 'IMAGE_UPLOAD',
          file_url: res.url,
          image_url: res.url,
          rx_image_url: res.url,
          notes: prev?.notes || 'Prescription slip uploaded at checkout'
        }));
      } else {
        alert(res.message || 'Failed to upload prescription slip');
      }
    } catch (err) {
      alert('Upload error: ' + err.message);
    } finally {
      setUploadingCheckoutRx(false);
    }
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!customerName.trim() || !customerPhone.trim() || !addressLine1.trim() || !pincode.trim()) {
      setErrorMessage('Please fill in all required shipping fields (Name, Phone, Address, PIN).');
      return;
    }

    setIsSubmitting(true);
    try {
      const firstRx = checkoutRx || items.find(i => i.prescription)?.prescription || null;

      const payload = {
        customer_id: user?.type === 'customer' ? user.id : null,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_email: customerEmail.trim() || null,
        address_line1: addressLine1.trim(),
        address_line2: addressLine2.trim() || null,
        landmark: landmark.trim() || null,
        city: city.trim() || 'Digha',
        state: state.trim() || 'West Bengal',
        pincode: pincode.trim(),
        payment_mode: paymentMode,
        coupon_code: couponCode || '',
        notes: orderNotes.trim() || null,
        upi_utr: paymentMode === 'UPI' ? (upiUtr.trim() || null) : null,
        payment_proof_url: paymentMode === 'UPI' ? (paymentProof || null) : null,
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          lens_type: item.lens_type,
          lens_price: item.lens_price,
          frame_size: item.selected_size || item.frame_size || 'Medium',
          frame_color: item.selected_color || item.frame_color || 'Matte Black'
        })),
        prescription: firstRx
      };

      const res = await api.post('/orders/create.php', payload);

      if (res.success && res.data) {
        // Automatically save new address to user account if opted in
        if (saveAddressToAccount && user && useNewAddress) {
          api.post('/account/addresses.php', {
            recipient_name: customerName.trim(),
            phone: customerPhone.trim(),
            address_line1: addressLine1.trim(),
            address_line2: addressLine2.trim() || null,
            landmark: landmark.trim() || null,
            city: city.trim() || 'Digha',
            state: state.trim() || 'West Bengal',
            pincode: pincode.trim(),
            address_type: 'HOME',
            is_default: savedAddresses.length === 0 ? 1 : 0
          }).catch(() => {});
        }

        // Confetti celebration
        try {
          confetti({
            particleCount: 90,
            spread: 80,
            origin: { y: 0.6 }
          });
        } catch {}

        clearCart();
        navigate(`/order-success/${res.data.order_number}`, {
          state: { orderData: res.data }
        });
      } else {
        setErrorMessage(res.message || 'Failed to place order.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Order placement failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-brand-cyan">
            Step 2 of 2: Clinical Verification
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-0.5">
            Secure Optical Checkout
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Choose delivery destination, attach doctor prescription, apply coupons &amp; confirm order
          </p>
        </div>

        <Link
          to="/cart"
          className="text-xs font-bold text-brand-cyan hover:underline inline-flex items-center gap-1 self-start sm:self-auto"
        >
          &larr; Back to Shopping Cart
        </Link>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2.5 shadow-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Shipping & Customer Details */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* SECTION 1: CUSTOMER CONTACT */}
          <div className="glass-card rounded-2xl p-6 space-y-4 border-2 border-slate-200 dark:border-white/10 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-cyan border-b border-slate-200 dark:border-white/10 pb-2 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-brand-cyan/20 text-brand-cyan flex items-center justify-center font-mono text-[10px]">1</span>
              <span>Customer Contact Details</span>
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-700 dark:text-slate-300 font-semibold mb-1">Full Name *</label>
                <input 
                  type="text" 
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Rahul Sen"
                  className="w-full glass-input rounded-xl px-3.5 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-700 dark:text-slate-300 font-semibold mb-1">Mobile Phone (for delivery &amp; OTP) *</label>
                <input 
                  type="tel" 
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. 9830123456"
                  className="w-full glass-input rounded-xl px-3.5 py-2 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-700 dark:text-slate-300 font-semibold mb-1">Email Address (Optional for Invoice PDF &amp; Tracking)</label>
              <input 
                type="email" 
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="e.g. rahul@example.com"
                className="w-full glass-input rounded-xl px-3.5 py-2 text-xs"
              />
            </div>
          </div>

          {/* SECTION 2: SAVED ADDRESS CHOOSER & DELIVERY DESTINATION */}
          <div className="glass-card rounded-2xl p-6 space-y-4 border-2 border-slate-200 dark:border-white/10 shadow-sm">
            
            {/* Header with Mode Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3 gap-3">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-brand-cyan/20 text-brand-cyan flex items-center justify-center font-mono text-[10px]">2</span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-cyan flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" /> Delivery Destination &amp; Address
                </h3>
              </div>
              
              {/* If user has saved addresses, show tabs */}
              {user && savedAddresses.length > 0 && (
                <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-white/10 border border-slate-300 dark:border-white/10 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setUseNewAddress(false)}
                    className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                      !useNewAddress
                        ? 'bg-brand-cyan text-slate-950 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Home className="w-3.5 h-3.5" />
                    <span>Saved Addresses ({savedAddresses.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUseNewAddress(true);
                      setSelectedAddressId(null);
                    }}
                    className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                      useNewAddress
                        ? 'bg-brand-cyan text-slate-950 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Enter New Address</span>
                  </button>
                </div>
              )}
            </div>

            {/* Guest / Non-logged in Prompt */}
            {!user && (
              <div className="p-3.5 rounded-xl bg-brand-cyan/10 border border-brand-cyan/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-medium">
                  <Sparkles className="w-4 h-4 text-brand-cyan shrink-0" />
                  <span>Already have an account with saved addresses?</span>
                </div>
                <Link
                  to={`/login?redirect=${encodeURIComponent('/checkout')}`}
                  className="px-3 py-1 rounded-lg bg-brand-cyan text-slate-950 font-bold hover:bg-cyan-400 transition-colors shrink-0"
                >
                  Log In &rarr;
                </Link>
              </div>
            )}

            {/* VIEW A: SAVED ADDRESSES CARDS SELECTOR */}
            {!useNewAddress && user && savedAddresses.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
                    Select a saved address for this optical delivery:
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAddAddressModal(true)}
                    className="text-xs text-brand-cyan hover:underline font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add New Address
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {savedAddresses.map((addr) => {
                    const isSelected = selectedAddressId === addr.id;
                    return (
                      <div
                        key={addr.id}
                        onClick={() => selectAddress(addr)}
                        className={`p-4 rounded-2xl cursor-pointer transition-all border-2 relative flex flex-col justify-between ${
                          isSelected
                            ? 'border-brand-cyan bg-brand-cyan/10 shadow-lg shadow-brand-cyan/10 ring-2 ring-brand-cyan/30'
                            : 'border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] hover:border-brand-cyan/50 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30 flex items-center gap-1">
                              {addr.address_type === 'OFFICE' ? <Building2 className="w-3 h-3" /> : <Home className="w-3 h-3" />}
                              <span>{addr.address_type || 'HOME'}</span>
                            </span>

                            {addr.is_default == 1 && (
                              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/30">
                                Default Address
                              </span>
                            )}
                          </div>

                          <h4 className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{addr.recipient_name}</span>
                          </h4>
                          
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 font-mono mt-0.5">
                            📞 {addr.phone}
                          </p>

                          <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-2 leading-relaxed">
                            {addr.address_line1}{addr.address_line2 ? `, ${addr.address_line2}` : ''}
                            {addr.landmark ? ` (Near ${addr.landmark})` : ''}<br />
                            {addr.city}, {addr.state} - <strong className="font-mono text-slate-900 dark:text-white">{addr.pincode}</strong>
                          </p>
                        </div>

                        {/* Explicit Select Button */}
                        <div className="pt-3 mt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              selectAddress(addr);
                            }}
                            className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                              isSelected
                                ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-sm'
                                : 'bg-brand-cyan/15 hover:bg-brand-cyan text-brand-cyan hover:text-slate-950 border border-brand-cyan/40'
                            }`}
                          >
                            {isSelected ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Delivering to This Address</span>
                              </>
                            ) : (
                              <span>Deliver Here</span>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* VIEW B: NEW ADDRESS ENTRY FORM */}
            {(useNewAddress || !user || savedAddresses.length === 0) && (
              <div className="space-y-4">
                
                {/* Autofill helper if customer has saved addresses */}
                {savedAddresses.length > 0 && (
                  <div className="p-3 rounded-xl bg-brand-cyan/10 border border-brand-cyan/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                      <Sparkles className="w-4 h-4 text-brand-cyan shrink-0" />
                      <span>Autofill from your saved addresses:</span>
                    </div>
                    <select
                      onChange={(e) => {
                        const targetId = parseInt(e.target.value, 10);
                        const found = savedAddresses.find((a) => a.id === targetId);
                        if (found) {
                          selectAddress(found);
                        }
                      }}
                      defaultValue=""
                      className="glass-input rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 border-brand-cyan/40"
                    >
                      <option value="" disabled>-- Select Saved Address to Autofill --</option>
                      {savedAddresses.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.address_type || 'HOME'}: {a.recipient_name} ({a.city} - {a.pincode})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Flat / House / Building / Street Address *
                  </label>
                  <input 
                    type="text" 
                    required
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    placeholder="e.g. Flat 4B, Sagarika Enclave, Digha Bypass Rd"
                    className="w-full glass-input rounded-xl px-3.5 py-2 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-700 dark:text-slate-300 font-semibold mb-1">Area / Locality</label>
                    <input 
                      type="text" 
                      value={addressLine2}
                      onChange={(e) => setAddressLine2(e.target.value)}
                      placeholder="e.g. Jatimati / New Digha"
                      className="w-full glass-input rounded-xl px-3.5 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-700 dark:text-slate-300 font-semibold mb-1">Nearby Landmark</label>
                    <input 
                      type="text" 
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      placeholder="e.g. Near Digha Railway Station"
                      className="w-full glass-input rounded-xl px-3.5 py-2 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-700 dark:text-slate-300 font-semibold mb-1">City / Town *</label>
                    <input 
                      type="text" 
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Digha"
                      className="w-full glass-input rounded-xl px-3.5 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-700 dark:text-slate-300 font-semibold mb-1">State *</label>
                    <input 
                      type="text" 
                      required
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="West Bengal"
                      className="w-full glass-input rounded-xl px-3.5 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-700 dark:text-slate-300 font-semibold mb-1">PIN Code *</label>
                    <input 
                      type="text" 
                      required
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      placeholder="721428"
                      className="w-full glass-input rounded-xl px-3.5 py-2 text-xs text-center font-mono"
                    />
                  </div>
                </div>

                {user && (
                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input 
                      type="checkbox" 
                      checked={saveAddressToAccount}
                      onChange={(e) => setSaveAddressToAccount(e.target.checked)}
                      className="rounded border-slate-300 dark:border-white/20 text-brand-cyan focus:ring-0"
                    />
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                      Save this address to my account for 1-click checkout next time
                    </span>
                  </label>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Order &amp; Delivery Instructions (Optional)
              </label>
              <textarea 
                rows="2"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="e.g. Call before delivery, or special frame fitting notes..."
                className="w-full glass-input rounded-xl px-3.5 py-2 text-xs"
              />
            </div>
          </div>

          {/* SECTION 3: OPTICAL PRESCRIPTION ATTACHMENT */}
          <div className="glass-card rounded-2xl p-6 space-y-4 border-2 border-slate-200 dark:border-white/10 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-cyan flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-brand-cyan/20 text-brand-cyan flex items-center justify-center font-mono text-[10px]">3</span>
                <FileText className="w-4 h-4 text-brand-cyan" />
                <span>Doctor Prescription Slip</span>
              </h3>
              {checkoutRx && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/50 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Attached
                </span>
              )}
            </div>

            {checkoutRx ? (
              <div className="p-4 rounded-xl bg-cyan-50/50 dark:bg-brand-cyan/[0.04] border border-cyan-200 dark:border-brand-cyan/20 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-brand-cyan" />
                      <span>{checkoutRx.lens_type || 'Prescription Eyewear Customized'}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Method: <strong className="text-slate-800 dark:text-slate-200">{checkoutRx.method === 'IMAGE_UPLOAD' ? 'Slip Photo Upload' : checkoutRx.method === 'WHATSAPP' ? 'Fast-Track via WhatsApp' : 'Direct Diopter Values'}</strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCheckoutRx(null)}
                    className="text-[11px] text-rose-500 hover:underline font-semibold"
                  >
                    Change
                  </button>
                </div>

                {(checkoutRx.file_url || checkoutRx.rx_image_url || checkoutRx.image_url) && (
                  <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10">
                    <img 
                      src={checkoutRx.file_url || checkoutRx.rx_image_url || checkoutRx.image_url} 
                      alt="Prescription Slip" 
                      className="w-12 h-12 rounded object-cover border border-slate-200 dark:border-white/10 shrink-0 cursor-pointer"
                      onClick={() => window.open(checkoutRx.file_url || checkoutRx.rx_image_url || checkoutRx.image_url, '_blank')}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">Doctor Prescription Slip Attached</div>
                      <a 
                        href={checkoutRx.file_url || checkoutRx.rx_image_url || checkoutRx.image_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-brand-cyan hover:underline inline-flex items-center gap-0.5"
                      >
                        View Full Slip <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Upload a photo of your doctor's slip now, or send it directly to our optometrist on WhatsApp after checkout.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label className="p-3 rounded-xl border border-dashed border-sky-300 dark:border-brand-cyan/40 bg-sky-50/50 dark:bg-brand-cyan/[0.04] cursor-pointer hover:bg-sky-100/50 dark:hover:bg-brand-cyan/[0.08] transition-colors flex items-center justify-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <Upload className="w-4 h-4 text-brand-cyan shrink-0" />
                    <span>{uploadingCheckoutRx ? 'Uploading Slip...' : 'Upload Prescription Slip'}</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      disabled={uploadingCheckoutRx}
                      onChange={handleCheckoutRxUpload}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => setCheckoutRx({
                      method: 'WHATSAPP',
                      lens_type: 'Single Vision Precision Optics',
                      notes: 'Customer chose to send prescription via WhatsApp'
                    })}
                    className="p-3 rounded-xl border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/50 dark:hover:bg-emerald-950/40 transition-colors flex items-center justify-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Provide via WhatsApp</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 4: PAYMENT METHOD SELECTION */}
          <div className="glass-card rounded-2xl p-6 space-y-4 border-2 border-slate-200 dark:border-white/10 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-cyan border-b border-slate-200 dark:border-white/10 pb-2 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-brand-cyan/20 text-brand-cyan flex items-center justify-center font-mono text-[10px]">4</span>
              <span>Payment Method</span>
            </h3>

            <div className="space-y-3">
              {/* Cash On Delivery Option */}
              <label className={`p-4 rounded-xl border-2 cursor-pointer flex items-center justify-between transition-all ${
                paymentMode === 'COD' 
                  ? 'bg-brand-cyan/15 border-brand-cyan shadow-cyan-glow/20 ring-1 ring-brand-cyan/30' 
                  : 'bg-slate-50 dark:bg-white/5 border-slate-300 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/20'
              }`}>
                <div className="flex items-center gap-3">
                  <input 
                    type="radio"
                    name="paymentMode"
                    value="COD"
                    checked={paymentMode === 'COD'}
                    onChange={() => setPaymentMode('COD')}
                    className="accent-brand-cyan w-4 h-4"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Truck className="w-4 h-4 text-brand-cyan" /> Cash on Delivery (COD)
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Pay cash or scan courier UPI QR when your packaged eyewear arrives.
                    </div>
                  </div>
                </div>
                <span className="text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                  Popular
                </span>
              </label>

              {/* Online UPI Payment Option */}
              <label className={`p-4 rounded-xl border-2 cursor-pointer flex flex-col gap-3 transition-all ${
                paymentMode === 'UPI' 
                  ? 'bg-brand-cyan/15 border-brand-cyan shadow-cyan-glow/20 ring-1 ring-brand-cyan/30' 
                  : 'bg-slate-50 dark:bg-white/5 border-slate-300 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/20'
              }`}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <input 
                      type="radio"
                      name="paymentMode"
                      value="UPI"
                      checked={paymentMode === 'UPI'}
                      onChange={() => setPaymentMode('UPI')}
                      className="accent-brand-cyan w-4 h-4"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <QrCode className="w-4 h-4 text-brand-teal" /> Instant Dynamic UPI QR (PhonePe, GPay, Paytm)
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Dynamic QR prefilled with exact order amount (₹{totals.total_amount}). Instant verification.
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded bg-brand-teal/20 text-teal-700 dark:text-brand-teal">
                    Fastest
                  </span>
                </div>

                {paymentMode === 'UPI' && (
                  <div className="mt-3 p-4 rounded-2xl bg-black/40 border border-brand-cyan/30 space-y-4 animate-fadeIn">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="w-36 h-36 bg-white rounded-2xl p-2 shrink-0 flex items-center justify-center shadow-2xl border border-white/20">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=9382293614@upi&pn=NETRA%20UNNAYAN&am=${totals.total_amount}&cu=INR&tn=Order%20Netra%20Unnayan`)}`}
                          alt="Dynamic UPI QR"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="space-y-2 text-left w-full">
                        <div className="text-xs font-extrabold text-brand-cyan flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                          Live Dynamic UPI QR — ₹{totals.total_amount}
                        </div>
                        <p className="text-[11px] text-slate-300">
                          Scan using PhonePe, Google Pay, Paytm, BHIM, or your bank's UPI app.
                        </p>
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 font-mono text-[11px] text-slate-200 flex items-center justify-between">
                          <span>UPI VPA: <strong className="text-white">9382293614@upi</strong></span>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Verified Merchant</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/10 space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-200 mb-1">
                          UPI 12-Digit Reference / UTR Number (Optional, for instant match)
                        </label>
                        <input 
                          type="text" 
                          maxLength="16"
                          value={upiUtr} 
                          onChange={(e) => setUpiUtr(e.target.value.replace(/[^0-9a-zA-Z]/g, ''))}
                          placeholder="e.g. 4256XXXXXXXX (from PhonePe / GPay receipt)"
                          className="w-full glass-input rounded-xl px-3.5 py-2 text-xs font-mono tracking-wider text-brand-cyan"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-200 mb-1">
                          Payment Screenshot / Receipt (Optional)
                        </label>
                        <div className="flex items-center gap-3">
                          <label className="btn-secondary text-xs py-2 px-4 rounded-xl cursor-pointer flex items-center gap-2 shrink-0">
                            <Upload className="w-3.5 h-3.5 text-brand-cyan" />
                            <span>{uploadingProof ? 'Uploading to Cloud...' : 'Upload Screenshot'}</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              disabled={uploadingProof}
                              onChange={handleProofChange}
                              className="hidden"
                            />
                          </label>
                          {paymentProof ? (
                            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-xs text-emerald-300">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span className="truncate max-w-[150px]">Cloud Screenshot Attached</span>
                              <button 
                                type="button" 
                                onClick={() => setPaymentProof('')}
                                className="p-0.5 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              Direct to ImgBB Cloud (PNG, JPG, WEBP up to 10MB)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </label>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Order Review, Coupon Section & Checkout Confirmation */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-card rounded-2xl p-6 space-y-5 sticky top-24 border-2 border-slate-200 dark:border-white/10 shadow-sm">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-cyan">
                Order Review ({items.length} Items)
              </h3>
              <Link to="/cart" className="text-[11px] text-brand-cyan hover:underline font-bold">
                Edit Cart
              </Link>
            </div>

            {/* Cart Items List Preview */}
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {items.map((it, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 dark:border-white/5">
                  <div className="space-y-0.5 max-w-[200px]">
                    <div className="font-bold text-slate-900 dark:text-white truncate">{it.name}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      Qty: {it.quantity} &bull; Size: <strong className="text-brand-cyan">{it.selected_size || it.frame_size || 'M'}</strong>{it.selected_color && <span> &bull; <strong className="text-slate-800 dark:text-slate-200">{it.selected_color}</strong></span>}
                      {it.lens_type && <span> &bull; {it.lens_type}</span>}
                    </div>
                  </div>
                  <div className="font-mono text-slate-900 dark:text-white font-bold">
                    ₹{(it.unit_price + (it.lens_price || 0)) * it.quantity}
                  </div>
                </div>
              ))}
            </div>

            {/* ========================================================= */}
            {/* DEDICATED COUPON APPLYING BOX (PRIMARY USER REQUEST)       */}
            {/* ========================================================= */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-brand-cyan" />
                  <span>Apply Discount Coupon</span>
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

              {/* Coupon Form */}
              <div className="flex gap-2">
                <input 
                  type="text"
                  placeholder="Enter Promo Code (e.g. CLARITY10)"
                  value={checkoutCouponInput}
                  onChange={(e) => setCheckoutCouponInput(e.target.value.toUpperCase())}
                  className="flex-1 glass-input rounded-xl px-3 py-2 text-xs font-mono font-bold tracking-wider uppercase text-slate-900 dark:text-white"
                />
                <button 
                  type="button"
                  onClick={handleApplyCheckoutCoupon}
                  disabled={isCalculating || !checkoutCouponInput.trim()}
                  className="btn-primary text-xs px-4 py-2 rounded-xl shrink-0 font-bold shadow-cyan-glow disabled:opacity-50 flex items-center gap-1"
                >
                  {isCalculating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Apply'}
                </button>
              </div>

              {/* Feedback Alert */}
              {couponFeedback && (
                <div className={`p-2.5 rounded-xl flex items-center justify-between text-xs font-semibold ${
                  couponFeedback.invalid 
                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30' 
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30'
                }`}>
                  <span className="flex items-center gap-1.5 text-[11px]">
                    {couponFeedback.invalid ? <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" /> : <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                    {couponFeedback.invalid ? couponFeedback.message : `Coupon Applied! Saved ₹${totals.discount_amount}`}
                  </span>
                  {!couponFeedback.invalid && (
                    <button 
                      type="button" 
                      onClick={() => {
                        removeCoupon();
                        setCheckoutCouponInput('');
                      }} 
                      className="text-rose-500 hover:underline text-[10px] font-bold"
                    >
                      Remove
                    </button>
                  )}
                </div>
              )}

              {/* Available Coupons Dropdown / List */}
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
                        className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 flex items-center justify-between gap-2 text-xs"
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
                          onClick={() => handleQuickApplyCoupon(cpn.code)}
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

            {/* Financial Breakdown */}
            <div className="space-y-2 text-xs border-t border-slate-200 dark:border-white/10 pt-3">
              <div className="flex justify-between text-slate-700 dark:text-slate-300 font-medium">
                <span>Subtotal (Frames &amp; Lenses)</span>
                <span className="font-mono font-semibold">₹{totals.subtotal}</span>
              </div>

              {totals.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    Coupon Discount ({couponCode})
                  </span>
                  <span className="font-mono">-₹{totals.discount_amount}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-700 dark:text-slate-300 font-medium">
                <span>Standard Shipping</span>
                <span className="font-mono">
                  {totals.shipping_fee === 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">FREE (Above ₹{totals.free_shipping_threshold})</span>
                  ) : (
                    `₹${totals.shipping_fee}`
                  )}
                </span>
              </div>

              <div className="border-t border-slate-200 dark:border-white/10 pt-3 flex justify-between items-baseline">
                <span className="font-bold text-slate-900 dark:text-white text-sm">Total Payable</span>
                <span className="text-2xl font-black text-brand-cyan font-mono">
                  ₹{totals.total_amount}
                </span>
              </div>
            </div>

            {/* Place Order Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn-primary py-3.5 text-sm font-bold flex items-center justify-center gap-2 rounded-xl shadow-cyan-glow disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Confirming Order...</span>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Confirm &amp; Place Order (₹{totals.total_amount})</span>
                </>
              )}
            </button>

            <div className="text-[11px] text-slate-400 space-y-1">
              <p className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                12-Hour cancellation cutoff window applies before optical fabrication.
              </p>
              <p className="text-[10px] text-slate-500">
                By placing this order, you accept Netra Unnayan's optical prescription terms and return policy.
              </p>
            </div>

          </div>
        </div>

      </form>

      {/* ========================================================================= */}
      {/* QUICK ADD ADDRESS MODAL                                                   */}
      {/* ========================================================================= */}
      {showAddAddressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-brand-cyan/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brand-cyan" />
                <span>Add New Delivery Address</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setShowAddAddressModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewAddressModal} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Recipient Name *</label>
                  <input
                    type="text"
                    required
                    value={newAddrForm.recipient_name}
                    onChange={(e) => setNewAddrForm(prev => ({ ...prev, recipient_name: e.target.value }))}
                    placeholder="Full Name"
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={newAddrForm.phone}
                    onChange={(e) => setNewAddrForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="10-digit mobile"
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Address Line 1 *</label>
                <input
                  type="text"
                  required
                  value={newAddrForm.address_line1}
                  onChange={(e) => setNewAddrForm(prev => ({ ...prev, address_line1: e.target.value }))}
                  placeholder="Flat, House, Street"
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Area / Locality</label>
                  <input
                    type="text"
                    value={newAddrForm.address_line2}
                    onChange={(e) => setNewAddrForm(prev => ({ ...prev, address_line2: e.target.value }))}
                    placeholder="Locality"
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Landmark</label>
                  <input
                    type="text"
                    value={newAddrForm.landmark}
                    onChange={(e) => setNewAddrForm(prev => ({ ...prev, landmark: e.target.value }))}
                    placeholder="Nearby landmark"
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={newAddrForm.city}
                    onChange={(e) => setNewAddrForm(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full glass-input rounded-xl px-2.5 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">State *</label>
                  <input
                    type="text"
                    required
                    value={newAddrForm.state}
                    onChange={(e) => setNewAddrForm(prev => ({ ...prev, state: e.target.value }))}
                    className="w-full glass-input rounded-xl px-2.5 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">PIN Code *</label>
                  <input
                    type="text"
                    required
                    value={newAddrForm.pincode}
                    onChange={(e) => setNewAddrForm(prev => ({ ...prev, pincode: e.target.value }))}
                    placeholder="721428"
                    className="w-full glass-input rounded-xl px-2.5 py-2 text-xs text-center font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Type:</span>
                {['HOME', 'OFFICE', 'OTHER'].map(type => (
                  <label key={type} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="addrType"
                      value={type}
                      checked={newAddrForm.address_type === type}
                      onChange={() => setNewAddrForm(prev => ({ ...prev, address_type: type }))}
                      className="accent-brand-cyan"
                    />
                    <span className="text-xs">{type}</span>
                  </label>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddAddressModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNewAddr}
                  className="btn-primary px-5 py-2 rounded-xl font-bold flex items-center gap-2 shadow-cyan-glow"
                >
                  {savingNewAddr ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <SaveIcon className="w-3.5 h-3.5" />}
                  <span>Save Address</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

function SaveIcon(props) {
  return (
    <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
    </svg>
  );
}

export default CheckoutPage;
