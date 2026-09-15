import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Phone, Mail, ShoppingBag, FileText, 
  RefreshCw, UserCheck, Calendar, Eye, Shield, ShieldCheck, 
  ArrowUpRight, X, Power, CheckCircle2, AlertCircle, Sparkles
} from 'lucide-react';
import api from '../../api/client';

export const AdminCustomersPage = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'staff', 'customers'
  
  // Role Promotion Modal State
  const [roleModalUser, setRoleModalUser] = useState(null);
  const [selectedRoleId, setSelectedRoleId] = useState('2');
  const [submittingRole, setSubmittingRole] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Prescription Vault Modal State
  const [rxModalUser, setRxModalUser] = useState(null);
  const [rxData, setRxData] = useState({ vault_prescriptions: [], order_prescriptions: [] });
  const [rxLoading, setRxLoading] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

  const handleOpenPrescriptions = async (u) => {
    setRxModalUser(u);
    setRxLoading(true);
    try {
      const res = await api.get(`/admin/customers.php?customer_id=${u.id}&prescriptions=1`);
      if (res.success && res.data) {
        setRxData(res.data);
      } else {
        setRxData({ vault_prescriptions: [], order_prescriptions: [] });
      }
    } catch (err) {
      console.error('Failed to load prescriptions:', err);
      setRxData({ vault_prescriptions: [], order_prescriptions: [] });
    } finally {
      setRxLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (activeFilter !== 'all') params.append('filter', activeFilter);

      const res = await api.get(`/admin/customers.php?${params.toString()}`);
      if (res.success && res.data) {
        setUsers(res.data.users || []);
        setRoles(res.data.roles || []);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [activeFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  const handlePromoteSubmit = async (e) => {
    e.preventDefault();
    if (!roleModalUser) return;

    setSubmittingRole(true);
    try {
      const res = await api.post('/admin/customers.php', {
        action: 'promote_to_staff',
        customer_id: roleModalUser.id,
        role_id: parseInt(selectedRoleId)
      });
      if (res.success) {
        setFeedback({ type: 'success', message: res.message || 'User promoted to staff successfully.' });
        setRoleModalUser(null);
        await fetchUsers();
        setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
      } else {
        alert(res.message || 'Promotion failed');
      }
    } catch (err) {
      alert(err.message || 'Error updating user role');
    } finally {
      setSubmittingRole(false);
    }
  };

  const handleDemote = async (user) => {
    if (!window.confirm(`Revoke staff privileges for ${user.full_name}? They will return to a standard customer account.`)) return;

    try {
      const res = await api.post('/admin/customers.php', {
        action: 'demote_to_customer',
        email: user.email,
        admin_id: user.admin_id
      });
      if (res.success) {
        setFeedback({ type: 'success', message: `${user.full_name} is now a regular customer.` });
        await fetchUsers();
        setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
      }
    } catch (err) {
      alert(err.message || 'Failed to revoke staff access');
    }
  };

  const handleToggleActive = async (user) => {
    const nextState = user.is_active == 1 ? 0 : 1;
    try {
      const res = await api.post('/admin/customers.php', {
        action: 'toggle_active',
        customer_id: user.id,
        is_active: nextState
      });
      if (res.success) {
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: nextState } : u));
      }
    } catch (err) {
      alert(err.message || 'Failed to update user status');
    }
  };

  const staffCount = users.filter(u => u.is_staff == 1).length;
  const customerCount = users.filter(u => u.is_staff == 0).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <span className="text-xs uppercase font-extrabold tracking-wider text-brand-cyan">
            Identity &amp; Role Management
          </span>
          <h1 className="text-2xl font-black text-white font-heading flex items-center gap-2.5">
            <Users className="w-7 h-7 text-brand-cyan" />
            Users, Customers &amp; Staff Roles
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage registered customer accounts, promote users to staff roles, and oversee permissions
          </p>
        </div>

        <button
          onClick={fetchUsers}
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all text-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Directory</span>
        </button>
      </div>

      {feedback.message && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-semibold ${
          feedback.type === 'success' 
            ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-200' 
            : 'bg-rose-950/40 border border-rose-500/40 text-rose-200'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Total User Accounts</span>
          <div className="text-2xl font-black text-white font-mono">{users.length}</div>
          <span className="text-[10px] text-slate-400">All registered profiles</span>
        </div>
        <div className="glass-card p-5 rounded-2xl border border-brand-cyan/20 space-y-1">
          <span className="text-[11px] font-semibold text-brand-cyan uppercase">Optical Staff / Admins</span>
          <div className="text-2xl font-black text-brand-cyan font-mono">{staffCount}</div>
          <span className="text-[10px] text-slate-400">Access to admin management portal</span>
        </div>
        <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Registered Customers</span>
          <div className="text-2xl font-black text-emerald-400 font-mono">{customerCount}</div>
          <span className="text-[10px] text-slate-400">Active eyewear shoppers &amp; patients</span>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="glass-card p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 border border-white/10">
        
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10 w-full md:w-auto text-xs font-semibold">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeFilter === 'all' ? 'bg-brand-cyan text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
            }`}
          >
            All Accounts ({users.length})
          </button>
          <button
            onClick={() => setActiveFilter('staff')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeFilter === 'staff' ? 'bg-brand-cyan text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
            }`}
          >
            Staff &amp; Admins ({staffCount})
          </button>
          <button
            onClick={() => setActiveFilter('customers')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeFilter === 'customers' ? 'bg-brand-cyan text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
            }`}
          >
            Customers ({customerCount})
          </button>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full glass-input rounded-xl pl-10 pr-4 py-2 text-xs"
          />
        </form>
      </div>

      {/* Users Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 border-b border-white/10 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="px-5 py-3.5">User Details</th>
                <th className="px-5 py-3.5">Account Role</th>
                <th className="px-5 py-3.5">Contact Phone</th>
                <th className="px-5 py-3.5 text-center">Prescriptions</th>
                <th className="px-5 py-3.5 text-right">Orders &amp; Spend</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Role Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-cyan" />
                    Loading user directory...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-slate-400">
                    No users found matching criteria.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isStaff = user.is_staff == 1;
                  const roleLabel = user.role_name || (isStaff ? 'Staff' : 'Customer');

                  return (
                    <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                      
                      {/* Name & Email */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-white text-sm flex items-center gap-1.5">
                          {user.full_name}
                          {isStaff && (
                            <span title="Staff Account">
                              <ShieldCheck className="w-4 h-4 text-brand-cyan shrink-0" />
                            </span>
                          )}
                        </div>
                        <div className="text-slate-400 text-[11px] flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-500" />
                          <span>{user.email}</span>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                          user.role_slug === 'super_admin'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : isStaff
                            ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30'
                            : 'bg-slate-800 text-slate-400 border border-white/5'
                        }`}>
                          <Shield className="w-3 h-3" />
                          <span>{roleLabel}</span>
                        </span>
                      </td>

                      {/* Phone */}
                      <td className="px-5 py-4 font-mono text-slate-300">
                        {user.phone ? (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-500" />
                            <span>{user.phone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* Prescriptions Vault Count */}
                      <td className="px-5 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenPrescriptions(user)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all border ${
                            user.prescriptions_count > 0
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30 shadow-sm'
                              : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white'
                          }`}
                          title="Click to view customer prescriptions"
                        >
                          <Eye className="w-3.5 h-3.5 text-brand-cyan" />
                          <span>{user.prescriptions_count > 0 ? `${user.prescriptions_count} Rx Saved` : '0 Rx'}</span>
                        </button>
                      </td>

                      {/* Orders & Total Spent */}
                      <td className="px-5 py-4 text-right font-mono">
                        <div className="text-white font-bold">
                          ₹{parseFloat(user.total_spent || 0).toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {user.total_orders || 0} orders
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(user)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                            user.is_active == 1
                              ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                          }`}
                        >
                          {user.is_active == 1 ? 'ACTIVE' : 'SUSPENDED'}
                        </button>
                      </td>

                      {/* Action */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenPrescriptions(user)}
                            className="px-2.5 py-1 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 text-[11px] font-semibold transition-all flex items-center gap-1"
                            title="Inspect Prescriptions"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View Rx</span>
                          </button>

                          {isStaff ? (
                            <>
                              <button
                                type="button"
                                onClick={() => { setRoleModalUser(user); setSelectedRoleId(String(user.role_id || 2)); }}
                                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold transition-all"
                              >
                                Edit Role
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDemote(user)}
                                className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[11px] font-semibold transition-all"
                                title="Demote to standard customer"
                              >
                                Demote
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => { setRoleModalUser(user); setSelectedRoleId('2'); }}
                              className="btn-primary px-3 py-1 text-[11px] rounded-lg shadow-cyan-glow flex items-center gap-1"
                            >
                              <Shield className="w-3 h-3" />
                              <span>Make Staff</span>
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ROLE PROMOTION / CHANGE ROLE MODAL */}
      {roleModalUser && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full glass-card rounded-3xl overflow-hidden border border-white/20 shadow-2xl p-6 space-y-5">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-brand-cyan/20 text-brand-cyan flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Assign Staff Role</h3>
                  <p className="text-[11px] text-slate-400">{roleModalUser.full_name}</p>
                </div>
              </div>
              <button
                onClick={() => setRoleModalUser(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePromoteSubmit} className="space-y-4">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 space-y-1">
                <div><strong>Email:</strong> {roleModalUser.email}</div>
                <div><strong>Current Account:</strong> {roleModalUser.is_staff == 1 ? 'Optical Staff' : 'Customer'}</div>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1.5 font-semibold">
                  Select Staff Role / Permission Level:
                </label>
                <div className="space-y-2">
                  {roles.map((r) => (
                    <label
                      key={r.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        String(selectedRoleId) === String(r.id)
                          ? 'bg-brand-cyan/15 border-brand-cyan text-white'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role_id"
                        value={r.id}
                        checked={String(selectedRoleId) === String(r.id)}
                        onChange={(e) => setSelectedRoleId(e.target.value)}
                        className="accent-brand-cyan mt-0.5"
                      />
                      <div>
                        <div className="text-xs font-bold text-white">{r.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{r.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setRoleModalUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRole}
                  className="btn-primary px-5 py-2 rounded-xl text-xs font-bold shadow-cyan-glow flex items-center gap-2 disabled:opacity-50"
                >
                  {submittingRole ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>Grant Staff Access</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}
      {rxModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-3xl glass-card bg-slate-900/98 rounded-3xl p-6 sm:p-7 border border-white/20 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-cyan/15 text-brand-cyan flex items-center justify-center font-black">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Clinical Prescription Vault</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-brand-cyan/20 text-brand-cyan font-mono font-bold">
                      {rxModalUser.full_name}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Email: <span className="text-slate-200">{rxModalUser.email}</span> &bull; Phone: <span className="text-slate-200">{rxModalUser.phone || '—'}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRxModalUser(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            {rxLoading ? (
              <div className="py-16 text-center text-slate-400 space-y-3">
                <RefreshCw className="w-8 h-8 text-brand-cyan animate-spin mx-auto" />
                <p className="text-xs">Loading patient prescription records...</p>
              </div>
            ) : (rxData.vault_prescriptions.length === 0 && rxData.order_prescriptions.length === 0) ? (
              <div className="py-14 text-center text-slate-400 space-y-3">
                <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-500">
                  <Eye className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white">No Prescriptions Uploaded</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  This customer has not saved any optical prescriptions in their vault or attached them to orders yet.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Vault Prescriptions */}
                {rxData.vault_prescriptions.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-brand-cyan flex items-center gap-2">
                      <span>Saved Vault Prescriptions ({rxData.vault_prescriptions.length})</span>
                    </h4>

                    {rxData.vault_prescriptions.map((rx) => (
                      <div key={rx.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{rx.label || 'My Prescription'}</span>
                            {rx.doctor_name && (
                              <span className="text-[11px] text-teal-400 font-medium">Dr. {rx.doctor_name}</span>
                            )}
                            {rx.clinic_name && (
                              <span className="text-[10px] text-slate-400">({rx.clinic_name})</span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Date: {rx.prescription_date || new Date(rx.created_at).toLocaleDateString('en-IN')}
                          </span>
                        </div>

                        {/* Lens Power Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left">
                            <thead className="text-[10px] uppercase text-slate-400 border-b border-white/10 font-mono">
                              <tr>
                                <th className="py-1.5 px-2">Eye</th>
                                <th className="py-1.5 px-2">Sphere (SPH)</th>
                                <th className="py-1.5 px-2">Cylinder (CYL)</th>
                                <th className="py-1.5 px-2">Axis</th>
                                <th className="py-1.5 px-2">Add Power</th>
                                <th className="py-1.5 px-2">Pupillary (PD)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-mono text-xs">
                              <tr>
                                <td className="py-2 px-2 font-bold text-teal-400">Right (OD)</td>
                                <td className="py-2 px-2 text-white font-bold">{rx.right_sph !== null ? `${rx.right_sph > 0 ? '+' : ''}${parseFloat(rx.right_sph).toFixed(2)}` : '0.00'}</td>
                                <td className="py-2 px-2 text-slate-300">{rx.right_cyl !== null ? `${rx.right_cyl > 0 ? '+' : ''}${parseFloat(rx.right_cyl).toFixed(2)}` : '0.00'}</td>
                                <td className="py-2 px-2 text-slate-300">{rx.right_axis !== null ? `${rx.right_axis}°` : '—'}</td>
                                <td className="py-2 px-2 text-slate-300">{rx.right_add !== null ? `+${parseFloat(rx.right_add).toFixed(2)}` : '—'}</td>
                                <td className="py-2 px-2 text-slate-300">{rx.right_pd !== null ? `${rx.right_pd}mm` : (rx.single_pd ? `${rx.single_pd}mm` : '—')}</td>
                              </tr>
                              <tr>
                                <td className="py-2 px-2 font-bold text-sky-400">Left (OS)</td>
                                <td className="py-2 px-2 text-white font-bold">{rx.left_sph !== null ? `${rx.left_sph > 0 ? '+' : ''}${parseFloat(rx.left_sph).toFixed(2)}` : '0.00'}</td>
                                <td className="py-2 px-2 text-slate-300">{rx.left_cyl !== null ? `${rx.left_cyl > 0 ? '+' : ''}${parseFloat(rx.left_cyl).toFixed(2)}` : '0.00'}</td>
                                <td className="py-2 px-2 text-slate-300">{rx.left_axis !== null ? `${rx.left_axis}°` : '—'}</td>
                                <td className="py-2 px-2 text-slate-300">{rx.left_add !== null ? `+${parseFloat(rx.left_add).toFixed(2)}` : '—'}</td>
                                <td className="py-2 px-2 text-slate-300">{rx.left_pd !== null ? `${rx.left_pd}mm` : (rx.single_pd ? `${rx.single_pd}mm` : '—')}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Notes and File Attachment */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
                          {rx.notes ? (
                            <div className="text-[11px] text-slate-400 italic">
                              <span className="font-semibold text-slate-300 not-italic">Notes: </span>
                              {rx.notes}
                            </div>
                          ) : (
                            <span />
                          )}

                          {rx.prescription_file_url && (
                            <button
                              type="button"
                              onClick={() => setLightboxImage(rx.prescription_file_url)}
                              className="px-3 py-1.5 rounded-xl bg-brand-cyan/20 hover:bg-brand-cyan/30 text-brand-cyan font-bold text-xs flex items-center gap-1.5 border border-brand-cyan/40 shadow-sm"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>View Uploaded Doctor Slip</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Order Attached Prescriptions */}
                {rxData.order_prescriptions.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                      <span>Order-Attached Optical Specifications ({rxData.order_prescriptions.length})</span>
                    </h4>

                    {rxData.order_prescriptions.map((op) => (
                      <div key={op.id} className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/10 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">Order #{op.order_number}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-bold uppercase">
                              {op.status || 'Verified'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">Method: {op.submission_method}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(op.order_date || op.created_at).toLocaleDateString('en-IN')}
                          </span>
                        </div>

                        {/* Power Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left">
                            <thead className="text-[10px] uppercase text-slate-400 border-b border-white/10 font-mono">
                              <tr>
                                <th className="py-1.5 px-2">Eye</th>
                                <th className="py-1.5 px-2">SPH</th>
                                <th className="py-1.5 px-2">CYL</th>
                                <th className="py-1.5 px-2">Axis</th>
                                <th className="py-1.5 px-2">Add</th>
                                <th className="py-1.5 px-2">PD</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-mono text-xs">
                              <tr>
                                <td className="py-1.5 px-2 font-bold text-amber-400">Right (OD)</td>
                                <td className="py-1.5 px-2 text-white font-bold">{op.right_sph !== null ? `${op.right_sph > 0 ? '+' : ''}${parseFloat(op.right_sph).toFixed(2)}` : '0.00'}</td>
                                <td className="py-1.5 px-2 text-slate-300">{op.right_cyl !== null ? `${op.right_cyl > 0 ? '+' : ''}${parseFloat(op.right_cyl).toFixed(2)}` : '0.00'}</td>
                                <td className="py-1.5 px-2 text-slate-300">{op.right_axis !== null ? `${op.right_axis}°` : '—'}</td>
                                <td className="py-1.5 px-2 text-slate-300">{op.right_add !== null ? `+${parseFloat(op.right_add).toFixed(2)}` : '—'}</td>
                                <td className="py-1.5 px-2 text-slate-300">{op.right_pd !== null ? `${op.right_pd}mm` : (op.single_pd ? `${op.single_pd}mm` : '—')}</td>
                              </tr>
                              <tr>
                                <td className="py-1.5 px-2 font-bold text-sky-400">Left (OS)</td>
                                <td className="py-1.5 px-2 text-white font-bold">{op.left_sph !== null ? `${op.left_sph > 0 ? '+' : ''}${parseFloat(op.left_sph).toFixed(2)}` : '0.00'}</td>
                                <td className="py-1.5 px-2 text-slate-300">{op.left_cyl !== null ? `${op.left_cyl > 0 ? '+' : ''}${parseFloat(op.left_cyl).toFixed(2)}` : '0.00'}</td>
                                <td className="py-1.5 px-2 text-slate-300">{op.left_axis !== null ? `${op.left_axis}°` : '—'}</td>
                                <td className="py-1.5 px-2 text-slate-300">{op.left_add !== null ? `+${parseFloat(op.left_add).toFixed(2)}` : '—'}</td>
                                <td className="py-1.5 px-2 text-slate-300">{op.left_pd !== null ? `${op.left_pd}mm` : (op.single_pd ? `${op.single_pd}mm` : '—')}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {op.rx_image_url && (
                          <div className="pt-2 text-right">
                            <button
                              type="button"
                              onClick={() => setLightboxImage(op.rx_image_url)}
                              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs inline-flex items-center gap-1.5 border border-amber-500/40"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>View Order Rx Slip</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

              </div>
            )}

          </div>
        </div>
      )}

      {/* Lightbox for Full-Resolution Doctor Prescription Image */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden border border-white/20 shadow-2xl p-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={lightboxImage} 
              alt="Prescription Document" 
              className="max-w-full max-h-[80vh] object-contain rounded-xl mx-auto"
            />
            <div className="p-3 text-center">
              <a 
                href={lightboxImage} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn-primary py-2 px-5 text-xs font-bold inline-flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                <span>Open Original High-Res Document</span>
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
