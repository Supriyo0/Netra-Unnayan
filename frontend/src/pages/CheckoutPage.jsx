import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ShieldCheck, Truck, QrCode, CreditCard, Lock, 
  ArrowRight, AlertCircle, CheckCircle2, ChevronRight,
  Upload, Image as ImageIcon, X, Sparkles, MapPin, Plus, Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import api from '../api/client';
import { uploadToImgBB } from '../utils/imgbb';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const { items, totals, couponCode, clearCart } = useCart();
  const { user } = useAuth();

  // All shipping fields start empty for customer to fill
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
  const [useNewAddress, setUseNewAddress] = useState(true);
  const [saveAddressToAccount, setSaveAddressToAccount] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const selectAddress = (addr) => {
    setSelectedAddressId(addr.id);
    setUseNewAddress(false);
    if (addr.recipient_name) setCustomerName(addr.recipient_name);
    if (addr.phone) setCustomerPhone(addr.phone);
    setAddressLine1(addr.address_line1 || '');
    setAddressLine2(addr.address_line2 || '');
    setLandmark(addr.landmark || '');
    setCity(addr.city || '');
    setState(addr.state || '');
    setPincode(addr.pincode || '');
  };

  // Fetch saved addresses from server on mount
  useEffect(() => {
    if (user) {
      api.get('/account/addresses.php').then((res) => {
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setSavedAddresses(res.data);
          // Do not auto-prefill: customer can click a saved address if desired
        }
      }).catch(() => {});
    }
  }, [user]);

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

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!customerName.trim() || !customerPhone.trim() || !addressLine1.trim() || !pincode.trim()) {
      setErrorMessage('Please fill in all required shipping fields (Name, Phone, Address, PIN).');
      return;
    }

    setIsSubmitting(true);
    try {
      // First item's prescription if available
      const firstRx = items.find(i => i.prescription)?.prescription || null;

      const payload = {
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_email: customerEmail.trim() || null,
        address_line1: addressLine1.trim(),
        address_line2: addressLine2.trim() || null,
        landmark: landmark.trim() || null,
        city: city.trim(),
        state: state.trim(),
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
          lens_price: item.lens_price
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
            city: city.trim(),
            state: state.trim(),
            pincode: pincode.trim(),
            address_type: 'HOME',
            is_default: savedAddresses.length === 0 ? 1 : 0
          }).catch(() => {});
        }

        // Confetti celebration
        try {
          confetti({
            particleCount: 80,
            spread: 70,
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
      
      <div className="border-b border-white/10 pb-4">
        <h1 className="text-2xl font-extrabold text-white">Secure Checkout</h1>
        <p className="text-xs text-slate-400 mt-0.5">Finalize your eyewear order with verified optical lab fabrication</p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Shipping & Customer Details */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Contact Details Card */}
          <div className="glass-card rounded-2xl p-6 space-y-4 border-2 border-slate-200 dark:border-white/10 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-cyan border-b border-slate-200 dark:border-white/10 pb-2 flex items-center gap-2">
              <span>1. Customer Contact</span>
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
                <label className="block text-xs text-slate-700 dark:text-slate-300 font-semibold mb-1">Mobile Phone (for updates &amp; OTP) *</label>
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
              <label className="block text-xs text-slate-700 dark:text-slate-300 font-semibold mb-1">Email Address (Optional for Invoice &amp; Tracking)</label>
              <input 
                type="email" 
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="e.g. rahul@example.com"
                className="w-full glass-input rounded-xl px-3.5 py-2 text-xs"
              />
            </div>
          </div>

          {/* Delivery Address Card with Interactive Saved Addresses Section */}
          <div className="glass-card rounded-2xl p-6 space-y-4 border-2 border-slate-200 dark:border-white/10 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-cyan flex items-center gap-1.5">
                <MapPin className="w-4 h-4" /> 2. Delivery Address
              </h3>
              {savedAddresses.length > 0 && (
                <button
                  type="button"
                  onClick={() => setUseNewAddress(!useNewAddress)}
                  className="text-xs text-brand-cyan hover:underline font-bold flex items-center gap-1"
                >
                  {useNewAddress ? '← Choose from Saved Addresses' : '+ Enter Different Address'}
                </button>
              )}
            </div>

            {/* Saved Addresses Picker Grid */}
            {!useNewAddress && savedAddresses.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  Select a saved delivery destination for this shipment:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {savedAddresses.map((addr) => {
                    const isSelected = selectedAddressId === addr.id;
                    return (
                      <div
                        key={addr.id}
                        onClick={() => selectAddress(addr)}
                        className={`p-4 rounded-xl cursor-pointer transition-all border-2 relative ${
                          isSelected
                            ? 'border-brand-cyan bg-brand-cyan/10 shadow-cyan-glow/20'
                            : 'border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-white/5 hover:border-brand-cyan/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30">
                            {addr.address_type || 'HOME'}
                          </span>
                          {isSelected && (
                            <span className="flex items-center gap-1 text-[11px] font-bold text-teal-600 dark:text-teal-300">
                              <Check className="w-3.5 h-3.5" /> Deliver Here
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                          {addr.recipient_name}
                        </h4>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 font-mono mt-0.5">
                          {addr.phone}
                        </p>
                        <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-2 leading-relaxed">
                          {addr.address_line1}{addr.address_line2 ? `, ${addr.address_line2}` : ''}
                          {addr.landmark ? ` (Near ${addr.landmark})` : ''}<br />
                          {addr.city}, {addr.state} - <strong className="font-mono text-slate-900 dark:text-white">{addr.pincode}</strong>
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Manual Address Input Form (shown when useNewAddress is true or no saved addresses) */}
            {(useNewAddress || savedAddresses.length === 0) && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Flat / House / Building / Street *
                  </label>
                  <input 
                    type="text" 
                    required
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    placeholder="e.g. Flat 4B, Sagarika Enclave, New Digha Road"
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
                      placeholder="e.g. Sea Beach Market Area"
                      className="w-full glass-input rounded-xl px-3.5 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-700 dark:text-slate-300 font-semibold mb-1">Nearby Landmark</label>
                    <input 
                      type="text" 
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      placeholder="e.g. Near Lions Eye Hospital"
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
                      Save this address to my account for future orders
                    </span>
                  </label>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs text-slate-700 dark:text-slate-300 font-semibold mb-1">Order / Prescription Special Notes (Optional)</label>
              <textarea 
                rows="2"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Any special optical lab instructions or delivery landmarks..."
                className="w-full glass-input rounded-xl px-3.5 py-2 text-xs"
              />
            </div>
          </div>

          {/* Payment Method Card */}
          <div className="glass-card rounded-2xl p-6 space-y-4 border-2 border-slate-200 dark:border-white/10 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-cyan border-b border-slate-200 dark:border-white/10 pb-2">
              3. Payment Method
            </h3>

            <div className="space-y-3">
              {/* Cash On Delivery Option */}
              <label className={`p-4 rounded-xl border-2 cursor-pointer flex items-center justify-between transition-all ${
                paymentMode === 'COD' 
                  ? 'bg-brand-cyan/15 border-brand-cyan shadow-cyan-glow/20' 
                  : 'bg-slate-50 dark:bg-white/5 border-slate-300 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/20'
              }`}>
                <div className="flex items-center gap-3">
                  <input 
                    type="radio"
                    name="paymentMode"
                    value="COD"
                    checked={paymentMode === 'COD'}
                    onChange={() => setPaymentMode('COD')}
                    className="accent-brand-cyan"
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
                  ? 'bg-brand-cyan/15 border-brand-cyan shadow-cyan-glow/20' 
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
                      className="accent-brand-cyan"
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
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=netraunnayan7@okaxis&pn=Netra%20Unnayan&am=${totals.total_amount}&cu=INR&tn=Order%20Netra%20Unnayan`)}`}
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
                          <span>UPI VPA: <strong className="text-white">netraunnayan7@okaxis</strong></span>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Verified Merchant</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Transfer exact order amount of ₹{totals.total_amount}. Order confirms automatically once verified.
                        </div>
                      </div>
                    </div>

                    {/* UTR and Payment Screenshot Verification Inputs */}
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

        {/* RIGHT COLUMN: Order Review & Placement */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-card rounded-2xl p-6 space-y-5 sticky top-24 border-2 border-slate-200 dark:border-white/10 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-cyan border-b border-slate-200 dark:border-white/10 pb-3">
              Order Review ({items.length} Items)
            </h3>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {items.map((it, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 dark:border-white/5">
                  <div className="space-y-0.5 max-w-[200px]">
                    <div className="font-bold text-slate-900 dark:text-white truncate">{it.name}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Qty: {it.quantity} &bull; {it.lens_type || 'Frame Only'}</div>
                  </div>
                  <div className="font-mono text-slate-900 dark:text-white font-bold">
                    ₹{(it.unit_price + (it.lens_price || 0)) * it.quantity}
                  </div>
                </div>
              ))}
            </div>

            {/* Financial Breakdown */}
            <div className="space-y-2 text-xs border-t border-slate-200 dark:border-white/10 pt-3">
              <div className="flex justify-between text-slate-700 dark:text-slate-300 font-medium">
                <span>Subtotal</span>
                <span className="font-mono font-semibold">₹{totals.subtotal}</span>
              </div>
              {totals.discount_amount > 0 && (
                <div className="flex justify-between text-teal-600 dark:text-teal-400 font-semibold">
                  <span>Coupon Discount</span>
                  <span className="font-mono">-₹{totals.discount_amount}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-700 dark:text-slate-300 font-medium">
                <span>Shipping</span>
                <span className="font-mono">
                  {totals.shipping_fee === 0 ? <span className="text-teal-600 dark:text-teal-400 font-bold">FREE</span> : `₹${totals.shipping_fee}`}
                </span>
              </div>
              <div className="border-t border-slate-200 dark:border-white/10 pt-3 flex justify-between items-baseline">
                <span className="font-bold text-slate-900 dark:text-white text-sm">Total Payable</span>
                <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">₹{totals.total_amount}</span>
              </div>
            </div>

            {/* Place Order Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn-primary py-3.5 text-sm font-bold flex items-center justify-center gap-2 rounded-xl shadow-cyan-glow disabled:opacity-50"
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
                12-Hour cancellation window applies prior to lens cutting.
              </p>
              <p className="text-[10px] text-slate-500">
                By placing this order, you confirm acceptance of Netra Unnayan's optical prescription terms and return policy.
              </p>
            </div>

          </div>
        </div>

      </form>

    </div>
  );
};
