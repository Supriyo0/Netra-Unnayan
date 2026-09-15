import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, Plus, Edit2, CheckCircle2, AlertCircle, 
  Clock, DollarSign, Calendar, RefreshCw, X, Shield, Award, UserCheck, Power
} from 'lucide-react';
import api from '../../api/client';
import { ImageUploadDropzone } from '../../components/common/ImageUploadDropzone';

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const AdminDoctorsPage = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Form State for Add/Edit Doctor
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [qualification, setQualification] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [experienceYears, setExperienceYears] = useState('10');
  const [regNumber, setRegNumber] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [consultationFee, setConsultationFee] = useState('400');
  const [dayFees, setDayFees] = useState({
    Monday: '400',
    Tuesday: '400',
    Wednesday: '400',
    Thursday: '400',
    Friday: '400',
    Saturday: '500',
    Sunday: '600'
  });
  const [availableDays, setAvailableDays] = useState(['Monday', 'Wednesday', 'Friday']);
  const [startTime, setStartTime] = useState('10:00:00');
  const [endTime, setEndTime] = useState('18:00:00');
  const [bio, setBio] = useState('');
  const [isActive, setIsActive] = useState(1);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/doctors.php');
      if (res.success && res.data) {
        setDoctors(res.data);
      }
    } catch (err) {
      console.error('Failed to load specialists:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setQualification('MBBS, MS (Ophthalmology)');
    setSpecialization('Senior Eye Surgeon & Cataract Specialist');
    setExperienceYears('12');
    setRegNumber('WBMC-' + Math.floor(10000 + Math.random() * 90000));
    setPhotoUrl('https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80');
    setConsultationFee('500');
    setDayFees({
      Monday: '500',
      Tuesday: '500',
      Wednesday: '500',
      Thursday: '500',
      Friday: '500',
      Saturday: '600',
      Sunday: '700'
    });
    setAvailableDays(['Monday', 'Wednesday', 'Friday', 'Saturday', 'Sunday']);
    setStartTime('10:00:00');
    setEndTime('18:00:00');
    setBio('Senior clinical consultant with extensive experience in refractive eye care and micro-surgery.');
    setIsActive(1);
    setModalOpen(true);
  };

  const handleOpenEdit = (doc) => {
    setEditingId(doc.id);
    setName(doc.name || '');
    setQualification(doc.qualification || '');
    setSpecialization(doc.specialization || '');
    setExperienceYears(String(doc.experience_years || 5));
    setRegNumber(doc.reg_number || '');
    setPhotoUrl(doc.photo_url || '');
    const baseFee = String(doc.consultation_fee || 400);
    setConsultationFee(baseFee);

    // Parse day_fees
    let parsedDayFees = {
      Monday: baseFee,
      Tuesday: baseFee,
      Wednesday: baseFee,
      Thursday: baseFee,
      Friday: baseFee,
      Saturday: String(parseFloat(baseFee) + 100),
      Sunday: String(parseFloat(baseFee) + 200)
    };
    if (doc.day_fees) {
      try {
        const decoded = typeof doc.day_fees === 'string' ? json_decode_safe(doc.day_fees) : doc.day_fees;
        if (decoded && typeof decoded === 'object') {
          ALL_DAYS.forEach(day => {
            if (decoded[day] !== undefined) {
              parsedDayFees[day] = String(decoded[day]);
            }
          });
        }
      } catch (e) {}
    }
    setDayFees(parsedDayFees);

    const daysArr = typeof doc.available_days === 'string'
      ? doc.available_days.split(',').map(s => s.trim()).filter(Boolean)
      : (doc.available_days || []);
    setAvailableDays(daysArr);
    setStartTime(doc.available_time_start || '10:00:00');
    setEndTime(doc.available_time_end || '18:00:00');
    setBio(doc.bio || '');
    setIsActive(Number(doc.is_active));
    setModalOpen(true);
  };

  const json_decode_safe = (str) => {
    try { return JSON.parse(str); } catch (e) { return null; }
  };

  const syncBaseFeeToAllDays = () => {
    const next = {};
    ALL_DAYS.forEach(d => { next[d] = consultationFee; });
    setDayFees(next);
  };

  const handleToggleDay = (day) => {
    setAvailableDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleToggleActive = async (doc) => {
    const nextState = doc.is_active ? 0 : 1;
    try {
      const res = await api.post('/admin/doctors.php', {
        action: 'toggle',
        id: doc.id,
        is_active: nextState
      });
      if (res.success) {
        setDoctors(prev => prev.map(d => d.id === doc.id ? { ...d, is_active: nextState } : d));
        setFeedback({ type: 'success', message: `${doc.name} is now ${nextState ? 'Active' : 'Deactivated'}.` });
        setTimeout(() => setFeedback({ type: '', message: '' }), 3000);
      }
    } catch (err) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Doctor name is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: editingId,
        name: name.trim(),
        qualification: qualification.trim(),
        specialization: specialization.trim(),
        experience_years: parseInt(experienceYears) || 0,
        reg_number: regNumber.trim(),
        photo_url: photoUrl.trim(),
        bio: bio.trim(),
        consultation_fee: parseFloat(consultationFee) || 0,
        day_fees: dayFees,
        available_days: availableDays,
        available_time_start: startTime,
        available_time_end: endTime,
        is_active: isActive
      };

      const res = await api.post('/admin/doctors.php', payload);
      if (res.success) {
        setFeedback({ type: 'success', message: res.message || 'Specialist profile saved successfully.' });
        setModalOpen(false);
        await fetchDoctors();
        setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
      } else {
        alert(res.message || 'Save failed');
      }
    } catch (err) {
      alert(err.message || 'Error saving doctor profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <span className="text-xs uppercase font-extrabold tracking-wider text-brand-cyan">
            Clinical Ophthalmology Suite
          </span>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-brand-cyan" />
            Doctors &amp; Specialists Roster
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage consulting eye surgeons, clinic schedule days, consultation fees &amp; public roster
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="btn-primary px-5 py-2.5 rounded-xl text-xs font-bold shadow-cyan-glow flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Specialist</span>
        </button>
      </div>

      {feedback.message && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-semibold ${
          feedback.type === 'success' 
            ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-200' 
            : 'bg-rose-950/40 border border-rose-500/40 text-rose-200'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Registered Specialists</span>
          <div className="text-2xl font-extrabold text-white font-mono">{doctors.length}</div>
          <span className="text-[10px] text-brand-cyan font-medium">Ophthalmology &amp; Optometry</span>
        </div>
        <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Active on Storefront</span>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">
            {doctors.filter(d => Number(d.is_active) === 1).length}
          </div>
          <span className="text-[10px] text-slate-400">Available for customer bookings</span>
        </div>
        <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase">Consultation Desk</span>
          <div className="text-2xl font-extrabold text-brand-teal font-mono">Digha Clinic</div>
          <span className="text-[10px] text-slate-400">Jatimati Bypass Center</span>
        </div>
      </div>

      {/* Specialists List */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-brand-cyan" />
          <p className="text-xs text-slate-400">Loading specialist roster...</p>
        </div>
      ) : doctors.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center space-y-4">
          <Stethoscope className="w-12 h-12 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-white">No doctors registered yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Click Add New Specialist above to register eye surgeons and optometrists.
          </p>
          <button onClick={handleOpenAdd} className="btn-primary text-xs px-5 py-2 rounded-xl">
            Add First Doctor
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {doctors.map((doc) => {
            const daysList = typeof doc.available_days === 'string'
              ? doc.available_days.split(',').map(s => s.trim()).filter(Boolean)
              : (doc.available_days || []);
            const isActiveBool = Number(doc.is_active) === 1;

            return (
              <div 
                key={doc.id}
                className={`glass-card rounded-3xl p-6 border transition-all space-y-5 flex flex-col justify-between ${
                  isActiveBool ? 'border-white/10 hover:border-brand-cyan/40' : 'border-white/5 opacity-70 bg-black/40'
                }`}
              >
                <div className="space-y-4">
                  {/* Top Doctor Row */}
                  <div className="flex items-start gap-4">
                    <img
                      src={doc.photo_url || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80'}
                      alt={doc.name}
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-brand-cyan/30 shrink-0 shadow-lg"
                    />
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-teal/20 text-brand-teal font-extrabold uppercase tracking-wider">
                          {doc.experience_years}+ Yrs Exp
                        </span>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          isActiveBool ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {isActiveBool ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white leading-tight">{doc.name}</h3>
                      <div className="text-xs text-brand-cyan font-medium">{doc.specialization}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{doc.qualification} &bull; Reg: {doc.reg_number}</div>
                    </div>
                  </div>

                  {/* Bio */}
                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                    {doc.bio || 'Clinical ophthalmologist specializing in vision testing and surgery.'}
                  </p>

                  {/* Consultation Days */}
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-brand-cyan" />
                      Clinic Consultation Days:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {daysList.map(day => (
                        <span key={day} className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-slate-200">
                          {day}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom Row */}
                <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Consultation Fee</span>
                    <span className="text-base font-black text-white font-mono">₹{doc.consultation_fee}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(doc)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isActiveBool 
                          ? 'bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300' 
                          : 'bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300'
                      }`}
                      title={isActiveBool ? 'Pause / Deactivate Doctor' : 'Activate Doctor'}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{isActiveBool ? 'Pause' : 'Activate'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(doc)}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ADD / EDIT SPECIALIST MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-2xl w-full glass-card rounded-3xl overflow-hidden border border-white/20 shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand-cyan/20 border border-brand-cyan/40 flex items-center justify-center text-brand-cyan">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {editingId ? 'Edit Doctor Profile' : 'Register New Consulting Doctor'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Enter clinical credentials, photo, consultation charges and clinic schedule
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              
              {/* Photo Upload via Direct Storage */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <ImageUploadDropzone
                  value={photoUrl}
                  onChange={setPhotoUrl}
                  label="Doctor Portrait Photograph"
                  sublabel="Upload doctor image directly from your local files (JPG/PNG)"
                  prefix="doctor_portrait"
                  heightClass="h-32"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Doctor Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dr. Arindam Banerjee"
                    className="w-full glass-input rounded-xl px-3.5 py-2 text-xs text-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">Specialization Title *</label>
                  <input
                    type="text"
                    required
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    placeholder="e.g. Senior Cataract & Glaucoma Surgeon"
                    className="w-full glass-input rounded-xl px-3.5 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">Qualifications / Degrees</label>
                  <input
                    type="text"
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    placeholder="e.g. MBBS, MS (Ophthalmology), FICO"
                    className="w-full glass-input rounded-xl px-3.5 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">Medical Registration Number</label>
                  <input
                    type="text"
                    value={regNumber}
                    onChange={(e) => setRegNumber(e.target.value)}
                    placeholder="e.g. WBMC-62419"
                    className="w-full glass-input rounded-xl px-3.5 py-2 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">Experience (Years)</label>
                  <input
                    type="number"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                    className="w-full glass-input rounded-xl px-3.5 py-2 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">Standard Base Fee (₹) *</label>
                  <input
                    type="number"
                    required
                    value={consultationFee}
                    onChange={(e) => setConsultationFee(e.target.value)}
                    className="w-full glass-input rounded-xl px-3.5 py-2 text-xs font-mono text-white font-bold"
                  />
                </div>
              </div>

              {/* Day-Specific Consultation Fees Grid */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <span>Day-Specific Fees (Different Doctor Fees per Mon, Sun, Tue, etc.)</span>
                  </label>
                  <button
                    type="button"
                    onClick={syncBaseFeeToAllDays}
                    className="text-[10px] text-brand-cyan hover:underline font-semibold"
                  >
                    Set Base Fee (₹{consultationFee}) to All Days
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Custom schedule pricing: Set different consultation charges for weekends or specific consulting weekdays.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                  {ALL_DAYS.map((day) => {
                    const isAvailable = availableDays.includes(day);
                    return (
                      <div 
                        key={day} 
                        className={`p-2 rounded-xl border transition-all ${
                          isAvailable ? 'bg-white/5 border-white/15' : 'bg-black/20 border-white/5 opacity-50'
                        }`}
                      >
                        <div className="text-[10px] font-bold text-slate-300 truncate mb-1 flex items-center justify-between">
                          <span>{day.slice(0, 3)}</span>
                          {isAvailable && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Consultation day active" />}
                        </div>
                        <div className="relative">
                          <span className="absolute left-2 top-1.5 text-[10px] text-slate-400">₹</span>
                          <input
                            type="number"
                            value={dayFees[day] || consultationFee}
                            onChange={(e) => setDayFees({ ...dayFees, [day]: e.target.value })}
                            className="w-full glass-input rounded-lg pl-5 pr-1.5 py-1 text-xs font-mono font-bold text-brand-cyan text-right"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Consultation Weekdays */}
              <div className="space-y-2">
                <label className="block text-xs text-slate-300">
                  Available Clinic Consultation Days (Select all that apply)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ALL_DAYS.map((day) => {
                    const checked = availableDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleToggleDay(day)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left flex items-center justify-between ${
                          checked
                            ? 'bg-brand-cyan/20 border-brand-cyan text-brand-cyan'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>{day}</span>
                        {checked && <CheckCircle2 className="w-3.5 h-3.5 text-brand-cyan" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Shift Timings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Shift Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full glass-input rounded-xl px-3.5 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Shift End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full glass-input rounded-xl px-3.5 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs text-slate-300 mb-1">Clinical Biography / Background</label>
                <textarea
                  rows="3"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Specialist clinical background, hospital affiliations, laser surgery certifications..."
                  className="w-full glass-input rounded-xl px-3.5 py-2 text-xs"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                <div>
                  <div className="text-xs font-bold text-white">Active Status</div>
                  <div className="text-[11px] text-slate-400">Displays on storefront and allows customer slot bookings</div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActive(prev => prev === 1 ? 0 : 1)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold ${
                    isActive === 1 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isActive === 1 ? 'ACTIVE (ON)' : 'OFF'}
                </button>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary px-6 py-2.5 rounded-xl text-xs font-bold shadow-cyan-glow flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                  <span>{editingId ? 'Update Specialist' : 'Add to Clinic Roster'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
