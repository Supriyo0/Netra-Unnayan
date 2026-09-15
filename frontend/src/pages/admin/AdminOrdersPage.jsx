import React, { useState, useEffect } from 'react';
import { 
  Package, Search, Filter, Eye, CheckCircle2, AlertTriangle, 
  Clock, Truck, DollarSign, RefreshCw, X, FileText, ChevronRight,
  Printer, Send, ShieldAlert, ArrowUpDown, Trash2
} from 'lucide-react';
import api from '../../api/client';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [isCustomerVisible, setIsCustomerVisible] = useState(true);
  const [newStatus, setNewStatus] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [courierName, setCourierName] = useState('Blue Dart');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('');

  const statusList = [
    { value: 'all', label: 'All Orders' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'prescription_verified', label: 'Rx Verified' },
    { value: 'lens_cutting', label: 'Lens Cutting' },
    { value: 'optical_fitting', label: 'Optical Fitting' },
    { value: 'quality_checked', label: 'Quality Checked' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/orders.php', {
        params: { status: statusFilter !== 'all' ? statusFilter : undefined, search: search || undefined }
      });
      const isSuccess = res.success || res.data?.success;
      if (isSuccess) {
        const orderData = res.data?.orders || res.data?.data?.orders || res.data || [];
        setOrders(Array.isArray(orderData) ? orderData : (orderData.orders || []));
      }
    } catch (err) {
      console.error('Failed to fetch orders', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchOrders();
  };

  const openOrderDetail = async (orderId) => {
    try {
      setModalLoading(true);
      const fromList = orders.find(o => o.id === orderId);
      if (fromList) {
        setSelectedOrder(fromList);
        setNewStatus(fromList.order_status || fromList.status || 'Pending');
        setCourierName(fromList.courier_name || 'Blue Dart');
        setTrackingNumber(fromList.tracking_number || '');
        setTrackingUrl(fromList.tracking_url || '');
        setEstimatedDeliveryDate(fromList.estimated_delivery_date || '');
      }

      const res = await api.get(`/admin/orders.php?id=${orderId}`);
      const isSuccess = res.success || res.data?.success;
      const orderPayload = res.data?.order || res.data?.data || res.data;
      if (isSuccess && orderPayload && typeof orderPayload === 'object' && !Array.isArray(orderPayload)) {
        setSelectedOrder(orderPayload);
        setNewStatus(orderPayload.order_status || orderPayload.status || 'Pending');
        setCourierName(orderPayload.courier_name || 'Blue Dart');
        setTrackingNumber(orderPayload.tracking_number || '');
        setTrackingUrl(orderPayload.tracking_url || '');
        setEstimatedDeliveryDate(orderPayload.estimated_delivery_date || '');
        setStatusNote('');
        setActionMessage('');
      }
    } catch (err) {
      console.error('Failed to load order details:', err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!newStatus || !selectedOrder) return;
    try {
      setActionLoading(true);
      setActionMessage('');
      const res = await api.post('/admin/orders.php', {
        action: 'update_status',
        order_id: selectedOrder.id,
        new_status: newStatus,
        status: newStatus,
        note: statusNote,
        is_customer_visible: isCustomerVisible ? 1 : 0,
        courier_name: courierName,
        tracking_number: trackingNumber,
        tracking_url: trackingUrl,
        estimated_delivery_date: estimatedDeliveryDate
      });
      if (res.success || res.data?.success) {
        setActionMessage('Order status and courier tracking updated successfully');
        await openOrderDetail(selectedOrder.id);
        fetchOrders();
      } else {
        alert(res.message || res.data?.message || 'Failed to update status');
      }
    } catch (err) {
      alert(err.message || 'Error updating order status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyPrescription = async (prescriptionId, statusVal) => {
    try {
      setActionLoading(true);
      const res = await api.post('/admin/orders.php', {
        action: 'verify_prescription',
        order_id: selectedOrder.id,
        prescription_id: prescriptionId,
        prescription_status: statusVal,
        verification_status: statusVal,
        note: statusVal === 'verified' || statusVal === 'Verified' ? 'Prescription verified by clinical optician' : 'Rx needs customer clarification'
      });
      if (res.success || res.data?.success) {
        setActionMessage(`Prescription marked as ${statusVal}`);
        await openOrderDetail(selectedOrder.id);
        fetchOrders();
      }
    } catch (err) {
      alert('Failed to update prescription status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyPayment = async (statusVal) => {
    if (!confirm(`Are you sure you want to mark this payment as ${statusVal}?`)) return;
    try {
      setActionLoading(true);
      const res = await api.post('/admin/orders.php', {
        action: 'verify_payment',
        order_id: selectedOrder.id,
        payment_status: statusVal
      });
      if (res.success || res.data?.success) {
        setActionMessage(`Payment status updated to ${statusVal}`);
        await openOrderDetail(selectedOrder.id);
        fetchOrders();
      }
    } catch (err) {
      alert('Failed to update payment status');
    } finally {
      setActionLoading(false);
    }
  };

  const [orderToDelete, setOrderToDelete] = useState(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);

  const handleConfirmDeleteOrder = async (restoreStock) => {
    if (!orderToDelete) return;
    setIsDeletingOrder(true);
    try {
      const res = await api.delete(`/admin/orders.php?id=${orderToDelete.id}&restore_stock=${restoreStock ? 1 : 0}`);
      if (res.success || res.data?.success) {
        setOrders(prev => prev.filter(o => o.id !== orderToDelete.id));
        if (selectedOrder?.id === orderToDelete.id) setSelectedOrder(null);
        setOrderToDelete(null);
      } else {
        alert(res.message || 'Failed to delete order.');
      }
    } catch (err) {
      alert(err.message || 'Error deleting order.');
    } finally {
      setIsDeletingOrder(false);
    }
  };

  const getOrderStatusBadge = (statusStr) => {
    const s = (statusStr || 'Pending').toLowerCase();
    if (s.includes('delivered') || s.includes('completed')) {
      return 'bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700/50';
    }
    if (s.includes('cancel') || s.includes('refund')) {
      return 'bg-rose-100 text-rose-900 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700/50';
    }
    if (s.includes('ship') || s.includes('cutting') || s.includes('fitting')) {
      return 'bg-cyan-100 text-cyan-900 border border-cyan-300 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-700/50';
    }
    if (s.includes('confirm') || s.includes('approved') || s.includes('verified')) {
      return 'bg-teal-100 text-teal-900 border border-teal-300 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-700/50';
    }
    return 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700/50';
  };

  const getPaymentStatusBadge = (statusStr) => {
    const s = (statusStr || 'Pending').toLowerCase();
    if (s.includes('paid') || s.includes('completed')) {
      return 'bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300';
    }
    if (s.includes('fail') || s.includes('reject')) {
      return 'bg-rose-100 text-rose-900 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300';
    }
    return 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-neutral-900 dark:text-white flex items-center gap-2">
            <Package className="w-7 h-7 text-primary-600" />
            Order Management &amp; Fulfillment
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Track online customer orders, verify prescription diopters, and update optical pipeline
          </p>
        </div>
        <button 
          onClick={fetchOrders}
          className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-800 dark:text-white border border-slate-300 dark:border-white/15 text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="glass-card p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 border border-slate-200 dark:border-white/10">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            placeholder="Search by Order #, Customer Name, Phone, or City..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full glass-input rounded-xl pl-9 pr-4 py-2 text-xs"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-4 h-4 text-neutral-400 shrink-0" />
          <div className="flex gap-1.5 shrink-0">
            {statusList.map((st) => (
              <button
                key={st.value}
                onClick={() => setStatusFilter(st.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === st.value
                    ? 'bg-brand-cyan text-slate-950 shadow-md font-extrabold'
                    : 'bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-neutral-700'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                <th className="px-5 py-3.5">ORDER #</th>
                <th className="px-5 py-3.5">CUSTOMER</th>
                <th className="px-5 py-3.5">ITEMS</th>
                <th className="px-5 py-3.5">TOTAL</th>
                <th className="px-5 py-3.5">PAYMENT</th>
                <th className="px-5 py-3.5">STATUS</th>
                <th className="px-5 py-3.5">DATE</th>
                <th className="px-5 py-3.5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-5 py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-cyan" />
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-5 py-12 text-center text-slate-400">
                    No orders found matching your criteria.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const currentStatus = order.order_status || order.status || 'Pending';
                  const payStatus = order.payment_status || 'Pending';
                  const orderAmt = Number(order.total_amount || order.subtotal || 0);
                  const orderDate = order.created_at ? new Date(order.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent';

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-4 font-mono font-bold text-brand-cyan">
                        {order.order_number}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {order.customer_name || 'Walk-in Customer'}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {order.customer_phone || order.customer_email || '—'}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-white/10 font-bold text-slate-700 dark:text-slate-200">
                          {order.item_count || order.items?.length || 1} {(order.item_count === 1 || order.items?.length === 1) ? 'item' : 'items'}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-extrabold text-slate-900 dark:text-white font-mono text-sm">
                        ₹{orderAmt.toLocaleString('en-IN')}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold w-fit uppercase tracking-wider ${getPaymentStatusBadge(payStatus)}`}>
                            {payStatus}
                          </span>
                          <span className="text-[10px] text-slate-500 uppercase font-mono">
                            {order.payment_mode || order.payment_method || 'UPI'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${getOrderStatusBadge(currentStatus)}`}>
                          {currentStatus.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {orderDate}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openOrderDetail(order.id)}
                            className="px-3.5 py-2 rounded-xl bg-brand-cyan hover:bg-cyan-400 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                            title="View and manage order"
                          >
                            <Eye className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Manage</span>
                          </button>
                          <button
                            onClick={() => setOrderToDelete(order)}
                            className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500 text-rose-600 dark:text-rose-300 hover:text-white border border-rose-500/40 transition-all cursor-pointer shadow-sm flex items-center justify-center"
                            title="Delete Order &amp; Invoice (with stock restore option)"
                          >
                            <Trash2 className="w-4 h-4 stroke-[2]" />
                          </button>
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

      {/* Order Detail & Optical Pipeline Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
          <div className="glass-card bg-white dark:bg-neutral-900 rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-white/15 my-6 text-slate-900 dark:text-white">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md z-10">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-extrabold font-heading text-slate-900 dark:text-white">
                    Order #{selectedOrder.order_number || selectedOrder.id}
                  </h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wider ${getOrderStatusBadge(selectedOrder.order_status || selectedOrder.status)}`}>
                    {(selectedOrder.order_status || selectedOrder.status || 'Pending').replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Placed on {selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleString('en-IN') : 'Recent'}
                </p>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notification alert */}
            {actionMessage && (
              <div className="mx-6 mt-4 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-600/50 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{actionMessage}</span>
              </div>
            )}

            <div className="p-5 sm:p-6 space-y-6">
              {/* Top Summary Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1">
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Customer Details</div>
                  <div className="font-extrabold text-slate-900 dark:text-white text-sm">
                    {selectedOrder.customer_name || 'Walk-in Customer'}
                  </div>
                  <div className="text-xs font-mono font-bold text-brand-cyan">
                    Phone: {selectedOrder.customer_phone || '—'}
                  </div>
                  <div className="text-xs text-slate-500">
                    Email: {selectedOrder.customer_email || '—'}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1">
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Shipping Address</div>
                  <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    {selectedOrder.shipping_address_line1 ? (
                      <>
                        {selectedOrder.shipping_address_line1}<br/>
                        {selectedOrder.shipping_city}, {selectedOrder.shipping_state} — {selectedOrder.shipping_pincode}
                      </>
                    ) : (
                      selectedOrder.shipping_address || 'In-store Counter Pickup (Digha Bypass)'
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1">
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Payment &amp; Financials</div>
                  <div className="text-xl font-black text-brand-cyan font-mono">
                    ₹{Number(selectedOrder.total_amount || selectedOrder.subtotal || 0).toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
                    <span>Mode: <strong className="uppercase">{selectedOrder.payment_mode || selectedOrder.payment_method || 'UPI'}</strong></span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${getPaymentStatusBadge(selectedOrder.payment_status)}`}>
                      {selectedOrder.payment_status || 'Pending'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ordered Items Table */}
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-brand-cyan" />
                  <span>Ordered Items &amp; Optical Specs</span>
                </h3>
                <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-2.5">Product</th>
                        <th className="px-4 py-2.5">Optical Specs</th>
                        <th className="px-4 py-2.5">Unit Price</th>
                        <th className="px-4 py-2.5 text-center">Qty</th>
                        <th className="px-4 py-2.5 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                      {(selectedOrder.items || []).map((item, idx) => (
                        <tr key={item.id || idx}>
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {item.product_name || item.name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              SKU: {item.product_sku || item.sku || 'NU-OPT-001'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                            {item.lens_type ? (
                              <div className="text-teal-600 dark:text-teal-300 font-semibold">{item.lens_type}</div>
                            ) : null}
                            <div className="text-[11px] text-slate-400 font-mono">
                              {item.frame_size ? `Size: ${item.frame_size}` : ''} {item.frame_color ? `· Color: ${item.frame_color}` : ''}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono font-medium">
                            ₹{Number(item.unit_price || item.price || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-center">
                            {item.quantity || 1}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-extrabold text-slate-900 dark:text-white">
                            ₹{Number(item.total_price || (item.unit_price || item.price || 0) * (item.quantity || 1)).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* =========================================================================
                  PRESCRIPTION VERIFICATION & UPLOADED SLIP / PDF DISPLAY
                 ========================================================================= */}
              {(() => {
                const rxList = selectedOrder.prescriptions || (selectedOrder.prescription ? [selectedOrder.prescription] : []);
                if (rxList.length === 0) return null;

                return (
                  <div className="p-4 rounded-2xl bg-cyan-50/50 dark:bg-brand-cyan/[0.05] border border-cyan-200 dark:border-brand-cyan/25 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-cyan-950 dark:text-cyan-200 uppercase tracking-wider flex items-center gap-2">
                        <FileText className="w-4 h-4 text-brand-cyan" />
                        <span>Prescription Details &amp; Uploaded Slip (Doctor's Note)</span>
                      </h3>
                      <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-cyan-100 dark:bg-brand-cyan/20 text-cyan-900 dark:text-cyan-200 border border-cyan-300 dark:border-brand-cyan/40 uppercase">
                        Status: {rxList[0]?.status || 'Pending Review'}
                      </span>
                    </div>

                    {rxList.map((rx, idx) => {
                      const rxFileUrl = rx.rx_image_url || rx.prescription_file_url || rx.file_url || rx.image_url;
                      const isPdf = rxFileUrl && rxFileUrl.toLowerCase().includes('.pdf');

                      return (
                        <div key={idx} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-white/10 space-y-3.5 shadow-sm">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div>
                              <span className="text-slate-400 block text-[10px]">Prescription Type</span>
                              <p className="font-bold text-slate-900 dark:text-white capitalize">{rx.lens_type || 'Single Vision'}</p>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Pupillary Distance (PD)</span>
                              <p className="font-bold text-slate-900 dark:text-white font-mono">{rx.single_pd ? `${rx.single_pd} mm (Single)` : (rx.right_pd ? `OD: ${rx.right_pd} | OS: ${rx.left_pd} mm` : '63 mm')}</p>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Submission Method</span>
                              <p className="font-bold text-slate-900 dark:text-white capitalize">{rx.submission_method || rx.submission_type || 'Prescription Slip'}</p>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Verification Stage</span>
                              <p className="font-bold text-emerald-600 dark:text-emerald-400">{rx.status || 'Pending Review'}</p>
                            </div>
                          </div>

                          {/* Diopter Chart */}
                          {(rx.right_sph !== null || rx.left_sph !== null) && (
                            <div className="overflow-x-auto">
                              <table className="w-full text-center text-xs font-mono border border-slate-200 dark:border-white/10 rounded-lg overflow-hidden">
                                <thead className="bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 font-bold text-[10px] uppercase">
                                  <tr>
                                    <th className="p-1.5 border-r border-slate-200 dark:border-white/10">Eye</th>
                                    <th className="p-1.5 border-r border-slate-200 dark:border-white/10">SPH (Sphere)</th>
                                    <th className="p-1.5 border-r border-slate-200 dark:border-white/10">CYL (Cylinder)</th>
                                    <th className="p-1.5 border-r border-slate-200 dark:border-white/10">AXIS</th>
                                    <th className="p-1.5">ADD</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-white/10 text-xs">
                                  <tr>
                                    <td className="p-1.5 font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-white/[0.02] border-r border-slate-200 dark:border-white/10">OD (Right Eye)</td>
                                    <td className="p-1.5 border-r border-slate-200 dark:border-white/10">{rx.right_sph ?? '0.00'}</td>
                                    <td className="p-1.5 border-r border-slate-200 dark:border-white/10">{rx.right_cyl ?? '0.00'}</td>
                                    <td className="p-1.5 border-r border-slate-200 dark:border-white/10">{rx.right_axis ? `${rx.right_axis}°` : '—'}</td>
                                    <td className="p-1.5">{rx.right_add ? `+${rx.right_add}` : '—'}</td>
                                  </tr>
                                  <tr>
                                    <td className="p-1.5 font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-white/[0.02] border-r border-slate-200 dark:border-white/10">OS (Left Eye)</td>
                                    <td className="p-1.5 border-r border-slate-200 dark:border-white/10">{rx.left_sph ?? '0.00'}</td>
                                    <td className="p-1.5 border-r border-slate-200 dark:border-white/10">{rx.left_cyl ?? '0.00'}</td>
                                    <td className="p-1.5 border-r border-slate-200 dark:border-white/10">{rx.left_axis ? `${rx.left_axis}°` : '—'}</td>
                                    <td className="p-1.5">{rx.left_add ? `+${rx.left_add}` : '—'}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* Uploaded Rx File / Image Preview */}
                          {rxFileUrl && (
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <ImageIcon className="w-4 h-4 text-brand-cyan" />
                                  <span>Customer Uploaded Prescription Attachment</span>
                                </span>
                                <a 
                                  href={rxFileUrl} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="px-3 py-1 rounded-lg bg-brand-cyan hover:bg-cyan-400 text-slate-950 font-black text-xs inline-flex items-center gap-1 shadow-sm transition-all"
                                >
                                  <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
                                  <span>{isPdf ? 'Open PDF File' : 'View Full Image'}</span>
                                </a>
                              </div>

                              {!isPdf && (
                                <div className="max-w-xs rounded-xl overflow-hidden border border-slate-300 dark:border-white/10 shadow-sm mt-2">
                                  <img 
                                    src={rxFileUrl} 
                                    alt="Prescription Slip" 
                                    className="w-full max-h-48 object-contain bg-white cursor-pointer hover:scale-102 transition-transform"
                                    onClick={() => window.open(rxFileUrl, '_blank')}
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          {/* Optician Verification Action Buttons */}
                          <div className="flex items-center gap-2.5 pt-2 border-t border-slate-100 dark:border-white/5">
                            <button
                              onClick={() => handleVerifyPrescription(rx.id, 'Verified')}
                              disabled={actionLoading || rx.status === 'Verified'}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve Diopters for Lab Cutting</span>
                            </button>
                            <button
                              onClick={() => handleVerifyPrescription(rx.id, 'Needs Clarification')}
                              disabled={actionLoading || rx.status === 'Needs Clarification'}
                              className="px-3.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-700 dark:text-amber-300 hover:text-white border border-amber-500/40 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Flag: Needs Clarification</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Optical Pipeline Status Updater */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-4">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Truck className="w-4 h-4 text-brand-cyan" />
                  <span>Update Optical Pipeline Status</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 font-bold block mb-1">
                      New Status
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="glass-input rounded-xl px-3 py-2 text-xs w-full font-bold"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Order Confirmed">Order Confirmed</option>
                      <option value="Prescription Verified">Prescription Verified</option>
                      <option value="Lens Cutting">Lens Cutting (Lens Edging in Lab)</option>
                      <option value="Fitting">Optical Fitting (Assembly &amp; Alignment)</option>
                      <option value="Quality Check">Quality Checked</option>
                      <option value="Packed">Packed</option>
                      <option value="Shipped">Shipped (With Tracking Details)</option>
                      <option value="Out for Delivery">Out for Delivery</option>
                      <option value="Delivered">Delivered to Customer</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 font-bold block mb-1">
                      Status Note / Lab Log
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CR-39 lenses cut and aligned, dispatched via BlueDart"
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      className="glass-input rounded-xl px-3 py-2 text-xs w-full"
                    />
                  </div>
                </div>

                {/* Courier Shipping Logistics Assignment */}
                <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5" /> Courier Logistics &amp; Tracking Assignment
                    </span>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                      Customer receives tracking email upon dispatch
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="text-[11px] text-slate-500 font-medium block mb-1">Courier Partner</label>
                      <select 
                        value={courierName}
                        onChange={(e) => setCourierName(e.target.value)}
                        className="glass-input rounded-xl px-3 py-1.5 text-xs w-full"
                      >
                        <option value="Blue Dart">Blue Dart Express</option>
                        <option value="Delhivery">Delhivery Surface</option>
                        <option value="DTDC">DTDC Express</option>
                        <option value="India Post">India Post Speed Post</option>
                        <option value="Shadowfax">Shadowfax E-Com</option>
                        <option value="Store Dispatch">Store Direct Messenger</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-500 font-medium block mb-1">AWB Tracking Number</label>
                      <input 
                        type="text"
                        placeholder="e.g. BLD789456123"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        className="glass-input rounded-xl px-3 py-1.5 text-xs w-full font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-500 font-medium block mb-1">Tracking URL</label>
                      <input 
                        type="url"
                        placeholder="https://track.bluedart.com/..."
                        value={trackingUrl}
                        onChange={(e) => setTrackingUrl(e.target.value)}
                        className="glass-input rounded-xl px-3 py-1.5 text-xs w-full"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-500 font-medium block mb-1">Est. Delivery Date</label>
                      <input 
                        type="date"
                        value={estimatedDeliveryDate}
                        onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
                        className="glass-input rounded-xl px-3 py-1.5 text-xs w-full font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                  <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={isCustomerVisible}
                      onChange={(e) => setIsCustomerVisible(e.target.checked)}
                      className="rounded text-brand-cyan focus:ring-brand-cyan"
                    />
                    <span>Make note visible to customer on public tracking page</span>
                  </label>

                  <button
                    onClick={handleUpdateStatus}
                    disabled={actionLoading}
                    className="px-5 py-2.5 rounded-xl bg-brand-cyan hover:bg-cyan-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-cyan-glow transition-all cursor-pointer"
                  >
                    <Send className="w-4 h-4 stroke-[2.5]" />
                    <span>{actionLoading ? 'Updating...' : 'Save & Publish Status'}</span>
                  </button>
                </div>
              </div>

              {/* Status History Timeline */}
              {selectedOrder.status_history && selectedOrder.status_history.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2.5">
                    Audit Status History
                  </h3>
                  <div className="space-y-2 border-l-2 border-brand-cyan/40 ml-3 pl-4">
                    {selectedOrder.status_history.map((hist, i) => (
                      <div key={i} className="text-xs relative">
                        <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-brand-cyan border-2 border-white dark:border-neutral-900" />
                        <div className="font-bold text-slate-900 dark:text-white capitalize">
                          {hist.new_status || hist.status}
                        </div>
                        <div className="text-slate-500 text-[11px]">
                          {new Date(hist.created_at).toLocaleString('en-IN')}
                          {hist.staff_name && ` • by ${hist.staff_name}`}
                        </div>
                        {hist.note && (
                          <p className="text-slate-700 dark:text-slate-300 mt-0.5 bg-slate-100 dark:bg-white/5 p-1.5 rounded-lg">
                            {hist.note}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-white/5 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-3">
              <button
                onClick={() => setOrderToDelete(selectedOrder)}
                className="py-2.5 px-4 text-xs font-bold text-rose-600 dark:text-rose-300 hover:text-white bg-rose-500/15 hover:bg-rose-600 rounded-xl flex items-center gap-1.5 border border-rose-500/40 transition-all cursor-pointer shadow-xs"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Order &amp; Invoices</span>
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-900 dark:text-white font-bold text-xs flex items-center gap-1.5 border border-slate-300 dark:border-white/20 transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Order Slip</span>
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ORDER DELETE CONFIRMATION MODAL */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-md w-full bg-slate-900 border border-white/20 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <Trash2 className="w-5 h-5" />
                <span>Delete Order #{orderToDelete.order_number}</span>
              </div>
              <button
                onClick={() => setOrderToDelete(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              How would you like to handle the items associated with Order <strong className="text-white font-mono">#{orderToDelete.order_number}</strong>?
            </p>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                disabled={isDeletingOrder}
                onClick={() => handleConfirmDeleteOrder(1)}
                className="w-full py-3 px-4 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Add Back to Inventory Stock &amp; Delete</span>
              </button>

              <button
                type="button"
                disabled={isDeletingOrder}
                onClick={() => handleConfirmDeleteOrder(0)}
                className="w-full py-3 px-4 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Permanently (Do Not Alter Stock)</span>
              </button>

              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                className="w-full py-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
