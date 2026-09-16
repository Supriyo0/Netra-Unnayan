import React, { useEffect, useState } from 'react';
import { 
  Calendar, Clock, ShieldCheck, MapPin, Award, 
  CheckCircle2, AlertCircle, X, ChevronRight, Sparkles, FileText
} from 'lucide-react';
import confetti from 'canvas-confetti';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { InvoiceModal } from '../components/common/InvoiceModal';

export const DoctorsPage = () => {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [clinicSettings, setClinicSettings] = useState({
    doctor_appointments_enabled: '1',
    doctor_clinic_notice: ''
  });

  // Booking Modal Form State - all empty, filled by customer
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);
  const [bookingError, setBookingError] = useState('');
  const [showSlipModal, setShowSlipModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [docRes, setRes] = await Promise.all([
          api.get('/doctors'),
          api.get('/settings.php')
        ]);
        if (docRes.success) {
          setDoctors(docRes.data || []);
        }
        if (setRes.success && setRes.data) {
          setClinicSettings(prev => ({ ...prev, ...setRes.data }));
        }
      } catch (err) {
        console.error('Failed to load clinic data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleOpenBooking = (doc) => {
    setSelectedDoctor(doc);
    setBookingResult(null);
    setBookingError('');
    setSelectedDate('');
    setSelectedTime('');
  };

  const handleBookSubmit = async (e) => {
    e.preventDefault();
    setBookingError('');
    if (!selectedDoctor || !selectedDate || !selectedTime) return;

    // Convert time to 24h format for backend
    let formattedTime = '11:00:00';
    if (selectedTime.includes('AM') || selectedTime.includes('PM')) {
      const [t, m] = selectedTime.split(' ');
      let [h, min] = t.split(':');
      h = parseInt(h);
      if (m === 'PM' && h < 12) h += 12;
      if (m === 'AM' && h === 12) h = 0;
      formattedTime = `${String(h).padStart(2, '0')}:${min || '00'}:00`;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/doctors/book.php', {
        doctor_id: selectedDoctor.id,
        patient_name: patientName.trim(),
        patient_phone: patientPhone.trim(),
        patient_email: patientEmail.trim() || null,
        appointment_date: selectedDate,
        appointment_time: formattedTime,
        notes: bookingNotes.trim() || null
      });

      if (res.success && res.data) {
        try {
          confetti({ particleCount: 60, spread: 60 });
        } catch {}
        setBookingResult(res.data);
      } else {
        setBookingError(res.message || 'Failed to book slot.');
      }
    } catch (err) {
      setBookingError(err.message || 'Appointment slot conflict. Please choose another time.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const timeSlots = [
    '10:20 AM', '10:40 AM', '11:00 AM', '11:20 AM', 
    '11:40 AM', '12:00 PM', '04:20 PM', '04:40 PM', 
    '05:00 PM', '05:20 PM', '05:40 PM', '06:00 PM'
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      
      {/* Hero Header */}
      <div className="glass-card-glow rounded-3xl p-8 sm:p-12 text-center max-w-4xl mx-auto space-y-4">
        <span className="inline-block px-3 py-1 rounded-full bg-brand-teal/20 text-brand-teal text-xs font-bold uppercase tracking-wider">
          Ophthalmic Specialists Desk
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white">
          Book Eye Doctor Appointment
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Comprehensive clinical ophthalmology at our Netra Unnayan Digha Eye Care Clinic. Micro-refraction, glaucoma management, cataract pre-op evaluation, and pediatric vision screening.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-6 pt-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
            <MapPin className="w-4 h-4 text-brand-cyan" /> Netra Unnayan, Digha Bypass Rd
          </span>
          <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
            <ShieldCheck className="w-4 h-4 text-brand-teal" /> Zero Advance Payment (Pay at Clinic)
          </span>
        </div>

        {clinicSettings.doctor_appointments_enabled === '0' && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-500/50 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-3 text-left mt-4">
            <AlertCircle className="w-6 h-6 text-amber-500 shrink-0" />
            <div>
              <strong className="block text-sm text-amber-900 dark:text-white font-bold">Clinic Appointments Temporarily Paused</strong>
              <p className="mt-0.5">{clinicSettings.doctor_clinic_notice || 'In-clinic doctor consultations are temporarily paused by clinic administration. For urgent eye care or store visits, please call +91 9382293614.'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Doctors Profiles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {doctors.map((doc) => (
          <div 
            key={doc.id}
            className="glass-card rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-6 hover:border-brand-cyan/40 hover:shadow-cyan-glow transition-all"
          >
            <div className="space-y-4">
              {/* Doctor Header */}
              <div className="flex items-start gap-4">
                <img 
                  src={doc.photo_url || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80'} 
                  alt={doc.name}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-brand-cyan/40 shadow-lg shrink-0"
                />
                <div className="space-y-1">
                  <div className="inline-block px-2.5 py-0.5 rounded bg-brand-teal/15 text-brand-teal text-[10px] font-extrabold uppercase">
                    {doc.experience_years}+ Years Experience
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">{doc.name}</h3>
                  <div className="text-xs text-brand-cyan font-bold">{doc.specialization}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">{doc.qualification} &bull; Reg: {doc.reg_number}</div>
                </div>
              </div>

              {/* Bio */}
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                {doc.bio}
              </p>

              {/* Available Days Badges */}
              <div className="space-y-1.5 pt-2">
                <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1">
                  <Clock className="w-3 h-3 text-brand-cyan" />
                  Clinic Consultation Days:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(doc.available_days_list || []).map((day) => (
                    <span 
                      key={day}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white font-semibold text-[11px]"
                    >
                      {day}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Pricing & Booking CTA */}
            <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Consultation Fee</div>
                <div className="text-xl font-black text-slate-900 dark:text-white font-mono">₹{doc.consultation_fee}</div>
              </div>

              <button
                type="button"
                onClick={() => handleOpenBooking(doc)}
                disabled={clinicSettings.doctor_appointments_enabled === '0'}
                className="btn-primary text-xs py-2.5 px-5 rounded-xl shadow-cyan-glow disabled:opacity-50 font-bold"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{clinicSettings.doctor_appointments_enabled === '0' ? 'Consultations Paused' : 'Select Date & Slot'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* APPOINTMENT BOOKING MODAL */}
      {selectedDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-xl bg-white dark:bg-[#0A192F] border border-slate-200 dark:border-brand-cyan/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 overflow-y-auto max-h-[90vh]">
            
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
              <div>
                <span className="text-[10px] text-brand-cyan font-bold uppercase tracking-wider">
                  Reserve Clinical Consultation
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedDoctor.name}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedDoctor(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {bookingResult ? (
              <div className="text-center space-y-4 py-4">
                <div className="w-14 h-14 rounded-full bg-teal-500/20 text-teal-400 border border-teal-500/40 flex items-center justify-center mx-auto shadow-cyan-glow">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-extrabold text-slate-900 dark:text-white">Appointment Reserved!</h4>
                
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 space-y-2 max-w-sm mx-auto text-left">
                  <div className="flex justify-between border-b border-slate-200 dark:border-white/10 pb-2">
                    <span className="text-slate-500 dark:text-slate-400">Appointment Pass:</span>
                    <strong className="text-brand-cyan font-mono text-sm">{bookingResult.appointment_number}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Doctor:</span>
                    <span className="text-slate-900 dark:text-white font-bold">{bookingResult.doctor_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Date &amp; Time:</span>
                    <span className="text-slate-900 dark:text-white font-bold">{bookingResult.date} at {bookingResult.time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Consultation Fee:</span>
                    <span className="text-teal-600 dark:text-teal-400 font-bold">₹{bookingResult.fee} (Pay at Clinic Desk)</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Please arrive 10 minutes prior to your slot at Netra Unnayan, Digha Bypass Rd, Jatimati, Digha.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSlipModal(true)}
                    className="py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View / Print Consultation Slip</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSelectedDoctor(null); setBookingResult(null); }}
                    className="btn-secondary text-xs py-2.5 px-5 rounded-xl font-bold"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleBookSubmit} className="space-y-4">
                
                {bookingError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>{bookingError}</span>
                  </div>
                )}

                {/* Patient Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1 font-semibold">Patient Full Name *</label>
                    <input 
                      type="text" 
                      required
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="e.g. Rahul Sen"
                      className="w-full glass-input rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1 font-semibold">Mobile Contact *</label>
                    <input 
                      type="tel" 
                      required
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      placeholder="e.g. 9830123456"
                      className="w-full glass-input rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                {/* Available Date Chips with Day-Specific Fees */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
                      Select Consultation Date *
                    </label>
                    <span className="text-[11px] text-teal-600 dark:text-teal-400 font-bold">
                      Different Fees per Weekday/Sunday
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {selectedDoctor.upcoming_slots?.slice(0, 8).map((slot) => {
                      const isSelected = selectedDate === slot.date;
                      const slotFee = slot.fee || selectedDoctor.consultation_fee;
                      return (
                        <button
                          key={slot.date}
                          type="button"
                          onClick={() => setSelectedDate(slot.date)}
                          className={`p-2 rounded-xl border text-center text-xs transition-all ${
                            isSelected 
                              ? 'bg-brand-cyan text-slate-950 font-bold border-brand-cyan shadow-cyan-glow' 
                              : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-white/30'
                          }`}
                        >
                          <div className="font-bold">{slot.label}</div>
                          <div className={`text-[10px] font-extrabold mt-0.5 ${
                            isSelected ? 'text-slate-950' : 'text-teal-600 dark:text-teal-400 font-mono'
                          }`}>
                            ₹{slotFee} ({slot.day.slice(0, 3)})
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Slots */}
                <div>
                  <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1.5 font-semibold">
                    Available Clinic Slots *
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {timeSlots.map((ts) => (
                      <button
                        key={ts}
                        type="button"
                        onClick={() => setSelectedTime(ts)}
                        className={`p-2 rounded-lg border text-center text-xs font-mono transition-all ${
                          selectedTime === ts
                            ? 'bg-brand-teal text-slate-950 font-bold border-brand-teal shadow-cyan-glow' 
                            : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-white/30'
                        }`}
                      >
                        {ts}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chief Complaint / Notes */}
                <div>
                  <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1 font-semibold">Reason for Visit / Eye Symptoms (Optional)</label>
                  <textarea
                    rows="2"
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    placeholder="e.g. Blurry vision, annual refraction test, eye strain..."
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                {/* Day-specific Fee Summary Card */}
                {(() => {
                  const activeSlot = selectedDoctor?.upcoming_slots?.find(s => s.date === selectedDate);
                  const activeFee = activeSlot?.fee || selectedDoctor?.consultation_fee;
                  return (
                    <div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                          Consultation Fee ({activeSlot ? activeSlot.day : 'Selected Day'} rate):
                        </span>
                        <div className="font-extrabold text-teal-600 dark:text-teal-300 text-sm">
                          ₹{activeFee} <span className="text-[10px] font-normal text-slate-500">(Pay at Clinic Desk)</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                          No Advance Needed
                        </span>
                      </div>
                    </div>
                  );
                })()}

                <button
                  type="submit"
                  disabled={isSubmitting || clinicSettings.doctor_appointments_enabled === '0'}
                  className="w-full btn-primary text-xs py-3 rounded-xl font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 shadow-cyan-glow"
                >
                  {isSubmitting ? (
                    <span>Registering Appointment...</span>
                  ) : clinicSettings.doctor_appointments_enabled === '0' ? (
                    <span>Clinic Appointments Paused</span>
                  ) : (
                    <span>Confirm Consultation Slot</span>
                  )}
                </button>

              </form>
            )}

          </div>
        </div>
      )}

      {/* Consultation Slip Invoice Modal */}
      {showSlipModal && bookingResult && (
        <InvoiceModal
          isOpen={showSlipModal}
          onClose={() => setShowSlipModal(false)}
          invoiceData={{
            invoiceNumber: `NU-DOC-${bookingResult.appointment_number?.replace(/[^0-9]/g, '') || '001'}`,
            orderNumber: bookingResult.appointment_number,
            invoiceDate: bookingResult.date || new Date().toISOString().split('T')[0],
            type: 'DOCTOR',
            status: 'Confirmed',
            paymentMode: 'CLINIC_DESK',
            paymentStatus: 'Pending (Pay at Clinic Desk)',
            customerName: patientName || user?.full_name || 'Patient',
            customerPhone: patientPhone || user?.phone || '',
            customerEmail: patientEmail || user?.email || '',
            customerAddress: 'Netra Unnayan Main Clinic, Digha Bypass Rd, Jatimati, Digha - 721428',
            doctorName: bookingResult.doctor_name || selectedDoctor?.name,
            specialty: selectedDoctor?.specialization || 'Cataract & Comprehensive Eye Care',
            appointmentDate: bookingResult.date,
            appointmentTime: bookingResult.time,
            totalAmount: bookingResult.fee || selectedDoctor?.consultation_fee || 500,
            subtotal: bookingResult.fee || selectedDoctor?.consultation_fee || 500,
            warrantyNote: 'Official Consultation Slip & Optical Prescription Token'
          }}
        />
      )}

    </div>
  );
};
