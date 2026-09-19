import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Search, Package, Clock, CheckCircle2, AlertCircle, 
  ShieldCheck, XCircle, ArrowRight, Truck, FileText, Printer,
  MessageCircle, Upload, Mail, Share2, Copy, Check 
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { InvoiceModal } from '../components/common/InvoiceModal';

export const OrderTrackingPage = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [orderNumber, setOrderNumber] = useState(searchParams.get('order') || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Invoice modal state (can be directly triggered by QR scan)
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

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
        if (searchParams.get('view') === 'invoice') {
          setInvoiceModalOpen(true);
        }
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
    const initialOrder = searchParams.get('order') || searchParams.get('invoice');
    if (initialOrder) {
      setOrderNumber(initialOrder);
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

  const [copiedLink, setCopiedLink] = useState(false);

  const handleShareWhatsApp = () => {
    if (!order) return;
    const invUrl = `https://netraunnayan.com/order-tracking?order=${encodeURIComponent(order.order_number)}&view=invoice`;
    let msg = `👓 *NETRA UNNAYAN — Order & Invoice Verification*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `Hello *${order.customer_name || 'Valued Customer'}*,\n`;
    msg += `Here is your optical order & invoice summary:\n\n`;
    msg += `📦 *Order No:* ${order.order_number}\n`;
    msg += `💵 *Total Amount:* ₹${order.total_amount} (${order.payment_mode || 'COD'})\n`;
    msg += `📊 *Status:* ${order.status || 'Processing'}\n\n`;
    msg += `🔗 *View Official Invoice & Live Tracking:*\n${invUrl}\n\n`;
    msg += `📍 Netra Unnayan Eyewear, Digha Bypass Rd, WB\n`;
    msg += `📞 Support: +91 9382293614 / +91 6294553897`;
    const cleanPhone = (order.customer_phone || '').replace(/[^0-9]/g, '');
    const phoneParam = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const waUrl = phoneParam 
      ? `https://api.whatsapp.com/send?phone=${phoneParam}&text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleShareEmail = () => {
    if (!order) return;
    const invUrl = `https://netraunnayan.com/order-tracking?order=${encodeURIComponent(order.order_number)}&view=invoice`;
    const subject = encodeURIComponent(`Netra Unnayan Eyewear Invoice #${order.order_number}`);
    const body = encodeURIComponent(
      `Dear ${order.customer_name || 'Customer'},\n\n` +
      `Thank you for choosing Netra Unnayan Eyewear.\n\n` +
      `Order Reference: ${order.order_number}\n` +
      `Total Amount: ₹${order.total_amount} (${order.payment_mode || 'COD'})\n` +
      `Order Status: ${order.status || 'Processing'}\n\n` +
      `You can view and print your verified official invoice anytime using this secure link:\n` +
      `${invUrl}\n\n` +
      `Best regards,\nNetra Unnayan Eyewear\nSupport: +91 9382293614`
    );
    window.location.href = `mailto:${order.customer_email || ''}?subject=${subject}&body=${body}`;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {}
  };

  const defaultStages = [
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

  const activeStages = React.useMemo(() => {
    if (order?.timeline_stages && typeof order.timeline_stages === 'object') {
      return Object.entries(order.timeline_stages).map(([label, info]) => ({
        key: label,
        label,
        ...(typeof info === 'object' ? info : {})
      }));
    }
    return defaultStages;
  }, [order?.timeline_stages]);

  const getCurrentStageIndex = (currentStatus) => {
    if (!currentStatus || currentStatus === 'Cancelled') return -1;
    const lower = String(currentStatus).toLowerCase();
    const idx = activeStages.findIndex(s => 
      s.key.toLowerCase() === lower || 
      s.label.toLowerCase() === lower ||
      (s.key.toLowerCase().includes(lower) || lower.includes(s.key.toLowerCase()))
    );
    return idx > -1 ? idx : (lower === 'completed' || lower === 'delivered' ? activeStages.length - 1 : 1);
  };

  const isOrderOwner = Boolean(
    user && order && (
      user.role === 'admin' ||
      user.id === order.customer_id ||
      (user.phone && order.customer_phone && user.phone.replace(/\D/g, '').slice(-10) === order.customer_phone.replace(/\D/g, '').slice(-10)) ||
      (user.email && order.customer_email && user.email.toLowerCase() === order.customer_email.toLowerCase())
    )
  );

  const canCancelOrder = Boolean(
    isOrderOwner &&
    order?.can_cancel &&
    order?.order_type !== 'POS_OFFLINE' &&
    !order?.is_offline_bill
  );

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
            <label className="block text-[11px] text-slate-700 dark:text-slate-300 mb-1 font-semibold">Phone Number (Optional)</label>
            <input 
              type="tel"
              required={false}
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

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {(order.prescription_status === 'Needs Clarification' || order.rx?.status === 'Needs Clarification') && (
                <span className="px-3 py-1 rounded-full text-xs font-black inline-flex items-center gap-1.5 bg-rose-600 text-white shadow-sm animate-pulse border border-rose-700">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Rx Clarification Required</span>
                </span>
              )}

              {(order.prescription_status === 'Approved' || order.rx?.status === 'Approved') && (
                <span className="px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Rx Approved for Lab</span>
                </span>
              )}

              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                order.order_status === 'Cancelled'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : order.order_status === 'Delivered'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                  : 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/40'
              }`}>
                {order.order_status}
              </span>

              {/* View Invoice Button */}
              <button 
                type="button"
                onClick={() => setInvoiceModalOpen(true)}
                className="px-3.5 py-1 rounded-full bg-brand-cyan hover:bg-cyan-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-cyan-glow transition-all cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Invoice</span>
              </button>

              {canCancelOrder && (
                <button 
                  onClick={() => setCancelModalOpen(true)}
                  className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 text-xs font-semibold cursor-pointer"
                >
                  Cancel Order
                </button>
              )}
            </div>
          </div>

          {/* PRESCRIPTION CLARIFICATION REQUIRED BANNER */}
          {(order.prescription_status === 'Needs Clarification' || order.rx?.status === 'Needs Clarification') && (
            <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-300 dark:border-rose-500/30 text-xs space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-extrabold uppercase tracking-wider text-xs">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>Prescription Action Required Before Lab Cutting</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-500/30">
                  Optometrist Review
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-white/10 space-y-1">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Optometrist Note:</span>
                <p className="text-slate-800 dark:text-rose-200 leading-relaxed font-semibold">
                  {order.rx?.admin_notes || 'Your prescription details or slip photo require confirmation before our optical lab can begin lens edging.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  to="/account?tab=orders"
                  className="btn-primary bg-rose-600 hover:bg-rose-500 text-white font-black text-xs px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition-all"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Updated Prescription Slip</span>
                </Link>

                <a
                  href={`https://wa.me/919382293614?text=${encodeURIComponent(`Hi Netra Unnayan Optometrist, regarding prescription clarification for Order #${order.order_number}: `)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Resolve via WhatsApp (+91 9382293614)</span>
                </a>
              </div>
            </div>
          )}

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

                  {activeStages.map((stage, i) => {
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
            <div className="space-y-3 border-t border-slate-200 dark:border-white/10 pt-5">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Status History Log
              </h4>
              <div className="space-y-2 text-xs">
                {order.status_history.map((log, idx) => (
                  <div key={idx} className="flex items-start justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-transparent">
                    <div>
                      <strong className="text-slate-900 dark:text-white">{log.status}</strong>
                      <div className="text-slate-600 dark:text-slate-400 mt-0.5">{log.note}</div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-200 dark:border-white/10 pt-5 text-xs">
            
            {/* Items */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">Ordered Frames</h4>
              <div className="space-y-2">
                {order.items?.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-transparent">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{item.product_name}</div>
                      <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                        SKU: {item.product_sku} &bull; Qty: {item.quantity}
                      </div>
                      {item.lens_type && (
                        <div className="text-teal-700 dark:text-brand-teal font-semibold text-[11px]">{item.lens_type}</div>
                      )}
                    </div>
                    <div className="font-mono text-slate-950 dark:text-white font-bold">
                      ₹{item.total_price}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Details */}
            <div className="space-y-2 p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-transparent">
              <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">Delivery Recipient</h4>
              <p className="text-slate-900 dark:text-white font-bold">{order.customer_name}</p>
              <p className="text-slate-700 dark:text-slate-300 font-mono">{order.customer_phone}</p>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                {order.shipping_address_line1} {order.shipping_address_line2}, {order.shipping_city}, {order.shipping_state} - {order.shipping_pincode}
              </p>
              <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex justify-between font-bold text-slate-900 dark:text-white">
                <span>Total Amount:</span>
                <span className="text-cyan-700 dark:text-brand-cyan font-mono">₹{order.total_amount} ({order.payment_mode})</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING QUICK ACTIONS BAR (QR SCAN / INVOICE SHARE) */}
      {order && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-lg bg-slate-900/95 border border-cyan-500/30 backdrop-blur-xl rounded-2xl shadow-2xl p-2.5 sm:px-4 sm:py-3 flex items-center justify-between gap-2 text-white animate-fade-in">
          <button
            onClick={() => setInvoiceModalOpen(true)}
            className="flex-1 min-w-0 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 shadow transition-all truncate"
            title="View & Print Official Invoice"
          >
            <FileText className="w-4 h-4 shrink-0 text-cyan-200" />
            <span className="truncate">View Invoice</span>
          </button>

          <button
            onClick={handleShareWhatsApp}
            className="bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 shadow transition-all shrink-0"
            title="Send Invoice Details to WhatsApp"
          >
            <MessageCircle className="w-4 h-4 shrink-0" />
            <span className="hidden xs:inline">WhatsApp</span>
          </button>

          <button
            onClick={handleShareEmail}
            className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 shadow transition-all shrink-0"
            title="Email Invoice Copy"
          >
            <Mail className="w-4 h-4 shrink-0" />
            <span className="hidden xs:inline">Email</span>
          </button>

          <button
            onClick={handleCopyLink}
            className="bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white text-xs font-medium px-2.5 py-2 rounded-xl flex items-center justify-center gap-1 transition-all shrink-0"
            title="Copy Tracking & Invoice Link"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
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

      {/* INVOICE MODAL */}
      <InvoiceModal
        isOpen={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        invoiceData={order}
      />

    </div>
  );
};
