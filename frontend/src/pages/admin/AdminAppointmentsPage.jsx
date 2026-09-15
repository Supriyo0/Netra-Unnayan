import React, { useState, useEffect } from 'react';
import { 
  Calendar, CheckCircle2, XCircle, Clock, MapPin, 
  User, Phone, Mail, Stethoscope, Home as HomeIcon, 
  Search, RefreshCw, AlertCircle, Shield, Award 
} from 'lucide-react';
import api from '../../api/client';

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

  const handleApprove = async (booking) => {
    setProcessingId(booking.id);
    setMessage(null);
    try {
      let optometrist = '';
      if (booking.booking_type === 'home_eye') {
        optometrist = prompt('Enter assigned Optometrist Name for this doorstep checkup:', 'Senior Optometrist (Mobile Lab)') || 'Senior Optometrist';
      }

      const res = await api.post('/admin/appointments.php', {
        action: 'approve',
        booking_type: booking.booking_type,
        id: booking.id,
        assigned_optometrist: optometrist
      });

      if (res.success) {
        setMessage({ type: 'success', text: res.message || 'Booking approved and customer confirmed!' });
        fetchBookings();
      } else {
        setMessage({ type: 'error', text: res.message || 'Failed to approve booking.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Network error approving booking.' });
    } finally {
      setProcessingId(null);
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

  const filteredBookings = bookings.filter(b => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      b.reference_number?.toLowerCase().includes(q) ||
      b.customer_name?.toLowerCase().includes(q) ||
      b.customer_phone?.toLowerCase().includes(q) ||
      b.doctor_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <span className="text-xs uppercase font-extrabold tracking-wider text-brand-cyan">
            Clinical Operations Center
          </span>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Calendar className="w-6 h-6 text-brand-cyan" />
            Appointments &amp; Home Eye Test Bookings
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Review incoming doctor consultation slots and home diagnostic visits. Approve to notify patients.
          </p>
        </div>

        <button
          onClick={fetchBookings}
          className="btn-secondary text-xs py-2 px-3.5 rounded-xl flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-4 border border-amber-500/30 bg-amber-500/5">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Pending Approval</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2 font-mono">
            {metrics.pending_total}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {metrics.pending_doctor} Clinic &bull; {metrics.pending_home_eye} Doorstep
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-emerald-500/30 bg-emerald-500/5">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Today's Clinic Slots</span>
            <Stethoscope className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2 font-mono">
            {metrics.today_clinic_visits}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Visiting specialists active</div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-brand-teal/30 bg-brand-teal/5">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-brand-teal uppercase tracking-wider">Today's Home Tests</span>
            <HomeIcon className="w-4 h-4 text-brand-teal" />
          </div>
          <div className="text-2xl font-black text-white mt-2 font-mono">
            {metrics.today_home_visits}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Doorstep visits scheduled</div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-brand-cyan/30 bg-brand-cyan/5">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-brand-cyan uppercase tracking-wider">Active Patient Queue</span>
            <Shield className="w-4 h-4 text-brand-cyan" />
          </div>
          <div className="text-2xl font-black text-white mt-2 font-mono">
            {bookings.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Total booked consultations</div>
        </div>
      </div>

      {/* Action Notification Alert */}
      {message && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between gap-3 border animate-fadeIn ${
          message.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <div className="glass-card rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
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
                  ? 'bg-brand-cyan text-slate-950 shadow-sm' 
                  : 'bg-white/5 hover:bg-white/10 text-slate-300'
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
            className="glass-input rounded-xl px-3 py-1.5 text-xs font-semibold"
          >
            <option value="all">All Statuses</option>
            <option value="Pending">Pending Only</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search by name, phone, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full glass-input rounded-xl pl-9 pr-3 py-1.5 text-xs placeholder:text-slate-500"
            />
          </div>
        </div>
      </div>

      {/* Bookings Table / Cards */}
      <div className="glass-card rounded-2xl overflow-hidden border border-white/10 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-slate-400 font-bold uppercase tracking-wider border-b border-white/10">
              <tr>
                <th className="p-4">Type &amp; ID</th>
                <th className="p-4">Patient / Customer</th>
                <th className="p-4">Scheduled Slot</th>
                <th className="p-4">Service &amp; Doctor</th>
                <th className="p-4">Fee &amp; Payment</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Approval Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-10 text-center text-slate-400">
                    <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    No bookings found matching current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => {
                  const isPending = b.status?.toLowerCase() === 'pending';
                  const isConfirmed = b.status?.toLowerCase() === 'confirmed';
                  const isCancelled = b.status?.toLowerCase() === 'cancelled';

                  return (
                    <tr key={`${b.booking_type}-${b.id}`} className="hover:bg-white/[0.02] transition-colors">
                      
                      {/* 1. Type & ID */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                            b.booking_type === 'doctor' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-brand-teal/20 text-brand-teal'
                          }`}>
                            {b.booking_type === 'doctor' ? <Stethoscope className="w-3.5 h-3.5" /> : <HomeIcon className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <span className="font-mono font-bold text-white text-xs">{b.reference_number}</span>
                            <div className="text-[10px] text-slate-400 capitalize">
                              {b.booking_type === 'doctor' ? 'Clinic Slot' : 'Home Visit'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Patient / Customer */}
                      <td className="p-4">
                        <div className="font-bold text-white text-xs">{b.customer_name}</div>
                        <div className="text-[11px] text-brand-cyan font-mono flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 shrink-0" />
                          <a href={`tel:${b.customer_phone}`} className="hover:underline">{b.customer_phone}</a>
                        </div>
                        {b.customer_email && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{b.customer_email}</div>
                        )}
                      </td>

                      {/* 3. Scheduled Slot */}
                      <td className="p-4">
                        <div className="font-bold text-white text-xs font-mono">{b.scheduled_date}</div>
                        <div className="text-[11px] text-brand-teal mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>{b.scheduled_slot}</span>
                        </div>
                      </td>

                      {/* 4. Service & Doctor */}
                      <td className="p-4">
                        {b.booking_type === 'doctor' ? (
                          <div>
                            <div className="font-bold text-white text-xs">{b.doctor_name}</div>
                            <div className="text-[10px] text-slate-400">{b.specialization}</div>
                            <div className="text-[10px] text-slate-500">{b.qualification}</div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-bold text-white text-xs">Doorstep Refraction</div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[160px]">{b.address_line1}</div>
                            <div className="text-[10px] text-brand-cyan font-mono">PIN: {b.pincode}</div>
                            {b.assigned_optometrist && (
                              <div className="text-[10px] text-emerald-400 font-medium mt-0.5">&#10003; {b.assigned_optometrist}</div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 5. Fee & Payment */}
                      <td className="p-4">
                        <div className="font-bold text-white text-xs font-mono">₹{b.fee}</div>
                        <div className="text-[10px] text-slate-400">{b.payment_status}</div>
                      </td>

                      {/* 6. Status Badge */}
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          isPending 
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse' 
                            : isConfirmed 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            isPending ? 'bg-amber-400' : isConfirmed ? 'bg-emerald-400' : 'bg-rose-400'
                          }`} />
                          {b.status}
                        </span>
                      </td>

                      {/* 7. Actions */}
                      <td className="p-4 text-right space-x-2">
                        {isPending && (
                          <button
                            onClick={() => handleApprove(b)}
                            disabled={processingId === b.id}
                            className="btn-primary py-1.5 px-2.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 shadow-cyan-glow"
                            title="Confirm booking and dispatch email to customer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                        )}

                        {!isCancelled && (
                          <button
                            onClick={() => openRescheduleModal(b)}
                            disabled={processingId === b.id}
                            className="py-1.5 px-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold inline-flex items-center gap-1"
                            title="Propose new date / slot to customer"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Change Date</span>
                          </button>
                        )}

                        {b.customer_email && (
                          <button
                            onClick={() => openEmailModal(b)}
                            className="p-1.5 rounded-lg bg-brand-cyan/10 hover:bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30 text-xs inline-flex items-center"
                            title={`Send custom email to ${b.customer_name}`}
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {!isCancelled && (
                          <button
                            onClick={() => handleCancel(b)}
                            disabled={processingId === b.id}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs inline-flex items-center"
                            title="Cancel Booking"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {isConfirmed && (
                          <span className="text-[11px] text-emerald-400 font-bold inline-flex items-center ml-2 gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
                          </span>
                        )}
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Custom Email Modal */}
      {emailModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border-2 border-brand-cyan/40 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-cyan/20 border border-brand-cyan/40 flex items-center justify-center text-brand-cyan">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Send Email to Patient</h3>
                  <p className="text-xs text-slate-400">
                    To: <span className="text-brand-cyan font-semibold">{emailModal.booking?.customer_name}</span> ({emailModal.booking?.customer_email})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEmailModal(prev => ({ ...prev, isOpen: false }))}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendCustomEmail} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={emailModal.subject}
                  onChange={(e) => setEmailModal(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-white/20 rounded-xl text-white focus:border-brand-cyan focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Message Body</label>
                <textarea
                  rows={6}
                  required
                  value={emailModal.messageText}
                  onChange={(e) => setEmailModal(prev => ({ ...prev, messageText: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-white/20 rounded-xl text-white focus:border-brand-cyan focus:outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEmailModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={emailModal.isSending}
                  className="btn-primary px-5 py-2 text-xs font-bold rounded-xl inline-flex items-center gap-2 shadow-cyan-glow disabled:opacity-50"
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

      {/* Request Change Date Modal */}
      {rescheduleModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border-2 border-amber-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Request Date / Slot Change</h3>
                  <p className="text-xs text-slate-400">
                    Patient: <span className="text-amber-300 font-semibold">{rescheduleModal.booking?.customer_name}</span> (#{rescheduleModal.booking?.reference_number})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRescheduleModal(prev => ({ ...prev, isOpen: false }))}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRequestChangeDate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Proposed New Date *
                </label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={rescheduleModal.newDate}
                  onChange={(e) => setRescheduleModal(prev => ({ ...prev, newDate: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-white/20 rounded-xl text-white focus:border-amber-400 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Proposed Time Window / Slot
                </label>
                <input
                  type="text"
                  value={rescheduleModal.newSlot}
                  onChange={(e) => setRescheduleModal(prev => ({ ...prev, newSlot: e.target.value }))}
                  placeholder="e.g. 11:30 AM or 02:00 PM - 04:00 PM"
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-white/20 rounded-xl text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Clinic Note to Patient
                </label>
                <textarea
                  rows="3"
                  value={rescheduleModal.note}
                  onChange={(e) => setRescheduleModal(prev => ({ ...prev, note: e.target.value }))}
                  placeholder="Reason for change or instructions..."
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-white/20 rounded-xl text-white focus:border-amber-400 focus:outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setRescheduleModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rescheduleModal.isSubmitting}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 inline-flex items-center gap-2 transition-all disabled:opacity-50"
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

    </div>
  );
};
