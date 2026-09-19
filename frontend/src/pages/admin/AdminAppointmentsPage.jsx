import React, { useState, useEffect } from 'react';
import { 
  Calendar, CheckCircle2, XCircle, Clock, MapPin, 
  User, Phone, Mail, Stethoscope, Home as HomeIcon, 
  Search, RefreshCw, AlertCircle, Shield, Award, FileText,
  Tag, FileCheck, Check, Download, FileSpreadsheet, Edit3, 
  MessageSquare, Filter, ChevronDown, Sparkles, Plus, Store
} from 'lucide-react';
import api from '../../api/client';
import { InvoiceModal } from '../../components/common/InvoiceModal';
import { exportToExcel, exportToCsv } from '../../utils/excelExport';

export const AdminAppointmentsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [metrics, setMetrics] = useState({
    pending_total: 0,
    pending_doctor: 0,
    pending_home_eye: 0,
    today_clinic_visits: 0,
    today_home_visits: 0
  });
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'doctor', 'home_eye'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'Pending', 'Confirmed', 'Rescheduled', 'Completed', 'Cancelled'
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', '1d', '2d', '3d', '7d', '1m', 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [message, setMessage] = useState(null);

  // Manual Store Visit / Walk-in Creation Modal
  const [manualModal, setManualModal] = useState({
    isOpen: false,
    bookingType: 'store_visit', // 'store_visit', 'doctor', 'home_eye'
    patientName: '',
    patientPhone: '',
    patientEmail: '',
    doctorId: '',
    appointmentDate: new Date().toISOString().split('T')[0],
    appointmentTime: 'Walk-in (Immediate)',
    fee: '0',
    paymentStatus: 'Paid at Desk',
    status: 'Confirmed',
    ticketNo: '',
    notes: 'Walk-in vision & store eye checkup',
    addressLine1: 'Netra Unnayan Main Clinic, Digha',
    landmark: 'Jatimati Bypass',
    pincode: '721428',
    assignedOptometrist: 'Certified In-House Optometrist',
    isSubmitting: false
  });

  // Approval Modal with Ticket No & Desk Note
  const [approveModal, setApproveModal] = useState({
    isOpen: false,
    booking: null,
    ticketNo: '',
    adminNote: '',
    assignedOptometrist: '',
    isSubmitting: false
  });

  // Edit Note / Instructions Modal
  const [noteModal, setNoteModal] = useState({
    isOpen: false,
    booking: null,
    notes: '',
    ticketNo: '',
    notifyPatient: true,
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

  const fetchDoctors = async () => {
    try {
      const res = await api.get('/admin/doctors.php');
      if (res.success && res.data) {
        setDoctors(res.data || []);
      }
    } catch {
      // Fallback
      try {
        const dRes = await api.get('/doctors/index.php');
        if (dRes.success && dRes.data) setDoctors(dRes.data || []);
      } catch {}
    }
  };

  useEffect(() => {
    fetchBookings();
    fetchDoctors();
  }, [typeFilter, statusFilter]);

  const openManualModal = (defaultType = 'store_visit') => {
    const today = new Date().toISOString().split('T')[0];
    const defaultDoc = doctors.length > 0 ? doctors[0] : null;
    const defaultFee = defaultType === 'doctor' ? (defaultDoc?.consultation_fee || '500') : '0';
    const autoToken = defaultType === 'doctor' 
      ? `TKN-${String(bookings.length + 1).padStart(3, '0')}` 
      : defaultType === 'home_eye'
      ? `HET-${String(bookings.length + 1).padStart(3, '0')}`
      : `STR-${String(bookings.length + 1).padStart(3, '0')}`;

    setManualModal({
      isOpen: true,
      bookingType: defaultType,
      patientName: '',
      patientPhone: '',
      patientEmail: '',
      doctorId: defaultDoc ? String(defaultDoc.id) : '',
      appointmentDate: today,
      appointmentTime: 'Walk-in (Immediate)',
      fee: String(defaultFee),
      paymentStatus: defaultFee === '0' ? 'Free / Waived' : 'Paid at Desk',
      status: 'Confirmed',
      ticketNo: autoToken,
      notes: defaultType === 'doctor' 
        ? 'Walk-in doctor appointment registered at desk' 
        : defaultType === 'home_eye'
        ? 'Doorstep home visit booked by phone desk'
        : 'Walk-in store vision checkup & frame trial',
      addressLine1: 'Netra Unnayan Main Clinic, Digha',
      landmark: 'Jatimati Bypass',
      pincode: '721428',
      assignedOptometrist: 'Certified In-House Optometrist',
      isSubmitting: false
    });
  };

  const handleManualBookingSubmit = async (e) => {
    e.preventDefault();
    if (!manualModal.patientName.trim() || !manualModal.patientPhone.trim()) {
      alert('Please provide patient name and phone number.');
      return;
    }

    setManualModal(prev => ({ ...prev, isSubmitting: true }));
    try {
      const payload = {
        action: 'create_manual',
        booking_type: manualModal.bookingType,
        patient_name: manualModal.patientName.trim(),
        patient_phone: manualModal.patientPhone.trim(),
        patient_email: manualModal.patientEmail.trim(),
        doctor_id: manualModal.doctorId ? parseInt(manualModal.doctorId) : null,
        appointment_date: manualModal.appointmentDate,
        appointment_time: manualModal.appointmentTime,
        consultation_fee: parseFloat(manualModal.fee) || 0,
        payment_status: manualModal.paymentStatus,
        status: manualModal.status,
        ticket_no: manualModal.ticketNo.trim(),
        notes: manualModal.notes.trim(),
        address_line1: manualModal.addressLine1.trim(),
        landmark: manualModal.landmark.trim(),
        pincode: manualModal.pincode.trim(),
        assigned_optometrist: manualModal.assignedOptometrist.trim()
      };

      const res = await api.post('/admin/appointments.php', payload);
      if (res.success) {
        setMessage({
          type: 'success',
          text: res.message || 'New Store / Doctor visit successfully registered and confirmed!'
        });
        setManualModal(prev => ({ ...prev, isOpen: false, isSubmitting: false }));
        await fetchBookings();
      } else {
        alert(res.message || 'Failed to create manual appointment.');
      }
    } catch (err) {
      alert(err.message || 'Error registering appointment.');
    } finally {
      setManualModal(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  const openApproveModal = (booking) => {
    const defaultTicket = booking.ticket_no || (booking.booking_type === 'doctor' 
      ? `TKN-${String(booking.id).padStart(3, '0')}` 
      : `HET-${String(booking.id).padStart(3, '0')}`);

    setApproveModal({
      isOpen: true,
      booking,
      ticketNo: defaultTicket,
      adminNote: booking.notes || '',
      assignedOptometrist: booking.assigned_optometrist || 'Certified Senior Optometrist (Mobile Lab)',
      isSubmitting: false
    });
  };

  const openNoteModal = (booking) => {
    setNoteModal({
      isOpen: true,
      booking,
      notes: booking.notes || '',
      ticketNo: booking.ticket_no || '',
      notifyPatient: true,
      isSubmitting: false
    });
  };

  const handleSaveNote = async (e) => {
    e.preventDefault();
    if (!noteModal.booking) return;

    setNoteModal(prev => ({ ...prev, isSubmitting: true }));
    try {
      const res = await api.post('/admin/appointments.php', {
        action: 'update_notes',
        booking_type: noteModal.booking.booking_type,
        id: noteModal.booking.id,
        notes: noteModal.notes.trim(),
        ticket_no: noteModal.ticketNo.trim(),
        notify_patient: noteModal.notifyPatient
      });

      if (res.success) {
        setMessage({ 
          type: 'success', 
          text: res.message || `Notes updated for Booking #${noteModal.booking.reference_number || noteModal.booking.id}!` 
        });
        setNoteModal({ isOpen: false, booking: null, notes: '', ticketNo: '', notifyPatient: true, isSubmitting: false });
        await fetchBookings();
      } else {
        alert(res.message || 'Failed to update note.');
      }
    } catch (err) {
      alert(err.message || 'Error updating note.');
    } finally {
      setNoteModal(prev => ({ ...prev, isSubmitting: false }));
    }
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

  // Date Filtering Engine
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const filteredBookings = bookings.filter(b => {
    // 1. Text Search Filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchSearch = (
        b.reference_number?.toLowerCase().includes(q) ||
        b.customer_name?.toLowerCase().includes(q) ||
        b.customer_phone?.toLowerCase().includes(q) ||
        b.doctor_name?.toLowerCase().includes(q) ||
        b.assigned_optometrist?.toLowerCase().includes(q) ||
        b.ticket_no?.toLowerCase().includes(q) ||
        b.notes?.toLowerCase().includes(q)
      );
      if (!matchSearch) return false;
    }

    // 2. Date Range Filter
    if (timeFilter !== 'all') {
      const bDate = b.scheduled_date || (b.created_at ? b.created_at.split('T')[0] : '');
      if (!bDate) return true;

      const itemDate = new Date(bDate);
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (timeFilter === '1d') {
        if (bDate !== todayStr) return false;
      } else if (timeFilter === '2d') {
        const diffDays = Math.abs(Math.floor((itemDate - startOfToday) / (1000 * 60 * 60 * 24)));
        if (diffDays > 1 && bDate !== todayStr) return false;
      } else if (timeFilter === '3d') {
        const diffDays = Math.abs(Math.floor((itemDate - startOfToday) / (1000 * 60 * 60 * 24)));
        if (diffDays > 2) return false;
      } else if (timeFilter === '7d') {
        const diffDays = Math.abs(Math.floor((itemDate - startOfToday) / (1000 * 60 * 60 * 24)));
        if (diffDays > 6) return false;
      } else if (timeFilter === '1m') {
        const diffDays = Math.abs(Math.floor((itemDate - startOfToday) / (1000 * 60 * 60 * 24)));
        if (diffDays > 30) return false;
      } else if (timeFilter === 'custom') {
        if (customStartDate && bDate < customStartDate) return false;
        if (customEndDate && bDate > customEndDate) return false;
      }
    }

    return true;
  });

  // Export to Excel / CSV
  const handleExport = (format = 'xls') => {
    const columns = [
      { header: 'Reference ID', key: 'reference_number', width: 16 },
      { header: 'Token / Ticket No', key: 'ticket_no', width: 16 },
      { header: 'Booking Type', key: 'booking_type_label', width: 16 },
      { header: 'Patient / Customer Name', key: 'customer_name', width: 22 },
      { header: 'Phone Number', key: 'customer_phone', width: 16 },
      { header: 'Email Address', key: 'customer_email', width: 24 },
      { header: 'Doctor / Optometrist', key: 'specialist_name', width: 22 },
      { header: 'Specialization / Service', key: 'specialization', width: 24 },
      { header: 'Scheduled Date', key: 'scheduled_date', width: 14 },
      { header: 'Time Slot', key: 'scheduled_slot', width: 16 },
      { header: 'Fee (₹)', key: 'fee', width: 12 },
      { header: 'Payment Status', key: 'payment_status', width: 14 },
      { header: 'Current Status', key: 'status', width: 16 },
      { header: 'Admin Desk Notes & Instructions', key: 'notes', width: 35 },
      { header: 'Address / Venue', key: 'address_info', width: 30 },
      { header: 'Booked On', key: 'created_at', width: 18 }
    ];

    const rows = filteredBookings.map(b => ({
      reference_number: b.reference_number || `BK-${b.id}`,
      ticket_no: b.ticket_no || 'N/A',
      booking_type_label: b.booking_type === 'doctor' ? 'Doctor Clinic' : 'Home Eye Test',
      customer_name: b.customer_name || 'N/A',
      customer_phone: b.customer_phone || 'N/A',
      customer_email: b.customer_email || 'N/A',
      specialist_name: b.doctor_name || b.assigned_optometrist || (b.booking_type === 'doctor' ? 'Visiting Ophthalmologist' : 'Certified Optometrist'),
      specialization: b.specialization || (b.booking_type === 'doctor' ? 'Clinical Ophthalmology' : 'Doorstep Refraction'),
      scheduled_date: b.scheduled_date || 'N/A',
      scheduled_slot: b.scheduled_slot || 'N/A',
      fee: Number(b.fee || 0),
      payment_status: b.payment_status || 'Pending',
      status: b.status || 'Pending',
      notes: b.notes || 'None',
      address_info: b.booking_type === 'doctor' ? 'Netra Unnayan Main Clinic, Digha' : `${b.address_line1 || ''} PIN: ${b.pincode || ''}`,
      created_at: b.created_at ? new Date(b.created_at).toLocaleString('en-IN') : 'N/A'
    }));

    const dateTag = new Date().toISOString().split('T')[0];
    const filename = `Netra_Unnayan_Appointments_${timeFilter.toUpperCase()}_${dateTag}`;

    if (format === 'csv') {
      exportToCsv(columns, rows, filename);
    } else {
      exportToExcel(columns, rows, filename, 'Appointments & Bookings');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
        <div>
          <span className="text-xs uppercase font-extrabold tracking-wider text-sky-700 dark:text-brand-cyan flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Clinical Operations &amp; Doorstep Optometry
          </span>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5 mt-0.5">
            <Calendar className="w-6 h-6 text-sky-600 dark:text-brand-cyan" />
            Appointments &amp; Home Eye Test Bookings
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Review incoming doctor slots, doorstep tests, and walk-in screening visits. Book store appointments manually and approve with custom tokens.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          
          {/* MANUALLY ADD STORE VISIT / DOCTOR BOOKING BUTTON */}
          <button
            onClick={() => openManualModal('store_visit')}
            className="btn-primary text-xs py-2 px-3.5 rounded-xl flex items-center gap-1.5 shadow-cyan-glow font-black cursor-pointer bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-slate-950"
            title="Book walk-in store visit, doctor consultation, or doorstep test"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Book Store / Doctor Visit</span>
          </button>

          {/* Export Excel Button */}
          <div className="flex items-center rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 p-1 shadow-sm">
            <button
              onClick={() => handleExport('xls')}
              className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              title="Export filtered appointments to Microsoft Excel (.xls)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="py-1.5 px-2.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:text-emerald-950 dark:hover:text-white transition-all cursor-pointer"
              title="Export as CSV format"
            >
              CSV
            </button>
          </div>

          <button
            onClick={fetchBookings}
            className="text-xs py-2 px-3.5 rounded-xl flex items-center gap-2 bg-white hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-white/10 font-bold shadow-sm transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-600' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
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
            {filteredBookings.length}
          </div>
          <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 font-medium">Matching active filters</div>
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

      {/* Advanced Filter Toolbar: Type + Date Range + Search */}
      <div className="rounded-2xl p-4 space-y-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 shadow-sm">
        
        {/* Row 1: Type Tabs & Date Quick Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Type Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            {[
              { id: 'all', label: 'All Bookings' },
              { id: 'doctor', label: 'Doctor Clinic' },
              { id: 'home_eye', label: 'Home Checkups' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setTypeFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  typeFilter === tab.id 
                    ? 'bg-gradient-to-r from-sky-600 to-cyan-600 text-white shadow-md' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Time Range Quick Filter Pills (1d, 2d, 3d, 7d, 1m, All) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Time:
            </span>
            {[
              { id: 'all', label: 'All Time' },
              { id: '1d', label: '1 Day (Today)' },
              { id: '2d', label: '2 Days' },
              { id: '3d', label: '3 Days' },
              { id: '7d', label: '7 Days (1W)' },
              { id: '1m', label: '1 Month (30D)' },
              { id: 'custom', label: 'Custom' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTimeFilter(t.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  timeFilter === t.id
                    ? 'bg-brand-cyan text-slate-950 shadow-cyan-glow font-black'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Status Filter, Custom Date Pickers, and Search */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-white/5">
          
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Selector */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="Pending">Pending Approval Only</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Reschedule Requested">Reschedule Requested</option>
              <option value="Completed">Completed / Done</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            {/* Custom Date Inputs if Custom is selected */}
            {timeFilter === 'custom' && (
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/10 text-xs">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-transparent text-slate-900 dark:text-white px-2 py-0.5 font-mono focus:outline-none"
                  title="Start Date"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-transparent text-slate-900 dark:text-white px-2 py-0.5 font-mono focus:outline-none"
                  title="End Date"
                />
              </div>
            )}
          </div>

          {/* Search Input */}
          <div className="relative flex-1 md:w-72">
            <Search className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search patient, doctor, phone, token, note..."
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
                <th className="p-4">Service &amp; Specialist</th>
                <th className="p-4">Fee &amp; Payment</th>
                <th className="p-4">Status &amp; Token</th>
                <th className="p-4">Desk Notes &amp; Instructions</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-10 text-center text-slate-500 dark:text-slate-400">
                    <Calendar className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
                    No bookings found matching the active filters ({timeFilter.toUpperCase()}, {typeFilter}, {statusFilter}).
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => {
                  const rawStatus = (b.status || '').toLowerCase().trim();
                  const isConfirmed = rawStatus === 'confirmed';
                  const isCompleted = rawStatus === 'completed' || rawStatus === 'done' || rawStatus === 'fulfilled';
                  const isCancelled = rawStatus === 'cancelled' || rawStatus === 'rejected';
                  const isRescheduled = rawStatus.includes('resched');
                  const needsApproval = !isConfirmed && !isCompleted && !isCancelled;

                  let badgeLabel = b.status || 'Pending';
                  let badgeClass = 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40 animate-pulse';
                  let dotClass = 'bg-amber-500';

                  if (isConfirmed) {
                    badgeLabel = 'Confirmed';
                    badgeClass = 'bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40';
                    dotClass = 'bg-emerald-500';
                  } else if (isCompleted) {
                    badgeLabel = 'Completed';
                    badgeClass = 'bg-blue-100 text-blue-900 border border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40';
                    dotClass = 'bg-blue-500';
                  } else if (isCancelled) {
                    badgeLabel = 'Cancelled';
                    badgeClass = 'bg-rose-100 text-rose-900 border border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40';
                    dotClass = 'bg-rose-500';
                  } else if (isRescheduled) {
                    badgeLabel = 'Rescheduled (Pending)';
                    badgeClass = 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40 animate-pulse';
                    dotClass = 'bg-amber-500';
                  }

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
                            <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">{b.reference_number || `BK-${b.id}`}</span>
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

                      {/* 4. Service & Specialist */}
                      <td className="p-4">
                        {b.booking_type === 'doctor' ? (
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-xs">{b.doctor_name || 'Visiting Specialist'}</div>
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
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${badgeClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
                          {badgeLabel}
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
                      </td>

                      {/* 7. Shared Desk Notes & Instructions */}
                      <td className="p-4 max-w-[180px]">
                        {b.notes ? (
                          <div className="group relative">
                            <div className="text-xs text-slate-800 dark:text-slate-200 line-clamp-2 leading-tight font-medium bg-slate-50 dark:bg-white/5 p-1.5 rounded-lg border border-slate-200/60 dark:border-white/5" title={b.notes}>
                              {b.notes}
                            </div>
                            <button
                              onClick={() => openNoteModal(b)}
                              className="text-[10px] text-sky-600 dark:text-brand-cyan hover:underline font-bold mt-0.5 flex items-center gap-0.5 cursor-pointer"
                            >
                              <Edit3 className="w-2.5 h-2.5" /> Edit Note
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => openNoteModal(b)}
                            className="text-[11px] text-slate-400 hover:text-sky-600 dark:hover:text-brand-cyan flex items-center gap-1 font-semibold cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" /> + Add Note
                          </button>
                        )}
                      </td>

                      {/* 8. Action Buttons */}
                      <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                        {needsApproval && (
                          <>
                            <button
                              onClick={() => handleQuickApprove(b)}
                              disabled={processingId === b.id}
                              className="py-1.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black inline-flex items-center gap-1.5 shadow-md hover:shadow-emerald-500/25 transition-all cursor-pointer"
                              title="1-Click Instant Confirm & Dispatch Confirmation Email"
                            >
                              <CheckCircle2 className={`w-3.5 h-3.5 ${processingId === b.id ? 'animate-spin' : ''}`} />
                              <span>{processingId === b.id ? 'Confirming...' : 'Approve'}</span>
                            </button>

                            <button
                              onClick={() => openApproveModal(b)}
                              disabled={processingId === b.id}
                              className="py-1.5 px-2.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-700 dark:text-sky-300 border border-sky-500/30 text-xs font-bold inline-flex items-center gap-1 transition-all cursor-pointer"
                              title="Approve with custom Token / Ticket No & Clinic Notes"
                            >
                              <Tag className="w-3 h-3 text-sky-500" />
                              <span>+ Token</span>
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

                        {!isCancelled && !isCompleted && (
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

                        <button
                          onClick={() => openNoteModal(b)}
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-300 border border-slate-200 dark:border-white/10 text-xs inline-flex items-center shadow-xs transition-all cursor-pointer"
                          title="Edit Clinic Notes / Customer Instructions"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>

                        {b.customer_email && (
                          <button
                            onClick={() => openEmailModal(b)}
                            className="p-1.5 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-900 dark:bg-cyan-500/15 dark:hover:bg-cyan-500/25 dark:text-cyan-300 border border-sky-300 dark:border-cyan-500/40 text-xs inline-flex items-center shadow-sm transition-all cursor-pointer"
                            title={`Send custom email to ${b.customer_name}`}
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {!isCancelled && !isCompleted && (
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

      {/* ================= MODAL: MANUAL STORE / DOCTOR VISIT BOOKING ================= */}
      {manualModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="w-full max-w-xl bg-white dark:bg-[#071322] border border-slate-200 dark:border-sky-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-slate-900 dark:text-white my-8">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-100 dark:bg-sky-500/20 border border-sky-300 dark:border-sky-500/40 flex items-center justify-center text-sky-700 dark:text-brand-cyan shadow-sm">
                  <Store className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Manual Visit / Walk-in Booking
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Register in-store walk-in, eye refraction, doctor slot, or doorstep booking
                  </p>
                </div>
              </div>
              <button
                onClick={() => setManualModal(prev => ({ ...prev, isOpen: false }))}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleManualBookingSubmit} className="space-y-4">
              
              {/* 1. Visit Type Selector Pills */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Visit Service Category *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'store_visit', label: 'Store Eye Test', icon: Store, desc: 'In-Clinic Screening' },
                    { id: 'doctor', label: 'Doctor Specialist', icon: Stethoscope, desc: 'Ophthalmology Slot' },
                    { id: 'home_eye', label: 'Home Eye Test', icon: HomeIcon, desc: 'Doorstep Visit' }
                  ].map(tab => {
                    const Icon = tab.icon;
                    const isSelected = manualModal.bookingType === tab.id;
                    return (
                      <button
                        type="button"
                        key={tab.id}
                        onClick={() => {
                          const autoToken = tab.id === 'doctor' 
                            ? `TKN-${String(bookings.length + 1).padStart(3, '0')}` 
                            : tab.id === 'home_eye'
                            ? `HET-${String(bookings.length + 1).padStart(3, '0')}`
                            : `STR-${String(bookings.length + 1).padStart(3, '0')}`;
                          const defFee = tab.id === 'doctor' ? (doctors[0]?.consultation_fee || '500') : '0';
                          setManualModal(prev => ({
                            ...prev,
                            bookingType: tab.id,
                            fee: String(defFee),
                            ticketNo: autoToken,
                            paymentStatus: defFee === '0' ? 'Free / Waived' : 'Paid at Desk'
                          }));
                        }}
                        className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col items-start gap-1 ${
                          isSelected 
                            ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-500 dark:border-brand-cyan shadow-sm text-sky-900 dark:text-white ring-1 ring-sky-500' 
                            : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-sky-600 dark:text-brand-cyan' : 'text-slate-400'}`} />
                          <span>{tab.label}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">{tab.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Patient Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Patient / Customer Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={manualModal.patientName}
                      onChange={(e) => setManualModal(prev => ({ ...prev, patientName: e.target.value }))}
                      placeholder="e.g. Ramesh Chandra Sen"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mobile Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={manualModal.patientPhone}
                      onChange={(e) => setManualModal(prev => ({ ...prev, patientPhone: e.target.value }))}
                      placeholder="e.g. 9876543210"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-white font-mono font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>
              </div>

              {/* Email (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address <span className="text-[10px] text-slate-400 font-normal">(Optional for confirmation pass)</span>
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={manualModal.patientEmail}
                    onChange={(e) => setManualModal(prev => ({ ...prev, patientEmail: e.target.value }))}
                    placeholder="e.g. patient@gmail.com"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* 3. Doctor / Specialist Selector (If doctor or store visit) */}
              {manualModal.bookingType !== 'home_eye' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Consulting Doctor / Optometrist
                  </label>
                  <select
                    value={manualModal.doctorId}
                    onChange={(e) => {
                      const selDoc = doctors.find(d => String(d.id) === e.target.value);
                      setManualModal(prev => ({
                        ...prev,
                        doctorId: e.target.value,
                        fee: selDoc && selDoc.consultation_fee ? String(selDoc.consultation_fee) : prev.fee
                      }));
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                  >
                    <option value="">In-House Optometry Vision Screening (₹0 / Free)</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} — {d.specialization || d.qualification} (₹{d.consultation_fee || 500})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 4. Schedule Details (Date & Time Slot) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Appointment Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={manualModal.appointmentDate}
                    onChange={(e) => setManualModal(prev => ({ ...prev, appointmentDate: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Time Slot / Arrival Window *
                  </label>
                  <input
                    type="text"
                    required
                    value={manualModal.appointmentTime}
                    onChange={(e) => setManualModal(prev => ({ ...prev, appointmentTime: e.target.value }))}
                    placeholder="e.g. Walk-in (Immediate) or 11:30 AM"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* 5. Token No & Fee & Payment Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Token / Ticket #
                  </label>
                  <input
                    type="text"
                    value={manualModal.ticketNo}
                    onChange={(e) => setManualModal(prev => ({ ...prev, ticketNo: e.target.value }))}
                    placeholder="e.g. TKN-001"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Consultation Fee (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={manualModal.fee}
                    onChange={(e) => setManualModal(prev => ({ ...prev, fee: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Status
                  </label>
                  <select
                    value={manualModal.paymentStatus}
                    onChange={(e) => setManualModal(prev => ({ ...prev, paymentStatus: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                  >
                    <option value="Paid at Desk">Paid at Desk</option>
                    <option value="Free / Waived">Free / Waived</option>
                    <option value="Pay at Clinic">Pay at Clinic</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>

              {/* Home Eye Specific Address fields */}
              {manualModal.bookingType === 'home_eye' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-teal-500/10 border border-teal-500/20">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-teal-800 dark:text-brand-teal mb-1">
                      Doorstep Address *
                    </label>
                    <input
                      type="text"
                      required
                      value={manualModal.addressLine1}
                      onChange={(e) => setManualModal(prev => ({ ...prev, addressLine1: e.target.value }))}
                      placeholder="e.g. Near Old Digha Police Station"
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-teal-300 dark:border-teal-700/50 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-teal-800 dark:text-brand-teal mb-1">
                      Assigned Optometrist
                    </label>
                    <input
                      type="text"
                      value={manualModal.assignedOptometrist}
                      onChange={(e) => setManualModal(prev => ({ ...prev, assignedOptometrist: e.target.value }))}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-teal-300 dark:border-teal-700/50 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-teal-800 dark:text-brand-teal mb-1">
                      Pincode
                    </label>
                    <input
                      type="text"
                      value={manualModal.pincode}
                      onChange={(e) => setManualModal(prev => ({ ...prev, pincode: e.target.value }))}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-teal-300 dark:border-teal-700/50 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              )}

              {/* 6. Desk Notes / Patient Instructions */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Desk Notes / Instructions (Visible to Patient)
                </label>
                <textarea
                  rows={2}
                  value={manualModal.notes}
                  onChange={(e) => setManualModal(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="e.g. Walk-in for power check & anti-glare glasses selection."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none leading-relaxed"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setManualModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={manualModal.isSubmitting}
                  className="py-2.5 px-6 text-xs font-black rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-slate-950 shadow-cyan-glow inline-flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {manualModal.isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Registering Visit...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                      <span>Confirm &amp; Issue Token Slip</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

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
                  This token/ticket identifier will be displayed on the customer booking portal and sent in the confirmation email.
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
                  Admin / Clinic Desk Note (Visible to Patient)
                </label>
                <textarea
                  rows={3}
                  value={approveModal.adminNote}
                  onChange={(e) => setApproveModal(prev => ({ ...prev, adminNote: e.target.value }))}
                  placeholder="e.g. Please report to Room 2 on 1st floor; arrive 10 min early with previous glasses."
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
                  className="py-2 px-5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md inline-flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
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

      {/* ================= EDIT NOTE & INSTRUCTIONS MODAL ================= */}
      {noteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-sky-500/40 rounded-2xl p-6 shadow-2xl space-y-4 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-500/20 border border-sky-300 dark:border-sky-500/40 flex items-center justify-center text-sky-700 dark:text-brand-cyan">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Desk Notes &amp; Instructions</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Patient: <span className="text-sky-700 dark:text-brand-cyan font-bold">{noteModal.booking?.customer_name}</span> (#{noteModal.booking?.reference_number})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setNoteModal(prev => ({ ...prev, isOpen: false }))}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Token / Ticket Identifier
                </label>
                <input
                  type="text"
                  value={noteModal.ticketNo}
                  onChange={(e) => setNoteModal(prev => ({ ...prev, ticketNo: e.target.value }))}
                  placeholder="e.g. TKN-012"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-white/20 rounded-xl text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Clinic Notes &amp; Patient Instructions
                </label>
                <textarea
                  rows={4}
                  required
                  value={noteModal.notes}
                  onChange={(e) => setNoteModal(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="e.g. Please bring previous prescription and visual acuity report. Fasting not required."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-white/20 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none leading-relaxed"
                />
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                  These instructions will be shown prominently to the customer in their account booking portal.
                </span>
              </div>

              {noteModal.booking?.customer_email && (
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={noteModal.notifyPatient}
                    onChange={(e) => setNoteModal(prev => ({ ...prev, notifyPatient: e.target.checked }))}
                    className="rounded text-sky-600 focus:ring-sky-500"
                  />
                  <span>Dispatch updated instructions via Email to {noteModal.booking.customer_email}</span>
                </label>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setNoteModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={noteModal.isSubmitting}
                  className="py-2 px-5 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-700 text-white shadow-md inline-flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {noteModal.isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Notes...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save &amp; Update Customer</span>
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
                  className="py-2 px-5 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-700 text-white shadow-md inline-flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
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
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-md inline-flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
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
