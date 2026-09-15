import React, { useState, useEffect } from 'react';
import { 
  Settings, Store, CreditCard, Stethoscope, Save, 
  CheckCircle2, AlertCircle, RefreshCw, MapPin, Phone, Mail,
  Sliders, Eye, Power, Send, ShieldCheck, Truck, Home, Award, Upload
} from 'lucide-react';
import api from '../../api/client';

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const [settings, setSettings] = useState({
    business_name: 'Netra Unnayan',
    tagline: 'Clarity You Can Trust',
    business_address: 'Digha Bypass Rd, Jatimati, Digha, West Bengal 721428',
    google_maps_url: 'https://maps.app.goo.gl/TBLLEac73RdPyqLq6?g_st=ac',
    contact_phone: '9382293614',
    contact_email: 'netraunnayan7@gmail.com',
    upi_id: '9382293614@upi',
    upi_merchant_name: 'NETRA UNNAYAN OPTICALS',
    cod_enabled: '1',
    online_payment_enabled: '1',
    home_eye_checkup_fee: '299',
    free_shipping_threshold: '999',
    standard_shipping_fee: '70',
    cancellation_cutoff_hours: '12',
    home_visit_cancellation_cutoff_hours: '2',
    return_window_days: '7',
    maintenance_mode: '0',
    // Section Visibility & Controls
    home_visit_enabled: '1',
    home_visit_notice: '',
    doctor_appointments_enabled: '1',
    doctor_clinic_notice: '',
    offers_slider_enabled: '1',
    serviceable_pincodes: '721428, 721463, 721401, 721453, 721441',
    // SMTP Credentials
    smtp_host: 'smtp.gmail.com',
    smtp_port: '587',
    smtp_user: 'netraunnayan7@gmail.com',
    smtp_pass: '',
    smtp_encryption: 'tls',
    smtp_from_email: 'netraunnayan7@gmail.com',
    smtp_from_name: 'Netra Unnayan Eye Care',
    // Trust Features
    trust_features: JSON.stringify([
      { icon: 'Shield', title: 'JAPAN TITANIUM', desc: '100% Certified Japanese Beta-Titanium' },
      { icon: 'Eye', title: 'GERMAN OPTICS', desc: 'Digital Blue & UV400 Anti-Glare Cut' },
      { icon: 'RotateCcw', title: '14-DAY REPLACEMENT', desc: 'Zero-Risk Optical Frame Exchange' },
      { icon: 'Truck', title: 'SECURE CHECKOUT', desc: 'Instant UPI QR & Verified COD Orders' }
    ]),
    // ImgBB Cloud Storage
    imgbb_api_key: ''
  });

  const defaultTrustFeatures = [
    { icon: 'Shield', title: 'JAPAN TITANIUM', desc: '100% Certified Japanese Beta-Titanium' },
    { icon: 'Eye', title: 'GERMAN OPTICS', desc: 'Digital Blue & UV400 Anti-Glare Cut' },
    { icon: 'RotateCcw', title: '14-DAY REPLACEMENT', desc: 'Zero-Risk Optical Frame Exchange' },
    { icon: 'Truck', title: 'SECURE CHECKOUT', desc: 'Instant UPI QR & Verified COD Orders' }
  ];

  const getTrustFeatures = () => {
    if (!settings.trust_features) return defaultTrustFeatures;
    try {
      const parsed = typeof settings.trust_features === 'string' 
        ? JSON.parse(settings.trust_features) 
        : settings.trust_features;
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultTrustFeatures;
    } catch {
      return defaultTrustFeatures;
    }
  };

  const handleTrustFeatureChange = (index, field, val) => {
    const current = [...getTrustFeatures()];
    if (current[index]) {
      current[index] = { ...current[index], [field]: val };
      setSettings(prev => ({ ...prev, trust_features: JSON.stringify(current) }));
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/settings.php');
      if (res.success && res.data) {
        setSettings((prev) => ({ ...prev, ...res.data }));
      }
    } catch (err) {
      console.error('Failed to load settings', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? '1' : '0') : value
    }));
  };

  const handleToggle = (key) => {
    setSettings((prev) => ({
      ...prev,
      [key]: prev[key] === '1' ? '0' : '1'
    }));
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      setFeedback({ type: '', message: '' });
      const res = await api.post('/admin/settings.php', settings);
      if (res.success) {
        setFeedback({ type: 'success', message: 'Settings & service controls saved successfully!' });
        setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
      } else {
        setFeedback({ type: 'error', message: res.message || 'Failed to save settings' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Error updating settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    setFeedback({ type: '', message: '' });
    try {
      const res = await api.post('/admin/settings.php', {
        ...settings,
        test_email: settings.contact_email || 'netraunnayan7@gmail.com'
      });
      setFeedback({ type: 'success', message: 'SMTP configuration validated! Test notification dispatched.' });
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'SMTP test failed. Please verify host, port, and App Password.' });
    } finally {
      setTestingSmtp(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-brand-cyan" />
        <p className="text-sm text-slate-400">Loading store settings &amp; controls...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <span className="text-xs uppercase font-extrabold tracking-wider text-brand-cyan">
            Enterprise Control Center
          </span>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-brand-cyan" />
            Store Controls, Section Toggles &amp; Settings
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Turn sections on/off, edit clinic notices, manage service pincodes, UPI, and SMTP mailer
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary px-6 py-2.5 rounded-xl text-xs font-bold shadow-cyan-glow flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Save All Changes</span>
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

      {/* SECTION 1: PUBLIC SERVICE & SECTION VISIBILITY CONTROLS */}
      <div className="glass-card rounded-2xl p-6 space-y-5 border border-brand-cyan/20">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-cyan/10 border border-brand-cyan/30 flex items-center justify-center text-brand-cyan">
              <Power className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Live Section Visibility &amp; Service Toggles</h2>
              <p className="text-[11px] text-slate-400">Stop, pause, or resume specific optical services with customized customer announcements</p>
            </div>
          </div>
          <span className="text-[10px] uppercase font-mono tracking-wider text-brand-cyan bg-brand-cyan/10 px-2.5 py-1 rounded-full border border-brand-cyan/20">
            Instant Real-Time
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Service 1: Home Eye Checkup Visits */}
          <div className={`p-4 rounded-2xl border transition-all space-y-3 ${
            settings.home_visit_enabled === '1'
              ? 'bg-emerald-950/20 border-emerald-500/30'
              : 'bg-rose-950/20 border-rose-500/30'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Home className={`w-4 h-4 ${settings.home_visit_enabled === '1' ? 'text-emerald-400' : 'text-rose-400'}`} />
                <span className="text-xs font-bold text-white">Home Eye Test Visits</span>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('home_visit_enabled')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  settings.home_visit_enabled === '1'
                    ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                    : 'bg-rose-600 text-white'
                }`}
              >
                {settings.home_visit_enabled === '1' ? 'ACTIVE (ON)' : 'PAUSED (STOPPED)'}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              When stopped, customer slot bookings are disabled and your notice appears.
            </p>
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Custom Public Notice (Optional)
              </label>
              <input
                type="text"
                name="home_visit_notice"
                value={settings.home_visit_notice || ''}
                onChange={handleChange}
                placeholder="e.g. Doorstep optometrist visits paused for Puja festival."
                className="w-full glass-input rounded-xl px-3 py-2 text-xs"
              />
            </div>
          </div>

          {/* Service 2: Doctor Clinic Appointments */}
          <div className={`p-4 rounded-2xl border transition-all space-y-3 ${
            settings.doctor_appointments_enabled === '1'
              ? 'bg-emerald-950/20 border-emerald-500/30'
              : 'bg-rose-950/20 border-rose-500/30'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Stethoscope className={`w-4 h-4 ${settings.doctor_appointments_enabled === '1' ? 'text-emerald-400' : 'text-rose-400'}`} />
                <span className="text-xs font-bold text-white">Doctor Clinic Consultations</span>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('doctor_appointments_enabled')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  settings.doctor_appointments_enabled === '1'
                    ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                    : 'bg-rose-600 text-white'
                }`}
              >
                {settings.doctor_appointments_enabled === '1' ? 'ACTIVE (ON)' : 'PAUSED (STOPPED)'}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Controls whether patients can book in-clinic ophthalmologist consultations.
            </p>
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Clinic Consultation Advisory (Optional)
              </label>
              <input
                type="text"
                name="doctor_clinic_notice"
                value={settings.doctor_clinic_notice || ''}
                onChange={handleChange}
                placeholder="e.g. Doctor Banerjee is on surgery duty till Friday."
                className="w-full glass-input rounded-xl px-3 py-2 text-xs"
              />
            </div>
          </div>

          {/* Service 3: Promotional Hero Slider & Offers */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-brand-cyan" />
                <span className="text-xs font-bold text-white">Homepage Hero Banners Slider</span>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('offers_slider_enabled')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  settings.offers_slider_enabled === '1'
                    ? 'bg-brand-cyan text-slate-950'
                    : 'bg-white/10 text-slate-400'
                }`}
              >
                {settings.offers_slider_enabled === '1' ? 'VISIBLE (ON)' : 'HIDDEN (OFF)'}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Toggle automatic rotating hero banner carousel and flash promo banners.
            </p>
          </div>

          {/* Service 4: Maintenance Mode */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white">Store Maintenance Mode</span>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('maintenance_mode')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  settings.maintenance_mode === '1'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-white/10 text-slate-400'
                }`}
              >
                {settings.maintenance_mode === '1' ? 'MAINTENANCE ON' : 'DISABLED'}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Temporarily displays maintenance banner to regular visitors while staff retain access.
            </p>
          </div>

        </div>
      </div>

      {/* SECTION 2: SERVICEABLE PINCODES & HOME VISIT FEES */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
          <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Home Eye Test Serviceable Pincodes</h2>
            <p className="text-[11px] text-slate-400">Manage postal zip codes eligible for doorstep optometrist equipment dispatch</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-300 mb-1">
              Active Serviceable Pincodes (Comma-separated)
            </label>
            <input
              type="text"
              name="serviceable_pincodes"
              value={settings.serviceable_pincodes || ''}
              onChange={handleChange}
              placeholder="721428, 721463, 721401, 721453"
              className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs font-mono"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Default coverage: Digha (721428), New Digha (721463), Contai (721401), Ramnagar (721453)
            </span>
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1">
              Doorstep Checkup Fee (₹)
            </label>
            <input
              type="number"
              name="home_eye_checkup_fee"
              value={settings.home_eye_checkup_fee || '299'}
              onChange={handleChange}
              className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs font-mono text-white font-bold"
            />
          </div>
        </div>
      </div>

      {/* SECTION: STOREFRONT TRUST BADGES & FEATURES BAR */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Storefront Trust Badges (Horizontal Homepage Bar)</h2>
              <p className="text-[11px] text-slate-400">Customize the 4 optical quality assurance badges displayed to customers in a single row</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {getTrustFeatures().map((feat, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-brand-cyan">
                  Badge #{idx + 1}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Icon: {feat.icon}</span>
              </div>
              <div>
                <label className="block text-[11px] text-slate-300 font-semibold mb-1">Badge Title</label>
                <input
                  type="text"
                  value={feat.title}
                  onChange={(e) => handleTrustFeatureChange(idx, 'title', e.target.value)}
                  className="w-full glass-input rounded-lg px-3 py-2 text-xs font-bold"
                  placeholder="e.g. JAPAN TITANIUM"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-300 font-semibold mb-1">Description / Subtitle</label>
                <textarea
                  rows="2"
                  value={feat.desc || feat.subtitle || ''}
                  onChange={(e) => handleTrustFeatureChange(idx, 'desc', e.target.value)}
                  className="w-full glass-input rounded-lg px-3 py-2 text-xs"
                  placeholder="e.g. 100% Certified Japanese Beta-Titanium"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION: IMGBB DIRECT CLOUD STORAGE (ZERO LOCAL STORAGE) */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-brand-cyan">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">ImgBB Cloud Image Storage (Zero Local Storage)</h2>
              <p className="text-[11px] text-slate-400">All admin and customer uploads stream directly to ImgBB CDN to conserve server disk space</p>
            </div>
          </div>
          <a
            href="https://api.imgbb.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-brand-cyan hover:underline font-semibold flex items-center gap-1"
          >
            <span>Get Free ImgBB Key</span> &rarr;
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              ImgBB V1 API Key
            </label>
            <input
              type="text"
              name="imgbb_api_key"
              value={settings.imgbb_api_key || ''}
              onChange={handleChange}
              placeholder="e.g. 6d207e02198a847aa5ad3ac50e97ff43"
              className="w-full glass-input rounded-xl px-3.5 py-2 text-xs font-mono"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Leave blank to use default cloud key or enter your personal key from api.imgbb.com for unlimited free hosting.
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-slate-300 space-y-1">
            <div className="font-bold text-brand-cyan flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> 100% Cloud Hosted
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Product images, banner pictures, prescriptions, and payment proofs are stored on ImgBB CDN, keeping your server storage lean.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 3: SMTP TRANSACTIONAL EMAIL CONFIGURATION */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">SMTP Email Dispatch Settings</h2>
              <p className="text-[11px] text-slate-400">Configures transactional email delivery for forgot password, order receipts &amp; booking alerts</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleTestSmtp}
            disabled={testingSmtp}
            className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            {testingSmtp ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>Test SMTP Mail</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-slate-300 mb-1">SMTP Host</label>
            <input
              type="text"
              name="smtp_host"
              value={settings.smtp_host || ''}
              onChange={handleChange}
              placeholder="smtp.gmail.com"
              className="w-full glass-input rounded-xl px-3.5 py-2 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1">SMTP Port</label>
            <input
              type="text"
              name="smtp_port"
              value={settings.smtp_port || '587'}
              onChange={handleChange}
              placeholder="587 or 465"
              className="w-full glass-input rounded-xl px-3.5 py-2 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1">Encryption</label>
            <select
              name="smtp_encryption"
              value={settings.smtp_encryption || 'tls'}
              onChange={handleChange}
              className="w-full glass-input rounded-xl px-3.5 py-2 text-xs font-medium cursor-pointer"
            >
              <option value="tls">STARTTLS (Port 587)</option>
              <option value="ssl">SSL (Port 465)</option>
              <option value="none">None</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1">SMTP Username / Email</label>
            <input
              type="text"
              name="smtp_user"
              value={settings.smtp_user || ''}
              onChange={handleChange}
              placeholder="netraunnayan7@gmail.com"
              className="w-full glass-input rounded-xl px-3.5 py-2 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1">App Password</label>
            <input
              type="password"
              name="smtp_pass"
              value={settings.smtp_pass || ''}
              onChange={handleChange}
              placeholder="Google App Password (16 chars)"
              className="w-full glass-input rounded-xl px-3.5 py-2 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1">Sender From Name</label>
            <input
              type="text"
              name="smtp_from_name"
              value={settings.smtp_from_name || ''}
              onChange={handleChange}
              placeholder="Netra Unnayan Eye Care"
              className="w-full glass-input rounded-xl px-3.5 py-2 text-xs"
            />
          </div>
        </div>

        <div className="text-[11px] text-slate-400 bg-white/5 p-3 rounded-xl border border-white/5">
          💡 For Gmail: Enable 2-Factor Authentication on your Google Account &gt; Generate an <strong>App Password</strong> (16 characters) &gt; Paste into App Password field above.
        </div>
      </div>

      {/* SECTION 4: UPI QR & STORE COMMERCE */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2.5 border-b border-white/10 pb-3">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">UPI QR Payments &amp; Delivery Logistics</h2>
            <p className="text-[11px] text-slate-400">Configure Axis Bank / PhonePe QR code VPA, payee name, and shipping thresholds</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-slate-300 mb-1">Merchant UPI VPA *</label>
            <input
              type="text"
              name="upi_id"
              value={settings.upi_id || ''}
              onChange={handleChange}
              placeholder="9382293614@upi"
              className="w-full glass-input rounded-xl px-3.5 py-2 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1">UPI Payee Display Name</label>
            <input
              type="text"
              name="upi_merchant_name"
              value={settings.upi_merchant_name || ''}
              onChange={handleChange}
              className="w-full glass-input rounded-xl px-3.5 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1">Free Shipping Threshold (₹)</label>
            <input
              type="number"
              name="free_shipping_threshold"
              value={settings.free_shipping_threshold || '999'}
              onChange={handleChange}
              className="w-full glass-input rounded-xl px-3.5 py-2 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1">Standard Courier Fee (₹)</label>
            <input
              type="number"
              name="standard_shipping_fee"
              value={settings.standard_shipping_fee || '70'}
              onChange={handleChange}
              className="w-full glass-input rounded-xl px-3.5 py-2 text-xs font-mono"
            />
          </div>
        </div>
      </div>

    </div>
  );
}
