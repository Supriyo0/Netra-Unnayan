import React, { useState, useEffect } from 'react';
import { 
  Tag, Plus, Trash2, Edit, CheckCircle2, XCircle, 
  Percent, Calendar, RefreshCw, Sparkles, Copy, Check
} from 'lucide-react';
import api from '../../api/client';

export const AdminCouponsPage = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'PERCENTAGE',
    discount_value: '',
    min_order_amount: '0',
    max_discount: '',
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    usage_limit: 100,
    is_active: 1
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/coupons.php');
      if (res.success) {
        setCoupons(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch coupons:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const openCreateModal = () => {
    setEditingCoupon(null);
    setFormData({
      code: '',
      discount_type: 'PERCENTAGE',
      discount_value: '10',
      min_order_amount: '999',
      max_discount: '500',
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      usage_limit: 100,
      is_active: 1
    });
    setShowModal(true);
  };

  const openEditModal = (c) => {
    setEditingCoupon(c);
    setFormData({
      code: c.code || '',
      discount_type: c.discount_type || 'PERCENTAGE',
      discount_value: c.discount_value || '',
      min_order_amount: c.min_order_amount || '0',
      max_discount: c.max_discount || '',
      valid_from: c.valid_from || '',
      valid_until: c.valid_until || '',
      usage_limit: c.usage_limit || 100,
      is_active: c.is_active ? 1 : 0
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        action: editingCoupon ? 'update' : 'create',
        ...(editingCoupon ? { id: editingCoupon.id } : {}),
        ...formData
      };
      const res = await api.post('/admin/coupons.php', payload);
      if (res.success) {
        setMessage({ type: 'success', text: res.message || 'Coupon saved!' });
        setShowModal(false);
        fetchCoupons();
      } else {
        setMessage({ type: 'error', text: res.error || 'Failed to save coupon.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || err.message });
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    try {
      const res = await api.post('/admin/coupons.php', {
        action: 'toggle_status',
        id,
        is_active: currentStatus ? 0 : 1
      });
      if (res.success) {
        fetchCoupons();
      }
    } catch (err) {
      console.error('Status toggle failed:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this coupon code?')) return;
    try {
      const res = await api.delete(`/admin/coupons.php?id=${id}`);
      if (res.success) {
        fetchCoupons();
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white font-heading flex items-center gap-2.5">
            <Tag className="w-7 h-7 text-amber-400" />
            Coupons &amp; Discount Codes
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure promotional discount codes, percentage cuts, minimum order thresholds, and expiry dates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchCoupons}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all text-xs flex items-center gap-1.5"
            title="Refresh Coupons"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={openCreateModal}
            className="btn-primary py-2 px-4 rounded-xl text-xs font-bold shadow-cyan-glow flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Coupon</span>
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

      {/* Coupons Table */}
      <div className="bg-[#0A192F] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="text-xs">Loading coupons...</div>
          </div>
        ) : coupons.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Tag className="w-12 h-12 mx-auto text-slate-600" />
            <div className="text-sm font-bold text-slate-300">No discount coupons active</div>
            <p className="text-xs text-slate-500">Create coupons like CLARITY10 or WELCOME500 to attract customers.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-white/[0.02] text-slate-400 border-b border-white/10 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Coupon Code</th>
                  <th className="py-3 px-4">Discount Value</th>
                  <th className="py-3 px-4">Min Order</th>
                  <th className="py-3 px-4">Validity Window</th>
                  <th className="py-3 px-4">Usage Count</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4">
                      <div className="inline-flex items-center gap-1.5 p-1.5 px-2.5 rounded-lg bg-black/40 border border-amber-400/40 font-mono font-black text-amber-300 text-sm">
                        <span>{c.code}</span>
                        <button
                          onClick={() => copyCode(c.code)}
                          className="text-slate-400 hover:text-white"
                          title="Copy Code"
                        >
                          {copiedCode === c.code ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-extrabold text-white text-sm">
                        {c.discount_type === 'PERCENTAGE' ? `${c.discount_value}% OFF` : `₹${c.discount_value} FLAT`}
                      </span>
                      {c.max_discount && (
                        <div className="text-[10px] text-slate-400">Cap: ₹{c.max_discount}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      ₹{c.min_order_amount || '0'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-[11px] text-slate-300 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>{c.valid_from} to {c.valid_until}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {c.times_used || 0} / {c.usage_limit || '∞'}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => toggleStatus(c.id, c.is_active)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          c.is_active
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-700/50 text-slate-400 border border-white/10'
                        }`}
                      >
                        {c.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        <span>{c.is_active ? 'Active' : 'Disabled'}</span>
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(c)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-brand-cyan/20 text-slate-300 hover:text-brand-cyan transition-colors"
                        title="Edit Coupon"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition-colors"
                        title="Delete Coupon"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0A192F] border border-white/15 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white font-heading">
                {editingCoupon ? 'Edit Coupon Code' : 'Create New Coupon Code'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white text-xl leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Coupon Code * (e.g. CLARITY10)
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="CLARITY10"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#060D17] border border-white/10 text-white text-xs font-mono uppercase focus:border-brand-cyan focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Discount Type
                  </label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#060D17] border border-white/10 text-white text-xs focus:border-brand-cyan focus:outline-none"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Flat Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Discount Value *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                    placeholder="10"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#060D17] border border-white/10 text-white text-xs focus:border-brand-cyan focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Min Order (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.min_order_amount}
                    onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#060D17] border border-white/10 text-white text-xs font-mono focus:border-brand-cyan focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Max Discount (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.max_discount}
                    onChange={(e) => setFormData({ ...formData, max_discount: e.target.value })}
                    placeholder="Optional"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#060D17] border border-white/10 text-white text-xs font-mono focus:border-brand-cyan focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Valid From
                  </label>
                  <input
                    type="date"
                    value={formData.valid_from}
                    onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#060D17] border border-white/10 text-white text-xs focus:border-brand-cyan focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Valid Until
                  </label>
                  <input
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#060D17] border border-white/10 text-white text-xs focus:border-brand-cyan focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary px-5 py-2 rounded-xl text-xs font-bold shadow-cyan-glow"
                >
                  {saving ? 'Saving...' : editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
