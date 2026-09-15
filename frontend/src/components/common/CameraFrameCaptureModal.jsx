import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, RefreshCw, Check, Sparkles, Sliders, AlertCircle, Eye } from 'lucide-react';
import api from '../../api/client';

export const CameraFrameCaptureModal = ({ isOpen, onClose, onCaptureComplete }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturedData, setCapturedData] = useState(null);
  const [processedData, setProcessedData] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const [threshold, setThreshold] = useState(210); // Brightness threshold for background removal
  const [saving, setSaving] = useState(false);
  const [removeBg, setRemoveBg] = useState(true);

  // Start webcam stream
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    const startCamera = async () => {
      setCameraError('');
      setCapturedData(null);
      setProcessedData(null);

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'environment' // default to back camera on mobile or primary webcam
          },
          audio: false
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play();
        }
      } catch (err) {
        console.error('Camera access failed:', err);
        setCameraError('Unable to access webcam. Please ensure camera permissions are granted in browser settings.');
      }
    };

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  // Capture frame from video stream
  const handleSnap = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const rawUrl = canvas.toDataURL('image/png');
    setCapturedData(rawUrl);
    applyBackgroundKnockout(canvas, rawUrl, threshold, removeBg);
  };

  // Background knockout algorithm
  const applyBackgroundKnockout = (canvas, rawUrl, thresh, shouldRemove) => {
    if (!shouldRemove) {
      setProcessedData(rawUrl);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const imgData = ctx.getImageData(0, 0, c.width, c.height);
      const data = imgData.data;

      // Sample corners to detect background color
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const brightness = (r * 0.299 + g * 0.587 + b * 0.114);

        // If pixel is very bright/white (typical sheet or neutral backing)
        if (brightness >= thresh) {
          // Smooth transparency fade
          const alphaFade = Math.max(0, 255 - (brightness - thresh) * 8);
          data[i + 3] = alphaFade;
        }
      }

      ctx.putImageData(imgData, 0, 0);
      setProcessedData(c.toDataURL('image/png'));
    };
    img.src = rawUrl;
  };

  const handleThresholdChange = (newVal) => {
    setThreshold(newVal);
    if (capturedData) {
      applyBackgroundKnockout(null, capturedData, newVal, removeBg);
    }
  };

  const handleToggleBg = () => {
    const next = !removeBg;
    setRemoveBg(next);
    if (capturedData) {
      applyBackgroundKnockout(null, capturedData, threshold, next);
    }
  };

  const handleSaveToVault = async () => {
    const dataToSend = processedData || capturedData;
    if (!dataToSend) return;

    setSaving(true);
    try {
      const res = await api.post('/admin/upload.php', {
        image_data: dataToSend,
        prefix: '3d_frame_ar'
      });

      if (res.success && res.data?.url) {
        onCaptureComplete(res.data.url);
        onClose();
      } else {
        alert(res.message || 'Failed to save captured frame.');
      }
    } catch (err) {
      alert(err.message || 'Error uploading captured frame.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-2xl w-full glass-card rounded-3xl overflow-hidden border border-white/20 shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-cyan/20 border border-brand-cyan/40 flex items-center justify-center text-brand-cyan">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Live 3D Eyewear Frame Scanner
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-cyan/20 text-brand-cyan font-mono font-bold">
                  AR Ready
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Position optical frame against light background for instant transparency cut-out
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {cameraError ? (
            <div className="p-6 text-center space-y-3 bg-rose-950/40 border border-rose-500/30 rounded-2xl">
              <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
              <div className="text-sm font-bold text-rose-200">Webcam Not Available</div>
              <p className="text-xs text-rose-300/80 max-w-sm mx-auto">{cameraError}</p>
            </div>
          ) : !capturedData ? (
            /* Live Camera Viewport */
            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Holographic Frame Alignment Reticle */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-72 h-24 border-2 border-dashed border-brand-cyan/60 rounded-3xl flex items-center justify-between px-6 backdrop-blur-[1px] shadow-[0_0_20px_rgba(0,180,216,0.2)]">
                  {/* Left Lens Guide */}
                  <div className="w-24 h-16 border-2 border-brand-cyan/80 rounded-2xl flex items-center justify-center">
                    <span className="text-[9px] font-mono text-brand-cyan/60 uppercase">Left Lens</span>
                  </div>
                  {/* Nose Bridge */}
                  <div className="h-1 w-8 bg-brand-cyan/80 rounded-full" />
                  {/* Right Lens Guide */}
                  <div className="w-24 h-16 border-2 border-brand-cyan/80 rounded-2xl flex items-center justify-center">
                    <span className="text-[9px] font-mono text-brand-cyan/60 uppercase">Right Lens</span>
                  </div>
                </div>

                <div className="absolute bottom-3 text-center text-[10px] text-brand-cyan font-mono bg-black/60 px-3 py-1 rounded-full border border-brand-cyan/30">
                  Align real eyewear frame horizontally inside guide box
                </div>
              </div>
            </div>
          ) : (
            /* Captured Preview with Transparency Tuning */
            <div className="space-y-4">
              <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/15 flex items-center justify-center bg-[#1a1a24]"
                   style={{
                     backgroundImage: 'linear-gradient(45deg, #111 25%, transparent 25%), linear-gradient(-45deg, #111 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #111 75%), linear-gradient(-45deg, transparent 75%, #111 75%)',
                     backgroundSize: '20px 20px',
                     backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                   }}
              >
                <img
                  src={processedData || capturedData}
                  alt="Captured Optical Frame"
                  className="max-h-full max-w-full object-contain filter drop-shadow-2xl"
                />
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/70 border border-brand-cyan/40 text-brand-cyan text-[10px] font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" />
                  <span>Transparent Cutout Active</span>
                </div>
              </div>

              {/* Threshold & Background Tuning */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-semibold text-slate-200">
                    <Sliders className="w-3.5 h-3.5 text-brand-cyan" />
                    <span>Auto Background Knockout Sensitivity</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleBg}
                    className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition-colors ${
                      removeBg ? 'bg-brand-cyan text-slate-950' : 'bg-white/10 text-slate-300'
                    }`}
                  >
                    {removeBg ? 'Auto-Cutout: ON' : 'Raw Capture'}
                  </button>
                </div>

                {removeBg && (
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-400 font-mono">Darker</span>
                    <input
                      type="range"
                      min="150"
                      max="245"
                      value={threshold}
                      onChange={(e) => handleThresholdChange(Number(e.target.value))}
                      className="w-full accent-brand-cyan cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-400 font-mono">Whiter</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between bg-black/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
          >
            Cancel
          </button>

          {!capturedData ? (
            <button
              type="button"
              onClick={handleSnap}
              disabled={!!cameraError}
              className="btn-primary px-6 py-2.5 rounded-xl text-xs font-bold shadow-cyan-glow flex items-center gap-2 disabled:opacity-50"
            >
              <Camera className="w-4 h-4" />
              <span>Capture Frame Photo</span>
            </button>
          ) : (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => { setCapturedData(null); setProcessedData(null); }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              >
                Retake
              </button>
              <button
                type="button"
                onClick={handleSaveToVault}
                disabled={saving}
                className="btn-primary px-6 py-2.5 rounded-xl text-xs font-bold shadow-cyan-glow flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving to Vault...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Use for 3D Virtual Try-On</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
