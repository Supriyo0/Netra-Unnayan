import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Camera, Upload, RotateCw, Sparkles, Check, 
  Download, Share2, Eye, Sun, Shield, Layers, ChevronLeft, ChevronRight, Sliders
} from 'lucide-react';

const LENS_FILTERS = [
  { id: 'clear', name: 'Natural Clear', icon: Eye, tintClass: 'bg-transparent', badge: 'Anti-Glare' },
  { id: 'bluecut', name: 'Blue-Cut Shield', icon: Shield, tintClass: 'bg-sky-400/25 mix-blend-color backdrop-brightness-105', badge: '420nm Filter' },
  { id: 'ocean', name: 'Ocean Polarized', icon: Sun, tintClass: 'bg-gradient-to-br from-blue-900/60 to-emerald-900/60 mix-blend-multiply backdrop-contrast-125', badge: '100% UV400' },
  { id: 'rosegold', name: 'Sunset Rose', icon: Sparkles, tintClass: 'bg-rose-500/25 mix-blend-screen backdrop-hue-rotate-15', badge: 'Fashion Tint' },
  { id: 'nightvision', name: 'Drive Vision', icon: Sun, tintClass: 'bg-amber-400/30 mix-blend-color backdrop-contrast-110', badge: 'High Contrast' },
];

const PRESET_FRAMES = [
  {
    id: 1,
    name: 'Titanium Aviator',
    price: 2499,
    image: 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 2,
    name: 'Acetate Wayfarer',
    price: 1999,
    image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 3,
    name: 'Vintage Round Gold',
    price: 2799,
    image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 4,
    name: 'Executive Clubmaster',
    price: 2299,
    image: 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 5,
    name: 'Cat-Eye Luxe Noir',
    price: 2699,
    image: 'https://images.unsplash.com/photo-1508296695146-257a814070b4?w=800&auto=format&fit=crop&q=80'
  }
];

