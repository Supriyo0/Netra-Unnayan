import React, { useState } from 'react';
import { X, Upload, MessageCircle, FileText, Check, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';
import { uploadToImgBB } from '../../utils/imgbb';

export const PrescriptionModal = ({ isOpen, onClose, onSave, product }) => {
  const [method, setMethod] = useState('FORM'); // 'FORM', 'UPLOAD', 'WHATSAPP'

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

  // Lens Coating & Index Selection
  const [selectedLens, setSelectedLens] = useState({
    lens_type: 'Standard Single Vision Anti-Glare',
    lens_price: 500
  });

  if (!isOpen) return null;

  const lensOptions = [
    {
      type: 'Standard Single Vision Anti-Glare',
      price: 500,
      description: 'Multi-layer anti-reflective coating, scratch resistant, high clarity'
    },
    {
      type: 'BluZero Anti-Fatigue Computer',
      price: 800,
      description: 'Blocks 98% harmful digital blue light (420nm), reduces eye strain'
    },
    {
      type: 'High-Index 1.67 Ultra-Thin',
      price: 1500,
      description: '40% thinner & lighter for high prescriptions (-3.00 to -8.00 D)'
    },
    {
      type: 'Progressive Digital Freeform',
      price: 2200,
      description: 'Seamless distance, intermediate, and reading vision without visible lines'
    },
    {
      type: 'Photochromic Transition (Grey)',
      price: 1200,
      description: 'Clear indoors, rapidly transforms into dark UV sunglasses outdoors'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-3xl bg-[#0A192F] border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl overflow-y-auto max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-cyan" />
              Configure Optical Prescription &amp; Lenses
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Customized precision German edging for <strong>{product?.name}</strong>
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lens Coating Selection */}
        <div className="mb-6">
          <label className="block text-xs uppercase font-bold tracking-wider text-brand-cyan mb-2">
            1. Select Lens Technology &amp; Coating
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {lensOptions.map((lens) => {
              const active = selectedLens.lens_type === lens.type;
              return (
                <div
                  key={lens.type}
                  onClick={() => setSelectedLens({ lens_type: lens.type, lens_price: lens.price })}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    active 
                      ? 'bg-brand-cyan/15 border-brand-cyan shadow-cyan-glow' 
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-sm text-white">{lens.type}</span>
                    <span className="text-brand-cyan font-bold text-xs">+₹{lens.price}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">{lens.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Prescription Submission Method Selector */}
        <div className="mb-6">
          <label className="block text-xs uppercase font-bold tracking-wider text-brand-cyan mb-2">
            2. Choose Prescription Submission Method
          </label>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setMethod('FORM')}
              className={`p-2.5 rounded-lg border font-semibold flex items-center justify-center gap-1.5 ${
                method === 'FORM' ? 'bg-brand-cyan text-slate-950 border-brand-cyan' : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
              }`}
            >
              <FileText className="w-4 h-4" /> Enter Values
            </button>
            <button
              type="button"
              onClick={() => setMethod('UPLOAD')}
              className={`p-2.5 rounded-lg border font-semibold flex items-center justify-center gap-1.5 ${
                method === 'UPLOAD' ? 'bg-brand-cyan text-slate-950 border-brand-cyan' : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
              }`}
            >
              <Upload className="w-4 h-4" /> Upload Rx Photo
            </button>
            <button
              type="button"
              onClick={() => setMethod('WHATSAPP')}
              className={`p-2.5 rounded-lg border font-semibold flex items-center justify-center gap-1.5 ${
                method === 'WHATSAPP' ? 'bg-brand-cyan text-slate-950 border-brand-cyan' : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
              }`}
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" /> WhatsApp
            </button>
          </div>
        </div>

        {/* Method 1: Form Inputs */}
        {method === 'FORM' && (
          <div className="space-y-4 mb-6 bg-slate-900/60 p-4 rounded-xl border border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300 font-semibold">Standard Optical Diopter Values</span>
              <button
                type="button"
                onClick={() => setIsDualPd(!isDualPd)}
                className="text-xs text-brand-cyan hover:underline"
              >
                {isDualPd ? 'Switch to Single PD' : 'Switch to Dual PD (OD/OS)'}
              </button>
            </div>

            {/* Right Eye (OD) Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-center border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400">
                    <th className="py-2 text-left">Eye</th>
                    <th className="py-2 px-1">SPH (Sphere)</th>
                    <th className="py-2 px-1">CYL (Cylinder)</th>
                    <th className="py-2 px-1">AXIS (0–180°)</th>
                    <th className="py-2 px-1">ADD (Near)</th>
                    {isDualPd && <th className="py-2 px-1">PD (mm)</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {/* Right Eye */}
                  <tr>
                    <td className="py-2.5 text-left font-bold text-brand-cyan">Right (OD)</td>
                    <td className="px-1">
                      <input 
                        type="text" 
                        value={rightSph} 
                        onChange={(e) => setRightSph(e.target.value)} 
                        className="w-16 glass-input rounded px-1.5 py-1 text-center" 
                        placeholder="-1.50" 
                      />
                    </td>
                    <td className="px-1">
                      <input 
                        type="text" 
                        value={rightCyl} 
                        onChange={(e) => setRightCyl(e.target.value)} 
                        className="w-16 glass-input rounded px-1.5 py-1 text-center" 
                        placeholder="-0.50" 
                      />
                    </td>
                    <td className="px-1">
                      <input 
                        type="number" 
                        value={rightAxis} 
                        onChange={(e) => setRightAxis(e.target.value)} 
                        className="w-16 glass-input rounded px-1.5 py-1 text-center" 
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
                        className="w-16 glass-input rounded px-1.5 py-1 text-center" 
                        placeholder="+1.50" 
                      />
                    </td>
                    {isDualPd && (
                      <td className="px-1">
                        <input 
                          type="text" 
                          value={rightPd} 
                          onChange={(e) => setRightPd(e.target.value)} 
                          className="w-16 glass-input rounded px-1.5 py-1 text-center" 
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
                        className="w-16 glass-input rounded px-1.5 py-1 text-center" 
                        placeholder="-1.25" 
                      />
                    </td>
                    <td className="px-1">
                      <input 
                        type="text" 
                        value={leftCyl} 
                        onChange={(e) => setLeftCyl(e.target.value)} 
                        className="w-16 glass-input rounded px-1.5 py-1 text-center" 
                        placeholder="-0.75" 
                      />
                    </td>
                    <td className="px-1">
                      <input 
                        type="number" 
                        value={leftAxis} 
                        onChange={(e) => setLeftAxis(e.target.value)} 
                        className="w-16 glass-input rounded px-1.5 py-1 text-center" 
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
                        className="w-16 glass-input rounded px-1.5 py-1 text-center" 
                        placeholder="+1.50" 
                      />
                    </td>
                    {isDualPd && (
                      <td className="px-1">
                        <input 
                          type="text" 
                          value={leftPd} 
                          onChange={(e) => setLeftPd(e.target.value)} 
                          className="w-16 glass-input rounded px-1.5 py-1 text-center" 
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
                <label className="text-xs text-slate-300">Pupillary Distance (Single PD mm):</label>
                <input 
                  type="text" 
                  value={singlePd} 
                  onChange={(e) => setSinglePd(e.target.value)} 
                  className="w-20 glass-input rounded px-2 py-1 text-xs text-center" 
                  placeholder="63.0" 
                />
                <span className="text-[11px] text-slate-400">Typical range: 58 – 68 mm</span>
              </div>
            )}
          </div>
        )}

        {/* Method 2: File Upload */}
        {method === 'UPLOAD' && (
          <div className="mb-6 p-6 rounded-xl border-2 border-dashed border-white/20 text-center bg-white/5">
            <Upload className="w-10 h-10 text-brand-cyan mx-auto mb-2 opacity-80" />
            <p className="text-sm font-semibold text-white mb-1">Upload Doctor's Prescription Slip</p>
            <p className="text-xs text-slate-400 mb-3">Direct to ImgBB Cloud (Clear photos or PDF up to 10MB)</p>
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
              className="inline-block btn-secondary text-xs px-4 py-2 cursor-pointer"
            >
              {uploadingRx ? (
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Uploading to Cloud...
                </span>
              ) : (
                'Select Image / PDF'
              )}
            </label>
            {uploadedFile && (
              <div className="mt-3 text-xs text-teal-300 flex items-center justify-center gap-1.5">
                <Check className="w-4 h-4" /> Attached: {uploadedFile.name} {uploadedFileUrl && '(Hosted on Cloud)'}
              </div>
            )}
          </div>
        )}

        {/* Method 3: WhatsApp Option */}
        {method === 'WHATSAPP' && (
          <div className="mb-6 p-5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <MessageCircle className="w-5 h-5" /> Fast-Track Prescription via WhatsApp
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Place your order now, and our clinical optometrist will message your registered number on WhatsApp at <strong>+91 9382293614</strong>. You can simply snap and send a photo of your prescription slip.
            </p>
            <span className="inline-block px-3 py-1 rounded bg-emerald-500/20 text-emerald-300 text-xs font-semibold">
              Verified by Optometrist before production
            </span>
          </div>
        )}

        {/* Legal Disclaimer Box */}
        <div className="p-3.5 rounded-lg bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5 mb-6">
          <ShieldAlert className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
          <p className="leading-snug">
            <strong>Customer Medical Responsibility:</strong> Netra Unnayan fabricates customized prescription lenses strictly according to your submitted diopter parameters. Under optical regulations, custom edged lenses cannot be cancelled or returned once lab cutting commences.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={handleConfirm}
            className="btn-primary text-xs px-6 py-2.5"
          >
            Save &amp; Attach Lenses (+₹{selectedLens.lens_price})
          </button>
        </div>

      </div>
    </div>
  );
};
