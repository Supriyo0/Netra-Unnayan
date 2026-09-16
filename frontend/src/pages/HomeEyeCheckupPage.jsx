import React, { useState } from 'react';
import { 
  Eye, CheckCircle2, ShieldCheck, MapPin, Clock, 
  AlertCircle, Sparkles, Home, Phone, FileText
} from 'lucide-react';
import confetti from 'canvas-confetti';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { InvoiceModal } from '../components/common/InvoiceModal';

export const HomeEyeCheckupPage = () => {
  const { user } = useAuth();

  // All fields start completely empty for the customer to fill
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [landmark, setLandmark] = useState('');
  const [pincode, setPincode] = useState('');
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddrId, setSelectedAddrId] = useState(null);
  const [serviceDate, setServiceDate] = useState('');
  const [serviceSlot, setServiceSlot] = useState('');
  const [notes, setNotes] = useState('');
  const [serviceSettings, setServiceSettings] = useState({
    home_visit_enabled: '1',
    home_visit_notice: '',
    home_eye_checkup_fee: '299',
    serviceable_pincodes: '721428, 721463, 721401, 721453, 721441'
  });

  const [baseServiceFee, setBaseServiceFee] = useState(299);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSlipModal, setShowSlipModal] = useState(false);

  React.useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settRes = await api.get('/settings.php').catch(() => ({ success: false }));
        if (settRes?.success && settRes.data) {
          setServiceSettings(prev => ({ ...prev, ...settRes.data }));
          if (settRes.data.home_eye_checkup_fee) {
            setBaseServiceFee(parseFloat(settRes.data.home_eye_checkup_fee));
          }
        }
      } catch (err) {
        console.warn('Could not load service settings:', err);
      }
    };
    fetchSettings();

    if (user) {
      api.get('/account/addresses.php').then(res => {
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setSavedAddresses(res.data);
          // Do NOT prefill automatically - let customer fill or click to apply
        }
      }).catch(() => {});
    }
  }, [user]);

  // Fee is strictly modified/controlled by admin via settings
  const dynamicFee = parseFloat(serviceSettings.home_eye_checkup_fee || baseServiceFee || 299);

  const handleBook = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const res = await api.post('/home_eye/book.php', {
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_email: customerEmail.trim() || null,
        address_line1: addressLine1.trim(),
        address_line2: addressLine2.trim() || null,
        landmark: landmark.trim() || null,
        pincode: pincode.trim(),
        service_date: serviceDate,
        service_slot: serviceSlot.trim(),
        notes: notes.trim() || null
      });

      if (res.success && res.data) {
        try { confetti({ particleCount: 70, spread: 60 }); } catch {}
        setBookingResult(res.data);
      } else {
        setErrorMessage(res.message || 'Failed to schedule home eye test.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Booking failed. Please check your information.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      
      {/* Hero Header */}
      <div className="glass-card-glow rounded-3xl p-8 text-center space-y-4">
        <span className="inline-block px-3 py-1 rounded-full bg-brand-cyan/20 text-brand-cyan text-xs font-bold uppercase tracking-wider">
          Doorstep Clinical Service
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
          Book Home Eye Checkup
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-xl mx-auto leading-relaxed">
          Certified optometrist visit with computerized autorefractor, retinal visual acuity testing, and 100+ optical frames for live trial at your home.
        </p>
        <div className="text-xs text-brand-teal font-bold flex items-center justify-center gap-1.5">
          <span>Fee: ₹{serviceSettings.home_eye_checkup_fee || '299'} (Covers complete diagnostic test + 100+ trial frames)</span>
        </div>

        {serviceSettings.home_visit_enabled === '0' && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-500/50 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-3 text-left">
            <AlertCircle className="w-6 h-6 text-amber-500 shrink-0" />
            <div>
              <strong className="block text-sm text-amber-900 dark:text-white font-bold">Doorstep Checkup Service Currently Paused</strong>
              <p className="mt-0.5">{serviceSettings.home_visit_notice || 'Home eye checkup appointments are temporarily paused by clinic administration. You can still visit our Digha clinic or contact us at +91 9382293614.'}</p>
            </div>
          </div>
        )}
      </div>

      {bookingResult ? (
        <div className="glass-card rounded-3xl p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-teal-500/20 text-teal-400 border border-teal-500/40 flex items-center justify-center mx-auto shadow-cyan-glow">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Home Visit Confirmed!</h2>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Booking Reference: <strong className="text-brand-cyan font-mono text-base px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5">{bookingResult.booking_number}</strong>
          </p>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 space-y-2 max-w-sm mx-auto text-left">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Scheduled Date:</span>
              <strong className="text-slate-900 dark:text-white">{bookingResult.service_date}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Time Window:</span>
              <strong className="text-slate-900 dark:text-white">{bookingResult.service_slot}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Visit Fee:</span>
              <strong className="text-teal-600 dark:text-teal-400">₹{bookingResult.fee} (Pay on visit via Cash/UPI)</strong>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-500/30 text-[11px] text-amber-800 dark:text-amber-200 max-w-md mx-auto">
            Free cancellation or reschedule is permitted up to 2 hours prior to your scheduled slot.
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setShowSlipModal(true)}
              className="py-2.5 px-4 rounded-xl font-bold text-xs bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>View / Print Booking Slip</span>
            </button>
            <button
              type="button"
              onClick={() => setBookingResult(null)}
              className="btn-secondary text-xs py-2.5 px-5 rounded-xl font-bold"
            >
              Book Another Visit
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleBook} className="glass-card rounded-3xl p-6 sm:p-8 space-y-6">
          
          <h3 className="text-xs font-bold uppercase tracking-wider text-brand-cyan border-b border-slate-200 dark:border-white/10 pb-3">
            Enter Service Address &amp; Schedule
          </h3>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1 font-semibold">Full Name *</label>
              <input 
                type="text" 
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Rahul Sen"
                className="w-full glass-input rounded-xl px-3.5 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1 font-semibold">Mobile Contact *</label>
              <input 
                type="tel" 
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="e.g. 9830123456"
                className="w-full glass-input rounded-xl px-3.5 py-2 text-xs"
              />
            </div>
          </div>

          {/* Saved Addresses Quick Selector */}
          {savedAddresses.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2">
              <span className="text-xs text-slate-700 dark:text-slate-300 font-bold block flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-brand-cyan" /> Autofill from Saved Address:
              </span>
              <div className="flex flex-wrap gap-2">
                {savedAddresses.map((sa) => (
                  <button
                    key={sa.id}
                    type="button"
                    onClick={() => {
                      setSelectedAddrId(sa.id);
                      setAddressLine1(sa.address_line1 || '');
                      setAddressLine2(sa.address_line2 || '');
                      setLandmark(sa.landmark || '');
                      if (sa.pincode) setPincode(sa.pincode);
                    }}
                    className={`text-xs px-3 py-1.5 rounded-xl border font-medium transition-all ${
                      selectedAddrId === sa.id
                        ? 'bg-brand-cyan text-slate-950 font-black border-brand-cyan shadow-sm'
                        : 'bg-white dark:bg-white/5 border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-300 hover:border-brand-cyan/50'
                    }`}
                  >
                    {sa.address_type || 'HOME'}: {sa.address_line1?.slice(0, 26)}... ({sa.pincode})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Transparent Admin Configured Pricing & Service Area Banner */}
          <div className="p-4 rounded-2xl bg-brand-cyan/10 border border-brand-cyan/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-brand-cyan block">
                Standard Doorstep Clinical Visit
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                Covers complete autorefraction eye checkup + 100+ trial optical frames at your doorstep.
              </p>
            </div>
            <div className="text-left sm:text-right shrink-0">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Visit Fee</span>
              <strong className="text-xl font-black text-brand-cyan font-mono">₹{dynamicFee}</strong>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Pay on visit (Cash / UPI)</span>
            </div>
          </div>

          {/* Premises Address */}
          <div>
            <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1 font-semibold">Premises Address (House/Flat/Office) *</label>
            <input 
              type="text" 
              required
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              placeholder="Enter your complete house / building / street address"
              className="w-full glass-input rounded-xl px-3.5 py-2 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1 font-semibold">Landmark (Optional)</label>
              <input 
                type="text" 
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g. Near Central Co-operative Bank"
                className="w-full glass-input rounded-xl px-3.5 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1 font-semibold">
                Service Area PIN Code (6-Digit) *
              </label>
              <input 
                type="text" 
                required
                maxLength={6}
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="Enter 6-digit postal PIN code"
                className="w-full glass-input rounded-xl px-3.5 py-2 text-xs font-mono font-bold"
              />
            </div>
          </div>

          {/* Custom Date & Time by Customer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1 font-semibold">
                Preferred Visit Date *
              </label>
              <input 
                type="date" 
                required
                min={new Date().toISOString().split('T')[0]}
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
                className="w-full glass-input rounded-xl px-3.5 py-2 text-xs cursor-pointer font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1 font-semibold">
                Preferred Time / Window *
              </label>
              <input 
                type="text" 
                required
                value={serviceSlot}
                onChange={(e) => setServiceSlot(e.target.value)}
                placeholder="e.g. 11:30 AM, Morning (10-1), or Afternoon (2-5)"
                className="w-full glass-input rounded-xl px-3.5 py-2 text-xs"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-slate-300 mb-1">Special Requirements / Family Members Count (Optional)</label>
            <input 
              type="text" 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Testing for elderly parents, please bring bifocal trial lenses..."
              className="w-full glass-input rounded-xl px-3.5 py-2 text-xs"
            />
          </div>

          {/* Policy Banner */}
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-brand-cyan shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>Cancellation Policy:</strong> You may cancel or reschedule free of charge up to 2 hours prior to the slot. Optometrist visits require active phone confirmation prior to departure.
            </p>
          </div>

          {/* Submit */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/10">
            <span className="text-xs text-slate-400">
              Visit Fee for your location: <strong className="text-brand-cyan text-sm font-mono font-bold">₹{dynamicFee}</strong> (Covers test &amp; 100+ trial frames)
            </span>

            <button
              type="submit"
              disabled={isSubmitting || serviceSettings.home_visit_enabled === '0'}
              className="btn-primary text-xs py-3 px-7 rounded-xl disabled:opacity-50 flex items-center gap-2 shadow-cyan-glow w-full sm:w-auto justify-center"
            >
              {isSubmitting ? (
                <span>Confirming...</span>
              ) : serviceSettings.home_visit_enabled === '0' ? (
                <span>Service Temporarily Paused</span>
              ) : (
                <span>Book Home Eye Test (₹{dynamicFee})</span>
              )}
            </button>
          </div>

        </form>
      )}

      {/* Home Eye Checkup Booking Slip Modal */}
      {showSlipModal && bookingResult && (
        <InvoiceModal
          isOpen={showSlipModal}
          onClose={() => setShowSlipModal(false)}
          invoiceData={{
            invoiceNumber: `NU-HET-${bookingResult.booking_number?.replace(/[^0-9]/g, '') || '001'}`,
            orderNumber: bookingResult.booking_number,
            invoiceDate: bookingResult.service_date || new Date().toISOString().split('T')[0],
            type: 'HOME_EYE',
            status: 'Confirmed',
            paymentMode: 'DOORSTEP_COD',
            paymentStatus: 'Pending (Pay at Visit)',
            customerName: customerName || user?.full_name || 'Patient',
            customerPhone: customerPhone || user?.phone || '',
            customerEmail: customerEmail || user?.email || '',
            customerAddress: `${addressLine1}${addressLine2 ? `, ${addressLine2}` : ''}${landmark ? ` (Landmark: ${landmark})` : ''} - ${pincode}`,
            appointmentDate: bookingResult.service_date,
            appointmentTime: bookingResult.service_slot,
            totalAmount: bookingResult.fee || 299,
            subtotal: bookingResult.fee || 299,
            warrantyNote: 'Doorstep Optometry Eye Exam & 100+ Designer Frame Trial'
          }}
        />
      )}

    </div>
  );
};
