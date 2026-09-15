import React, { useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, X, RefreshCw, CheckCircle2, AlertCircle, Camera } from 'lucide-react';
import { uploadToImgBB } from '../../utils/imgbb';

export const ImageUploadDropzone = ({
  value,
  onChange,
  label = 'Upload Image',
  sublabel = 'Direct to ImgBB Cloud (PNG, JPG, WEBP up to 10MB)',
  prefix = 'opt',
  heightClass = 'h-36',
  onLaunchCamera = null,
  showCameraBtn = false,
  required = false
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleUploadFile = async (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File exceeds 10MB limit.');
      return;
    }

    setError('');
    setUploading(true);

    try {
      const res = await uploadToImgBB(file);

      if (res.success && res.url) {
        onChange(res.url);
      } else {
        setError(res.message || 'Upload failed');
      }
    } catch (err) {
      setError(err.message || 'Error uploading file to ImgBB storage.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUploadFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            {label}
            {required && <span className="text-rose-400">*</span>}
          </label>
          {showCameraBtn && onLaunchCamera && (
            <button
              type="button"
              onClick={onLaunchCamera}
              className="text-[11px] font-bold text-brand-cyan hover:text-cyan-300 flex items-center gap-1 transition-colors px-2 py-0.5 rounded bg-brand-cyan/10 hover:bg-brand-cyan/20 border border-brand-cyan/30"
            >
              <Camera className="w-3 h-3" />
              <span>Live Camera</span>
            </button>
          )}
        </div>
      )}

      {value ? (
        <div className={`relative ${heightClass} bg-black/40 rounded-2xl border border-white/15 overflow-hidden flex items-center justify-center p-2 group shadow-inner`}>
          <img
            src={value}
            alt="Preview"
            className="max-h-full max-w-full object-contain filter drop-shadow-md"
          />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold backdrop-blur-sm transition-all"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="p-1.5 rounded-lg bg-rose-500/80 hover:bg-rose-500 text-white transition-all"
              title="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono flex items-center gap-1 backdrop-blur-sm">
            <CheckCircle2 className="w-3 h-3" />
            <span>Stored in Vault</span>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative ${heightClass} rounded-2xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center p-4 text-center ${
            isDragOver 
              ? 'border-brand-cyan bg-brand-cyan/10 shadow-cyan-glow' 
              : 'border-white/15 hover:border-brand-cyan/60 bg-white/5 hover:bg-white/10'
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2 text-brand-cyan">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span className="text-xs font-semibold">Uploading to storage...</span>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center mx-auto text-slate-300 group-hover:text-brand-cyan">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-white">
                Click or Drag to Upload
              </div>
              <div className="text-[10px] text-slate-400">
                {sublabel}
              </div>
            </div>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/jpg"
        onChange={handleFileChange}
        className="hidden"
      />

      {error && (
        <div className="text-[11px] text-rose-400 flex items-center gap-1 mt-1">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
