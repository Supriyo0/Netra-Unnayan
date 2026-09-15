import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Search, Package, Clock, CheckCircle2, AlertCircle, 
  ShieldCheck, XCircle, ArrowRight, Truck 
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export const OrderTrackingPage = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [orderNumber, setOrderNumber] = useState(searchParams.get('order') || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Cancel modal state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState('');

  const fetchTracking = async (oNum, ph) => {
    if (!oNum) return;
    setLoading(true);
    setError('');
    setCancelSuccess('');
    try {
      const url = `/orders/track.php?order_number=${encodeURIComponent(oNum)}&phone=${encodeURIComponent(ph || '')}`;
      const res = await api.get(url);
      if (res.success && res.data) {
        setOrder(res.data);
      } else {
        setError(res.message || 'Order not found.');
      }
    } catch (err) {
      setError(err.message || 'Could not verify order details.');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialOrder = searchParams.get('order');
    if (initialOrder) {
      fetchTracking(initialOrder, phone);
    }
  }, [searchParams]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchTracking(orderNumber.trim(), phone.trim());
  };

  const handleCancelOrder = async (e) => {
    e.preventDefault();
    if (!order) return;

    setCancelLoading(true);
    setError('');
    try {
      const res = await api.post('/orders/cancel.php', {
        order_number: order.order_number,
        reason: cancelReason || 'Customer requested online cancellation'
      });
      if (res.success) {
        setCancelSuccess(res.message || 'Order successfully cancelled.');
        setCancelModalOpen(false);
        // Refresh tracking data
        fetchTracking(order.order_number, phone);
      } else {
        setError(res.message || 'Cancellation rejected.');
      }
    } catch (err) {
      setError(err.message || 'Failed to cancel order.');
    } finally {
      setCancelLoading(false);
    }
  };

  const allStages = [
    { key: 'Order Placed', label: 'Order Placed' },
    { key: 'Payment Confirmed', label: 'Payment Confirmed' },
    { key: 'Prescription Review', label: 'Prescription Review' },
    { key: 'Lens Cutting', label: 'Lens Cutting & Lab' },
    { key: 'Fitting', label: 'Chassis Fitting' },
    { key: 'Quality Check', label: 'Quality Verification' },
    { key: 'Packed', label: 'Sterilized & Packed' },
    { key: 'Shipped', label: 'Dispatched' },
    { key: 'Delivered', label: 'Delivered' },
  ];

  const getCurrentStageIndex = (currentStatus) => {
    if (currentStatus === 'Cancelled') return -1;
    const idx = allStages.findIndex(s => s.key.toLowerCase() === currentStatus?.toLowerCase());
    return idx > -1 ? idx : 0;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header & Search */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Live Optical Order Tracker</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time manufacturing, digital surfacing, and delivery progress for your eyewear
          </p>
        </div>

        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] text-slate-700 dark:text-slate-300 mb-1 font-semibold">Order Number *</label>
            <input 
              type="text"
              required
              placeholder="e.g. NU-ORD-88210"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              className="w-full glass-input rounded-xl px-3.5 py-2 text-xs font-mono uppercase"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-700 dark:text-slate-300 mb-1 font-semibold">Phone Number (Verification) *</label>
            <input 
              type="tel"
              required={!user}
              placeholder="e.g. 9830123456"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full glass-input rounded-xl px-3.5 py-2 text-xs"
            />
          </div>
          <div className="flex items-end">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full btn-primary py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{loading ? 'Searching...' : 'Track Eyewear'}</span>
            </button>
          </div>
        </form>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {cancelSuccess && (
          <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-300 dark:border-teal-500/30 text-teal-800 dark:text-teal-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0" />
            <span>{cancelSuccess}</span>
          </div>
        )}
      </div>

      {order && (
        <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-8">
          
          {/* Status Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-5">
            <div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wider">
                Order Tracking &bull; {order.order_type}
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                {order.order_number}
              </h2>
              <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                Placed on: {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                order.order_status === 'Cancelled'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : order.order_status === 'Delivered'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                  : 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/40'
              }`}>
                {order.order_status}
              </span>

              {order.can_cancel && (
                <button 
                  onClick={() => setCancelModalOpen(true)}
                  className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 text-xs font-semibold"
                >
                  Cancel Order
                </button>
              )}
            </div>
          </div>

          {/* Cancelled Alert if order is cancelled */}
          {order.order_status === 'Cancelled' && (
            <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 text-xs text-rose-200 space-y-1">
              <strong className="block font-bold">This order was cancelled on {order.cancelled_at || 'record'}.</strong>
              <p>Reason: {order.cancel_reason || 'Customer request'}</p>
              <p>Payment Status: {order.payment_status}</p>
            </div>
          )}

          {/* ANIMATED OPTICAL LIFECYCLE TIMELINE */}
          {order.order_status !== 'Cancelled' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider text-brand-cyan">
                Manufacturing &amp; Dispatch Timeline
              </h3>

              {/* Horizontal / Responsive Stepper */}
              <div className="relative pt-4 pb-2 overflow-x-auto">
                <div className="flex items-center justify-between min-w-[620px] relative">
                  
                  {/* Connecting line */}
                  <div className="absolute top-4 left-4 right-4 h-0.5 bg-white/10 -z-0" />

                  {allStages.map((stage, i) => {
                    const currentIdx = getCurrentStageIndex(order.order_status);
                    const isCompleted = i <= currentIdx;
                    const isCurrent = i === currentIdx;

                    return (
                      <div key={stage.key} className="flex flex-col items-center relative z-10 space-y-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          isCurrent 
                            ? 'bg-brand-cyan text-slate-950 shadow-cyan-glow scale-110' 
                            : isCompleted 
                            ? 'bg-teal-500 text-slate-950' 
                            : 'bg-slate-800 text-slate-500 border border-white/10'
                        }`}>
                          {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                        </div>
                        <span className={`text-[11px] font-medium text-center max-w-[70px] leading-tight ${
                          isCurrent ? 'text-brand-cyan font-bold' : isCompleted ? 'text-slate-200' : 'text-slate-500'
                        }`}>
                          {stage.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Order Status History Log (Excluding admin internal private notes) */}
          {order.status_history && order.status_history.length > 0 && (
            <div className="space-y-3 border-t border-white/10 pt-5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Status History Log
              </h4>
              <div className="space-y-2 text-xs">
                {order.status_history.map((log, idx) => (
                  <div key={idx} className="flex items-start justify-between p-2.5 rounded-lg bg-white/5">
                    <div>
                      <strong className="text-white">{log.status}</strong>
                      <div className="text-slate-400 mt-0.5">{log.note}</div>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-4">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Items & Shipping Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-white/10 pt-5 text-xs">
            
            {/* Items */}
            <div className="space-y-3">
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Ordered Frames</h4>
              <div className="space-y-2">
                {order.items?.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                    <div>
                      <div className="font-bold text-white">{item.product_name}</div>
                      <div className="text-slate-400 text-[11px]">
                        SKU: {item.product_sku} &bull; Qty: {item.quantity}
                      </div>
                      {item.lens_type && (
                        <div className="text-brand-teal text-[11px]">{item.lens_type}</div>
                      )}
                    </div>
                    <div className="font-mono text-white font-bold">
                      ₹{item.total_price}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Details */}
            <div className="space-y-2 p-4 rounded-xl bg-white/5">
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Delivery Recipient</h4>
              <p className="text-white font-bold">{order.customer_name}</p>
              <p className="text-slate-300">{order.customer_phone}</p>
              <p className="text-slate-400 leading-relaxed">
                {order.shipping_address_line1} {order.shipping_address_line2}, {order.shipping_city}, {order.shipping_state} - {order.shipping_pincode}
              </p>
              <div className="pt-2 border-t border-white/10 flex justify-between font-bold text-white">
                <span>Total Amount:</span>
                <span className="text-brand-cyan font-mono">₹{order.total_amount} ({order.payment_mode})</span>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* CANCELLATION MODAL */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0A192F] border border-rose-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-400" /> Cancel Order {order?.order_number}
            </h3>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              Cancellation is permitted because customized optical lens cutting has not yet started. If you paid online via UPI, a full refund of ₹{order?.total_amount} will be initiated to your source account.
            </p>

            <div>
              <label className="block text-xs text-slate-300 mb-1">Reason for cancellation *</label>
              <textarea
                rows="3"
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Changed mind about frame color, entered incorrect prescription..."
                className="w-full glass-input rounded-xl p-3 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button 
                type="button" 
                onClick={() => setCancelModalOpen(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Keep Order
              </button>
              <button 
                type="button" 
                disabled={cancelLoading}
                onClick={handleCancelOrder}
                className="btn-primary bg-rose-600 hover:bg-rose-500 text-xs px-4 py-2 rounded-xl text-white"
              >
                {cancelLoading ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
