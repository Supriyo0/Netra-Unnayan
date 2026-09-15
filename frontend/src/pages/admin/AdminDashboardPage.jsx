import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, ShoppingBag, Clock, CreditCard, 
  AlertTriangle, Calendar, Eye, RefreshCw, ArrowUpRight, 
  CheckCircle2, ChevronRight, ShoppingCart, ShieldCheck,
  Stethoscope, Home as HomeIcon, Check, X, ExternalLink, Image as ImageIcon
} from 'lucide-react';
import api from '../../api/client';

export const AdminDashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [selectedProof, setSelectedProof] = useState(null);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/dashboard.php');
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load admin dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleApprovePayment = async (paymentId) => {
    if (!window.confirm('Confirm and approve this customer payment? This will update the order status to Paid/Confirmed.')) return;
    setActionLoading(prev => ({ ...prev, [`pay_${paymentId}`]: true }));
    try {
      const res = await api.post('/admin/payments.php', {
        action: 'approve',
        payment_id: paymentId
      });
      if (res.success) {
        await fetchDashboard();
      } else {
        alert(res.message || 'Approval failed');
      }
    } catch (err) {
      alert(err.message || 'Approval failed');
    } finally {
      setActionLoading(prev => ({ ...prev, [`pay_${paymentId}`]: false }));
    }
  };

  const handleConfirmBooking = async (type, id) => {
    if (!window.confirm('Confirm this booking? A confirmation dispatch email/SMS will be triggered.')) return;
    setActionLoading(prev => ({ ...prev, [`book_${type}_${id}`]: true }));
    try {
      const res = await api.post('/admin/appointments.php', {
        action: 'approve',
        type: type,
        id: id
      });
      if (res.success) {
        await fetchDashboard();
      } else {
        alert(res.message || 'Confirmation failed');
      }
    } catch (err) {
      alert(err.message || 'Confirmation failed');
    } finally {
      setActionLoading(prev => ({ ...prev, [`book_${type}_${id}`]: false }));
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 rounded-full border-2 border-brand-cyan border-t-transparent animate-spin" />
      </div>
    );
  }

  const { 
    metrics, sales_trend, payment_breakdown, 
    low_stock_products, recent_orders, today_appointments,
    pending_payments_queue, pending_bookings_queue
  } = data;

  return (
    <div className="space-y-8">
      
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Executive Clinic &amp; Store Dashboard</h1>
          <p className="text-xs text-slate-400 mt-0.5">Real-time ledger, customer approval queues, and appointment confirmations</p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={fetchDashboard}
            className="btn-secondary text-xs py-2 px-3 rounded-xl flex items-center gap-1.5"
            title="Refresh Data"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <Link 
            to="/admin/pos" 
            className="btn-primary text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-cyan-glow"
          >
            <ShoppingCart className="w-3.5 h-3.5" /> Create Offline Bill
          </Link>
        </div>
      </div>

      {/* 1. EXECUTIVE KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        
        <div className="glass-card rounded-2xl p-5 space-y-2 border-brand-cyan/30">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>Today's Verified Sales</span>
            <TrendingUp className="w-4 h-4 text-brand-cyan" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            ₹{metrics.today_sales}
          </div>
          <div className="text-[11px] text-teal-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Counter &amp; Online Settled
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 space-y-2">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>Today's Orders</span>
            <ShoppingBag className="w-4 h-4 text-brand-teal" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {metrics.today_orders}
          </div>
          <div className="text-[11px] text-slate-400">
            {metrics.pending_orders} pending lab/dispatch
          </div>
        </div>

        <Link to="/admin/payments" className="glass-card rounded-2xl p-5 space-y-2 hover:border-amber-500/50 transition-colors">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>Pending UPI / UTR</span>
            <CreditCard className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-300 font-mono">
            {metrics.pending_payments}
          </div>
          <div className="text-[11px] text-amber-300 font-medium">
            Requires desk UTR verification &rarr;
          </div>
        </Link>

        <Link to="/admin/appointments" className="glass-card rounded-2xl p-5 space-y-2 hover:border-emerald-500/50 transition-colors">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>Pending Bookings</span>
            <Calendar className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {metrics.pending_bookings_total || 0}
          </div>
          <div className="text-[11px] text-emerald-300 font-medium">
            Doctor &amp; Home tests awaiting slot approval &rarr;
          </div>
        </Link>

        <div className="glass-card rounded-2xl p-5 space-y-2 border-rose-500/30">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>Low Stock Inventory</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400 font-mono">
            {metrics.low_stock_count}
          </div>
          <div className="text-[11px] text-rose-300 font-medium">
            Threshold &le; 5 units
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 space-y-2">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>Doctor Appointments</span>
            <Calendar className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {metrics.today_appointments}
          </div>
          <div className="text-[11px] text-slate-400">
            Scheduled at Digha Clinic today
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 space-y-2">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>Home Eye Visits</span>
            <Eye className="w-4 h-4 text-brand-teal" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {metrics.today_home_visits}
          </div>
          <div className="text-[11px] text-slate-400">
            Purba Medinipur doorstep tests
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 space-y-2">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>Return Requests</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {metrics.return_requests}
          </div>
          <div className="text-[11px] text-slate-400">
            7-day frame exchange review
          </div>
        </div>

      </div>

      {/* 2. PENDING APPROVAL WORKFLOW QUEUES (PAYMENTS + BOOKINGS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Pending UPI Payment Verifications */}
        <div className="glass-card rounded-3xl p-6 space-y-4 border border-amber-500/20">
          <div className="flex justify-between items-center border-b border-white/10 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-400" /> Pending UPI Payment Verifications
              </h3>
              <p className="text-[11px] text-slate-400">Customer QR payments awaiting bank UTR / screenshot match</p>
            </div>
            <Link to="/admin/payments" className="text-xs text-brand-cyan hover:underline shrink-0">
              Full Queue &rarr;
            </Link>
          </div>

          {(!pending_payments_queue || pending_payments_queue.length === 0) ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-400/60 mx-auto mb-2" />
              All customer payments are settled and verified!
            </div>
          ) : (
            <div className="space-y-3">
              {pending_payments_queue.map((pay) => (
                <div key={pay.id} className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-mono font-bold text-xs text-white flex items-center gap-1.5">
                        {pay.order_number || `Pay #${pay.id}`}
                        <span className="text-[10px] text-amber-400 font-normal px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                          {pay.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300 mt-0.5">
                        {pay.customer_name} &bull; {pay.customer_phone}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-black text-sm text-brand-cyan">
                        ₹{parseFloat(pay.amount || 0).toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-slate-400">{pay.payment_method || 'UPI'}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5 text-xs">
                    <div className="font-mono text-[11px] text-slate-300 truncate">
                      UTR: <strong className="text-amber-300">{pay.transaction_reference || 'Not Provided'}</strong>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      {pay.payment_proof_url && (
                        <button
                          type="button"
                          onClick={() => setSelectedProof(pay.payment_proof_url)}
                          className="btn-secondary text-[10px] py-1 px-2.5 rounded-lg flex items-center gap-1 text-sky-300"
                          title="View Screenshot Proof"
                        >
                          <ImageIcon className="w-3 h-3" /> Proof
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={actionLoading[`pay_${pay.id}`]}
                        onClick={() => handleApprovePayment(pay.id)}
                        className="btn-primary text-[10px] py-1 px-3 rounded-lg flex items-center gap-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-sm"
                      >
                        <Check className="w-3 h-3" /> Approve
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Clinic & Home Bookings Queue */}
        <div className="glass-card rounded-3xl p-6 space-y-4 border border-emerald-500/20">
          <div className="flex justify-between items-center border-b border-white/10 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" /> Pending Appointment Confirmations
              </h3>
              <p className="text-[11px] text-slate-400">Doctor slots &amp; home eye tests awaiting staff schedule approval</p>
            </div>
            <Link to="/admin/appointments" className="text-xs text-brand-cyan hover:underline shrink-0">
              Center &rarr;
            </Link>
          </div>

          {(!pending_bookings_queue || pending_bookings_queue.length === 0) ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-400/60 mx-auto mb-2" />
              All clinical bookings and home eye visits are confirmed!
            </div>
          ) : (
            <div className="space-y-3">
              {pending_bookings_queue.map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        {item.booking_type === 'doctor' ? (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 flex items-center gap-1">
                            <Stethoscope className="w-3 h-3" /> Doctor Slot
                          </span>
                        ) : (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-brand-cyan/20 text-brand-cyan flex items-center gap-1">
                            <HomeIcon className="w-3 h-3" /> Home Eye Test
                          </span>
                        )}
                        <span className="font-mono text-[10px] text-slate-400">{item.reference_number}</span>
                      </div>
                      <div className="font-bold text-xs text-white mt-1">
                        {item.customer_name} &bull; <span className="font-mono text-slate-400 font-normal">{item.customer_phone}</span>
                      </div>
                      <div className="text-[11px] text-slate-300 truncate max-w-xs">
                        {item.title_info}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-xs text-brand-cyan">
                        {item.scheduled_date}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {item.scheduled_slot}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                    <span className="text-[10px] text-amber-400 font-medium animate-pulse">
                      &bull; Awaiting Confirmation
                    </span>
                    <button
                      type="button"
                      disabled={actionLoading[`book_${item.booking_type}_${item.id}`]}
                      onClick={() => handleConfirmBooking(item.booking_type, item.id)}
                      className="btn-primary text-[10px] py-1 px-3 rounded-lg flex items-center gap-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-sm"
                    >
                      <Check className="w-3 h-3" /> Confirm &amp; Mail
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* 3. REVENUE TREND & PAYMENT MODES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Sales Trend Bar Visual */}
        <div className="lg:col-span-2 glass-card rounded-3xl p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-white/10 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Recent 7-Day Revenue Trend (₹)
            </h3>
            <span className="text-[10px] text-brand-cyan font-bold">Live MySQL Ledger</span>
          </div>

          <div className="h-48 flex items-end justify-between gap-2 pt-6 px-2">
            {sales_trend.map((day, i) => {
              const maxRev = Math.max(...sales_trend.map(d => Number(d.daily_revenue) || 1000), 5000);
              const heightPct = Math.max(15, Math.round((Number(day.daily_revenue) / maxRev) * 100));

              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                  <span className="text-[10px] text-slate-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                    ₹{day.daily_revenue}
                  </span>
                  <div 
                    style={{ height: `${heightPct}%` }}
                    className="w-full bg-gradient-to-t from-brand-blue via-brand-cyan to-brand-teal rounded-t-lg transition-all group-hover:brightness-125 shadow-cyan-glow"
                  />
                  <span className="text-[10px] text-slate-400 font-medium">
                    {day.sale_date?.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment Methods Distribution */}
        <div className="glass-card rounded-3xl p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-white/10 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Payment Methods
            </h3>
            <CreditCard className="w-4 h-4 text-brand-cyan" />
          </div>

          <div className="space-y-3">
            {payment_breakdown.map((pm) => (
              <div key={pm.payment_mode} className="p-3 rounded-xl bg-white/5 space-y-1">
                <div className="flex justify-between text-xs font-bold text-white">
                  <span>{pm.payment_mode}</span>
                  <span className="font-mono">₹{pm.total}</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  {pm.count} transaction(s) recorded
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 4. LOW STOCK WARNING TABLE & RECENT ORDERS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Low Stock Watch */}
        <div className="glass-card rounded-3xl p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-white/10 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" /> Low Stock Warning Alert
            </h3>
            <Link to="/admin/inventory" className="text-xs text-brand-cyan hover:underline">
              Inventory Ledger &rarr;
            </Link>
          </div>

          <div className="space-y-2 text-xs">
            {low_stock_products.map((prod) => (
              <div key={prod.id} className="p-3 rounded-xl bg-white/5 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">{prod.name}</div>
                  <div className="text-slate-400 text-[11px]">SKU: {prod.sku}</div>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 font-mono font-bold text-xs">
                    {prod.stock_quantity} left
                  </span>
                  <div className="text-[10px] text-slate-400 mt-0.5">Threshold: {prod.low_stock_threshold}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Orders Overview */}
        <div className="glass-card rounded-3xl p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-white/10 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Recent Counter &amp; Online Orders
            </h3>
            <Link to="/admin/orders" className="text-xs text-brand-cyan hover:underline">
              View All &rarr;
            </Link>
          </div>

          <div className="space-y-2 text-xs">
            {recent_orders.map((ord) => (
              <div key={ord.id} className="p-3 rounded-xl bg-white/5 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white font-mono">{ord.order_number}</div>
                  <div className="text-slate-400 text-[11px]">
                    {ord.customer_name} &bull; {ord.order_type}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-white font-mono">₹{ord.total_amount}</div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-cyan/20 text-brand-cyan font-semibold">
                    {ord.order_status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* PROOF PREVIEW MODAL */}
      {selectedProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-xl bg-[#0A192F] border border-white/15 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-brand-cyan" /> Customer Payment Proof Screenshot
              </h3>
              <button onClick={() => setSelectedProof(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto rounded-2xl bg-black/50 p-2 flex items-center justify-center border border-white/10">
              <img src={selectedProof} alt="Payment Proof" className="max-w-full h-auto rounded-xl" />
            </div>
            <div className="flex justify-end">
              <button 
                onClick={() => setSelectedProof(null)}
                className="btn-secondary text-xs py-2 px-4 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
