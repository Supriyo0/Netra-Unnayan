import React, { useState, useEffect } from 'react';
import { 
  CreditCard, CheckCircle2, XCircle, Clock, Search, 
  RefreshCw, Copy, Check, ExternalLink, ShieldCheck, AlertCircle,
  Eye, Image as ImageIcon, X
} from 'lucide-react';
import api from '../../api/client';

export const AdminPaymentsPage = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [copiedUtr, setCopiedUtr] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage] = useState(null);
  const [previewReceipt, setPreviewReceipt] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const url = filterStatus ? `/admin/payments.php?status=${filterStatus}` : '/admin/payments.php';
      const res = await api.get(url);
      if (res.success && res.data) {
        setPayments(res.data.payments || []);
        if (res.data.pending_count !== undefined) {
          setPendingCount(res.data.pending_count);
        }
      }
    } catch (err) {
      console.error('Failed to fetch payments:', err);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [filterStatus]);

  const handleCopyUtr = (utr) => {
    navigator.clipboard.writeText(utr);
    setCopiedUtr(utr);
    setTimeout(() => setCopiedUtr(null), 2000);
  };

  const handleAction = async (paymentId, newStatus) => {
    const reason = newStatus === 'Failed' ? prompt('Enter reason for payment rejection:') : '';
    if (newStatus === 'Failed' && reason === null) return; // cancelled prompt

    setActionLoading(paymentId);
    setMessage(null);
    try {
      const res = await api.post('/admin/payments.php', {
        payment_id: paymentId,
        status: newStatus,
        reason: reason || ''
      });
      if (res.success) {
        setMessage({ type: 'success', text: `Payment #${paymentId} marked as ${newStatus}!` });
        fetchPayments();
      } else {
        setMessage({ type: 'error', text: res.message || 'Failed to update payment status.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const safePayments = Array.isArray(payments) ? payments : [];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <span className="text-xs uppercase font-extrabold tracking-wider text-brand-cyan">
            Financial Ledger &amp; Gateways
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-heading flex items-center gap-2.5 mt-1">
            <CreditCard className="w-7 h-7 text-brand-cyan" />
            UPI &amp; Payment Approval Queue
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Verify customer UPI transaction references (UTR / Ref IDs) &amp; payment screenshot proofs to approve orders.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchPayments}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all text-xs flex items-center gap-1.5"
            title="Refresh Payments"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-cyan' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-xs font-semibold ${
          message.type === 'success' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
        }`}>
          {message.text}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilterStatus('')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filterStatus === '' 
              ? 'bg-brand-cyan text-slate-950 shadow-lg' 
              : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
          }`}
        >
          All Payments ({safePayments.length})
        </button>
        <button
          onClick={() => setFilterStatus('Pending')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            filterStatus === 'Pending' 
              ? 'bg-amber-500 text-slate-950 font-black shadow-lg' 
              : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Pending Verification</span>
          {pendingCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-black">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setFilterStatus('Paid')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            filterStatus === 'Paid' 
              ? 'bg-emerald-600 text-white shadow-lg' 
              : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Approved / Paid</span>
        </button>
        <button
          onClick={() => setFilterStatus('Failed')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            filterStatus === 'Failed' 
              ? 'bg-rose-600 text-white shadow-lg' 
              : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>Rejected / Failed</span>
        </button>
      </div>

      {/* Payments Table */}
      <div className="bg-[#0A192F] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="text-xs">Loading payment transactions...</div>
          </div>
        ) : safePayments.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <CreditCard className="w-12 h-12 mx-auto text-slate-600" />
            <div className="text-sm font-bold text-slate-300">No payment records found</div>
            <p className="text-xs text-slate-500">Customer payments submitted via UPI / QR will appear here for verification.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-white/[0.02] text-slate-400 border-b border-white/10 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Payment #</th>
                  <th className="py-3 px-4">Order / Customer</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4">Submitted UTR / Ref</th>
                  <th className="py-3 px-4">Payment Proof</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Verification Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {safePayments.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-white">{p.payment_number || `PAY-${p.id}`}</span>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {p.created_at ? new Date(p.created_at).toLocaleString() : '—'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-brand-cyan font-mono">{p.order_number || `ORD-${p.order_id}`}</div>
                      <div className="text-white font-semibold">{p.customer_name || 'Walk-in Customer'}</div>
                      <div className="text-[10px] text-slate-400">{p.customer_phone || p.customer_email || '—'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-black text-sm text-white font-mono">₹{p.amount}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                        {p.payment_mode || 'UPI'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {p.upi_utr ? (
                        <div className="inline-flex items-center gap-1.5 p-1 px-2 rounded-lg bg-black/40 border border-white/10 font-mono text-[11px] text-brand-teal">
                          <span>{p.upi_utr}</span>
                          <button
                            onClick={() => handleCopyUtr(p.upi_utr)}
                            className="text-slate-400 hover:text-white"
                            title="Copy UTR"
                          >
                            {copiedUtr === p.upi_utr ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">No UTR attached</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {p.payment_proof_url ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setPreviewReceipt(p.payment_proof_url)}
                            className="relative group rounded-lg overflow-hidden border border-brand-cyan/40 w-10 h-10 bg-black/50 shrink-0"
                            title="Click to view payment screenshot"
                          >
                            <img
                              src={p.payment_proof_url}
                              alt="Receipt Screenshot"
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye className="w-3.5 h-3.5 text-white" />
                            </div>
                          </button>
                          <button
                            onClick={() => setPreviewReceipt(p.payment_proof_url)}
                            className="text-[10px] font-bold text-brand-cyan hover:underline flex items-center gap-0.5"
                          >
                            <span>Inspect SS</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">No Screenshot</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        p.status === 'Paid'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : p.status === 'Failed'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {p.status === 'Paid' ? <CheckCircle2 className="w-3 h-3" /> : p.status === 'Failed' ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        <span>{p.status}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {p.status !== 'Paid' ? (
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleAction(p.id, 'Paid')}
                            disabled={actionLoading === p.id}
                            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-sm transition-all disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleAction(p.id, 'Failed')}
                            disabled={actionLoading === p.id}
                            className="px-2.5 py-1 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-[11px] transition-all disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-emerald-400 font-bold flex items-center justify-end gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" /> Verified
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Screenshot Lightbox Modal */}
      {previewReceipt && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-2xl w-full bg-slate-900 border border-white/20 rounded-2xl overflow-hidden shadow-2xl space-y-4 p-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <ImageIcon className="w-4 h-4 text-brand-cyan" />
                <span>Customer Payment Proof Screenshot</span>
              </div>
              <div className="flex items-center gap-2">
                <a 
                  href={previewReceipt} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white text-xs flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Full Size</span>
                </a>
                <button
                  onClick={() => setPreviewReceipt(null)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-auto flex items-center justify-center bg-black/50 rounded-xl p-2">
              <img
                src={previewReceipt}
                alt="Payment Proof Full"
                className="max-h-[65vh] max-w-full object-contain rounded-lg shadow-md"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setPreviewReceipt(null)}
                className="btn-primary text-xs py-2 px-4 rounded-xl"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
