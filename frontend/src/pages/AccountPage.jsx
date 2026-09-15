import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
  User, Package, FileText, MapPin, Calendar, Eye, 
  LogOut, Shield, Plus, Check, Clock, ChevronRight, X, 
  ExternalLink, Truck, CheckCircle2, AlertCircle, Phone, 
  Home as HomeIcon, Stethoscope, Trash2, Star, Sparkles, Edit2
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { InvoiceModal } from '../components/common/InvoiceModal';

export const AccountPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, logout } = useAuth();

  // Tab state synced with URL ?tab=
  const initialTab = searchParams.get('tab') || 'orders';
  const [activeTab, setActiveTab] = useState(initialTab);

  const [orders, setOrders] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [bookings, setBookings] = useState({ doctor_appointments: [], home_visits: [] });
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [invoiceModalData, setInvoiceModalData] = useState(null);

  // Address Modal State (Add & Edit)
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [savingAddr, setSavingAddr] = useState(false);
  const [addrForm, setAddrForm] = useState({
    recipient_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    landmark: '',
    city: '',
    state: '',
    pincode: '',
    address_type: 'HOME',
    is_default: false
  });

  // New Prescription Modal
  const [addRxOpen, setAddRxOpen] = useState(false);
  const [newRxLabel, setNewRxLabel] = useState('');
  const [rSph, setRSph] = useState('');
  const [rCyl, setRCyl] = useState('');
  const [rAxis, setRAxis] = useState('');
  const [rPd, setRPd] = useState('');
  const [lSph, setLSph] = useState('');
  const [lCyl, setLCyl] = useState('');
  const [lAxis, setLAxis] = useState('');
  const [lPd, setLPd] = useState('');
  const [rxNotes, setRxNotes] = useState('');

  // Sync tab change with URL query param
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const loadAllAccountData = async () => {
      setLoading(true);
      try {
        const [ordRes, rxRes, bookRes, addrRes] = await Promise.allSettled([
          api.get('/orders/my_orders.php'),
          api.get('/prescriptions/list.php'),
          api.get('/account/bookings.php'),
          api.get('/account/addresses.php')
        ]);

        if (ordRes.status === 'fulfilled' && ordRes.value?.success) {
          setOrders(ordRes.value.data || []);
        }
        if (rxRes.status === 'fulfilled' && rxRes.value?.success) {
          setPrescriptions(rxRes.value.data || []);
        }
        if (bookRes.status === 'fulfilled' && bookRes.value?.success) {
          setBookings(bookRes.value.data || { doctor_appointments: [], home_visits: [] });
        }
        if (addrRes.status === 'fulfilled' && addrRes.value?.success) {
          setAddresses(addrRes.value.data || []);
        }
      } catch (err) {
        console.error('Error fetching account data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAllAccountData();
  }, [user, navigate]);

  // Refresh addresses
  const refreshAddresses = async () => {
    try {
      const res = await api.get('/account/addresses.php');
      if (res.success) setAddresses(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Add / Edit Address Handler
  const handleSaveAddress = async (e) => {
    e.preventDefault();
    setSavingAddr(true);
    try {
      let res;
      if (editingAddressId) {
        res = await api.put('/account/addresses.php', {
          id: editingAddressId,
          action: 'update',
          ...addrForm
        });
      } else {
        res = await api.post('/account/addresses.php', addrForm);
      }

      if (res.success) {
        setAddressModalOpen(false);
        setEditingAddressId(null);
        setAddrForm({
          recipient_name: '',
          phone: '',
          address_line1: '',
          address_line2: '',
          landmark: '',
          city: '',
          state: '',
          pincode: '',
          address_type: 'HOME',
          is_default: false
        });
        await refreshAddresses();
      } else {
        alert(res.message || 'Failed to save address');
      }
    } catch (err) {
      alert(err.message || 'Failed to save address');
    } finally {
      setSavingAddr(false);
    }
  };

  // Set Address as Default
  const handleSetDefault = async (addrId) => {
    try {
      const res = await api.put(`/account/addresses.php?id=${addrId}`, { is_default: true });
      if (res.success) {
        await refreshAddresses();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Address
  const handleDeleteAddress = async (addrId) => {
    if (!window.confirm('Are you sure you want to remove this delivery address?')) return;
    try {
      const res = await api.delete(`/account/addresses.php?id=${addrId}`);
      if (res.success) {
        await refreshAddresses();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save Prescription Handler
  const handleSavePrescription = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/prescriptions/save.php', {
        label: newRxLabel,
        right_sph: parseFloat(rSph) || 0,
        right_cyl: parseFloat(rCyl) || 0,
        right_axis: parseInt(rAxis) || 0,
        right_pd: parseFloat(rPd) || null,
        left_sph: parseFloat(lSph) || 0,
        left_cyl: parseFloat(lCyl) || 0,
        left_axis: parseInt(lAxis) || 0,
        left_pd: parseFloat(lPd) || null,
        notes: rxNotes
      });
      if (res.success) {
        setAddRxOpen(false);
        const rxRes = await api.get('/prescriptions/list.php');
        if (rxRes.success) setPrescriptions(rxRes.data || []);
      }
    } catch (err) {
      alert(err.message || 'Failed to save prescription');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) return null;

  const totalBookingsCount = (bookings.doctor_appointments?.length || 0) + (bookings.home_visits?.length || 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Profile Overview Header */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border border-white/10 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-cyan to-brand-blue flex items-center justify-center text-slate-950 font-black text-2xl shadow-cyan-glow">
            {user.full_name?.charAt(0) || 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-brand-teal uppercase font-bold tracking-widest bg-brand-teal/10 px-2 py-0.5 rounded-full border border-brand-teal/20">
                Verified Optical Profile
              </span>
              {user.role === 'admin' && (
                <span className="text-[10px] text-amber-400 uppercase font-bold tracking-widest bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  Staff Administrator
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
              {user.full_name}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              {user.phone} &bull; {user.email}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user.role === 'admin' && (
            <Link
              to="/admin"
              className="btn-primary text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-cyan-glow"
            >
              <Shield className="w-3.5 h-3.5" /> Staff Control Panel
            </Link>
          )}
          <button 
            onClick={handleLogout}
            className="btn-secondary text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 text-rose-300 hover:text-rose-200 border-rose-500/20"
          >
            <LogOut className="w-3.5 h-3.5" /> Log Out
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-white/10 text-xs scrollbar-none">
        <button
          onClick={() => handleTabChange('orders')}
          className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'orders' ? 'bg-brand-cyan text-slate-950 shadow-cyan-glow' : 'glass-nav-pill text-slate-300 hover:text-white'
          }`}
        >
          <Package className="w-4 h-4" /> My Orders ({orders.length})
        </button>

        <button
          onClick={() => handleTabChange('bookings')}
          className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'bookings' ? 'bg-emerald-400 text-slate-950 shadow-emerald-glow' : 'glass-nav-pill text-slate-300 hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4" /> My Bookings ({totalBookingsCount})
          {bookings.doctor_appointments?.some(b => b.status === 'Pending') && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => handleTabChange('addresses')}
          className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'addresses' ? 'bg-brand-cyan text-slate-950 shadow-cyan-glow' : 'glass-nav-pill text-slate-300 hover:text-white'
          }`}
        >
          <MapPin className="w-4 h-4" /> Saved Addresses ({addresses.length})
        </button>

        <button
          onClick={() => handleTabChange('prescriptions')}
          className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'prescriptions' ? 'bg-brand-cyan text-slate-950 shadow-cyan-glow' : 'glass-nav-pill text-slate-300 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" /> Optical Health Vault ({prescriptions.length})
        </button>
      </div>

      {/* TAB 1: MY ORDERS */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center space-y-3">
              <Package className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-white">No Eyewear Orders Yet</h3>
              <p className="text-xs text-slate-400">Discover our collection of prescription frames and polarized sunglasses.</p>
              <Link to="/shop" className="btn-primary text-xs py-2 px-4 inline-flex">
                Shop Eyewear Now
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((ord) => (
                <div key={ord.id} className="glass-card rounded-2xl p-5 space-y-4 border border-white/10">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                    <div>
                      <div className="text-[10px] text-slate-400 font-mono">Order Number</div>
                      <Link to={`/order-tracking?order=${ord.order_number}`} className="font-bold text-white text-base hover:text-brand-cyan transition-colors flex items-center gap-1.5">
                        {ord.order_number}
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      </Link>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        ord.order_status === 'Delivered' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' :
                        ord.order_status === 'Shipped' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                        ord.order_status === 'Cancelled' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                        ord.order_status === 'Processing' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                        'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {ord.order_status}
                      </span>
                      <Link 
                        to={`/order-tracking?order=${ord.order_number}`}
                        className="btn-secondary text-[11px] py-1.5 px-3 rounded-lg flex items-center gap-1"
                      >
                        <Truck className="w-3.5 h-3.5 text-brand-cyan" /> Track Shipment
                      </Link>
                    </div>
                  </div>

                  {/* Courier & Shipping Tracking Banner (if assigned) */}
                  {(ord.courier_name || ord.tracking_number) && (
                    <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                          <Truck className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>Dispatched via {ord.courier_name || 'Express Logistics'}</span>
                            {ord.estimated_delivery_date && (
                              <span className="text-[10px] text-blue-300 font-normal">
                                (Est. Delivery: {new Date(ord.estimated_delivery_date).toLocaleDateString()})
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-300 font-mono">
                            AWB Tracking: <strong className="text-brand-cyan">{ord.tracking_number}</strong>
                          </div>
                        </div>
                      </div>
                      {ord.tracking_url && (
                        <a
                          href={ord.tracking_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary text-[11px] py-1 px-3 rounded-lg flex items-center gap-1 shrink-0"
                        >
                          Courier Portal &rarr;
                        </a>
                      )}
                    </div>
                  )}

                  {/* Preview Items */}
                  <div className="space-y-2 bg-white/5 p-3 rounded-xl">
                    {ord.preview_items?.map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs text-slate-300">
                        <span className="font-medium">{it.product_name} ({it.product_sku || 'Frame'}) &times; {it.quantity}</span>
                        <span className="font-mono text-white font-bold">₹{parseFloat(it.total_price || 0).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-2 border-t border-white/5 text-xs text-slate-400 gap-2">
                    <span>Placed on: {new Date(ord.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    <div className="flex items-center gap-3">
                      <span>Payment: <span className="font-semibold text-slate-200">{ord.payment_mode}</span></span>
                      <span>Total: <strong className="text-white text-sm font-mono text-brand-cyan">₹{parseFloat(ord.total_amount || 0).toLocaleString('en-IN')}</strong></span>
                      <button
                        onClick={() => setInvoiceModalData({
                          invoiceNumber: `NU-INV-${ord.order_number?.replace('NU-', '') || ord.id}`,
                          orderNumber: ord.order_number,
                          invoiceDate: new Date(ord.created_at).toISOString().split('T')[0],
                          type: 'ORDER',
                          status: ord.order_status,
                          paymentMode: ord.payment_mode,
                          paymentStatus: ord.payment_status || 'Paid',
                          customerName: user.full_name || ord.customer_name,
                          customerPhone: user.phone || ord.customer_phone,
                          customerEmail: user.email || ord.customer_email,
                          customerAddress: `${ord.shipping_address_line1 || ''}, ${ord.shipping_city || ''}, ${ord.shipping_state || ''} - ${ord.shipping_pincode || ''}`,
                          items: ord.preview_items || [],
                          subtotal: ord.subtotal || ord.total_amount,
                          discountAmount: ord.discount_amount || 0,
                          totalAmount: ord.total_amount,
                          warrantyNote: '1-Year Optical Warranty on Frame & Multi-Coat Anti-Glare Optics against manufacturing defects.'
                        })}
                        className="btn-secondary text-[11px] py-1 px-2.5 rounded-lg flex items-center gap-1 text-brand-cyan border-brand-cyan/30 hover:bg-brand-cyan/10 transition-colors"
                        title="Download / View Tax Invoice"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Tax Invoice</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY BOOKINGS (DOCTOR CLINIC & HOME EYE TEST) */}
      {activeTab === 'bookings' && (
        <div className="space-y-8">
          
          {/* Section A: Doctor Consultations */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-emerald-400" /> Doctor Clinic Consultations
                </h3>
                <p className="text-xs text-slate-400">Bookings with ophthalmologists &amp; optometrists at Netra Unnayan Digha Clinic.</p>
              </div>
              <Link to="/doctors" className="btn-secondary text-xs py-1.5 px-3 rounded-lg flex items-center gap-1 text-emerald-400 border-emerald-500/20">
                <Plus className="w-3.5 h-3.5" /> Book Doctor
              </Link>
            </div>

            {(!bookings.doctor_appointments || bookings.doctor_appointments.length === 0) ? (
              <div className="glass-card rounded-2xl p-8 text-center space-y-2">
                <Stethoscope className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">No clinic appointments booked yet.</p>
                <Link to="/doctors" className="btn-primary text-xs py-2 px-4 inline-flex">
                  Explore Doctors &amp; Schedule Slot
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bookings.doctor_appointments.map((apt) => (
                  <div key={apt.id} className="glass-card rounded-2xl p-5 space-y-4 border border-white/10 relative overflow-hidden">
                    {/* Top Status Header */}
                    <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 block">Token: {apt.booking_number}</span>
                        <h4 className="font-extrabold text-sm text-white mt-0.5">{apt.doctor_name || 'Senior Consultant'}</h4>
                        <span className="text-[11px] text-emerald-400 font-semibold">{apt.doctor_specialty}</span>
                      </div>

                      {/* Status Badge */}
                      <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 ${
                        apt.status === 'Confirmed' 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-emerald-glow'
                          : apt.status === 'Completed'
                          ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                          : apt.status === 'Cancelled'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                      }`}>
                        {apt.status === 'Confirmed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {apt.status === 'Pending' && <Clock className="w-3.5 h-3.5" />}
                        {apt.status}
                      </span>
                    </div>

                    {/* Status Message Info Box */}
                    <div className={`p-3 rounded-xl text-xs leading-relaxed ${
                      apt.status === 'Confirmed' 
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-200' 
                        : apt.status === 'Pending'
                        ? 'bg-amber-500/10 border border-amber-500/20 text-amber-200'
                        : 'bg-white/5 text-slate-300'
                    }`}>
                      {apt.status === 'Confirmed' ? (
                        <div>
                          <strong className="block font-bold mb-0.5">Booking Confirmed by Clinic</strong>
                          Your slot has been approved and confirmed. A confirmation SMS/Email has been dispatched. Please report 10 minutes prior to slot time.
                        </div>
                      ) : apt.status === 'Pending' ? (
                        <div>
                          <strong className="block font-bold mb-0.5">Awaiting Clinic Verification</strong>
                          Your booking request has been forwarded to the clinic desk. Once verified by our reception, the status will immediately turn Confirmed and you will receive an alert.
                        </div>
                      ) : (
                        <span>Status: {apt.status}</span>
                      )}
                    </div>

                    {/* Slot Details */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-white/5 p-3 rounded-xl">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Appointment Date</span>
                        <span className="font-bold text-white font-mono flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3.5 h-3.5 text-brand-cyan" />
                          {apt.appointment_date}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Time Slot</span>
                        <span className="font-bold text-white font-mono flex items-center gap-1 mt-0.5">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          {apt.appointment_time}
                        </span>
                      </div>
                    </div>

                    {/* Patient & Clinic Details */}
                    <div className="space-y-1.5 text-xs text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Patient Name:</span>
                        <span className="font-semibold text-white">{apt.patient_name} {apt.patient_age ? `(${apt.patient_age} yrs)` : ''}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Consultation Fee:</span>
                        <span className="font-bold text-brand-cyan font-mono">₹{apt.doctor_fee || 500}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-white/5">
                        <span className="text-slate-400">Clinic Location:</span>
                        <span className="font-medium text-slate-200">{apt.clinic_address || 'Netra Unnayan Main Clinic, Digha'}</span>
                      </div>
                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={() => setInvoiceModalData({
                            invoiceNumber: `NU-DOC-${apt.booking_number?.replace('DOC-', '') || apt.id}`,
                            orderNumber: apt.booking_number,
                            invoiceDate: apt.appointment_date || new Date().toISOString().split('T')[0],
                            type: 'DOCTOR',
                            status: apt.status,
                            paymentMode: 'CLINIC_DESK',
                            paymentStatus: apt.status === 'Completed' ? 'Paid' : 'Pending',
                            customerName: apt.patient_name || user.full_name,
                            customerPhone: apt.patient_phone || user.phone,
                            customerEmail: user.email,
                            customerAddress: apt.clinic_address || 'Netra Unnayan Main Clinic, Digha',
                            doctorName: apt.doctor_name,
                            specialty: apt.doctor_specialty,
                            appointmentDate: apt.appointment_date,
                            appointmentTime: apt.appointment_time,
                            totalAmount: apt.doctor_fee || 500,
                            subtotal: apt.doctor_fee || 500,
                            warrantyNote: 'Official Consultation Slip & Optical Prescription Token'
                          })}
                          className="btn-secondary text-[11px] py-1 px-3 rounded-lg flex items-center gap-1.5 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Download Slip / Invoice</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section B: Home Eye Test Appointments */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <HomeIcon className="w-5 h-5 text-brand-cyan" /> Home Eye Test Checkups
                </h3>
                <p className="text-xs text-slate-400">Certified optometrist doorstep vision test &amp; frame trial sessions.</p>
              </div>
              <Link to="/home-eye-checkup" className="btn-secondary text-xs py-1.5 px-3 rounded-lg flex items-center gap-1 text-brand-cyan border-brand-cyan/20">
                <Plus className="w-3.5 h-3.5" /> Book Home Visit
              </Link>
            </div>

            {(!bookings.home_visits || bookings.home_visits.length === 0) ? (
              <div className="glass-card rounded-2xl p-8 text-center space-y-2">
                <HomeIcon className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">No home eye test visits requested yet.</p>
                <Link to="/home-eye-checkup" className="btn-primary text-xs py-2 px-4 inline-flex">
                  Schedule Free Home Eye Test
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bookings.home_visits.map((vis) => (
                  <div key={vis.id} className="glass-card rounded-2xl p-5 space-y-4 border border-white/10">
                    <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 block">Visit ID: #{vis.id}</span>
                        <h4 className="font-extrabold text-sm text-white mt-0.5">{vis.full_name}</h4>
                        <span className="text-[11px] text-brand-cyan font-mono">{vis.phone}</span>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 ${
                        vis.status === 'Confirmed' 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-emerald-glow'
                          : vis.status === 'Completed'
                          ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                          : vis.status === 'Cancelled'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                      }`}>
                        {vis.status === 'Confirmed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {vis.status === 'Pending' && <Clock className="w-3.5 h-3.5" />}
                        {vis.status}
                      </span>
                    </div>

                    {/* Status Info */}
                    <div className={`p-3 rounded-xl text-xs leading-relaxed ${
                      vis.status === 'Confirmed' 
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-200' 
                        : vis.status === 'Pending'
                        ? 'bg-amber-500/10 border border-amber-500/20 text-amber-200'
                        : 'bg-white/5 text-slate-300'
                    }`}>
                      {vis.status === 'Confirmed' ? (
                        <div>
                          <strong className="block font-bold mb-0.5">Optometrist Assigned &amp; Confirmed</strong>
                          Certified optometrist has been allocated to your area with portable digital equipment and 100+ trial frames.
                        </div>
                      ) : vis.status === 'Pending' ? (
                        <div>
                          <strong className="block font-bold mb-0.5">Route Allocation in Progress</strong>
                          Our dispatch team is assigning an optometrist to your pincode. We will confirm your preferred time slot shortly.
                        </div>
                      ) : (
                        <span>Status: {vis.status}</span>
                      )}
                    </div>

                    {/* Slot & Location */}
                    <div className="space-y-2 text-xs bg-white/5 p-3 rounded-xl">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Scheduled Date:</span>
                        <span className="font-bold text-white font-mono">{vis.visit_date}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Time Window:</span>
                        <span className="font-bold text-white font-mono">{vis.time_slot}</span>
                      </div>
                      <div className="pt-2 border-t border-white/5">
                        <span className="text-slate-400 block">Address:</span>
                        <span className="text-slate-200 mt-0.5 block leading-relaxed">
                          {vis.address}{vis.landmark ? ` (Landmark: ${vis.landmark})` : ''} - {vis.pincode}
                        </span>
                      </div>
                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={() => setInvoiceModalData({
                            invoiceNumber: `NU-HET-${vis.booking_number?.replace('HET-', '') || vis.id}`,
                            orderNumber: vis.booking_number || `HET-${vis.id}`,
                            invoiceDate: vis.visit_date || new Date().toISOString().split('T')[0],
                            type: 'HOME_EYE',
                            status: vis.status,
                            paymentMode: 'DOORSTEP_COD',
                            paymentStatus: vis.status === 'Completed' ? 'Paid' : 'Pending',
                            customerName: vis.full_name || user.full_name,
                            customerPhone: vis.phone || user.phone,
                            customerEmail: user.email,
                            customerAddress: `${vis.address || ''} - ${vis.pincode || ''}`,
                            zoneName: vis.service_tier || 'Doorstep Optometry',
                            appointmentDate: vis.visit_date,
                            appointmentTime: vis.time_slot,
                            totalAmount: vis.service_fee || 0,
                            subtotal: vis.service_fee || 0,
                            warrantyNote: 'Doorstep Optometry Eye Exam & 100+ Designer Frame Trial'
                          })}
                          className="btn-secondary text-[11px] py-1 px-3 rounded-lg flex items-center gap-1.5 text-brand-cyan border-brand-cyan/20 hover:bg-brand-cyan/10 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Download Slip / Invoice</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 3: SAVED ADDRESSES */}
      {activeTab === 'addresses' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-brand-cyan" /> Saved Delivery Addresses
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage your saved delivery locations for 1-click eyewear shipping and home eye checkups.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingAddressId(null);
                setAddrForm({
                  recipient_name: user?.full_name || '',
                  phone: user?.phone || '',
                  address_line1: '',
                  address_line2: '',
                  landmark: '',
                  city: '',
                  state: '',
                  pincode: '',
                  address_type: 'HOME',
                  is_default: addresses.length === 0
                });
                setAddressModalOpen(true);
              }}
              className="btn-primary text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-cyan-glow shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Add New Address
            </button>
          </div>

          {addresses.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center space-y-3 border-2 border-slate-200 dark:border-white/10">
              <MapPin className="w-10 h-10 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">No Addresses Saved Yet</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Save your home, clinic, or office address for lightning-fast 1-click checkout.</p>
              <button 
                onClick={() => {
                  setEditingAddressId(null);
                  setAddrForm({
                    recipient_name: user?.full_name || '',
                    phone: user?.phone || '',
                    address_line1: '',
                    address_line2: '',
                    landmark: '',
                    city: '',
                    state: '',
                    pincode: '',
                    address_type: 'HOME',
                    is_default: true
                  });
                  setAddressModalOpen(true);
                }} 
                className="btn-primary text-xs py-2 px-5 inline-flex shadow-cyan-glow"
              >
                <Plus className="w-3.5 h-3.5" /> Save First Address
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {addresses.map((addr) => (
                <div 
                  key={addr.id} 
                  className="glass-card rounded-2xl p-5 space-y-3.5 border-2 border-slate-300 dark:border-white/15 hover:border-brand-cyan/60 transition-all relative shadow-sm hover:shadow-md"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-[11px] text-brand-cyan tracking-wider uppercase px-2.5 py-0.5 rounded-md bg-brand-cyan/10 border border-brand-cyan/30">
                      {addr.address_type || 'HOME'}
                    </span>
                    <div className="flex items-center gap-2">
                      {addr.is_default == 1 ? (
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-300 font-bold border border-teal-500/30 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Default
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetDefault(addr.id)}
                          className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-brand-cyan transition-colors"
                        >
                          Make Default
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingAddressId(addr.id);
                          setAddrForm({
                            recipient_name: addr.recipient_name,
                            phone: addr.phone,
                            address_line1: addr.address_line1,
                            address_line2: addr.address_line2 || '',
                            landmark: addr.landmark || '',
                            city: addr.city,
                            state: addr.state,
                            pincode: addr.pincode,
                            address_type: addr.address_type || 'HOME',
                            is_default: addr.is_default == 1
                          });
                          setAddressModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-brand-cyan hover:bg-brand-cyan/10 border border-transparent hover:border-brand-cyan/20 transition-colors"
                        title="Edit Address"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors"
                        title="Delete Address"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{addr.recipient_name}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-mono mt-0.5">{addr.phone}</p>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-200 dark:border-white/5">
                    {addr.address_line1}
                    {addr.address_line2 ? `, ${addr.address_line2}` : ''}
                    {addr.landmark ? ` (Landmark: ${addr.landmark})` : ''}<br />
                    {addr.city}, {addr.state} - <strong className="font-mono text-slate-900 dark:text-white font-bold">{addr.pincode}</strong>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SAVED PRESCRIPTIONS VAULT */}
      {activeTab === 'prescriptions' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white">Your Optical Health Vault</h3>
              <p className="text-xs text-slate-400">Secure digital archive of your vision corrective prescriptions.</p>
            </div>
            <button
              onClick={() => setAddRxOpen(true)}
              className="btn-primary text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-cyan-glow"
            >
              <Plus className="w-3.5 h-3.5" /> Add New Prescription
            </button>
          </div>

          {prescriptions.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center space-y-3">
              <Eye className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-white">No Prescriptions Vaulted</h4>
              <p className="text-xs text-slate-400">Upload your eye power parameters to auto-populate future lens orders.</p>
              <button onClick={() => setAddRxOpen(true)} className="btn-primary text-xs py-2 px-4 inline-flex">
                Save First Prescription
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {prescriptions.map((rx) => (
                <div key={rx.id} className="glass-card rounded-2xl p-5 space-y-3 border border-white/10">
                  <div className="flex justify-between items-start border-b border-white/10 pb-2">
                    <div>
                      <h4 className="font-bold text-sm text-white">{rx.label}</h4>
                      <span className="text-[11px] text-slate-400">{rx.prescription_date || 'Current Active'}</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-brand-cyan/20 text-brand-cyan text-[10px] font-bold">
                      PD: {rx.single_pd ? `${rx.single_pd} mm` : `${rx.right_pd}/${rx.left_pd} mm`}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-center font-mono">
                      <thead>
                        <tr className="text-slate-400 border-b border-white/5">
                          <th className="py-1 text-left">Eye</th>
                          <th className="py-1">SPH</th>
                          <th className="py-1">CYL</th>
                          <th className="py-1">AXIS</th>
                          <th className="py-1">ADD</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        <tr>
                          <td className="py-1.5 text-left font-bold text-brand-cyan">Right (OD)</td>
                          <td>{rx.right_sph ?? '0.00'}</td>
                          <td>{rx.right_cyl ?? '0.00'}</td>
                          <td>{rx.right_axis ? `${rx.right_axis}°` : '-'}</td>
                          <td>{rx.right_add ?? '-'}</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 text-left font-bold text-brand-teal">Left (OS)</td>
                          <td>{rx.left_sph ?? '0.00'}</td>
                          <td>{rx.left_cyl ?? '0.00'}</td>
                          <td>{rx.left_axis ? `${rx.left_axis}°` : '-'}</td>
                          <td>{rx.left_add ?? '-'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {rx.notes && (
                    <p className="text-[11px] text-slate-400 bg-white/5 p-2.5 rounded-lg">
                      {rx.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ADD / EDIT ADDRESS MODAL */}
      {addressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-white dark:bg-[#0A192F] border-2 border-slate-300 dark:border-white/15 rounded-3xl p-6 sm:p-7 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingAddressId ? 'Edit Delivery Address' : 'Add Delivery Address'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {editingAddressId ? 'Update your saved delivery address details.' : 'Save destination for orders and optometrist home visits.'}
                </p>
              </div>
              <button onClick={() => setAddressModalOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Recipient Name *</label>
                  <input 
                    type="text" 
                    required
                    value={addrForm.recipient_name} 
                    onChange={(e) => setAddrForm({...addrForm, recipient_name: e.target.value})} 
                    placeholder="Full name"
                    className="w-full glass-input rounded-xl px-3 py-2.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Phone Number *</label>
                  <input 
                    type="tel" 
                    required
                    value={addrForm.phone} 
                    onChange={(e) => setAddrForm({...addrForm, phone: e.target.value})} 
                    placeholder="10-digit mobile number"
                    className="w-full glass-input rounded-xl px-3 py-2.5 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Street Address / Flat No *</label>
                <input 
                  type="text" 
                  required
                  value={addrForm.address_line1} 
                  onChange={(e) => setAddrForm({...addrForm, address_line1: e.target.value})} 
                  placeholder="e.g. Flat 302, Sea Pearl Heights, Foreshore Road"
                  className="w-full glass-input rounded-xl px-3 py-2.5"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Area / Locality</label>
                  <input 
                    type="text" 
                    value={addrForm.address_line2} 
                    onChange={(e) => setAddrForm({...addrForm, address_line2: e.target.value})} 
                    placeholder="e.g. Sea Beach Market"
                    className="w-full glass-input rounded-xl px-3 py-2.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Landmark (Optional)</label>
                  <input 
                    type="text" 
                    value={addrForm.landmark} 
                    onChange={(e) => setAddrForm({...addrForm, landmark: e.target.value})} 
                    placeholder="e.g. Near New Digha Railway Station"
                    className="w-full glass-input rounded-xl px-3 py-2.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">City *</label>
                  <input 
                    type="text" 
                    required
                    value={addrForm.city} 
                    onChange={(e) => setAddrForm({...addrForm, city: e.target.value})} 
                    placeholder="e.g. Digha"
                    className="w-full glass-input rounded-xl px-3 py-2.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">State *</label>
                  <input 
                    type="text" 
                    required
                    value={addrForm.state} 
                    onChange={(e) => setAddrForm({...addrForm, state: e.target.value})} 
                    placeholder="e.g. West Bengal"
                    className="w-full glass-input rounded-xl px-3 py-2.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Pincode *</label>
                  <input 
                    type="text" 
                    required
                    value={addrForm.pincode} 
                    onChange={(e) => setAddrForm({...addrForm, pincode: e.target.value})} 
                    placeholder="e.g. 721428"
                    className="w-full glass-input rounded-xl px-3 py-2.5 font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex gap-2">
                  {['HOME', 'OFFICE', 'OTHER'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setAddrForm({...addrForm, address_type: type})}
                      className={`px-3 py-1.5 rounded-lg font-bold text-[10px] border transition-all ${
                        addrForm.address_type === type 
                          ? 'bg-brand-cyan text-slate-950 font-black border-brand-cyan shadow-sm' 
                          : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                  <input 
                    type="checkbox" 
                    checked={addrForm.is_default}
                    onChange={(e) => setAddrForm({...addrForm, is_default: e.target.checked})}
                    className="rounded border-slate-300 dark:border-white/20 text-brand-cyan focus:ring-0"
                  />
                  <span className="font-medium">Make default address</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                <button 
                  type="button" 
                  onClick={() => setAddressModalOpen(false)} 
                  className="px-4 py-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white font-semibold"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={savingAddr}
                  className="btn-primary text-xs py-2 px-5 rounded-xl shadow-cyan-glow"
                >
                  {savingAddr ? 'Saving...' : editingAddressId ? 'Update Address' : 'Save Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD NEW PRESCRIPTION MODAL */}
      {addRxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#0A192F] border border-white/15 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white">Save Prescription to Vault</h3>
              <button onClick={() => setAddRxOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePrescription} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Prescription Label</label>
                <input 
                  type="text" 
                  required
                  value={newRxLabel} 
                  onChange={(e) => setNewRxLabel(e.target.value)} 
                  placeholder="e.g. Daily Screen Rx"
                  className="w-full glass-input rounded-xl px-3 py-2"
                />
              </div>

              {/* Right Eye */}
              <div className="p-3 rounded-xl bg-white/5 space-y-2">
                <span className="font-bold text-brand-cyan block">Right Eye (OD)</span>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400">SPH</span>
                    <input type="text" value={rSph} onChange={(e) => setRSph(e.target.value)} placeholder="0.00" className="w-full glass-input rounded px-1 text-center py-1 font-mono" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">CYL</span>
                    <input type="text" value={rCyl} onChange={(e) => setRCyl(e.target.value)} placeholder="0.00" className="w-full glass-input rounded px-1 text-center py-1 font-mono" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">AXIS</span>
                    <input type="number" value={rAxis} onChange={(e) => setRAxis(e.target.value)} placeholder="90" className="w-full glass-input rounded px-1 text-center py-1 font-mono" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">PD</span>
                    <input type="text" value={rPd} onChange={(e) => setRPd(e.target.value)} placeholder="31.5" className="w-full glass-input rounded px-1 text-center py-1 font-mono" />
                  </div>
                </div>
              </div>

              {/* Left Eye */}
              <div className="p-3 rounded-xl bg-white/5 space-y-2">
                <span className="font-bold text-brand-teal block">Left Eye (OS)</span>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400">SPH</span>
                    <input type="text" value={lSph} onChange={(e) => setLSph(e.target.value)} placeholder="0.00" className="w-full glass-input rounded px-1 text-center py-1 font-mono" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">CYL</span>
                    <input type="text" value={lCyl} onChange={(e) => setLCyl(e.target.value)} placeholder="0.00" className="w-full glass-input rounded px-1 text-center py-1 font-mono" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">AXIS</span>
                    <input type="number" value={lAxis} onChange={(e) => setLAxis(e.target.value)} placeholder="90" className="w-full glass-input rounded px-1 text-center py-1 font-mono" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">PD</span>
                    <input type="text" value={lPd} onChange={(e) => setLPd(e.target.value)} placeholder="31.5" className="w-full glass-input rounded px-1 text-center py-1 font-mono" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Doctor / Clinic Notes</label>
                <input 
                  type="text" 
                  value={rxNotes} 
                  onChange={(e) => setRxNotes(e.target.value)} 
                  placeholder="e.g. Anti-glare coating recommended..."
                  className="w-full glass-input rounded-xl px-3 py-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setAddRxOpen(false)} className="px-4 py-2 text-slate-400">Cancel</button>
                <button type="submit" className="btn-primary text-xs py-2 px-5 rounded-xl">Save to Vault</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Watermarked Tax Invoice & Guarantee Certificate Modal */}
      <InvoiceModal
        isOpen={!!invoiceModalData}
        onClose={() => setInvoiceModalData(null)}
        invoiceData={invoiceModalData}
      />

    </div>
  );
};
