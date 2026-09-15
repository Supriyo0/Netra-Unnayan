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
      const res = await api.get('/admin/orders.php', { params: { id: orderId } });
      const isSuccess = res.success || res.data?.success;
      const orderPayload = res.data?.order || res.data?.data || res.data;
      if (isSuccess && orderPayload) {
        setSelectedOrder(orderPayload);
        setNewStatus(orderPayload.status || orderPayload.order_status);
        setCourierName(orderPayload.courier_name || 'Blue Dart');
        setTrackingNumber(orderPayload.tracking_number || '');
        setTrackingUrl(orderPayload.tracking_url || '');
        setEstimatedDeliveryDate(orderPayload.estimated_delivery_date || '');
        setStatusNote('');
        setActionMessage('');
      }
    } catch (err) {
      alert('Failed to load order details');
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
        verification_status: statusVal,
        note: statusVal === 'verified' ? 'Prescription verified by clinical optician' : 'Rx needs customer clarification'
      });
      if (res.data.success) {
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
      if (res.data.success) {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-neutral-900 dark:text-white flex items-center gap-2">
            <Package className="w-7 h-7 text-primary-600" />
            Order Management & Fulfillment
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Track online customer orders, verify prescription diopters, and update optical pipeline
          </p>
        </div>
        <button 
          onClick={fetchOrders}
          className="btn-secondary px-4 py-2 flex items-center gap-2 text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters & Search */}
      <div className="glass-card p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            placeholder="Search by Order #, Customer Name, Phone, or City..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9 py-2 text-sm w-full"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-4 h-4 text-neutral-400 shrink-0" />
          <div className="flex gap-1.5 shrink-0">
            {statusList.map((st) => (
              <button
                key={st.value}
                onClick={() => setStatusFilter(st.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === st.value
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-neutral-200/70 dark:border-neutral-800/80 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-900/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 text-xs uppercase font-medium">
              <tr>
                <th className="px-5 py-3.5">Order #</th>
                <th className="px-5 py-3.5">Customer</th>
                <th className="px-5 py-3.5">Items</th>
                <th className="px-5 py-3.5">Total</th>
                <th className="px-5 py-3.5">Payment</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-5 py-12 text-center text-neutral-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary-500" />
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-5 py-12 text-center text-neutral-500">
                    No orders found matching your criteria.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="px-5 py-4 font-mono font-semibold text-primary-600 dark:text-primary-400">
                      {order.order_number}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-medium text-neutral-900 dark:text-white">
                        {order.customer_name || 'Guest'}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {order.customer_phone || order.customer_email || '—'}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-neutral-100 dark:bg-neutral-800 font-medium">
                        {order.item_count || 1} {order.item_count === 1 ? 'item' : 'items'}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-bold text-neutral-900 dark:text-white">
                      ₹{parseFloat(order.total_amount).toLocaleString('en-IN')}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium w-fit ${
                          order.payment_status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : order.payment_status === 'pending'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                        }`}>
                          {order.payment_status?.toUpperCase()}
                        </span>
                        <span className="text-[10px] text-neutral-400 uppercase font-mono">
                          {order.payment_method}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        order.status === 'delivered'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : order.status === 'cancelled'
                          ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                          : order.status === 'shipped'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}>
                        {order.status?.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-neutral-500 whitespace-nowrap">
                      {new Date(order.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openOrderDetail(order.id)}
                          className="btn-primary py-1.5 px-3 text-xs inline-flex items-center gap-1.5"
                          title="View and manage order"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Manage</span>
                        </button>
                        <button
                          onClick={() => setOrderToDelete(order)}
                          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-200 hover:bg-rose-500/20 transition-colors border border-rose-500/30"
                          title="Delete Order & Invoice (with stock restore option)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail & Optical Pipeline Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="glass-card bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-neutral-200 dark:border-neutral-800 my-8">
            {/* Modal Header */}
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-neutral-900/95 backdrop-blur z-10">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold font-heading text-neutral-900 dark:text-white">
                    Order #{selectedOrder.order_number}
                  </h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                    selectedOrder.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                    selectedOrder.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-primary-100 text-primary-800 dark:bg-primary-950 dark:text-primary-300'
                  }`}>
                    {selectedOrder.status?.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  Placed on {new Date(selectedOrder.created_at).toLocaleString('en-IN')}
                </p>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notification alert */}
            {actionMessage && (
              <div className="mx-6 mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-300 rounded-lg text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {actionMessage}
              </div>
            )}

            <div className="p-6 space-y-6">
              {/* Top Summary Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800">
                  <div className="text-xs text-neutral-400 font-medium">Customer Information</div>
                  <div className="font-semibold text-neutral-900 dark:text-white mt-1">
                    {selectedOrder.customer_name || 'Guest User'}
                  </div>
                  <div className="text-xs text-neutral-600 dark:text-neutral-300 mt-0.5">
                    {selectedOrder.customer_phone}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {selectedOrder.customer_email}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800">
                  <div className="text-xs text-neutral-400 font-medium">Shipping Address</div>
                  <div className="text-xs text-neutral-700 dark:text-neutral-300 mt-1 leading-relaxed">
                    {selectedOrder.shipping_address ? (
                      <>
                        {selectedOrder.shipping_address.street_address}<br/>
                        {selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.state} — {selectedOrder.shipping_address.pincode}
                      </>
                    ) : (
                      selectedOrder.raw_shipping_address || 'In-store Pickup'
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-800">
                  <div className="text-xs text-neutral-400 font-medium">Payment & Amount</div>
                  <div className="text-lg font-bold text-neutral-900 dark:text-white mt-1">
                    ₹{parseFloat(selectedOrder.total_amount).toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-neutral-500 flex items-center justify-between mt-1">
                    <span>Method: {selectedOrder.payment_method?.toUpperCase()}</span>
                    <span className="font-medium capitalize">{selectedOrder.payment_status}</span>
                  </div>
                  {selectedOrder.upi_reference && (
                    <div className="mt-2 text-xs font-mono bg-neutral-100 dark:bg-neutral-900 p-1.5 rounded border border-neutral-200 dark:border-neutral-700">
                      UTR: {selectedOrder.upi_reference}
                    </div>
                  )}
                  {selectedOrder.payment_status === 'pending' && selectedOrder.payment_method === 'upi' && (
                    <div className="mt-2 flex gap-2">
                      <button 
                        onClick={() => handleVerifyPayment('completed')}
                        disabled={actionLoading}
                        className="px-2.5 py-1 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-700"
                      >
                        Approve UTR
                      </button>
                      <button 
                        onClick={() => handleVerifyPayment('failed')}
                        disabled={actionLoading}
                        className="px-2.5 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Items Table */}
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider mb-3">
                  Ordered Items & Optical Specs
                </h3>
                <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-neutral-50 dark:bg-neutral-900/80 text-neutral-500 dark:text-neutral-400 text-xs">
                      <tr>
                        <th className="px-4 py-2.5">Product</th>
                        <th className="px-4 py-2.5">Dimensions</th>
                        <th className="px-4 py-2.5">Unit Price</th>
                        <th className="px-4 py-2.5">Qty</th>
                        <th className="px-4 py-2.5 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                      {selectedOrder.items?.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-neutral-900 dark:text-white">
                              {item.product_name}
                            </div>
                            <div className="text-xs text-neutral-500 font-mono">
                              SKU: {item.sku}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-400 font-mono">
                            {item.lens_width ? `${item.lens_width} □ ${item.bridge_width || 18} — ${item.temple_length || 140}` : 'Standard'}
                          </td>
                          <td className="px-4 py-3 font-medium">
                            ₹{parseFloat(item.unit_price).toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 font-semibold">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-neutral-900 dark:text-white">
                            ₹{parseFloat(item.total_price).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Prescription Verification Section */}
              {selectedOrder.prescriptions && selectedOrder.prescriptions.length > 0 && (
                <div className="p-4 rounded-xl bg-primary-50/50 dark:bg-primary-950/20 border border-primary-200 dark:border-primary-900/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-primary-900 dark:text-primary-300 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary-600" />
                      Prescription Verification Workflow
                    </h3>
                    <span className="text-xs text-primary-700 dark:text-primary-400 font-medium">
                      Status: {selectedOrder.prescriptions[0].verification_status?.toUpperCase() || 'PENDING'}
                    </span>
                  </div>

                  {selectedOrder.prescriptions.map((rx, idx) => (
                    <div key={idx} className="bg-white dark:bg-neutral-900 p-4 rounded-lg border border-primary-200/60 dark:border-primary-900/40 space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-neutral-400">Prescription Type:</span>
                          <p className="font-semibold text-neutral-900 dark:text-white capitalize">{rx.lens_type || 'Single Vision'}</p>
                        </div>
                        <div>
                          <span className="text-neutral-400">Lens Coating:</span>
                          <p className="font-semibold text-neutral-900 dark:text-white capitalize">{rx.lens_coating || 'Blue Light Cut'}</p>
                        </div>
                        <div>
                          <span className="text-neutral-400">Pupillary Distance (PD):</span>
                          <p className="font-semibold text-neutral-900 dark:text-white font-mono">{rx.pd ? `${rx.pd} mm` : '63 mm (Std)'}</p>
                        </div>
                        <div>
                          <span className="text-neutral-400">Input Mode:</span>
                          <p className="font-semibold text-neutral-900 dark:text-white capitalize">{rx.submission_type || 'Manual'}</p>
                        </div>
                      </div>

                      {/* Diopter Chart */}
                      {rx.sph_od !== null && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-center text-xs font-mono border border-neutral-200 dark:border-neutral-800">
                            <thead className="bg-neutral-100 dark:bg-neutral-800">
                              <tr>
                                <th className="p-1.5">Eye</th>
                                <th className="p-1.5">SPH (Sphere)</th>
                                <th className="p-1.5">CYL (Cylinder)</th>
                                <th className="p-1.5">AXIS</th>
                                <th className="p-1.5">ADD</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                              <tr>
                                <td className="p-1.5 font-bold text-neutral-800 dark:text-neutral-200">OD (Right)</td>
                                <td className="p-1.5">{rx.sph_od || '0.00'}</td>
                                <td className="p-1.5">{rx.cyl_od || '0.00'}</td>
                                <td className="p-1.5">{rx.axis_od || '0'}°</td>
                                <td className="p-1.5">{rx.add_od || '—'}</td>
                              </tr>
                              <tr>
                                <td className="p-1.5 font-bold text-neutral-800 dark:text-neutral-200">OS (Left)</td>
                                <td className="p-1.5">{rx.sph_os || '0.00'}</td>
                                <td className="p-1.5">{rx.cyl_os || '0.00'}</td>
                                <td className="p-1.5">{rx.axis_os || '0'}°</td>
                                <td className="p-1.5">{rx.add_os || '—'}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Uploaded Rx File */}
                      {rx.prescription_file_url && (
                        <div className="flex items-center gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                          <a 
                            href={rx.prescription_file_url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-xs text-primary-600 hover:underline flex items-center gap-1 font-medium"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            View Uploaded Prescription Slip
                          </a>
                        </div>
                      )}

                      {/* Optician Verification Buttons */}
                      <div className="flex items-center gap-3 pt-2">
                        <button
                          onClick={() => handleVerifyPrescription(rx.id, 'verified')}
                          disabled={actionLoading || rx.verification_status === 'verified'}
                          className="btn-primary py-1.5 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approve Diopters for Cutting
                        </button>
                        <button
                          onClick={() => handleVerifyPrescription(rx.id, 'needs_clarification')}
                          disabled={actionLoading || rx.verification_status === 'needs_clarification'}
                          className="btn-secondary py-1.5 px-3 text-xs text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 flex items-center gap-1.5"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Flag: Needs Clarification
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Optical Pipeline Status Updater */}
              <div className="p-5 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 space-y-4">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Truck className="w-4 h-4 text-primary-600" />
                  Update Optical Pipeline Status
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-neutral-500 font-medium block mb-1">
                      New Status
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="input-field py-2 text-sm w-full"
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="prescription_verified">Prescription Verified</option>
                      <option value="lens_cutting">Lens Cutting (Lens Edging in Lab)</option>
                      <option value="optical_fitting">Optical Fitting (Assembly & Alignment)</option>
                      <option value="quality_checked">Quality Checked</option>
                      <option value="shipped">Shipped (With Tracking Details)</option>
                      <option value="delivered">Delivered to Customer</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-neutral-500 font-medium block mb-1">
                      Status Note / Lab Log
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CR-39 lenses cut and aligned, dispatched via BlueDart"
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      className="input-field py-2 text-sm w-full"
                    />
                  </div>
                </div>

                {/* Courier Shipping Logistics Assignment */}
                <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 space-y-3">
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
                      <label className="text-[11px] text-neutral-500 font-medium block mb-1">Courier Partner</label>
                      <select 
                        value={courierName}
                        onChange={(e) => setCourierName(e.target.value)}
                        className="input-field py-1.5 text-xs w-full"
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
                      <label className="text-[11px] text-neutral-500 font-medium block mb-1">AWB Tracking Number</label>
                      <input 
                        type="text"
                        placeholder="e.g. BLD789456123"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        className="input-field py-1.5 text-xs w-full font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-neutral-500 font-medium block mb-1">Tracking URL</label>
                      <input 
                        type="url"
                        placeholder="https://track.bluedart.com/..."
                        value={trackingUrl}
                        onChange={(e) => setTrackingUrl(e.target.value)}
                        className="input-field py-1.5 text-xs w-full"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-neutral-500 font-medium block mb-1">Est. Delivery Date</label>
                      <input 
                        type="date"
                        value={estimatedDeliveryDate}
                        onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
                        className="input-field py-1.5 text-xs w-full font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                  <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={isCustomerVisible}
                      onChange={(e) => setIsCustomerVisible(e.target.checked)}
                      className="rounded text-primary-600 focus:ring-primary-500"
                    />
                    Make note visible to customer on public tracking page
                  </label>

                  <button
                    onClick={handleUpdateStatus}
                    disabled={actionLoading}
                    className="btn-primary py-2 px-5 text-sm flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {actionLoading ? 'Updating...' : 'Save & Publish Status'}
                  </button>
                </div>
              </div>

              {/* Status History Timeline */}
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider mb-3">
                  Audit Status History
                </h3>
                <div className="space-y-2 border-l-2 border-primary-500/30 ml-3 pl-4">
                  {selectedOrder.status_history?.map((hist, i) => (
                    <div key={i} className="text-xs relative">
                      <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary-600 border-2 border-white dark:border-neutral-900" />
                      <div className="font-semibold text-neutral-900 dark:text-white capitalize">
                        {hist.status?.replace('_', ' ')}
                      </div>
                      <div className="text-neutral-500 text-[11px]">
                        {new Date(hist.created_at).toLocaleString('en-IN')}
                        {hist.created_by_name && ` • by ${hist.created_by_name}`}
                        {hist.is_customer_visible === 0 && ' (Internal Staff Note)'}
                      </div>
                      {hist.note && (
                        <p className="text-neutral-600 dark:text-neutral-300 mt-0.5 bg-neutral-100 dark:bg-neutral-800 p-1.5 rounded">
                          {hist.note}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3">
              <button
                onClick={() => handleDeleteOrder(selectedOrder)}
                className="py-2 px-3 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg flex items-center gap-1.5 border border-rose-500/20"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Order &amp; Invoices</span>
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="btn-secondary py-2 px-4 text-xs flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  Print Order Slip
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="btn-secondary py-2 px-4 text-xs"
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