export const VirtualTryOnModal = ({ isOpen, onClose, product }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);

  const [hasCamera, setHasCamera] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [userPhoto, setUserPhoto] = useState(null);

  // Active filter & active frame
  const [activeFilter, setActiveFilter] = useState('clear');
  const [selectedFrame, setSelectedFrame] = useState(null);

  // Manual Adjustments
  const [scale, setScale] = useState(1.0);
  const [offsetY, setOffsetY] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [showControls, setShowControls] = useState(false);

  // Snapshot result modal
  const [capturedImage, setCapturedImage] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Set default frame from product
  useEffect(() => {
    if (product) {
      const pImg = product?.images?.find(i => i.view_type === 'front')?.image_url 
        || product?.primary_image 
        || '/logo_symbol.png';
      setSelectedFrame({
        name: product.name,
        image: pImg,
        price: product.price
      });
    } else {
      setSelectedFrame(PRESET_FRAMES[0]);
    }
  }, [product]);

  useEffect(() => {
    if (isOpen && !userPhoto) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, userPhoto]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access not supported by browser.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasCamera(true);
    } catch (err) {
      console.warn('Camera access denied:', err);
      setCameraError('Camera access denied or device unavailable. You can upload your photo below.');
      setHasCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUserPhoto(event.target.result);
        stopCamera();
      };
      reader.readAsDataURL(file);
    }
  };

  // Snapchat / Instagram Shutter Snapshot Capture
  const handleCaptureSnapshot = () => {
    setIsCapturing(true);

    setTimeout(() => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');

        // Draw Video or User Photo
        if (hasCamera && videoRef.current) {
          ctx.save();
          // Mirror video horizontally like front cam
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          ctx.restore();
        } else if (userPhoto) {
          const img = new Image();
          img.src = userPhoto;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }

        // Draw Eyewear Frame
        const frameImgElement = new Image();
        frameImgElement.crossOrigin = 'anonymous';
        frameImgElement.onload = () => {
          ctx.save();
          const cx = canvas.width / 2 + offsetX;
          const cy = canvas.height * 0.44 + offsetY;
          const fw = canvas.width * 0.6 * scale;
          const fh = fw * (frameImgElement.height / frameImgElement.width || 0.45);

          ctx.translate(cx, cy);
          ctx.rotate((rotation * Math.PI) / 180);
          ctx.drawImage(frameImgElement, -fw / 2, -fh / 2, fw, fh);
          ctx.restore();

          // Watermark badge
          ctx.fillStyle = 'rgba(6, 13, 23, 0.85)';
          ctx.fillRect(16, canvas.height - 56, 260, 42);
          ctx.strokeStyle = '#00F0FF';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(16, canvas.height - 56, 260, 42);

          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 12px sans-serif';
          ctx.fillText('NETRA UNNAYAN AR TRY-ON', 26, canvas.height - 35);
          ctx.fillStyle = '#00F0FF';
          ctx.font = '10px monospace';
          ctx.fillText(selectedFrame?.name || 'Designer Eyewear', 26, canvas.height - 20);

          setCapturedImage(canvas.toDataURL('image/png'));
          setIsCapturing(false);
        };
        frameImgElement.onerror = () => {
          setCapturedImage(canvas.toDataURL('image/png'));
          setIsCapturing(false);
        };
        frameImgElement.src = selectedFrame?.image || '/logo_symbol.png';
      } catch (err) {
        console.error('Snapshot capture failed:', err);
        setIsCapturing(false);
      }
    }, 150);
  };

  const handleDownloadSnapshot = () => {
    if (!capturedImage) return;
    const a = document.createElement('a');
    a.href = capturedImage;
    a.download = `netra-unnayan-tryon-${Date.now()}.png`;
    a.click();
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(`Hey! Check out how these ${selectedFrame?.name} frames look on me with Netra Unnayan Virtual Try-On!`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  if (!isOpen) return null;

  const currentFilterObj = LENS_FILTERS.find(f => f.id === activeFilter) || LENS_FILTERS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-xl">
      <div className="relative w-full max-w-2xl bg-[#071220] border border-brand-cyan/40 rounded-3xl p-4 sm:p-6 shadow-2xl overflow-hidden flex flex-col">
        
        {/* Top Header: Filter Bar & Close */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <div>
              <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5 font-heading">
                <span>AR FACE TRY-ON</span>
                <span className="text-xs font-mono text-brand-cyan font-normal">| {selectedFrame?.name}</span>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowControls(!showControls)}
              className={`p-1.5 rounded-xl border text-xs flex items-center gap-1 transition-all ${
                showControls ? 'bg-brand-cyan text-slate-950 border-brand-cyan font-bold' : 'border-white/15 text-slate-300 hover:text-white'
              }`}
              title="Calibration Sliders"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Calibrate</span>
            </button>
            <button 
              onClick={onClose} 
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Instagram/Snapchat Lens Tint Filter Carousel */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none text-xs">
          {LENS_FILTERS.map((filter) => {
            const Icon = filter.icon;
            const isSelected = activeFilter === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 shrink-0 transition-all ${
                  isSelected 
                    ? 'bg-gradient-to-r from-brand-cyan to-brand-teal text-slate-950 shadow-cyan-glow' 
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{filter.name}</span>
                {isSelected && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-black/30 text-white font-mono">
                    {filter.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Main AR Camera Viewport */}
        <div className="relative w-full aspect-[4/3] bg-black rounded-2xl overflow-hidden border border-brand-cyan/20 flex items-center justify-center mt-2 group">
          
          {/* Flash Shutter Animation */}
          {isCapturing && (
            <div className="absolute inset-0 bg-white z-50 animate-ping opacity-90 pointer-events-none" />
          )}

          {/* Live Camera Feed */}
          {hasCamera && !userPhoto && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />
          )}

          {/* Uploaded User Photo */}
          {userPhoto && (
            <img 
              src={userPhoto} 
              alt="User Face" 
              className="w-full h-full object-contain"
            />
          )}

          {/* Fallback Screen */}
          {!hasCamera && !userPhoto && (
            <div className="p-6 text-center max-w-sm space-y-3">
              <Camera className="w-12 h-12 text-slate-500 mx-auto opacity-70" />
              <p className="text-xs text-slate-300">
                {cameraError || 'Allow camera access or upload your portrait to experience Instagram-style 3D eyewear filters.'}
              </p>
              <div>
                <input 
                  type="file" 
                  id="tryon-upload" 
                  accept="image/*" 
                  onChange={handlePhotoUpload} 
                  className="hidden" 
                />
                <label 
                  htmlFor="tryon-upload" 
                  className="btn-primary text-xs py-2 px-4 cursor-pointer inline-flex items-center gap-1.5 shadow-cyan-glow"
                >
                  <Upload className="w-3.5 h-3.5" /> Upload Portrait Photo
                </label>
              </div>
            </div>
          )}

          {/* Instagram / Snapchat AR Face Oval Guide & Dynamic Laser Scan Line */}
          {(hasCamera || userPhoto) && (
            <>
              {/* Dynamic Cyan Laser Scan Line */}
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-brand-cyan to-transparent shadow-[0_0_15px_#00F0FF] animate-pulse pointer-events-none" />

              {/* Holographic AR Face Oval with Pupil Marks */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center opacity-40">
                <div className="w-48 h-64 border-2 border-dashed border-brand-cyan rounded-[50%] relative flex items-center justify-center">
                  {/* Left Pupil Reticle */}
                  <div className="absolute top-24 left-10 w-4 h-4 border border-brand-teal rounded-full flex items-center justify-center">
                    <div className="w-1 h-1 bg-brand-cyan rounded-full" />
                  </div>
                  {/* Right Pupil Reticle */}
                  <div className="absolute top-24 right-10 w-4 h-4 border border-brand-teal rounded-full flex items-center justify-center">
                    <div className="w-1 h-1 bg-brand-cyan rounded-full" />
                  </div>
                  {/* Bridge Coordinate */}
                  <div className="absolute top-24 w-6 h-[1px] bg-brand-cyan" />
                </div>
                <span className="text-[10px] text-brand-cyan mt-2 font-mono tracking-widest uppercase bg-black/60 px-2 py-0.5 rounded-full border border-brand-cyan/30">
                  AR Pupil Tracking Active
                </span>
              </div>

              {/* Top Left Live Watermark */}
              <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-black/60 border border-brand-cyan/40 text-brand-cyan text-[10px] font-bold px-3 py-1 rounded-full backdrop-blur-md">
                <Sparkles className="w-3 h-3 text-brand-teal" />
                <span>NETRA 3D AR</span>
              </div>
            </>
          )}

          {/* Eyewear Frame Overlay with Active Lens Filter Tint */}
          {(hasCamera || userPhoto) && selectedFrame && (
            <div 
              className="absolute pointer-events-none transition-transform duration-75"
              style={{
                transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale}) rotate(${rotation}deg)`,
                width: '62%',
                top: '36%',
              }}
            >
              {/* Lens Tint Filter Backdrop Layer */}
              <div className={`absolute inset-x-[8%] inset-y-[18%] rounded-full ${currentFilterObj.tintClass} transition-all duration-300 pointer-events-none`} />

              {/* Eyewear Frame PNG */}
              <img 
                src={selectedFrame.image} 
                alt={selectedFrame.name} 
                className="w-full h-auto object-contain filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.85)] relative z-10"
              />
            </div>
          )}

          {/* Instagram / Snapchat Shutter Button (Centered Bottom) */}
          {(hasCamera || userPhoto) && (
            <div className="absolute bottom-4 inset-x-0 flex items-center justify-center z-30 pointer-events-auto">
              <button
                type="button"
                onClick={handleCaptureSnapshot}
                className="w-14 h-14 rounded-full border-4 border-white bg-white/20 backdrop-blur-md hover:bg-brand-cyan/40 hover:border-brand-cyan flex items-center justify-center shadow-2xl transition-all transform hover:scale-105 active:scale-95"
                title="Capture Try-On Snapshot"
              >
                <div className="w-10 h-10 rounded-full bg-white hover:bg-brand-cyan transition-colors" />
              </button>
            </div>
          )}
        </div>

        {/* Bottom Eyewear Frame Switcher Carousel */}
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>Switch Eyewear Frame:</span>
            <span className="text-brand-cyan font-mono font-bold">₹{selectedFrame?.price || 1999}</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {PRESET_FRAMES.map((frm) => (
              <button
                key={frm.id}
                type="button"
                onClick={() => setSelectedFrame(frm)}
                className={`flex items-center gap-2 p-1.5 pr-3 rounded-xl border text-xs shrink-0 transition-all ${
                  selectedFrame?.name === frm.name
                    ? 'bg-brand-cyan/20 border-brand-cyan text-white shadow-cyan-glow'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:border-white/30'
                }`}
              >
                <img src={frm.image} alt={frm.name} className="w-8 h-8 rounded-lg object-contain bg-black/40 p-0.5" />
                <div className="text-left">
                  <div className="font-bold text-[11px] truncate max-w-[100px]">{frm.name}</div>
                  <div className="text-[10px] text-brand-teal font-mono">₹{frm.price}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Collapsible Manual Calibration Drawer */}
        {showControls && (hasCamera || userPhoto) && (
          <div className="mt-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2 animate-fadeIn text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <div className="flex justify-between text-[10px] text-slate-300 mb-0.5">
                  <span>Size</span>
                  <span className="text-brand-cyan font-mono">{Math.round(scale * 100)}%</span>
                </div>
                <input 
                  type="range" min="0.6" max="1.5" step="0.02" value={scale} 
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                  className="w-full accent-brand-cyan" 
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-slate-300 mb-0.5">
                  <span>Vertical</span>
                  <span className="text-brand-cyan font-mono">{offsetY}px</span>
                </div>
                <input 
                  type="range" min="-80" max="80" step="2" value={offsetY} 
                  onChange={(e) => setOffsetY(parseInt(e.target.value))}
                  className="w-full accent-brand-cyan" 
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-slate-300 mb-0.5">
                  <span>Horizontal</span>
                  <span className="text-brand-cyan font-mono">{offsetX}px</span>
                </div>
                <input 
                  type="range" min="-60" max="60" step="2" value={offsetX} 
                  onChange={(e) => setOffsetX(parseInt(e.target.value))}
                  className="w-full accent-brand-cyan" 
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-slate-300 mb-0.5">
                  <span>Tilt</span>
                  <span className="text-brand-cyan font-mono">{rotation}°</span>
                </div>
                <input 
                  type="range" min="-20" max="20" step="1" value={rotation} 
                  onChange={(e) => setRotation(parseInt(e.target.value))}
                  className="w-full accent-brand-cyan" 
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 text-[11px]">
              <button 
                type="button" 
                onClick={() => { setScale(1.0); setOffsetX(0); setOffsetY(0); setRotation(0); }}
                className="text-slate-400 hover:text-white flex items-center gap-1"
              >
                <RotateCw className="w-3 h-3" /> Reset To Center
              </button>

              <div className="flex gap-2">
                <input type="file" id="tryon-swap" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                <label htmlFor="tryon-swap" className="text-brand-cyan hover:underline cursor-pointer">
                  {userPhoto ? 'Change Photo' : 'Upload Face Photo'}
                </label>
                {userPhoto && (
                  <button type="button" onClick={() => { setUserPhoto(null); startCamera(); }} className="text-slate-300 hover:text-white">
                    Use Live Camera
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* SNAPSHOT CAPTURED MODAL (Instagram / Snapchat Style Story Preview) */}
      {capturedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl animate-fadeIn">
          <div className="w-full max-w-md bg-[#0A192F] border border-brand-cyan/40 rounded-3xl p-5 space-y-4 shadow-2xl text-center">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-bold text-brand-cyan uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-teal" /> Try-On Snapshot Captured!
              </span>
              <button onClick={() => setCapturedImage(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden border border-white/15 bg-black shadow-lg">
              <img src={capturedImage} alt="AR Snapshot" className="w-full h-auto object-contain" />
            </div>

            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleDownloadSnapshot}
                className="btn-primary text-xs py-2.5 px-4 rounded-xl flex items-center gap-1.5 shadow-cyan-glow flex-1 justify-center"
              >
                <Download className="w-4 h-4" /> Download Photo
              </button>
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="btn-secondary text-xs py-2.5 px-4 rounded-xl flex items-center gap-1.5 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 flex-1 justify-center"
              >
                <Share2 className="w-4 h-4" /> Share WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
