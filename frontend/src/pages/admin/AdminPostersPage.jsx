import React, { useState, useEffect } from 'react';
import { 
  Award, Calendar, Clock, MapPin, Phone, Mail, QrCode, 
  Printer, Sparkles, UserCheck, ShieldCheck, Download, Share2 
} from 'lucide-react';
import api from '../../api/client';

export default function AdminPostersPage() {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [title, setTitle] = useState('Specialist Eye Camp & Free Vision Screening');
  const [subtitle, setSubtitle] = useState('Comprehensive Eye Checkup, Retina Examination & Precision Glasses');
  const [eventDate, setEventDate] = useState('Every Sunday & Thursday');
  const [eventTime, setEventTime] = useState('10:00 AM — 02:00 PM & 05:00 PM — 08:00 PM');
  const [venue, setVenue] = useState('Netra Unnayan Eye Clinic, Digha Bypass Rd, Jatimati, Digha, West Bengal 721428');
  const [specialOffer, setSpecialOffer] = useState('Free Computerised Eye Test with Frame Purchase');
  const [features, setFeatures] = useState([
    'Digital Vision & Refraction Testing',
    'Glaucoma & Eye Pressure Screening',
    'Diabetic Retinopathy Assessment',
    'Cataract Surgical Consultations',
    'Blue-Cut & Progressive Lenses Fitting'
  ]);
  const [contactNumber, setContactNumber] = useState('9382293614');
  const [contactEmail, setContactEmail] = useState('netraunnayan@gmail.com');

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const res = await api.get('/doctors');
      const docs = res.data?.doctors || (Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []));
      setDoctors(docs);
      if (docs.length > 0) {
        setSelectedDoctorId(docs[0].id);
      }
    } catch (err) {
      console.error('Failed to load doctors for posters', err);
    }
  };

  const selectedDoctor = doctors.find((d) => d.id == selectedDoctorId) || {
    name: 'Dr. Arindam Banerjee',
    qualifications: 'MBBS, MS (Ophthalmology)',
    specialty: 'Senior Cataract & Refractive Surgeon',
    experience_years: 14,
    photo_url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&q=80'
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header - Screen only */}
      <div className="print:hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-neutral-900 dark:text-white flex items-center gap-2">
            <Award className="w-7 h-7 text-primary-600" />
            Promotional Eye Doctor & Camp Poster Studio
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Generate high-resolution marketing banners, clinic standees, and eye checkup camp notices
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="btn-primary px-6 py-2.5 flex items-center gap-2 shadow-lg"
        >
          <Printer className="w-4 h-4" />
          Print / Export Poster
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Customization Form - Screen only */}
        <div className="print:hidden lg:col-span-5 space-y-4">
          <div className="glass-card p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary-600" />
              Poster Campaign Settings
            </h3>

            <div>
              <label className="text-xs text-neutral-500 font-medium block mb-1">
                Select Consulting Doctor
              </label>
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="input-field py-2 text-sm w-full"
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} — {d.qualifications} ({d.specialty})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-neutral-500 font-medium block mb-1">
                Event / Campaign Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-field py-2 text-sm w-full"
              />
            </div>

            <div>
              <label className="text-xs text-neutral-500 font-medium block mb-1">
                Sub-headline
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="input-field py-2 text-sm w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-neutral-500 font-medium block mb-1">
                  Camp Dates / Days
                </label>
                <input
                  type="text"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="input-field py-2 text-sm w-full"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-500 font-medium block mb-1">
                  Timings
                </label>
                <input
                  type="text"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  className="input-field py-2 text-sm w-full"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-neutral-500 font-medium block mb-1">
                Promotional Offer Badge
              </label>
              <input
                type="text"
                value={specialOffer}
                onChange={(e) => setSpecialOffer(e.target.value)}
                className="input-field py-2 text-sm w-full font-semibold text-primary-600"
              />
            </div>

            <div>
              <label className="text-xs text-neutral-500 font-medium block mb-1">
                Clinic Venue & Address
              </label>
              <textarea
                rows="2"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className="input-field py-2 text-sm w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-neutral-500 font-medium block mb-1">
                  Fast WhatsApp Booking
                </label>
                <input
                  type="text"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className="input-field py-2 text-sm w-full font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-500 font-medium block mb-1">
                  Official Email
                </label>
                <input
                  type="text"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="input-field py-2 text-sm w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Live Poster Canvas */}
        <div className="lg:col-span-7 flex justify-center">
          {/* High-res Standee Canvas (Aspect Ratio 3:4 or A4) */}
          <div 
            id="printable-poster"
            className="w-full max-w-[540px] bg-gradient-to-b from-neutral-900 via-primary-950 to-neutral-900 text-white rounded-3xl overflow-hidden shadow-2xl border-4 border-amber-500/40 relative p-8 flex flex-col justify-between"
            style={{ minHeight: '740px' }}
          >
            {/* Background Glows */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-primary-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header: Netra Unnayan Logo & Tagline */}
            <div className="relative z-10 flex items-center justify-between border-b border-white/15 pb-5">
              <div className="flex items-center gap-3">
                <img 
                  src="/logo_symbol.png" 
                  alt="Netra Unnayan" 
                  className="h-10 w-10 object-contain drop-shadow"
                />
                <div>
                  <span className="font-black text-white text-base tracking-wider block leading-none">
                    NETRA <span className="text-amber-400">UNNAYAN</span>
                  </span>
                  <span className="text-[9px] text-teal-300 font-bold uppercase tracking-widest">
                    Optical &amp; Eye Clinic
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-widest text-amber-400 font-semibold">
                  CLARITY YOU CAN TRUST
                </div>
                <div className="text-xs text-neutral-300 font-medium">
                  Optical & Diagnostic Centre
                </div>
              </div>
            </div>

            {/* Main Campaign Headline */}
            <div className="relative z-10 text-center my-6 space-y-2">
              <span className="inline-block px-4 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-wider">
                ★ Special Eye Care Event ★
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold font-heading text-white tracking-tight leading-tight">
                {title}
              </h2>
              <p className="text-xs sm:text-sm text-neutral-300 max-w-md mx-auto">
                {subtitle}
              </p>
            </div>

            {/* Doctor Profile Banner */}
            <div className="relative z-10 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 flex items-center gap-4">
              <img 
                src={selectedDoctor.photo_url || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&q=80'} 
                alt={selectedDoctor.name} 
                className="w-20 h-20 rounded-xl object-cover border-2 border-amber-400 shadow-md shrink-0"
              />
              <div>
                <div className="text-xs uppercase tracking-wider text-amber-400 font-semibold flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" /> Consulting Specialist
                </div>
                <div className="text-lg font-bold font-heading text-white mt-0.5">
                  {selectedDoctor.name}
                </div>
                <div className="text-xs text-primary-200 font-medium">
                  {selectedDoctor.qualifications}
                </div>
                <div className="text-xs text-neutral-300 mt-0.5">
                  {selectedDoctor.specialty} • {selectedDoctor.experience_years}+ Years Experience
                </div>
              </div>
            </div>

            {/* Camp Offer & Highlights */}
            <div className="relative z-10 my-4 space-y-3">
              {specialOffer && (
                <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-bold text-center py-2 px-4 rounded-xl text-xs uppercase tracking-wider shadow-lg">
                  🎁 {specialOffer}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-neutral-200">
                {features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Date, Time & Venue */}
            <div className="relative z-10 bg-black/40 rounded-2xl p-4 border border-white/10 grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Date & Days</div>
                  <div className="text-neutral-300 text-[11px]">{eventDate}</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Consultation Hours</div>
                  <div className="text-neutral-300 text-[11px]">{eventTime}</div>
                </div>
              </div>
              <div className="col-span-2 flex items-start gap-2 pt-2 border-t border-white/10">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Venue</div>
                  <div className="text-neutral-300 text-[11px]">{venue}</div>
                </div>
              </div>
            </div>

            {/* Footer: WhatsApp & Instant QR */}
            <div className="relative z-10 mt-5 pt-4 border-t border-white/15 flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-[10px] uppercase tracking-wider text-amber-400 font-bold">
                  Prior Appointment Recommended
                </div>
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <span>Call / WhatsApp: {contactNumber}</span>
                </div>
                <div className="text-[11px] text-neutral-400">
                  Email: {contactEmail}
                </div>
              </div>

              <div className="flex flex-col items-center bg-white p-2 rounded-xl text-black">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`https://wa.me/91${contactNumber}?text=Hello%20Netra%20Unnayan,%20I%20would%20like%20to%20book%20an%20eye%20consultation`)}`}
                  alt="Book QR" 
                  className="w-14 h-14 object-contain"
                />
                <span className="text-[8px] font-bold uppercase mt-0.5 text-neutral-800">Scan to Book</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
