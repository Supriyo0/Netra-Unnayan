import React, { useState } from 'react';
import { X, Upload, MessageCircle, FileText, Check, ShieldAlert, Sparkles, RefreshCw, Smartphone, Eye, Sun, Layers } from 'lucide-react';
import { uploadToImgBB } from '../../utils/imgbb';
import { useTheme } from '../../context/ThemeContext';

export const PrescriptionModal = ({ isOpen, onClose, onSave, product }) => {
  const { isDark } = useTheme();
  const [method, setMethod] = useState('UPLOAD'); // 'UPLOAD' (default easiest), 'WHATSAPP', 'FORM'

  // Right Eye (OD)
  const [rightSph, setRightSph] = useState('');
  const [rightCyl, setRightCyl] = useState('');
  const [rightAxis, setRightAxis] = useState('');
  const [rightAdd, setRightAdd] = useState('');
  const [rightPd, setRightPd] = useState('');

  // Left Eye (OS)
  const [leftSph, setLeftSph] = useState('');
  const [leftCyl, setLeftCyl] = useState('');
  const [leftAxis, setLeftAxis] = useState('');
  const [leftAdd, setLeftAdd] = useState('');
  const [leftPd, setLeftPd] = useState('');

  const [singlePd, setSinglePd] = useState('');
  const [isDualPd, setIsDualPd] = useState(false);
  const [notes, setNotes] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState('');
  const [uploadingRx, setUploadingRx] = useState(false);

  // Customer-friendly lens options
  const [selectedLens, setSelectedLens] = useState({
    lens_type: 'Anti-Glare Computer Shield (BluZero™)',
    lens_price: 500
  });

  if (!isOpen) return null;

  const lensOptions = [
    {
      type: 'Anti-Glare Computer Shield (BluZero™)',
      tag: 'Most Popular',
      price: 500,
      icon: Smartphone,
      description: 'Cuts 98% harmful mobile & laptop screen light. Prevents headaches & eye fatigue.'
    },
    {
      type: 'Everyday Clear (Single Vision)',
      tag: 'Classic',
      price: 400,
      icon: Eye,
      description: 'Super sharp clarity for distance or reading. Multi-layer anti-scratch & water-repellent coating.'
    },
    {
      type: 'Day & Night Transitions (Photochromic)',
      tag: 'Smart Lens',
      price: 1200,
      icon: Sun,
      description: 'Clear indoors, automatically transforms into dark protective sunglasses under direct sunlight.'
    },
    {
      type: 'Ultra-Thin Featherlight (High Power 1.67)',
      tag: 'Slim Fit',
      price: 1500,
      icon: Layers,
      description: '40% thinner and lighter for high power prescriptions (-3.00 to -8.00 D). Eliminates thick bottle-glass look.'
    },
    {
      type: 'Progressive All-in-One (No Lines)',
      tag: 'Premium Freeform',
      price: 2200,
      icon: Sparkles,
      description: 'Seamless distance + intermediate + reading vision in a single lens without any ugly visible dividing lines.'
    }
  ];

  const handleConfirm = () => {
    const rxPayload = {
      method,
      lens_type: selectedLens.lens_type,
      lens_price: selectedLens.lens_price,
      right_sph: parseFloat(rightSph) || 0,
      right_cyl: parseFloat(rightCyl) || 0,
      right_axis: parseInt(rightAxis) || null,
      right_add: parseFloat(rightAdd) || null,
      right_pd: isDualPd ? (parseFloat(rightPd) || null) : null,
      left_sph: parseFloat(leftSph) || 0,
      left_cyl: parseFloat(leftCyl) || 0,
      left_axis: parseInt(leftAxis) || null,
      left_add: parseFloat(leftAdd) || null,
      left_pd: isDualPd ? (parseFloat(leftPd) || null) : null,
      single_pd: !isDualPd ? (parseFloat(singlePd) || 63) : null,
      notes,
      file_name: uploadedFile ? uploadedFile.name : null,
      file_url: uploadedFileUrl || null
    };

    onSave({
      lensOptions: selectedLens,
      prescription: rxPayload
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className={`relative w-full max-w-3xl rounded-2xl p-6 md:p-8 shadow-2xl overflow-y-auto max-h-[92vh] border transition-colors ${
        isDark
          ? 'bg-[#0A192F] border-white/10 text-white'
          : 'bg-white border-slate-200 text-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.2)]'
      }`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between border-b pb-4 mb-5 ${
          isDark ? 'border-white/10' : 'border-slate-200'
        }`}>
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-cyan" />
              Choose Your Lenses &amp; Prescription
            </h3>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Precision customized for your optical frame <strong>{product?.name}</strong>
            </p>
          </div>
          <button 
            onClick={onClose} 
            className={`p-1.5 rounded-full transition-colors ${
              isDark ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lens Type Selection */}
        <div className="mb-6">
          <label className="block text-xs uppercase font-bold tracking-wider text-brand-cyan mb-2">
            1. Select Lens Type (All Include Free Hard Case &amp; Microfiber Cloth)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {lensOptions.map((lens) => {
              const active = selectedLens.lens_type === lens.type;
              const IconComp = lens.icon;
              return (
                <div
                  key={lens.type}
                  onClick={() => setSelectedLens({ lens_type: lens.type, lens_price: lens.price })}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    active 
                      ? 'bg-brand-cyan/15 border-brand-cyan shadow-cyan-glow' 
                      : isDark 
                        ? 'bg-white/5 border-white/10 hover:border-white/20' 
                        : 'bg-slate-50 border-slate-200 hover:border-brand-cyan/40 hover:bg-sky-50/40'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2">
                        <IconComp className="w-4 h-4 text-brand-cyan shrink-0" />
                        <span className="font-bold text-sm leading-tight">{lens.type}</span>
                      </div>
                      <span className="text-brand-cyan font-bold text-xs shrink-0">+₹{lens.price}</span>
                    </div>
                    <p className={`text-[11px] mt-1.5 leading-relaxed ${
                      isDark ? 'text-slate-300' : 'text-slate-600'
                    }`}>
                      {lens.description}
                    </p>
                  </div>
                  {lens.tag && (
                    <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px]">
                      <span className="px-2 py-0.5 rounded-full bg-brand-cyan/20 text-brand-cyan font-bold border border-brand-cyan/30">
                        {lens.tag}
                      </span>
                      {active && (
                        <span className="text-brand-teal font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Selected
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Prescription Submission Method */}
        <div className="mb-6">
          <label className="block text-xs uppercase font-bold tracking-wider text-brand-cyan mb-2">
            2. How would you like to provide your prescription?
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setMethod('UPLOAD')}
              className={`p-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition-all ${
                method === 'UPLOAD'
                  ? 'bg-brand-cyan text-slate-950 border-brand-cyan shadow-cyan-glow'
                  : isDark ? 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              <Upload className="w-4 h-4" /> 
              <span>Upload Photo (Easiest)</span>
            </button>
            <button
              type="button"
              onClick={() => setMethod('WHATSAPP')}
              className={`p-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition-all ${
                method === 'WHATSAPP'
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-md'
                  : isDark ? 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" /> 
              <span>Send via WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={() => setMethod('FORM')}
              className={`p-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition-all ${
                method === 'FORM'
                  ? 'bg-brand-cyan text-slate-950 border-brand-cyan shadow-cyan-glow'
                  : isDark ? 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" /> 
              <span>Type Numbers</span>
            </button>
          </div>
        </div>

        {/* Method 1: Form Inputs */}
        {method === 'FORM' && (
          <div className={`space-y-4 mb-6 p-4 rounded-2xl border ${
            isDark ? 'bg-slate-900/60 border-white/10' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                Enter Doctor's Prescription Values
              </span>
              <button
                type="button"
                onClick={() => setIsDualPd(!isDualPd)}
                className="text-xs text-brand-cyan hover:underline font-semibold"
              >
                {isDualPd ? 'Switch to Single PD' : 'Switch to Dual PD (OD/OS)'}
              </button>
            </div>

            {/* Right Eye (OD) / Left Eye (OS) Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-center border-collapse">
                <thead>
                  <tr className={`border-b text-[11px] font-bold ${isDark ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                    <th className="py-2 text-left">Eye</th>
                    <th className="py-2 px-1">SPH (Power)</th>
                    <th className="py-2 px-1">CYL (Cylindrical)</th>
                    <th className="py-2 px-1">AXIS (0–180°)</th>
                    <th className="py-2 px-1">ADD (Near Reading)</th>
                    {isDualPd && <th className="py-2 px-1">PD (mm)</th>}
                  </tr>
                </thead>
                <tbody className={`divide-y font-mono ${isDark ? 'divide-white/5' : 'divide-slate-200'}`}>
                  {/* Right Eye */}
                  <tr>
                    <td className="py-2.5 text-left font-bold text-brand-cyan">Right (OD)</td>
                    <td className="px-1">
                      <input 
                        type="text" 
                        value={rightSph} 
                        onChange={(e) => setRightSph(e.target.value)} 
                        className={`w-16 rounded-lg px-1.5 py-1 text-center border ${
                          isDark ? 'bg-[#060D17] border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`} 
                        placeholder="-1.50" 
                      />
                    </td>
                    <td className="px-1">
                      <input 
                        type="text" 
                        value={rightCyl} 
                        onChange={(e) => setRightCyl(e.target.value)} 
                        className={`w-16 rounded-lg px-1.5 py-1 text-center border ${
                          isDark ? 'bg-[#060D17] border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`} 
                        placeholder="-0.50" 
                      />
                    </td>
                    <td className="px-1">
                      <input 
                        type="number" 
                        value={rightAxis} 
                        onChange={(e) => setRightAxis(e.target.value)} 
                        className={`w-16 rounded-lg px-1.5 py-1 text-center border ${
                          isDark ? 'bg-[#060D17] border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`} 
                        placeholder="90" 
                        min="0" 
                        max="180" 
                      />
                    </td>
                    <td className="px-1">
                      <input 
                        type="text" 
                        value={rightAdd} 
                        onChange={(e) => setRightAdd(e.target.value)} 
                        className={`w-16 rounded-lg px-1.5 py-1 text-center border ${
                          isDark ? 'bg-[#060D17] border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`} 
                        placeholder="+1.50" 
                      />
                    </td>
                    {isDualPd && (
                      <td className="px-1">
                        <input 
                          type="text" 
                          value={rightPd} 
                          onChange={(e) => setRightPd(e.target.value)} 
                          className={`w-16 rounded-lg px-1.5 py-1 text-center border ${
                            isDark ? 'bg-[#060D17] border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'
                          }`} 
                          placeholder="31.5" 
                        />
                      </td>
                    )}
                  </tr>

                  {/* Left Eye */}
                  <tr>
                    <td className="py-2.5 text-left font-bold text-brand-teal">Left (OS)</td>
                    <td className="px-1">
                      <input 
                        type="text" 
                        value={leftSph} 
                        onChange={(e) => setLeftSph(e.target.value)} 
                        className={`w-16 rounded-lg px-1.5 py-1 text-center border ${
                          isDark ? 'bg-[#060D17] border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`} 
                        placeholder="-1.25" 
                      />
                    </td>
                    <td className="px-1">
                      <input 
                        type="text" 
                        value={leftCyl} 
                        onChange={(e) => setLeftCyl(e.target.value)} 
                        className={`w-16 rounded-lg px-1.5 py-1 text-center border ${
                          isDark ? 'bg-[#060D17] border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`} 
                        placeholder="-0.75" 
                      />
                    </td>
                    <td className="px-1">
                      <input 
                        type="number" 
                        value={leftAxis} 
                        onChange={(e) => setLeftAxis(e.target.value)} 
                        className={`w-16 rounded-lg px-1.5 py-1 text-center border ${
                          isDark ? 'bg-[#060D17] border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`} 
                        placeholder="85" 
                        min="0" 
                        max="180" 
                      />
                    </td>
                    <td className="px-1">
                      <input 
                        type="text" 
                        value={leftAdd} 
                        onChange={(e) => setLeftAdd(e.target.value)} 
                        className={`w-16 rounded-lg px-1.5 py-1 text-center border ${
                          isDark ? 'bg-[#060D17] border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'
                        }`} 
                        placeholder="+1.50" 
                      />
                    </td>
                    {isDualPd && (
                      <td className="px-1">
                        <input 
                          type="text" 
                          value={leftPd} 
                          onChange={(e) => setLeftPd(e.target.value)} 
                          className={`w-16 rounded-lg px-1.5 py-1 text-center border ${
                            isDark ? 'bg-[#060D17] border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'
                          }`} 
                          placeholder="31.0" 
                        />
                      </td>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>

            {!isDualPd && (
              <div className="flex items-center gap-3 pt-2">
                <label className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Pupillary Distance (Single PD mm):
                </label>
                <input 
                  type="text" 
                  value={singlePd} 
                  onChange={(e) => setSinglePd(e.target.value)} 
                  className={`w-20 rounded-lg px-2 py-1 text-xs text-center border font-mono ${
                    isDark ? 'bg-[#060D17] border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`} 
                  placeholder="63.0" 
                />
                <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  (Average adult is 63 mm, optometrist can measure if blank)
                </span>
              </div>
            )}
          </div>
        )}

        {/* Method 2: File Upload */}
        {method === 'UPLOAD' && (
          <div className={`mb-6 p-6 rounded-2xl border-2 border-dashed text-center transition-all ${
            isDark ? 'border-brand-cyan/40 bg-white/5' : 'border-sky-300 bg-sky-50/50'
          }`}>
            <Upload className="w-10 h-10 text-brand-cyan mx-auto mb-2 opacity-90" />
            <p className={`text-sm font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Upload Doctor's Prescription Slip
            </p>
            <p className={`text-xs mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Snap a clear photo or select a PDF (Up to 10MB)
            </p>
            <input 
              type="file" 
              id="rx-file" 
              accept="image/*,application/pdf" 
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploadedFile(file);
                if (file.type.startsWith('image/')) {
                  setUploadingRx(true);
                  try {
                    const res = await uploadToImgBB(file);
                    if (res.success && res.url) {
                      setUploadedFileUrl(res.url);
                    }
                  } catch (err) {
                    console.warn('ImgBB upload error:', err);
                  } finally {
                    setUploadingRx(false);
                  }
                }
              }}
              className="hidden" 
            />
            <label 
              htmlFor="rx-file"
              className="inline-block btn-primary text-xs px-6 py-2.5 rounded-xl font-bold shadow-cyan-glow cursor-pointer"
            >
              {uploadingRx ? (
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Uploading to Cloud...
                </span>
              ) : (
                'Choose Photo or File'
              )}
            </label>
            {uploadedFile && (
              <div className="mt-3 text-xs text-teal-500 dark:text-teal-300 font-bold flex items-center justify-center gap-1.5">
                <Check className="w-4 h-4" /> Attached: {uploadedFile.name}
              </div>
            )}
          </div>
        )}

        {/* Method 3: WhatsApp Option */}
        {method === 'WHATSAPP' && (
          <div className={`mb-6 p-5 rounded-2xl border space-y-3 ${
            isDark ? 'border-emerald-500/30 bg-emerald-950/20 text-slate-300' : 'border-emerald-200 bg-emerald-50 text-slate-800'
          }`}>
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
              <MessageCircle className="w-5 h-5" /> Fast-Track Prescription via WhatsApp
            </div>
            <p className="text-xs leading-relaxed">
              Place your order now! Our certified optometrist will automatically message you on WhatsApp at <strong>+91 9382293614</strong> right after checkout. You can easily send your doctor's slip photo there.
            </p>
            <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
              ✓ Verified by Clinical Optometrist before lab cutting
            </span>
          </div>
        )}

        {/* Legal Disclaimer Box */}
        <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 mb-6 ${
          isDark ? 'bg-amber-950/30 border-amber-500/30 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          <ShieldAlert className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
          <p className="leading-snug">
            <strong>Optical Accuracy Guarantee:</strong> Netra Unnayan precision-cuts each lens according to your verified diopters. Double-checked by senior optometrists before shipping.
          </p>
        </div>

        {/* Actions */}
        <div className={`flex items-center justify-end gap-3 pt-3 border-t ${
          isDark ? 'border-white/10' : 'border-slate-200'
        }`}>
          <button 
            type="button" 
            onClick={onClose} 
            className={`px-4 py-2 text-xs font-medium rounded-xl transition-colors ${
              isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={handleConfirm}
            className="btn-primary text-xs px-6 py-2.5 rounded-xl font-bold shadow-cyan-glow"
          >
            Save &amp; Attach Lenses (+₹{selectedLens.lens_price})
          </button>
        </div>

      </div>
    </div>
  );
};
