import React, { useState } from 'react';
import { X, CheckCircle, AlertCircle, HelpCircle } from 'lucide-react';

export const SizeGuideModal = ({ isOpen, onClose, currentProduct }) => {
  const [userWidth, setUserWidth] = useState('');
  const [userLens, setUserLens] = useState('');
  const [userBridge, setUserBridge] = useState('');
  const [userTemple, setUserTemple] = useState('');
  const [comparisonResult, setComparisonResult] = useState(null);

  if (!isOpen) return null;

  const prodLens = currentProduct?.lens_width || 52;
  const prodBridge = currentProduct?.bridge_width || 18;
  const prodTemple = currentProduct?.temple_length || 140;
  const prodTotal = currentProduct?.total_frame_width || 138;
  const prodSize = currentProduct?.frame_size || 'Medium';

  const handleCompare = (e) => {
    e.preventDefault();
    const parsedLens = parseFloat(userLens);
    const parsedTotal = parseFloat(userWidth);

    let recSize = 'Medium';
    let fitMessage = '';

    if (parsedTotal) {
      if (parsedTotal < 133) recSize = 'Small';
      else if (parsedTotal > 141) recSize = 'Large';
      else recSize = 'Medium';
    } else if (parsedLens) {
      if (parsedLens < 50) recSize = 'Small';
      else if (parsedLens > 54) recSize = 'Large';
      else recSize = 'Medium';
    }

    const match = recSize.toLowerCase() === prodSize.toLowerCase();
    if (match) {
      fitMessage = `Great match! Your current frame measurements align smoothly with this ${prodSize} frame (${prodLens} □ ${prodBridge} — ${prodTemple}).`;
    } else {
      fitMessage = `Notice: Your measurements suggest a ${recSize} fit, whereas this frame is calibrated for a ${prodSize} facial profile.`;
    }

    setComparisonResult({
      recommendedSize: recSize,
      isMatch: match,
      message: fitMessage
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-[#0B1A2F] border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              Optical Frame Sizing &amp; Fit Guide
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Understand your frame geometry for an optimal ergonomic fit</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Product Dimensions Diagram */}
        <div className="bg-slate-900/70 border border-brand-cyan/25 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-wider text-brand-cyan font-bold">
              Current Frame Specifications
            </span>
            <span className="px-3 py-0.5 rounded-full bg-brand-cyan/20 text-brand-cyan text-xs font-bold">
              Size: {prodSize}
            </span>
          </div>

          <div className="text-center py-4 bg-[#070E1A] rounded-lg border border-white/5 relative overflow-hidden">
            <div className="text-3xl font-extrabold text-white tracking-widest font-mono">
              {prodLens} □ {prodBridge} — {prodTemple}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Lens Width &bull; Bridge Distance &bull; Temple Length (mm)
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2 mt-4 text-center text-xs">
            <div className="p-2 rounded bg-white/5">
              <div className="text-slate-400">Lens Width</div>
              <div className="font-bold text-white text-sm">{prodLens} mm</div>
            </div>
            <div className="p-2 rounded bg-white/5">
              <div className="text-slate-400">Bridge Width</div>
              <div className="font-bold text-white text-sm">{prodBridge} mm</div>
            </div>
            <div className="p-2 rounded bg-white/5">
              <div className="text-slate-400">Temple Length</div>
              <div className="font-bold text-white text-sm">{prodTemple} mm</div>
            </div>
            <div className="p-2 rounded bg-white/5">
              <div className="text-slate-400">Total Frame</div>
              <div className="font-bold text-white text-sm">{prodTotal} mm</div>
            </div>
          </div>
        </div>

        {/* Standard Face Size Chart */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-white mb-2">Standard Optical Fit Chart</h4>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className={`p-3 rounded-lg border text-center ${prodSize === 'Small' ? 'bg-brand-cyan/15 border-brand-cyan text-white' : 'bg-white/5 border-white/10 text-slate-300'}`}>
              <div className="font-bold text-sm">Small</div>
              <div className="text-[11px] text-slate-400 mt-1">Total Width: 125 – 132 mm</div>
              <div className="text-[10px] text-slate-400">Narrow / Petite faces</div>
            </div>
            <div className={`p-3 rounded-lg border text-center ${prodSize === 'Medium' ? 'bg-brand-cyan/15 border-brand-cyan text-white' : 'bg-white/5 border-white/10 text-slate-300'}`}>
              <div className="font-bold text-sm">Medium</div>
              <div className="text-[11px] text-slate-400 mt-1">Total Width: 133 – 141 mm</div>
              <div className="text-[10px] text-slate-400">Fits 85% of adults</div>
            </div>
            <div className={`p-3 rounded-lg border text-center ${prodSize === 'Large' ? 'bg-brand-cyan/15 border-brand-cyan text-white' : 'bg-white/5 border-white/10 text-slate-300'}`}>
              <div className="font-bold text-sm">Large</div>
              <div className="text-[11px] text-slate-400 mt-1">Total Width: 142 – 150+ mm</div>
              <div className="text-[10px] text-slate-400">Broad facial profile</div>
            </div>
          </div>
        </div>

        {/* Compare with My Current Glasses */}
        <form onSubmit={handleCompare} className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-brand-cyan" />
            <h4 className="text-sm font-bold text-white">Compare With My Current Glasses</h4>
          </div>
          <p className="text-xs text-slate-400">
            Look on the inside of your current eyeglass temple arm for three stamped numbers (e.g. 52 □ 18 140).
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] text-slate-300 mb-1">Lens Width</label>
              <input 
                type="number"
                placeholder="e.g. 52"
                value={userLens}
                onChange={(e) => setUserLens(e.target.value)}
                className="w-full glass-input rounded-lg px-3 py-1.5 text-xs text-center"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-300 mb-1">Bridge</label>
              <input 
                type="number"
                placeholder="e.g. 18"
                value={userBridge}
                onChange={(e) => setUserBridge(e.target.value)}
                className="w-full glass-input rounded-lg px-3 py-1.5 text-xs text-center"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-300 mb-1">Temple</label>
              <input 
                type="number"
                placeholder="e.g. 140"
                value={userTemple}
                onChange={(e) => setUserTemple(e.target.value)}
                className="w-full glass-input rounded-lg px-3 py-1.5 text-xs text-center"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-300 mb-1">Total Width (mm)</label>
              <input 
                type="number"
                placeholder="e.g. 138"
                value={userWidth}
                onChange={(e) => setUserWidth(e.target.value)}
                className="w-full glass-input rounded-lg px-3 py-1.5 text-xs text-center"
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full btn-secondary text-xs py-2 rounded-lg"
          >
            Calculate Size Recommendation
          </button>

          {comparisonResult && (
            <div className={`p-4 rounded-lg border text-xs flex items-start gap-3 ${
              comparisonResult.isMatch ? 'bg-teal-950/40 border-teal-500/40 text-teal-200' : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
            }`}>
              {comparisonResult.isMatch ? <CheckCircle className="w-5 h-5 shrink-0 text-teal-400" /> : <AlertCircle className="w-5 h-5 shrink-0 text-amber-400" />}
              <div>
                <strong className="block text-sm">Recommended for you: {comparisonResult.recommendedSize}</strong>
                <p className="mt-1">{comparisonResult.message}</p>
              </div>
            </div>
          )}
        </form>

        <p className="text-[10px] text-slate-500 text-center mt-4 italic">
          *Note: This sizing tool provides an ergonomic visual fit recommendation based on mechanical millimeter standards. It does not constitute medical diagnostic advice.
        </p>

      </div>
    </div>
  );
};
