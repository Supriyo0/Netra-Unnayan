import React, { useState, useEffect } from 'react';
import { 
  Package, Search, Filter, Eye, CheckCircle2, AlertTriangle, 
  Clock, Truck, DollarSign, RefreshCw, X, FileText, ChevronRight,
  Printer, Send, ShieldAlert, ArrowUpDown, Trash2, ExternalLink,
  Image as ImageIcon, MapPin, User, Phone, Mail, History,
  ShieldCheck, ShoppingBag, Sparkles, Scissors, Glasses, Check, Store, ArrowRight,
  MessageCircle
} from 'lucide-react';
import api from '../../api/client';
import { InvoiceModal } from '../../components/common/InvoiceModal';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeModalTab, setActiveModalTab] = useState('overview'); // 'overview' | 'items' | 'dispatch' | 'prescription' | 'timeline'
  const [invoiceModalData, setInvoiceModalData] = useState(null);
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
  const [storeSettings, setStoreSettings] = useState({ upi_id: '', upi_qr_image: '' });

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

  useEffect(() => {
    api.get('/admin/settings.php').then(res => {
      if (res.success && res.data) {
        setStoreSettings({
          upi_id: res.data.upi_id || '',
          upi_qr_image: res.data.upi_qr_image || ''
        });
      }
    }).catch(() => {});
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/orders.php', {
        params: { status: statusFilter !== 'all' ? statusFilter : undefined, search: search || undefined }
      });
      let orderData = [];
      if (Array.isArray(res)) {
        orderData = res;
      } else if (Array.isArray(res?.data)) {
        orderData = res.data;
      } else if (Array.isArray(res?.data?.orders)) {
        orderData = res.data.orders;
      } else if (Array.isArray(res?.orders)) {
        orderData = res.orders;
      } else if (Array.isArray(res?.data?.data)) {
        orderData = res.data.data;
      }
      setOrders(orderData);
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
      const isSuccess = res.success || res.data?.success || (res.id && res.order_number);
      let orderPayload = null;
      if (res?.data?.order) orderPayload = res.data.order;
      else if (res?.data && typeof res.data === 'object' && !Array.isArray(res.data) && (res.data.id || res.data.order_number)) orderPayload = res.data;
      else if (res?.order) orderPayload = res.order;
      else if (res && typeof res === 'object' && !Array.isArray(res) && (res.id || res.order_number)) orderPayload = res;

      if (orderPayload) {
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

  const handleApproveCancellation = async () => {
    if (!selectedOrder) return;
    if (!confirm(`Are you sure you want to approve cancellation for Order #${selectedOrder.order_number}? This will restore deducted stock back to inventory and initiate a refund if paid.`)) return;

    try {
      setActionLoading(true);
      const res = await api.post('/admin/orders.php', {
        action: 'approve_cancellation',
        order_id: selectedOrder.id,
        new_status: 'Cancelled',
        cancel_reason: selectedOrder.cancel_reason || 'Cancellation approved by Store Admin'
      });
      if (res.success || res.data?.success) {
        setActionMessage('Order cancelled and stock restored to catalog inventory.');
        await openOrderDetail(selectedOrder.id);
        fetchOrders();
      } else {
        alert(res.message || 'Failed to cancel order');
      }
    } catch (err) {
      alert(err.message || 'Error cancelling order');
    } finally {
      setActionLoading(false);
    }
  };

  const [rejectReasonModalOpen, setRejectReasonModalOpen] = useState(false);
  const [rejectionNoteInput, setRejectionNoteInput] = useState('Customized optical lenses have already commenced fabrication and lens cutting in our lab.');

  const handleConfirmRejectCancellation = async () => {
    if (!selectedOrder) return;
    if (!rejectionNoteInput.trim()) {
      alert('Please provide an explanation note for declining the cancellation request.');
      return;
    }

    try {
      setActionLoading(true);
      const res = await api.post('/admin/orders.php', {
        action: 'reject_cancellation',
        order_id: selectedOrder.id,
        new_status: 'Order Confirmed',
        rejection_reason: rejectionNoteInput.trim()
      });
      if (res.success || res.data?.success) {
        setActionMessage('Cancellation request rejected and customer notified via email & tracker.');
        setRejectReasonModalOpen(false);
        await openOrderDetail(selectedOrder.id);
        fetchOrders();
      } else {
        alert(res.message || 'Failed to reject cancellation');
      }
    } catch (err) {
      alert(err.message || 'Error rejecting cancellation');
    } finally {
      setActionLoading(false);
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

  const handleQuickStatusTransition = async (targetStatus, note) => {
    if (!selectedOrder) return;
    try {
      setActionLoading(true);
      setActionMessage('');
      const res = await api.post('/admin/orders.php', {
        action: 'update_status',
        order_id: selectedOrder.id,
        new_status: targetStatus,
        status: targetStatus,
        note: note || `Order pipeline advanced to ${targetStatus}`,
        is_customer_visible: 1,
        courier_name: courierName || selectedOrder.courier_name,
        tracking_number: trackingNumber || selectedOrder.tracking_number,
        tracking_url: trackingUrl || selectedOrder.tracking_url,
        estimated_delivery_date: estimatedDeliveryDate || selectedOrder.estimated_delivery_date
      });
      if (res.success || res.data?.success) {
        setActionMessage(`Order pipeline advanced to "${targetStatus}"!`);
        await openOrderDetail(selectedOrder.id);
        fetchOrders();
      } else {
        alert(res.message || 'Failed to update stage');
      }
    } catch (err) {
      alert(err.message || 'Error updating stage');
    } finally {
      setActionLoading(false);
    }
  };


  const [clarificationModalOpen, setClarificationModalOpen] = useState(false);
  const [clarificationRxId, setClarificationRxId] = useState(null);
  const [clarificationNote, setClarificationNote] = useState('Prescription slip photo is unclear or missing cylinder axis / PD values. Please re-upload a clear slip or message us on WhatsApp.');

  const handleVerifyPrescription = async (prescriptionId, statusVal, customNote = '') => {
    if (!selectedOrder) return;
    try {
      setActionLoading(true);
      const targetRxId = prescriptionId || selectedOrder.prescription?.id || selectedOrder.prescriptions?.[0]?.id || 0;
      const res = await api.post('/admin/orders.php', {
        action: 'verify_prescription',
        order_id: selectedOrder.id,
        prescription_id: targetRxId,
        prescription_status: statusVal,
        verification_status: statusVal,
        note: customNote || (statusVal === 'verified' || statusVal === 'Verified' || statusVal === 'Approved' ? 'Prescription verified by clinical optician' : 'Rx needs customer clarification')
      });
      if (res.success || res.data?.success) {
        setClarificationModalOpen(false);
        await openOrderDetail(selectedOrder.id);
        fetchOrders();
        setActionMessage(statusVal === 'Needs Clarification' 
          ? 'Prescription flagged as Needs Clarification. Customer notification dispatched!' 
          : 'Prescription diopters verified & approved for lab edging!'
        );
      } else {
        alert(res.message || 'Failed to update prescription status');
      }
    } catch (err) {
      alert(err.message || 'Failed to update prescription status');
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

  const handleOpenInvoice = (order) => {
    if (!order) return;
    const rawOrderItems = order.items || order.order_items || order.preview_items || [];
    const invData = {
      invoiceNumber: order.invoice_number || (order.order_number ? `NU/INV/${order.order_number.replace('NU-', '')}` : `NU/INV/${new Date().getFullYear()}/${order.id}`),
      orderNumber: order.order_number || `NU-ORD-${order.id}`,
      invoiceDate: order.created_at ? new Date(order.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-GB'),
      type: order.order_type === 'POS_OFFLINE' ? 'POS' : 'ORDER',
      isGstInvoice: false,
      status: order.order_status || 'Paid & Delivered',
      paymentMode: order.payment_mode || order.payment_method || 'UPI',
      paymentStatus: order.payment_status || 'Paid',
      customerName: order.customer_name || 'Walk-in Customer',
      customerPhone: order.customer_phone || '',
      customerEmail: order.customer_email || '',
      customerAddress: order.shipping_address_line1 
        ? `${order.shipping_address_line1}${order.shipping_city ? `, ${order.shipping_city}` : ''}${order.shipping_state ? `, ${order.shipping_state}` : ''} ${order.shipping_pincode ? `— ${order.shipping_pincode}` : ''}`
        : (order.shipping_address || 'In-store Counter Pickup (Digha Flagship)'),
      items: rawOrderItems,
      subtotal: Number(order.subtotal || order.total_amount || 0),
      discountAmount: Number(order.discount_amount || 0),
      shippingFee: Number(order.shipping_fee || 0),
      taxAmount: Number(order.tax_amount || 0),
      totalAmount: Number(order.total_amount || order.subtotal || 0),
      prescription: order.prescription || (order.prescriptions && order.prescriptions[0]) || null,
      notes: order.notes || 'Thank you for choosing Netra Unnayan for your vision care!'
    };
    setInvoiceModalData(invData);
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
                    ? 'bg-brand-cyan text-slate-950 shadow-md font-black ring-1 ring-cyan-500'
                    : 'bg-white dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 border border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-neutral-700 shadow-xs'
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
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${getOrderStatusBadge(currentStatus)}`}>
                            {currentStatus.replace('_', ' ')}
                          </span>
                          {order.prescription_status === 'Needs Clarification' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-600 text-white uppercase tracking-wider animate-pulse shadow-xs">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              <span>Rx Clarification</span>
                            </span>
                          )}
                          {order.prescription_status === 'Approved' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/50">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>Rx Approved</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {orderDate}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenInvoice(order)}
                            className="p-2 rounded-xl bg-teal-500/15 hover:bg-teal-600 text-teal-700 dark:text-teal-300 hover:text-white border border-teal-500/30 transition-all cursor-pointer shadow-xs"
                            title="Print Official A4 Tax / POS Invoice"
                          >
                            <Printer className="w-4 h-4 stroke-[2.2]" />
                          </button>
                          <button
                            onClick={() => openOrderDetail(order.id)}
                            className="px-3 py-2 rounded-xl bg-brand-cyan hover:bg-cyan-400 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
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
      {selectedOrder && (() => {
        const rxList = selectedOrder.prescriptions || (selectedOrder.prescription ? [selectedOrder.prescription] : []);
        const rawItems = selectedOrder.items || selectedOrder.order_items || selectedOrder.preview_items || [];
        const itemsList = rawItems.length > 0 
          ? rawItems 
          : (selectedOrder.total_amount ? [
              {
                id: 'auto-1',
                product_name: selectedOrder.notes && selectedOrder.notes.includes('Eyewear') ? selectedOrder.notes : 'Optical Eyewear Frame & Precision Optics Package',
                product_sku: selectedOrder.order_number || 'NU-OPT-001',
                unit_price: Number(selectedOrder.total_amount || 0),
                quantity: 1,
                lens_type: selectedOrder.prescription ? 'Single Vision Prescription Optics' : 'Standard Optical Eyewear',
                total_price: Number(selectedOrder.total_amount || 0),
                image_url: '/logo_symbol.png'
              }
            ] : []);
        const historyList = selectedOrder.status_history || [];

        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <div className="glass-card bg-white dark:bg-neutral-900 rounded-t-[28px] sm:rounded-3xl w-full max-w-4xl h-[92vh] sm:h-auto sm:max-h-[90vh] flex flex-col shadow-2xl border-t sm:border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between shrink-0 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                    <h2 className="text-base sm:text-xl font-extrabold font-heading text-slate-900 dark:text-white truncate">
                      Order #{selectedOrder.order_number || selectedOrder.id}
                    </h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-extrabold uppercase tracking-wider ${getOrderStatusBadge(selectedOrder.order_status || selectedOrder.status)}`}>
                      {(selectedOrder.order_status || selectedOrder.status || 'Pending').replace('_', ' ')}
                    </span>
                    {selectedOrder.prescription_status === 'Needs Clarification' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider bg-rose-600 text-white flex items-center gap-1 shadow-sm animate-pulse border border-rose-700">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Prescription Clarification Required</span>
                      </span>
                    )}
                    {selectedOrder.prescription_status === 'Approved' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-emerald-600 text-white flex items-center gap-1 shadow-sm">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Rx Approved</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Placed on {selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleString('en-IN') : 'Recent'}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Notification alert */}
              {actionMessage && (
                <div className="mx-4 mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-600/50 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm shrink-0">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>{actionMessage}</span>
                </div>
              )}

              {/* Mobile-Friendly Navigation Tabs */}
              <div className="px-3 sm:px-5 pt-2 sm:pt-3 border-b border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] shrink-0 overflow-x-auto">
                <div className="flex items-center gap-1.5 min-w-max pb-2">
                  <button
                    type="button"
                    onClick={() => setActiveModalTab('overview')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      activeModalTab === 'overview'
                        ? 'bg-brand-cyan text-slate-950 shadow-sm font-black'
                        : 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Overview</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveModalTab('items')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      activeModalTab === 'items'
                        ? 'bg-brand-cyan text-slate-950 shadow-sm font-black'
                        : 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10'
                    }`}
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>Items</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 dark:bg-white/10">
                      {itemsList.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveModalTab('logistics')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      activeModalTab === 'logistics'
                        ? 'bg-brand-cyan text-slate-950 shadow-sm font-black'
                        : 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Logistics &amp; Status</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveModalTab('prescription')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      activeModalTab === 'prescription'
                        ? 'bg-brand-cyan text-slate-950 shadow-sm font-black'
                        : 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Prescription</span>
                    {rxList.length > 0 && (
                      selectedOrder.prescription_status === 'Needs Clarification' ? (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-rose-600 text-white animate-pulse flex items-center gap-0.5 shadow-xs">
                          <AlertTriangle className="w-2.5 h-2.5" /> Flagged
                        </span>
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      )
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveModalTab('timeline')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      activeModalTab === 'timeline'
                        ? 'bg-brand-cyan text-slate-950 shadow-sm font-black'
                        : 'bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10'
                    }`}
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Timeline</span>
                    {historyList.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 dark:bg-white/10">
                        {historyList.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Scrollable Content Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                
                {/* ================= TAB 1: OVERVIEW ================= */}
                {activeModalTab === 'overview' && (
                  <div className="space-y-4">
                    {/* Top Summary Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                      {/* Customer Details */}
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2">
                        <div className="text-xs font-black text-slate-700 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-sky-600 dark:text-brand-cyan" />
                          <span>Customer Details</span>
                        </div>
                        <div className="font-extrabold text-slate-900 dark:text-white text-sm">
                          {selectedOrder.customer_name || 'Walk-in Customer'}
                        </div>
                        {selectedOrder.customer_phone && (
                          <div className="text-xs font-mono font-bold text-sky-700 dark:text-brand-cyan flex items-center gap-1">
                            <Phone className="w-3 h-3 text-sky-700 dark:text-brand-cyan" />
                            <a href={`tel:${selectedOrder.customer_phone}`} className="hover:underline">
                              {selectedOrder.customer_phone}
                            </a>
                          </div>
                        )}
                        {selectedOrder.customer_email && (
                          <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1 truncate font-medium">
                            <Mail className="w-3 h-3 text-slate-500" />
                            <span>{selectedOrder.customer_email}</span>
                          </div>
                        )}
                      </div>

                      {/* Shipping Address */}
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2">
                        <div className="text-xs font-black text-slate-700 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-sky-600 dark:text-brand-cyan" />
                          <span>Shipping Address</span>
                        </div>
                        <div className="text-xs text-slate-800 dark:text-slate-300 leading-relaxed font-medium">
                          {selectedOrder.shipping_address_line1 ? (
                            <>
                              <p className="font-semibold text-slate-900 dark:text-white">{selectedOrder.shipping_address_line1}</p>
                              <p>{selectedOrder.shipping_city}, {selectedOrder.shipping_state} — {selectedOrder.shipping_pincode}</p>
                            </>
                          ) : (
                            <p>{selectedOrder.shipping_address || 'In-store Counter Pickup (Digha Flagship)'}</p>
                          )}
                        </div>
                      </div>

                      {/* Payment & Financials */}
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2">
                        <div className="text-xs font-black text-slate-700 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-sky-600 dark:text-brand-cyan" />
                          <span>Financial Summary</span>
                        </div>
                        <div className="text-2xl font-black text-sky-700 dark:text-brand-cyan font-mono">
                          ₹{Number(selectedOrder.total_amount || selectedOrder.subtotal || 0).toLocaleString('en-IN')}
                        </div>
                        <div className="text-xs text-slate-700 dark:text-slate-400 flex items-center justify-between pt-1 font-medium">
                          <span>Mode: <strong className="uppercase font-mono text-slate-900 dark:text-slate-200">{selectedOrder.payment_mode || selectedOrder.payment_method || 'UPI'}</strong></span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${getPaymentStatusBadge(selectedOrder.payment_status)}`}>
                            {selectedOrder.payment_status || 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* CANCELLATION REQUEST / REASON CALLOUT */}
                    {(selectedOrder.cancel_reason || selectedOrder.order_status === 'Cancelled') && (
                      <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-extrabold uppercase tracking-wider text-xs">
                            <ShieldAlert className="w-4 h-4" />
                            <span>Customer Cancellation Request</span>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                            {selectedOrder.order_status}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-white/70 dark:bg-black/30 border border-rose-500/20 text-slate-800 dark:text-rose-200 leading-relaxed font-medium">
                          <span className="text-slate-500 text-[10px] uppercase font-bold block mb-0.5">Reason provided:</span>
                          "{selectedOrder.cancel_reason || 'Customer requested order cancellation'}"
                        </div>

                        {selectedOrder.order_status !== 'Cancelled' && (
                          <div className="flex flex-wrap items-center gap-2.5 pt-1">
                            <button
                              onClick={handleApproveCancellation}
                              disabled={actionLoading}
                              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve Cancellation (Restore Stock &amp; Refund)</span>
                            </button>
                            <button
                              onClick={() => setRejectReasonModalOpen(true)}
                              disabled={actionLoading}
                              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Reject Cancellation (Provide Note)</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Quick navigation preview cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div 
                        onClick={() => setActiveModalTab('items')}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 hover:border-brand-cyan/40 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between cursor-pointer group transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-brand-cyan/15 text-brand-cyan flex items-center justify-center font-bold">
                            <Package className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-brand-cyan transition-colors">
                              {itemsList.length} Item{itemsList.length !== 1 ? 's' : ''} in this order
                            </p>
                            <p className="text-[11px] text-slate-400">View frame details, lenses &amp; pricing</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>

                      <div 
                        onClick={() => setActiveModalTab('logistics')}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 hover:border-brand-cyan/40 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between cursor-pointer group transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-brand-cyan/15 text-brand-cyan flex items-center justify-center font-bold">
                            <Truck className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-brand-cyan transition-colors">
                              Logistics &amp; Courier Status
                            </p>
                            <p className="text-[11px] text-slate-400">Update pipeline status, AWB &amp; tracking</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                )}

                {/* ================= TAB 2: ITEMS & SPECS ================= */}
                {activeModalTab === 'items' && (
                  <div className="space-y-4">
                    {/* Mobile Card Layout (Visible on Small Screens) */}
                    <div className="block sm:hidden space-y-3">
                      {itemsList.map((item, idx) => (
                        <div 
                          key={item.id || idx}
                          className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                                {item.product_name || item.name}
                              </h4>
                              <span className="text-[10px] text-slate-400 font-mono">
                                SKU: {item.product_sku || item.sku || 'NU-OPT-001'}
                              </span>
                            </div>
                            <span className="text-xs font-extrabold font-mono text-slate-900 dark:text-white">
                              ₹{Number(item.total_price || (item.unit_price || item.price || 0) * (item.quantity || 1)).toLocaleString('en-IN')}
                            </span>
                          </div>

                          {(item.lens_type || item.frame_size || item.frame_color) && (
                            <div className="p-2 rounded-xl bg-white dark:bg-black/20 border border-slate-200/60 dark:border-white/5 text-[11px] space-y-1">
                              {item.lens_type && (
                                <p className="text-teal-600 dark:text-teal-300 font-semibold">
                                  Lens: {item.lens_type}
                                </p>
                              )}
                              {(item.frame_size || item.frame_color) && (
                                <p className="text-slate-400 font-mono text-[10px]">
                                  {item.frame_size ? `Size: ${item.frame_size} ` : ''}
                                  {item.frame_color ? `· Color: ${item.frame_color}` : ''}
                                </p>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-200/50 dark:border-white/5 font-mono">
                            <span>Rate: ₹{Number(item.unit_price || item.price || 0).toLocaleString('en-IN')}</span>
                            <span>Qty: <strong className="text-slate-900 dark:text-white">{item.quantity || 1}</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table Layout (Visible on sm and up) */}
                    <div className="hidden sm:block border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xs">
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
                          {itemsList.map((item, idx) => (
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

                    {/* Financial Summary */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2 max-w-sm ml-auto text-xs">
                      <div className="flex justify-between text-slate-500">
                        <span>Items Subtotal:</span>
                        <span className="font-mono">₹{Number(selectedOrder.subtotal || selectedOrder.total_amount || 0).toLocaleString('en-IN')}</span>
                      </div>
                      {Number(selectedOrder.discount_amount) > 0 && (
                        <div className="flex justify-between text-emerald-600 font-semibold">
                          <span>Discount Applied:</span>
                          <span className="font-mono">-₹{Number(selectedOrder.discount_amount).toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-500">
                        <span>Shipping / Courier:</span>
                        <span className="font-mono">{Number(selectedOrder.shipping_fee) > 0 ? `₹${selectedOrder.shipping_fee}` : 'FREE'}</span>
                      </div>
                      <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex justify-between font-extrabold text-slate-900 dark:text-white text-sm">
                        <span>Grand Total:</span>
                        <span className="font-mono text-brand-cyan">₹{Number(selectedOrder.total_amount || selectedOrder.subtotal || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ================= TAB 3: LOGISTICS & PIPELINE ================= */}
                {activeModalTab === 'logistics' && (
                  <div className="space-y-4">
                    <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-4">
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
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium hidden sm:inline">
                            Customer receives tracking notification upon dispatch
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
                          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-brand-cyan hover:bg-cyan-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-cyan-glow transition-all cursor-pointer"
                        >
                          <Send className="w-4 h-4 stroke-[2.5]" />
                          <span>{actionLoading ? 'Updating...' : 'Save & Publish Status'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ================= TAB 4: PRESCRIPTION & SLIP ================= */}
                {activeModalTab === 'prescription' && (
                  <div className="space-y-4">
                    {rxList.length === 0 ? (
                      <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2">
                        <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                        <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300">No Prescription Attached</h4>
                        <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                          This order contains non-prescription frames or optical accessories that do not require diopter verification.
                        </p>
                      </div>
                    ) : (
                      rxList.map((rx, idx) => {
                        const rxFileUrl = rx.rx_image_url || rx.prescription_file_url || rx.file_url || rx.image_url;
                        const isPdf = rxFileUrl && rxFileUrl.toLowerCase().includes('.pdf');

                        return (
                          <div key={idx} className="p-4 rounded-2xl bg-cyan-50/50 dark:bg-brand-cyan/[0.05] border border-cyan-200 dark:border-brand-cyan/25 space-y-4">
                            <div className="flex items-center justify-between">
                              <h3 className="text-xs font-bold text-cyan-950 dark:text-cyan-200 uppercase tracking-wider flex items-center gap-2">
                                <FileText className="w-4 h-4 text-brand-cyan" />
                                <span>Prescription Diopters &amp; Slip</span>
                              </h3>
                              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-cyan-100 dark:bg-brand-cyan/20 text-cyan-900 dark:text-cyan-200 border border-cyan-300 dark:border-brand-cyan/40 uppercase">
                                Stage: {rx.status || 'Pending Review'}
                              </span>
                            </div>

                            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-white/10 space-y-3.5 shadow-sm">
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
                                        <th className="p-1.5 border-r border-slate-200 dark:border-white/10">SPH</th>
                                        <th className="p-1.5 border-r border-slate-200 dark:border-white/10">CYL</th>
                                        <th className="p-1.5 border-r border-slate-200 dark:border-white/10">AXIS</th>
                                        <th className="p-1.5">ADD</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-white/10 text-xs">
                                      <tr>
                                        <td className="p-1.5 font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-white/[0.02] border-r border-slate-200 dark:border-white/10">OD (Right)</td>
                                        <td className="p-1.5 border-r border-slate-200 dark:border-white/10">{rx.right_sph ?? '0.00'}</td>
                                        <td className="p-1.5 border-r border-slate-200 dark:border-white/10">{rx.right_cyl ?? '0.00'}</td>
                                        <td className="p-1.5 border-r border-slate-200 dark:border-white/10">{rx.right_axis ? `${rx.right_axis}°` : '—'}</td>
                                        <td className="p-1.5">{rx.right_add ? `+${rx.right_add}` : '—'}</td>
                                      </tr>
                                      <tr>
                                        <td className="p-1.5 font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-white/[0.02] border-r border-slate-200 dark:border-white/10">OS (Left)</td>
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
                                      <span>Uploaded Prescription Attachment</span>
                                    </span>
                                    <a 
                                      href={rxFileUrl} 
                                      target="_blank" 
                                      rel="noreferrer"
                                      className="px-3 py-1 rounded-lg bg-brand-cyan hover:bg-cyan-400 text-slate-950 font-black text-xs inline-flex items-center gap-1 shadow-sm transition-all"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
                                      <span>{isPdf ? 'Open PDF' : 'View Attachment'}</span>
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

                              {/* Existing Optometrist Lab Notes if any */}
                              {(rx.admin_notes || selectedOrder.prescription_status === 'Needs Clarification') && (
                                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 text-xs space-y-1">
                                  <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase block">
                                    Clinical Optometrist Note:
                                  </span>
                                  <p className="text-amber-900 dark:text-amber-200 font-semibold leading-relaxed">
                                    {rx.admin_notes || 'Prescription details require clarification before laboratory lens cutting.'}
                                  </p>
                                </div>
                              )}

                              {/* Optician Verification Action Buttons */}
                              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                                <button
                                  onClick={() => handleVerifyPrescription(rx.id, 'Approved')}
                                  disabled={actionLoading || rx.status === 'Approved'}
                                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Approve Diopters for Lab</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setClarificationRxId(rx.id || selectedOrder.prescription?.id || 0);
                                    if (rx.admin_notes) {
                                      setClarificationNote(rx.admin_notes);
                                    }
                                    setClarificationModalOpen(true);
                                  }}
                                  disabled={actionLoading}
                                  className="px-3.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-700 dark:text-amber-300 hover:text-white border border-amber-500/40 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span>{rx.status === 'Needs Clarification' || selectedOrder.prescription_status === 'Needs Clarification' ? 'Update Clarification Flag' : 'Flag: Needs Clarification'}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* ================= TAB 5: TIMELINE & OPTICAL PIPELINE ================= */}
                {activeModalTab === 'timeline' && (() => {
                  const isPosOrder = selectedOrder.order_type === 'POS_OFFLINE' || selectedOrder.order_type === 'POS' || (selectedOrder.shipping_address && selectedOrder.shipping_address.toLowerCase().includes('counter'));
                  const currentStatus = (selectedOrder.order_status || selectedOrder.status || 'Pending').toLowerCase();
                  const isCancelled = currentStatus.includes('cancel');

                  // Online order stages
                  const onlineStages = [
                    {
                      id: 'pending',
                      label: 'Order Placed',
                      subtitle: 'Customer completed online checkout',
                      icon: ShoppingBag,
                      stageNum: 1,
                      isMatch: (s) => true, // Always completed once placed
                    },
                    {
                      id: 'confirmed',
                      label: 'Payment Confirmed',
                      subtitle: selectedOrder.payment_mode === 'COD' ? 'Cash on Delivery verified by desk' : 'Prepaid digital transaction verified',
                      icon: CheckCircle2,
                      stageNum: 2,
                      isMatch: (s) => s.includes('confirm') || s.includes('prescription') || s.includes('rx') || s.includes('cutting') || s.includes('lens') || s.includes('fitting') || s.includes('quality') || s.includes('qc') || s.includes('ship') || s.includes('deliver') || s.includes('complete'),
                      actionTarget: 'Prescription Verified',
                      actionLabel: 'Mark Rx Verified'
                    },
                    {
                      id: 'prescription_verified',
                      label: 'Prescription Audited',
                      subtitle: selectedOrder.prescription ? 'Diopters & Pupillary Distance (PD) approved for optical lab' : 'Non-prescription / plano optical verification complete',
                      icon: FileText,
                      stageNum: 3,
                      isMatch: (s) => s.includes('prescription') || s.includes('rx') || s.includes('cutting') || s.includes('lens') || s.includes('fitting') || s.includes('quality') || s.includes('qc') || s.includes('ship') || s.includes('deliver') || s.includes('complete'),
                      actionTarget: 'Lens Cutting',
                      actionLabel: 'Start Lens Cutting in Lab'
                    },
                    {
                      id: 'lens_cutting',
                      label: 'Lens Cutting & Edging',
                      subtitle: 'Computerized robotic lens edging and multi-coat application',
                      icon: Scissors,
                      stageNum: 4,
                      isMatch: (s) => s.includes('cutting') || s.includes('lens') || s.includes('fitting') || s.includes('quality') || s.includes('qc') || s.includes('ship') || s.includes('deliver') || s.includes('complete'),
                      actionTarget: 'Fitting',
                      actionLabel: 'Move to Frame Fitting'
                    },
                    {
                      id: 'optical_fitting',
                      label: 'Optical Assembly & Fitting',
                      subtitle: 'Precision mounting of optical lenses into chosen designer frame',
                      icon: Glasses,
                      stageNum: 5,
                      isMatch: (s) => s.includes('fitting') || s.includes('assembly') || s.includes('quality') || s.includes('qc') || s.includes('ship') || s.includes('deliver') || s.includes('complete'),
                      actionTarget: 'Quality Check',
                      actionLabel: 'Pass 5-Point QA Check'
                    },
                    {
                      id: 'quality_checked',
                      label: 'Quality Assurance (QA Passed)',
                      subtitle: 'Frame alignment, power calibration & optical axis inspection verified',
                      icon: ShieldCheck,
                      stageNum: 6,
                      isMatch: (s) => s.includes('quality') || s.includes('qc') || s.includes('ship') || s.includes('deliver') || s.includes('complete'),
                      actionTarget: 'Shipped',
                      actionLabel: 'Dispatch & Assign AWB'
                    },
                    {
                      id: 'shipped',
                      label: 'Dispatched via Courier',
                      subtitle: selectedOrder.tracking_number 
                        ? `${selectedOrder.courier_name || 'Express Logistics'} · AWB: ${selectedOrder.tracking_number}`
                        : 'Packed in luxury hard case and handed over to courier partner',
                      icon: Truck,
                      stageNum: 7,
                      isMatch: (s) => s.includes('ship') || s.includes('deliver') || s.includes('complete'),
                      actionTarget: 'Delivered',
                      actionLabel: 'Mark as Delivered'
                    },
                    {
                      id: 'delivered',
                      label: 'Delivered to Customer',
                      subtitle: 'Eyewear received by customer; 1-year optical warranty activated',
                      icon: Sparkles,
                      stageNum: 8,
                      isMatch: (s) => s.includes('deliver') || s.includes('complete')
                    }
                  ];

                  // POS in-store stages
                  const posStages = [
                    {
                      label: 'POS Counter Sale Created',
                      subtitle: `Walk-in order processed by ${selectedOrder.cashier || 'Sagar Shaoo'} at Digha Flagship counter`,
                      icon: Store,
                      isMatch: () => true
                    },
                    {
                      label: 'Payment Received & Verified',
                      subtitle: `Paid via ${selectedOrder.payment_mode || selectedOrder.payment_method || 'UPI'} · ₹${Number(selectedOrder.total_amount || 0).toLocaleString('en-IN')}`,
                      icon: CheckCircle2,
                      isMatch: () => (selectedOrder.payment_status || 'Paid').toLowerCase().includes('paid')
                    },
                    {
                      label: 'Instant Counter Dispensing',
                      subtitle: 'Eyewear custom fitted, adjusted and handed directly to customer',
                      icon: Glasses,
                      isMatch: () => true
                    },
                    {
                      label: 'Tax Invoice & Verification QR Issued',
                      subtitle: `Official invoice #${selectedOrder.invoice_number || 'NU/INV/2026/' + selectedOrder.id} generated with online scannable QR`,
                      icon: Printer,
                      isMatch: () => true
                    },
                    {
                      label: '1-Year Optical Warranty Active',
                      subtitle: 'Comprehensive 1-year guarantee on frame hinge integrity & lens coatings',
                      icon: ShieldCheck,
                      isMatch: () => true
                    }
                  ];

                  const activeStages = isPosOrder ? posStages : onlineStages;

                  return (
                    <div className="space-y-4">
                      
                      {/* Channel Header Banner */}
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                            isPosOrder 
                              ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40' 
                              : 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/40'
                          }`}>
                            {isPosOrder ? <Store className="w-5 h-5" /> : <ShoppingBag className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-xs text-slate-900 dark:text-white font-heading">
                                {isPosOrder ? 'POS Billing Counter Order' : 'Online E-Commerce Order'}
                              </span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-bold">
                                {selectedOrder.order_number}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {isPosOrder 
                                ? 'Walk-in Counter Dispensing · Netra Unnayan Flagship Store, Digha' 
                                : `Direct Doorstep Delivery to ${selectedOrder.shipping_city || selectedOrder.customer_name}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${getOrderStatusBadge(selectedOrder.order_status || selectedOrder.status)}`}>
                            {(selectedOrder.order_status || selectedOrder.status || 'Pending').replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      {/* Cancelled Alert Banner */}
                      {isCancelled && (
                        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-700 dark:text-rose-300 text-xs font-medium">
                          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500" />
                          <div>
                            <span className="font-bold block text-slate-900 dark:text-white">Order has been Cancelled</span>
                            <span>{selectedOrder.cancel_reason || 'Cancellation requested and finalized.'}</span>
                          </div>
                        </div>
                      )}

                      {/* Visual Optical Fulfillment Journey Pipeline */}
                      <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-white/10 pb-2.5">
                          <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-brand-cyan" />
                            <span>{isPosOrder ? 'POS Counter Handover Journey' : 'Optical Lab & Fulfillment Pipeline'}</span>
                          </h3>
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                            {isPosOrder ? 'Instant In-Store Dispensing' : 'Stage-by-Stage Precision Optics Flow'}
                          </span>
                        </div>

                        <div className="relative pl-6 sm:pl-8 space-y-5 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-white/10">
                          {activeStages.map((stg, idx) => {
                            const isDone = stg.isMatch(currentStatus);
                            const IconComp = stg.icon;

                            // Determine if this is the current active/in-progress milestone
                            const isNextUpcoming = !isDone && (idx === 0 || activeStages[idx - 1].isMatch(currentStatus));
                            const isCurrentActive = isDone && (idx === activeStages.length - 1 || !activeStages[idx + 1].isMatch(currentStatus));

                            return (
                              <div key={idx} className="relative group">
                                
                                {/* Step Indicator Node */}
                                <div className={`absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-all ${
                                  isDone 
                                    ? 'bg-emerald-600 text-white shadow-sm ring-4 ring-emerald-500/20' 
                                    : isNextUpcoming 
                                    ? 'bg-amber-500 text-slate-950 font-bold ring-4 ring-amber-500/20 animate-pulse' 
                                    : 'bg-slate-200 dark:bg-white/10 text-slate-400 dark:text-slate-500 border border-slate-300 dark:border-white/10'
                                }`}>
                                  {isDone ? (
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  ) : (
                                    <IconComp className="w-3 h-3" />
                                  )}
                                </div>

                                {/* Step Content Card */}
                                <div className={`p-3.5 rounded-xl border transition-all ${
                                  isCurrentActive
                                    ? 'bg-white dark:bg-white/10 border-brand-cyan/40 shadow-sm'
                                    : isDone
                                    ? 'bg-white/60 dark:bg-white/[0.03] border-slate-200/80 dark:border-white/5'
                                    : 'bg-slate-100/50 dark:bg-white/[0.01] border-slate-200/40 dark:border-white/5 opacity-70'
                                }`}>
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`font-bold text-xs ${isDone ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                                        {stg.label}
                                      </span>
                                      {isCurrentActive && !isCancelled && (
                                        <span className="px-2 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider bg-brand-cyan text-slate-950 shadow-xs">
                                          Current Stage
                                        </span>
                                      )}
                                      {isDone && !isCurrentActive && (
                                        <span className="text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                          <Check className="w-3 h-3" /> Completed
                                        </span>
                                      )}
                                    </div>

                                    {/* Action button if this step can advance the order */}
                                    {isCurrentActive && stg.actionTarget && !isCancelled && (
                                      <button
                                        type="button"
                                        disabled={actionLoading}
                                        onClick={() => handleQuickStatusTransition(stg.actionTarget, `Advanced from ${stg.label} to ${stg.actionTarget}`)}
                                        className="px-3 py-1 rounded-lg bg-brand-cyan hover:bg-cyan-400 text-slate-950 font-black text-[11px] inline-flex items-center gap-1 shadow-sm transition-all cursor-pointer self-start sm:self-auto"
                                      >
                                        <span>{stg.actionLabel}</span>
                                        <ArrowRight className="w-3 h-3 stroke-[3]" />
                                      </button>
                                    )}
                                  </div>

                                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                                    {stg.subtitle}
                                  </p>
                                </div>

                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Detailed Chronological Audit History Logs */}
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                            <History className="w-4 h-4 text-brand-cyan" />
                            <span>Chronological Audit Event Log</span>
                          </h3>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {historyList.length} Recorded Event{historyList.length !== 1 ? 's' : ''}
                          </span>
                        </div>

                        {historyList.length === 0 ? (
                          <div className="p-4 rounded-xl bg-white dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-xs text-slate-500 dark:text-slate-400">
                            <p className="font-semibold text-slate-700 dark:text-slate-300">Initial checkout event active.</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Order placed on {selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleString('en-IN') : 'Recent'}. Subsequent lab and courier milestones will be logged here.</p>
                          </div>
                        ) : (
                          <div className="space-y-2.5 border-l-2 border-brand-cyan/40 ml-2.5 pl-3.5">
                            {historyList.map((hist, i) => (
                              <div key={i} className="text-xs relative">
                                <div className="absolute -left-[19px] top-1.5 w-2 h-2 rounded-full bg-brand-cyan border-2 border-white dark:border-neutral-900" />
                                <div className="flex items-center justify-between gap-2">
                                  <div className="font-bold text-slate-900 dark:text-white capitalize">
                                    {hist.new_status || hist.status}
                                  </div>
                                  <div className="text-slate-400 text-[10.5px] font-mono shrink-0">
                                    {new Date(hist.created_at).toLocaleString('en-IN')}
                                  </div>
                                </div>
                                <div className="text-slate-500 text-[11px]">
                                  {hist.staff_name ? `Updated by ${hist.staff_name}` : 'System / Store Staff'}
                                </div>
                                {hist.note && (
                                  <p className="text-slate-700 dark:text-slate-300 mt-1 bg-white dark:bg-white/5 p-2 rounded-lg border border-slate-200/50 dark:border-white/5 text-[11px]">
                                    {hist.note}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })()}

              </div>

              {/* Modal Sticky Footer */}
              <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-white/5 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-2 shrink-0">
                <button
                  onClick={() => setOrderToDelete(selectedOrder)}
                  className="py-2 px-3 sm:px-4 text-xs font-black text-rose-700 dark:text-rose-300 hover:text-white bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-600 rounded-xl flex items-center gap-1.5 border border-rose-300 dark:border-rose-500/40 transition-all cursor-pointer shadow-xs shrink-0"
                  title="Delete order record"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden xs:inline sm:inline">Delete</span>
                </button>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenInvoice(selectedOrder)}
                    className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-teal-50 dark:bg-teal-500/15 hover:bg-teal-600 text-teal-800 dark:text-teal-300 hover:text-white font-black text-xs flex items-center gap-1.5 border border-teal-300 dark:border-teal-500/30 transition-all cursor-pointer shadow-xs"
                    title="Print or download official invoice"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Invoice</span>
                  </button>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs transition-all cursor-pointer shadow-sm hover:bg-slate-800 dark:hover:bg-slate-100"
                  >
                    Close
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ORDER DELETE CONFIRMATION MODAL */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/20 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-black text-sm">
                <Trash2 className="w-5 h-5" />
                <span>Delete Order #{orderToDelete.order_number}</span>
              </div>
              <button
                onClick={() => setOrderToDelete(null)}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-rose-50 dark:hover:bg-rose-500/20 text-slate-600 dark:text-slate-300 hover:text-rose-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              How would you like to handle the items associated with Order <strong className="text-slate-950 dark:text-white font-mono font-bold">#{orderToDelete.order_number}</strong>?
            </p>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                disabled={isDeletingOrder}
                onClick={() => handleConfirmDeleteOrder(1)}
                className="w-full py-3 px-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/30 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Add Back to Inventory Stock &amp; Delete</span>
              </button>

              <button
                type="button"
                disabled={isDeletingOrder}
                onClick={() => handleConfirmDeleteOrder(0)}
                className="w-full py-3 px-4 rounded-xl bg-rose-50 dark:bg-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/30 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40 text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Permanently (Do Not Alter Stock)</span>
              </button>

              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                className="w-full py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Note Modal */}
      {rejectReasonModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/15 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-900 dark:text-white">
            <h3 className="text-base font-extrabold flex items-center gap-2 text-amber-500">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> Reject Cancellation Request
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Please enter the explanation note that will be sent to <strong>{selectedOrder?.customer_name}</strong> and displayed on their live order tracker.
            </p>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Reason for Rejection *</label>
              <textarea
                rows="3"
                value={rejectionNoteInput}
                onChange={(e) => setRejectionNoteInput(e.target.value)}
                placeholder="e.g. Customized optical lenses have already commenced fabrication and edging in our optical lab."
                className="w-full glass-input rounded-xl p-3 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRejectReasonModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmRejectCancellation}
                className="btn-primary bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs px-4 py-2 rounded-xl font-black"
              >
                {actionLoading ? 'Saving...' : 'Confirm & Notify Customer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Optician Prescription Clarification Modal */}
      {clarificationModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/15 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-900 dark:text-white animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <h3 className="text-base font-extrabold flex items-center gap-2 text-rose-500">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                <span>Flag Prescription Clarification</span>
              </h3>
              <button
                type="button"
                onClick={() => setClarificationModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Flagging this order will send an urgent email notification to <strong>{selectedOrder?.customer_name}</strong> and display a high-visibility Red Badge on their "My Orders" and tracking page with direct WhatsApp &amp; re-upload options.
            </p>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Note / Reason for Customer &amp; Lab Log *
              </label>
              <textarea
                rows="3"
                value={clarificationNote}
                onChange={(e) => setClarificationNote(e.target.value)}
                placeholder="e.g. Doctor slip image is blurry / cylinder axis is missing. Please send a clearer slip via WhatsApp or re-upload."
                className="w-full glass-input rounded-xl p-3 text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-200 dark:border-white/10">
              {(() => {
                const custPhone = (selectedOrder?.customer_phone || '').replace(/\D/g, '').slice(-10);
                if (custPhone.length === 10) {
                  const waUrl = `https://wa.me/91${custPhone}?text=${encodeURIComponent(`Hi ${selectedOrder.customer_name || 'Customer'}, this is Netra Unnayan Eye Clinic regarding your optical Order #${selectedOrder.order_number}. Prescription clarification: ${clarificationNote.trim()}`)}`;
                  return (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      title="Open WhatsApp chat with customer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp Customer</span>
                    </a>
                  );
                }
                return <div />;
              })()}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setClarificationModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading || !clarificationNote.trim()}
                  onClick={() => handleVerifyPrescription(clarificationRxId, 'Needs Clarification', clarificationNote.trim())}
                  className="btn-primary bg-rose-600 hover:bg-rose-500 text-white text-xs px-4 py-2 rounded-xl font-bold shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Updating...' : 'Flag & Send Customer Alert'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* A4 TAX / POS INVOICE MODAL */}
      <InvoiceModal
        isOpen={!!invoiceModalData}
        onClose={() => setInvoiceModalData(null)}
        invoiceData={invoiceModalData
          ? { ...invoiceModalData, upi_id: storeSettings?.upi_id || '', payment_qr_image: storeSettings?.upi_qr_image || '' }
          : null
        }
      />

    </div>
  );
}
