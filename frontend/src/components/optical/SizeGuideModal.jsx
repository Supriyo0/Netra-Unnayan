import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, HelpCircle, Check, Sparkles } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const SizeGuideModal = ({ isOpen, onClose, currentProduct, selectedSize = 'Medium', onSelectSize }) => {
  const { isDark } = useTheme();
  const [activeSize, setActiveSize] = useState(selectedSize);
  const [userWidth, setUserWidth] = useState('');
  const [userLens, setUserLens] = useState('');
  const [userBridge, setUserBridge] = useState('');
  const [userTemple, setUserTemple] = useState('');
  const [comparisonResult, setComparisonResult] = useState(null);

  useEffect(() => {
    setActiveSize(selectedSize || 'Medium');
  }, [selectedSize]);

  if (!isOpen) return null;

  const handleSizeChange = (newSize) => {
    setActiveSize(newSize);
    if (onSelectSize) {
      onSelectSize(newSize);
    }
  };

  const baseLens = currentProduct?.lens_width || 52;
  const baseBridge = currentProduct?.bridge_width || 18;
  const baseTemple = currentProduct?.temple_length || 140;
  const baseTotal = currentProduct?.total_frame_width || 138;

  // Calibrate dynamically to active size
  let prodLens = baseLens;
  let prodBridge = baseBridge;
  let prodTemple = baseTemple;
  let prodTotal = baseTotal;

  if (activeSize === 'Small') {
    prodLens = Math.max(46, baseLens - 3);
    prodBridge = Math.max(15, baseBridge - 1);
    prodTemple = Math.max(130, baseTemple - 5);
    prodTotal = Math.max(126, baseTotal - 6);
  } else if (activeSize === 'Large') {
    prodLens = baseLens + 3;
    prodBridge = baseBridge + 1;
    prodTemple = baseTemple + 5;
    prodTotal = baseTotal + 6;
  }

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

    const match = recSize.toLowerCase() === activeSize.toLowerCase();
    if (match) {
      fitMessage = `Perfect fit! Your measurements match this ${activeSize} frame (${prodLens} □ ${prodBridge} — ${prodTemple}).`;
    } else {
      fitMessage = `Notice: Your measurements suggest a ${recSize} fit, while you currently have ${activeSize} selected.`;
    }

    setComparisonResult({
      recommendedSize: recSize,
      isMatch: match,
      message: fitMessage
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className={`relative w-full max-w-2xl rounded-2xl p-5 sm:p-8 shadow-2xl overflow-y-auto max-h-[92vh] border transition-colors ${
          isDark
            ? 'bg-[#0B1A2F] border-white/10 text-white'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between border-b pb-4 mb-5 ${
          isDark ? 'border-white/10' : 'border-slate-200'
        }`}>
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-cyan" />
              <h3 className={`text-lg sm:text-xl font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Optical Frame Sizing &amp; Fit Guide
              </h3>
            </div>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Understand exact millimeter frame geometry for an optimal ergonomic fit
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`p-2 rounded-xl transition-colors ${
              isDark 
                ? 'text-slate-400 hover:text-white hover:bg-white/10' 
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Switchable Size Pill Bar */}
        <div className="mb-5">
          <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${
            isDark ? 'text-slate-300' : 'text-slate-700'
          }`}>
            Switch Frame Size (Updates Millimeters Instantly):
          </label>
          <div className={`grid grid-cols-3 gap-2 p-1 rounded-xl border ${
            isDark ? 'bg-slate-900/80 border-white/10' : 'bg-slate-100 border-slate-200'
          }`}>
            {['Small', 'Medium', 'Large'].map((sz) => {
              const isSelected = activeSize === sz;
              return (
                <button
                  key={sz}
                  type="button"
                  onClick={() => handleSizeChange(sz)}
                  className={`py-2 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all duration-200 ${
                    isSelected
                      ? isDark
                        ? 'bg-brand-cyan text-slate-950 shadow-cyan-glow'
                        : 'bg-white text-slate-950 shadow-md border border-brand-cyan/60'
                      : isDark
                        ? 'text-slate-400 hover:text-white hover:bg-white/5'
                        : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/60'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 text-brand-cyan shrink-0 stroke-[3]" />}
                  <span>{sz} Fit</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Current Product Dimensions Diagram */}
        <div className={`rounded-2xl p-4 sm:p-5 mb-6 border transition-all ${
          isDark 
            ? 'bg-slate-900/70 border-brand-cyan/30' 
            : 'bg-sky-50/70 border-sky-200'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-wider text-brand-cyan font-extrabold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse" />
              Frame Geometry ({activeSize})
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
              isDark 
                ? 'bg-brand-cyan/20 text-brand-cyan border-brand-cyan/40'
                : 'bg-white text-brand-cyan border-brand-cyan shadow-xs'
            }`}>
              Currently Selected: {activeSize}
            </span>
          </div>

          <div className={`text-center py-4 rounded-xl border relative shadow-sm ${
            isDark ? 'bg-[#070E1A] border-white/10' : 'bg-white border-slate-200'
          }`}>
            <div className={`text-2xl sm:text-3xl font-black tracking-widest font-mono ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              {prodLens} □ {prodBridge} — {prodTemple}
            </div>
            <p className={`text-xs mt-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Lens Width &bull; Bridge Distance &bull; Temple Length (mm)
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3.5 text-center text-xs">
            <div className={`p-2.5 rounded-xl border transition-colors ${
              isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <div className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Lens Width</div>
              <div className={`font-black text-sm sm:text-base mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>{prodLens} mm</div>
            </div>
            <div className={`p-2.5 rounded-xl border transition-colors ${
              isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <div className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Bridge Width</div>
              <div className={`font-black text-sm sm:text-base mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>{prodBridge} mm</div>
            </div>
            <div className={`p-2.5 rounded-xl border transition-colors ${
              isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <div className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Temple Length</div>
              <div className={`font-black text-sm sm:text-base mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>{prodTemple} mm</div>
            </div>
            <div className={`p-2.5 rounded-xl border transition-colors ${
              isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <div className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total Frame Width</div>
              <div className={`font-black text-sm sm:text-base mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>{prodTotal} mm</div>
            </div>
          </div>
        </div>

        {/* Standard Face Size Chart with Clickable Cards */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Standard Optical Fit Chart
            </h4>
            <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Click any size to switch
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            {/* Small */}
            <button
              type="button"
              onClick={() => handleSizeChange('Small')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                activeSize === 'Small' 
                  ? isDark
                    ? 'bg-brand-cyan/15 border-brand-cyan font-bold shadow-cyan-glow'
                    : 'bg-sky-50 border-2 border-brand-cyan font-bold shadow-sm ring-1 ring-brand-cyan/20'
                  : isDark 
                    ? 'bg-white/5 border-white/10 text-slate-300 hover:border-brand-cyan/40 hover:bg-white/[0.08]' 
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-brand-cyan/50 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-extrabold text-sm ${
                  activeSize === 'Small' ? (isDark ? 'text-brand-cyan' : 'text-slate-950') : (isDark ? 'text-white' : 'text-slate-800')
                }`}>
                  Small (S)
                </span>
                {activeSize === 'Small' && <Check className="w-4 h-4 text-brand-cyan shrink-0 stroke-[3]" />}
              </div>
              <div className={`text-[11px] mt-1 font-mono ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Width: 125–132 mm
              </div>
              <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Best for narrow or petite faces
              </div>
            </button>

            {/* Medium */}
            <button
              type="button"
              onClick={() => handleSizeChange('Medium')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                activeSize === 'Medium' 
                  ? isDark
                    ? 'bg-brand-cyan/15 border-brand-cyan font-bold shadow-cyan-glow'
                    : 'bg-sky-50 border-2 border-brand-cyan font-bold shadow-sm ring-1 ring-brand-cyan/20'
                  : isDark 
                    ? 'bg-white/5 border-white/10 text-slate-300 hover:border-brand-cyan/40 hover:bg-white/[0.08]' 
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-brand-cyan/50 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-extrabold text-sm ${
                  activeSize === 'Medium' ? (isDark ? 'text-brand-cyan' : 'text-slate-950') : (isDark ? 'text-white' : 'text-slate-800')
                }`}>
                  Medium (M)
                </span>
                {activeSize === 'Medium' && <Check className="w-4 h-4 text-brand-cyan shrink-0 stroke-[3]" />}
              </div>
              <div className={`text-[11px] mt-1 font-mono ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Width: 133–141 mm
              </div>
              <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Most common &bull; Fits 85% of adults
              </div>
            </button>

            {/* Large */}
            <button
              type="button"
              onClick={() => handleSizeChange('Large')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                activeSize === 'Large' 
                  ? isDark
                    ? 'bg-brand-cyan/15 border-brand-cyan font-bold shadow-cyan-glow'
                    : 'bg-sky-50 border-2 border-brand-cyan font-bold shadow-sm ring-1 ring-brand-cyan/20'
                  : isDark 
                    ? 'bg-white/5 border-white/10 text-slate-300 hover:border-brand-cyan/40 hover:bg-white/[0.08]' 
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-brand-cyan/50 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-extrabold text-sm ${
                  activeSize === 'Large' ? (isDark ? 'text-brand-cyan' : 'text-slate-950') : (isDark ? 'text-white' : 'text-slate-800')
                }`}>
                  Large (L)
                </span>
                {activeSize === 'Large' && <Check className="w-4 h-4 text-brand-cyan shrink-0 stroke-[3]" />}
              </div>
              <div className={`text-[11px] mt-1 font-mono ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Width: 142–150+ mm
              </div>
              <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Best for wide or broad facial profiles
              </div>
            </button>
          </div>
        </div>

        {/* Compare with My Current Glasses */}
        <form onSubmit={handleCompare} className={`rounded-2xl p-4 sm:p-5 space-y-4 border ${
          isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-brand-cyan shrink-0" />
            <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Check Measurements From Your Current Glasses
            </h4>
          </div>
          <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            Look on the inside of your current eyeglasses temple arm for the 3 stamped numbers (e.g. <strong>52 □ 18 140</strong>).
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label className={`block text-[11px] mb-1 font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Lens Width (mm)
              </label>
              <input 
                type="number"
                placeholder="e.g. 52"
                value={userLens}
                onChange={(e) => setUserLens(e.target.value)}
                className={`w-full rounded-xl px-3 py-2 text-xs text-center border font-mono font-bold transition-colors ${
                  isDark 
                    ? 'bg-[#060D17] border-white/15 text-white placeholder:text-slate-600 focus:border-brand-cyan' 
                    : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-brand-cyan shadow-xs'
                }`}
              />
            </div>
            <div>
              <label className={`block text-[11px] mb-1 font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Bridge (mm)
              </label>
              <input 
                type="number"
                placeholder="e.g. 18"
                value={userBridge}
                onChange={(e) => setUserBridge(e.target.value)}
                className={`w-full rounded-xl px-3 py-2 text-xs text-center border font-mono font-bold transition-colors ${
                  isDark 
                    ? 'bg-[#060D17] border-white/15 text-white placeholder:text-slate-600 focus:border-brand-cyan' 
                    : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-brand-cyan shadow-xs'
                }`}
              />
            </div>
            <div>
              <label className={`block text-[11px] mb-1 font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Temple (mm)
              </label>
              <input 
                type="number"
                placeholder="e.g. 140"
                value={userTemple}
                onChange={(e) => setUserTemple(e.target.value)}
                className={`w-full rounded-xl px-3 py-2 text-xs text-center border font-mono font-bold transition-colors ${
                  isDark 
                    ? 'bg-[#060D17] border-white/15 text-white placeholder:text-slate-600 focus:border-brand-cyan' 
                    : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-brand-cyan shadow-xs'
                }`}
              />
            </div>
            <div>
              <label className={`block text-[11px] mb-1 font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Total Width (mm)
              </label>
              <input 
                type="number"
                placeholder="e.g. 138"
                value={userWidth}
                onChange={(e) => setUserWidth(e.target.value)}
                className={`w-full rounded-xl px-3 py-2 text-xs text-center border font-mono font-bold transition-colors ${
                  isDark 
                    ? 'bg-[#060D17] border-white/15 text-white placeholder:text-slate-600 focus:border-brand-cyan' 
                    : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-brand-cyan shadow-xs'
                }`}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full py-3 rounded-xl font-extrabold text-xs bg-brand-cyan hover:bg-cyan-400 text-slate-950 shadow-cyan-glow transition-all duration-200 cursor-pointer"
          >
            Calculate Recommended Fit
          </button>

          {comparisonResult && (
            <div className={`p-4 rounded-xl border text-xs flex items-start gap-3 animate-fadeIn ${
              comparisonResult.isMatch 
                ? isDark 
                  ? 'bg-teal-950/60 border-teal-500/40 text-teal-200' 
                  : 'bg-emerald-50 border-emerald-300 text-emerald-950' 
                : isDark 
                  ? 'bg-amber-950/60 border-amber-500/40 text-amber-200' 
                  : 'bg-amber-50 border-amber-300 text-amber-950'
            }`}>
              {comparisonResult.isMatch 
                ? <CheckCircle className="w-5 h-5 shrink-0 text-emerald-500 mt-0.5" /> 
                : <AlertCircle className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />}
              <div>
                <strong className="block text-sm font-extrabold">
                  Recommended Fit: {comparisonResult.recommendedSize}
                </strong>
                <p className="mt-1 leading-relaxed">{comparisonResult.message}</p>
                {!comparisonResult.isMatch && (
                  <button
                    type="button"
                    onClick={() => handleSizeChange(comparisonResult.recommendedSize)}
                    className="mt-2 text-xs font-bold text-brand-cyan underline hover:text-brand-teal"
                  >
                    Switch to {comparisonResult.recommendedSize} now →
                  </button>
                )}
              </div>
            </div>
          )}
        </form>

        <div className="mt-5 flex items-center justify-between pt-4 border-t border-slate-200 dark:border-white/10">
          <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Selected Frame Size: <strong className="text-brand-cyan font-bold">{activeSize}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-white transition-colors"
          >
            Done &bull; Keep {activeSize}
          </button>
        </div>

        <p className="text-[10px] text-slate-400 text-center mt-3 italic">
          *Note: Frame sizing is based on international optical millimeter standards for ergonomic comfort.
        </p>
      </div>
    </div>
  );
};
