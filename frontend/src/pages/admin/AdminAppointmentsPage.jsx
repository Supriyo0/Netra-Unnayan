import React, { useState, useEffect } from 'react';
import { 
  Calendar, CheckCircle2, XCircle, Clock, MapPin, 
  User, Phone, Mail, Stethoscope, Home as HomeIcon, 
  Search, RefreshCw, AlertCircle, Shield, Award, FileText,
  Tag, FileCheck, Check
} from 'lucide-react';
import api from '../../api/client';
import { InvoiceModal } from '../../components/common/InvoiceModal';

export const AdminAppointmentsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [metrics, setMetrics] = useState({
    pending_total: 0,
    pending_doctor: 0,
    pending_home_eye: 0,
    today_clinic_visits: 0,
    today_home_visits: 0
  });
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'doctor', 'home_eye'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'Pending', 'Confirmed', 'Cancelled'
  const [search, setSearch] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [message, setMessage] = useState(null);

  // Approval Modal with Ticket No & Desk Note
  const [approveModal, setApproveModal] = useState({
    isOpen: false,
    booking: null,
    ticketNo: '',
    adminNote: '',
    assignedOptometrist: '',
    isSubmitting: false
  });

  const [emailModal, setEmailModal] = useState({
    isOpen: false,
    booking: null,
    subject: '',
    messageText: '',
    isSending: false
  });
  const [rescheduleModal, setRescheduleModal] = useState({
    isOpen: false,
    booking: null,
    newDate: '',
    newSlot: '',
    note: '',
    isSubmitting: false
  });
  const [invoiceModalData, setInvoiceModalData] = useState(null);

  const fetchBookings = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await api.get(`/admin/appointments.php?type=${typeFilter}&status=${statusFilter}`);
      if (res.success && res.data) {
        setBookings(res.data.bookings || []);
        if (res.data.metrics) setMetrics(res.data.metrics);
      }
    } catch (err) {
      console.error('Failed to load appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [typeFilter, statusFilter]);

  const openApproveModal = (booking) => {
    // Generate an automatic default token/ticket identifier if not already assigned
    const defaultTicket = booking.ticket_no || (booking.booking_type === 'doctor' 
      ? `TKN-${String(booking.id).padStart(3, '0')}` 
      : `HET-${String(booking.id).padStart(3, '0')}`);

    setApproveModal({
      isOpen: true,
      booking,
      ticketNo: defaultTicket,
      adminNote: '',
      assignedOptometrist: booking.assigned_optometrist || 'Certified Senior Optometrist (Mobile Lab)',
      isSubmitting: false
    });
  };

  const handleQuickApprove = async (booking) => {
    const defaultTicket = booking.ticket_no || (booking.booking_type === 'doctor' 
      ? `TKN-${String(booking.id).padStart(3, '0')}` 
      : `HET-${String(booking.id).padStart(3, '0')}`);

    setProcessingId(booking.id);
    setMessage(null);
    try {
      const res = await api.post('/admin/appointments.php', {
        action: 'approve',
        booking_type: booking.booking_type,
        id: booking.id,
        ticket_no: defaultTicket,
        admin_note: 'Approved & Scheduled by Clinic Desk',
        assigned_optometrist: booking.assigned_optometrist || 'Certified Senior Optometrist (Mobile Lab)'
      });

      if (res.success) {
        setMessage({ 
          type: 'success', 
          text: res.message || `Booking #${booking.reference_number || booking.id} confirmed and email dispatched!` 
        });
        await fetchBookings();
      } else {
        setMessage({ type: 'error', text: res.message || 'Approval failed.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Error approving booking.' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkCompleted = async (booking) => {
    if (!window.confirm(`Mark ${booking.booking_type === 'doctor' ? 'doctor consultation' : 'home eye visit'} #${booking.reference_number || booking.id} as Completed?`)) return;

    setProcessingId(booking.id);
    setMessage(null);
    try {
      const res = await api.post('/admin/appointments.php', {
        action: 'complete',
        booking_type: booking.booking_type,
        id: booking.id
      });

      if (res.success) {
        setMessage({ 
          type: 'success', 
          text: res.message || `Booking #${booking.reference_number || booking.id} marked as Completed!` 
        });
        await fetchBookings();
      } else {
        setMessage({ type: 'error', text: res.message || 'Action failed.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Error updating status.' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmApprove = async (e) => {
    e.preventDefault();
    if (!approveModal.booking) return;

    setApproveModal(prev => ({ ...prev, isSubmitting: true }));
    try {
      const res = await api.post('/admin/appointments.php', {
        action: 'approve',
        booking_type: approveModal.booking.booking_type,
        id: approveModal.booking.id,
        ticket_no: approveModal.ticketNo.trim(),
        admin_note: approveModal.adminNote.trim(),
        assigned_optometrist: approveModal.assignedOptometrist.trim()
      });

      if (res.success) {
        setMessage({ 
          type: 'success', 
          text: res.message || `Booking #${approveModal.booking.reference_number} approved successfully!` 
        });
        setApproveModal({ isOpen: false, booking: null, ticketNo: '', adminNote: '', assignedOptometrist: '', isSubmitting: false });
        fetchBookings();
      } else {
        alert(res.message || 'Failed to approve booking.');
      }
    } catch (err) {
      alert(err.message || 'Network error approving booking.');
    } finally {
      setApproveModal(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleCancel = async (booking) => {
    const reason = prompt('Please enter cancellation reason for patient notification:', 'Slot unavailable / Rescheduled by Clinic');
    if (!reason) return;

    setProcessingId(booking.id);
    try {
      const res = await api.post('/admin/appointments.php', {
        action: 'cancel',
        booking_type: booking.booking_type,
        id: booking.id,
        reason
      });

      if (res.success) {
        setMessage({ type: 'success', text: 'Booking cancelled.' });
        fetchBookings();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Error cancelling booking.' });
    } finally {
      setProcessingId(null);
    }
  };

  const openEmailModal = (booking) => {
    setEmailModal({
      isOpen: true,
      booking,
      subject: `Update regarding your Netra Unnayan appointment #${booking.reference_number || booking.id}`,
      messageText: `Dear ${booking.customer_name},\n\nWe would like to share an update regarding your upcoming appointment with Netra Unnayan.\n\nDate: ${booking.scheduled_date}\nTime Slot: ${booking.scheduled_slot}\n\nPlease feel free to reach out to us if you need any assistance or wish to adjust your schedule.\n\nWarm regards,\nNetra Unnayan Eye Care Team`,
      isSending: false
    });
  };

  const openRescheduleModal = (booking) => {
    setRescheduleModal({
      isOpen: true,
      booking,
      newDate: booking.scheduled_date || '',
      newSlot: booking.scheduled_slot || '',
      note: 'Alternative slot recommended by clinic desk',
      isSubmitting: false
    });
  };

  const handleRequestChangeDate = async (e) => {
    e.preventDefault();
    if (!rescheduleModal.booking || !rescheduleModal.newDate) return;

    setRescheduleModal(prev => ({ ...prev, isSubmitting: true }));
    try {
      const res = await api.post('/admin/appointments.php', {
        action: 'request_change_date',
        booking_type: rescheduleModal.booking.booking_type,
        id: rescheduleModal.booking.id,
        new_date: rescheduleModal.newDate,
        new_slot: rescheduleModal.newSlot,
        note: rescheduleModal.note
      });

      if (res.success) {
        setMessage({ type: 'success', text: res.message || 'Date change request sent and patient notified.' });
        setRescheduleModal({ isOpen: false, booking: null, newDate: '', newSlot: '', note: '', isSubmitting: false });
        fetchBookings();
      } else {
        alert(res.message || 'Failed to request date change.');
      }
    } catch (err) {
      alert(err.message || 'Error requesting date change.');
    } finally {
      setRescheduleModal(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleSendCustomEmail = async (e) => {
    e.preventDefault();
    if (!emailModal.booking || !emailModal.messageText) return;

    setEmailModal(prev => ({ ...prev, isSending: true }));
    try {
      const res = await api.post('/admin/appointments.php', {
        action: 'send_message',
        booking_type: emailModal.booking.booking_type,
        id: emailModal.booking.id,
        subject: emailModal.subject,
        message: emailModal.messageText
      });

      if (res.success) {
        setMessage({ type: 'success', text: res.message || 'Email sent to patient successfully!' });
        setEmailModal({ isOpen: false, booking: null, subject: '', messageText: '', isSending: false });
      } else {
        alert(res.message || 'Failed to send email.');
      }
    } catch (err) {
      alert(err.message || 'Error dispatching email.');
    } finally {
      setEmailModal(prev => ({ ...prev, isSending: false }));
    }
  };

  const filteredBookings = bookings.filter(b => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      b.reference_number?.toLowerCase().includes(q) ||
      b.customer_name?.toLowerCase().includes(q) ||
      b.customer_phone?.toLowerCase().includes(q) ||
      b.doctor_name?.toLowerCase().includes(q) ||
      b.ticket_no?.toLowerCase().includes(q) ||
      b.notes?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
        <div>
          <span className="text-xs uppercase font-extrabold tracking-wider text-sky-700 dark:text-brand-cyan">
            Clinical Operations Center
          </span>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Calendar className="w-6 h-6 text-sky-600 dark:text-brand-cyan" />
            Appointments &amp; Home Eye Test Bookings
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Review incoming doctor consultation slots and home diagnostic visits. Approve with ticket number and clinic notes to notify patients.
          </p>
        </div>

        <button
          onClick={fetchBookings}
          className="text-xs py-2 px-3.5 rounded-xl flex items-center gap-2 self-start sm:self-auto bg-white hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-white/10 font-bold shadow-sm transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-600' : ''}`} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl p-4 border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/5 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">Pending Approval</span>
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono">
            {metrics.pending_total}
          </div>
          <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
            {metrics.pending_doctor} Clinic &bull; {metrics.pending_home_eye} Doorstep
          </div>
        </div>

        <div className="rounded-2xl p-4 border border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/5 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">Today's Clinic Slots</span>
            <Stethoscope className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono">
            {metrics.today_clinic_visits}
          </div>
          <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 font-medium">Visiting specialists active</div>
        </div>

        <div className="rounded-2xl p-4 border border-teal-300 dark:border-brand-teal/30 bg-teal-50 dark:bg-brand-teal/5 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-teal-800 dark:text-brand-teal uppercase tracking-wider">Today's Home Tests</span>
            <HomeIcon className="w-4 h-4 text-teal-600 dark:text-brand-teal" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono">
            {metrics.today_home_visits}
          </div>
          <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 font-medium">Doorstep visits scheduled</div>
        </div>

        <div className="rounded-2xl p-4 border border-sky-300 dark:border-brand-cyan/30 bg-sky-50 dark:bg-brand-cyan/5 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-sky-800 dark:text-brand-cyan uppercase tracking-wider">Active Patient Queue</span>
            <Shield className="w-4 h-4 text-sky-600 dark:text-brand-cyan" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono">
            {bookings.length}
          </div>
          <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 font-medium">Total booked consultations</div>
        </div>
      </div>

      {/* Action Notification Alert */}
      {message && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between gap-3 border animate-fadeIn ${
          message.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300' 
            : 'bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/30 text-rose-800 dark:text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-500 hover:text-slate-900 dark:hover:text-white font-black">✕</button>
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <div className="rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 shadow-sm">
        
        {/* Type Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All Bookings' },
            { id: 'doctor', label: 'Doctor Clinic' },
            { id: 'home_eye', label: 'Home Checkups' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setTypeFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                typeFilter === tab.id 
                  ? 'bg-gradient-to-r from-sky-600 to-cyan-600 text-white shadow-md' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Status Filter & Search */}
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="all">All Statuses</option>
            <option value="Pending">Pending Only</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search name, phone, ticket, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>
      </div>

      {/* Bookings Table / Cards */}
      <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-slate-900/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-white/10">
              <tr>
                <th className="p-4">Type &amp; ID</th>
                <th className="p-4">Patient / Customer</th>
                <th className="p-4">Scheduled Slot</th>
                <th className="p-4">Service &amp; Doctor</th>
                <th className="p-4">Fee &amp; Payment</th>
                <th className="p-4">Status &amp; Token</th>
                <th className="p-4 text-right">Approval Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-10 text-center text-slate-500 dark:text-slate-400">
                    <Calendar className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
                    No bookings found matching current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => {
                  const isPending = b.status?.toLowerCase() === 'pending' || b.status?.toLowerCase() === 'requested';
                  const isConfirmed = b.status?.toLowerCase() === 'confirmed';
                  const isCancelled = b.status?.toLowerCase() === 'cancelled';

                  return (
                    <tr key={`${b.booking_type}-${b.id}`} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
                      
                      {/* 1. Type & ID */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                            b.booking_type === 'doctor' 
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' 
                              : 'bg-teal-100 text-teal-700 dark:bg-brand-teal/20 dark:text-brand-teal'
                          }`}>
                            {b.booking_type === 'doctor' ? <Stethoscope className="w-3.5 h-3.5" /> : <HomeIcon className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">{b.reference_number}</span>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">
                              {b.booking_type === 'doctor' ? 'Clinic Slot' : 'Home Visit'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Patient / Customer */}
                      <td className="p-4">
                        <div className="font-bold text-slate-900 dark:text-white text-xs">{b.customer_name}</div>
                        <div className="text-[11px] text-sky-700 dark:text-brand-cyan font-mono font-semibold flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 shrink-0" />
                          <a href={`tel:${b.customer_phone}`} className="hover:underline">{b.customer_phone}</a>
                        </div>
                        {b.customer_email && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[140px]">{b.customer_email}</div>
                        )}
                      </td>

                      {/* 3. Scheduled Slot */}
                      <td className="p-4">
                        <div className="font-bold text-slate-900 dark:text-white text-xs font-mono">{b.scheduled_date}</div>
                        <div className="text-[11px] text-teal-700 dark:text-brand-teal mt-0.5 flex items-center gap-1 font-semibold">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>{b.scheduled_slot}</span>
                        </div>
                      </td>

                      {/* 4. Service & Doctor */}
                      <td className="p-4">
                        {b.booking_type === 'doctor' ? (
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-xs">{b.doctor_name}</div>
                            <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">{b.specialization}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-500">{b.qualification}</div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-xs">Doorstep Refraction</div>
                            <div className="text-[10px] text-slate-600 dark:text-slate-400 truncate max-w-[160px]">{b.address_line1}</div>
                            <div className="text-[10px] text-sky-700 dark:text-brand-cyan font-mono font-semibold">PIN: {b.pincode}</div>
                            {b.assigned_optometrist && (
                              <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold mt-0.5">&#10003; {b.assigned_optometrist}</div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 5. Fee & Payment */}
                      <td className="p-4">
                        <div className="font-bold text-slate-900 dark:text-white text-xs font-mono">₹{b.fee}</div>
                        <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">{b.payment_status}</div>
                      </td>

                      {/* 6. Status & Token Badge */}
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          isPending 
                            ? 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40 animate-pulse' 
                            : isConfirmed 
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40' 
                            : 'bg-rose-100 text-rose-900 border border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            isPending ? 'bg-amber-500' : isConfirmed ? 'bg-emerald-500' : 'bg-rose-500'
                          }`} />
                          {b.status}
                        </span>

                        {/* Ticket / Token pill if assigned */}
                        {b.ticket_no && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-900/40 text-sky-900 dark:text-sky-300 font-mono text-[10px] font-extrabold border border-sky-300 dark:border-sky-700">
                              <Tag className="w-2.5 h-2.5" />
                              Token: #{b.ticket_no}
                            </span>
                          </div>
                        )}

                        {b.notes && (
                          <div className="text-[9.5px] text-slate-600 dark:text-slate-400 mt-1 line-clamp-1 italic max-w-[140px]" title={b.notes}>
                            {b.notes}
                          </div>
                        )}
                      </td>

                      {/* 7. Action Buttons */}
                      <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                        {isPending && (
                          <>
                            <button
                              onClick={() => handleQuickApprove(b)}
                              disabled={processingId === b.id}
                              className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black inline-flex items-center gap-1 shadow-md hover:shadow-emerald-500/20 transition-all cursor-pointer"
                              title="1-Click Instant Confirm & Dispatch Confirmation Email"
                            >
                              <CheckCircle2 className={`w-3.5 h-3.5 ${processingId === b.id ? 'animate-spin' : ''}`} />
                              <span>{processingId === b.id ? 'Confirming...' : 'Approve'}</span>
                            </button>

                            <button
                              onClick={() => openApproveModal(b)}
                              disabled={processingId === b.id}
                              className="py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-white/10 dark:hover:bg-white/20 dark:text-slate-200 text-xs font-semibold inline-flex items-center gap-1 transition-all cursor-pointer"
                              title="Approve with custom Token / Ticket No & Clinic Notes"
                            >
                              <Tag className="w-3 h-3 text-sky-500" />
                              <span>+ Note</span>
                            </button>
                          </>
                        )}

                        {isConfirmed && (
                          <>
                            <button
                              onClick={() => handleMarkCompleted(b)}
                              disabled={processingId === b.id}
                              className="py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold inline-flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                              title="Mark this visit as Fulfilled / Completed"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Mark Done</span>
                            </button>
                          </>
                        )}

                        {!isCancelled && (
                          <button
                            onClick={() => openRescheduleModal(b)}
                            disabled={processingId === b.id}
                            className="py-1.5 px-2.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-500/15 dark:hover:bg-amber-500/25 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 text-xs font-bold inline-flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                            title="Propose new date / slot to customer"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Reschedule</span>
                          </button>
                        )}

                        {b.customer_email && (
                          <button
                            onClick={() => openEmailModal(b)}
                            className="p-1.5 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-900 dark:bg-cyan-500/15 dark:hover:bg-cyan-500/25 dark:text-cyan-300 border border-sky-300 dark:border-cyan-500/40 text-xs inline-flex items-center shadow-sm transition-all cursor-pointer"
                            title={`Send custom email to ${b.customer_name}`}
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {!isCancelled && (
                          <button
                            onClick={() => handleCancel(b)}
                            disabled={processingId === b.id}
                            className="p-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-900 dark:bg-rose-500/15 dark:hover:bg-rose-500/25 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40 text-xs inline-flex items-center shadow-sm transition-all cursor-pointer"
                            title="Cancel Booking"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => setInvoiceModalData({
                            invoiceNumber: b.booking_type === 'doctor' ? `NU-DOC-${b.id}` : `NU-HET-${b.id}`,
                            orderNumber: b.booking_type === 'doctor' ? (b.reference_number || `DOC-${b.id}`) : (b.reference_number || `HET-${b.id}`),
                            ticket_no: b.ticket_no,
                            ticketNo: b.ticket_no,
                            invoiceDate: b.scheduled_date || new Date().toISOString().split('T')[0],
                            type: b.booking_type === 'doctor' ? 'DOCTOR' : 'HOME_EYE',
                            status: b.status,
                            paymentMode: b.booking_type === 'doctor' ? 'CLINIC_DESK' : 'DOORSTEP_COD',
                            paymentStatus: b.payment_status || 'Pending',
                            customerName: b.customer_name,
                            customerPhone: b.customer_phone,
                            customerEmail: b.customer_email,
                            customerAddress: b.booking_type === 'doctor' ? 'Netra Unnayan Main Clinic, Digha' : `${b.address_line1 || ''} - ${b.pincode || ''}`,
                            doctorName: b.doctor_name,
                            specialty: b.specialization,
                            appointmentDate: b.scheduled_date,
                            appointmentTime: b.scheduled_slot,
                            assigned_optometrist: b.assigned_optometrist,
                            totalAmount: b.fee,
                            subtotal: b.fee,
                            notes: b.notes
                          })}
                          className="p-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 text-xs inline-flex items-center shadow-sm transition-all cursor-pointer"
                          title="View / Print Official Slip"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= APPROVE MODAL (WITH TICKET NO & NOTE) ================= */}
      {approveModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-emerald-500/40 rounded-2xl p-6 shadow-2xl space-y-4 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/40 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Approve &amp; Confirm Booking
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Ref: <span className="text-emerald-700 dark:text-emerald-400 font-bold font-mono">{approveModal.booking?.reference_number}</span> &bull; {approveModal.booking?.customer_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setApproveModal(prev => ({ ...prev, isOpen: false }))}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmApprove} className="space-y-4">
              
              {/* Ticket / Token No Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Ticket No / Token No *
                </label>
                <div className="relative">
                  <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={approveModal.ticketNo}
                    onChange={(e) => setApproveModal(prev => ({ ...prev, ticketNo: e.target.value }))}
                    placeholder="e.g. TK-DOC-012 or Token #5"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-white/20 rounded-xl text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                  This token/ticket identifier will be printed on the invoice slip and sent via confirmation email.
                </span>
              </div>

              {/* Optometrist Assignment for Home Checkups */}
              {approveModal.booking?.booking_type === 'home_eye' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Assigned Doorstep Optometrist
                  </label>
                  <input
                    type="text"
                    required
                    value={approveModal.assignedOptometrist}
                    onChange={(e) => setApproveModal(prev => ({ ...prev, assignedOptometrist: e.target.value }))}
                    placeholder="e.g. Senior Optometrist (Mobile Lab Unit 1)"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-white/20 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}

              {/* Admin Note */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Admin / Clinic Desk Note
                </label>
                <textarea
                  rows={3}
                  value={approveModal.adminNote}
                  onChange={(e) => setApproveModal(prev => ({ ...prev, adminNote: e.target.value }))}
                  placeholder="e.g. Please report to Room 2 on 1st floor; arrive 10 min early."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-white/20 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setApproveModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={approveModal.isSubmitting}
                  className="py-2 px-5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md inline-flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {approveModal.isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Confirming...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve &amp; Dispatch Pass</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ================= CUSTOM EMAIL MODAL ================= */}
      {emailModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-sky-500/40 rounded-2xl p-6 shadow-2xl space-y-4 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-500/20 border border-sky-300 dark:border-sky-500/40 flex items-center justify-center text-sky-700 dark:text-brand-cyan">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Send Email to Patient</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    To: <span className="text-sky-700 dark:text-brand-cyan font-bold">{emailModal.booking?.customer_name}</span> ({emailModal.booking?.customer_email})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEmailModal(prev => ({ ...prev, isOpen: false }))}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendCustomEmail} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={emailModal.subject}
                  onChange={(e) => setEmailModal(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-white/20 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Message Body</label>
                <textarea
                  rows={6}
                  required
                  value={emailModal.messageText}
                  onChange={(e) => setEmailModal(prev => ({ ...prev, messageText: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-white/20 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setEmailModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={emailModal.isSending}
                  className="py-2 px-5 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-700 text-white shadow-md inline-flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {emailModal.isSending ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-3.5 h-3.5" />
                      <span>Send Message</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= REQUEST CHANGE DATE MODAL ================= */}
      {rescheduleModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-amber-500/40 rounded-2xl p-6 shadow-2xl space-y-4 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/40 flex items-center justify-center text-amber-700 dark:text-amber-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Request Date / Slot Change</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Patient: <span className="text-amber-700 dark:text-amber-400 font-bold">{rescheduleModal.booking?.customer_name}</span> (#{rescheduleModal.booking?.reference_number})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRescheduleModal(prev => ({ ...prev, isOpen: false }))}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRequestChangeDate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Proposed New Date *
                </label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={rescheduleModal.newDate}
                  onChange={(e) => setRescheduleModal(prev => ({ ...prev, newDate: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-white/20 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Proposed Time Window / Slot
                </label>
                <input
                  type="text"
                  value={rescheduleModal.newSlot}
                  onChange={(e) => setRescheduleModal(prev => ({ ...prev, newSlot: e.target.value }))}
                  placeholder="e.g. 11:30 AM or 02:00 PM - 04:00 PM"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-white/20 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Clinic Note to Patient
                </label>
                <textarea
                  rows="3"
                  value={rescheduleModal.note}
                  onChange={(e) => setRescheduleModal(prev => ({ ...prev, note: e.target.value }))}
                  placeholder="Reason for change or instructions..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-white/20 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setRescheduleModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rescheduleModal.isSubmitting}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-md inline-flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {rescheduleModal.isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Notifying Patient...</span>
                    </>
                  ) : (
                    <>
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Send Date Change</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dedicated Clinical / Doorstep Slip Modal */}
      {invoiceModalData && (
        <InvoiceModal
          isOpen={!!invoiceModalData}
          onClose={() => setInvoiceModalData(null)}
          invoiceData={invoiceModalData}
        />
      )}

    </div>
  );
};
