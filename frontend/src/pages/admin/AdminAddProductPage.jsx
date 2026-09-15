import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Sparkles, Upload, Save, CheckCircle2, 
  AlertCircle, Camera, Barcode, Eye, Layers, ShieldCheck, Tag, Users
} from 'lucide-react';
import api from '../../api/client';
import { ImageUploadDropzone } from '../../components/common/ImageUploadDropzone';
import { CameraFrameCaptureModal } from '../../components/common/CameraFrameCaptureModal';

export const AdminAddProductPage = () => {
  const navigate = useNavigate();

  // Tab State
  const [activeTab, setActiveTab] = useState('specs'); // 'specs' | 'geometry' | 'pricing' | 'tryon'
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('1');
  const [subCategory, setSubCategory] = useState('Daily Essentials');
  const [brandName, setBrandName] = useState('Netra Signature');
  const [gender, setGender] = useState('Unisex');
  const [description, setDescription] = useState('');

  // Geometry
  const [frameShape, setFrameShape] = useState('Rectangle');
  const [frameMaterial, setFrameMaterial] = useState('Beta Titanium');
  const [frameSize, setFrameSize] = useState('Medium');
  const [frameColor, setFrameColor] = useState('Matte Black');
  const [lensWidth, setLensWidth] = useState('52');
  const [bridgeWidth, setBridgeWidth] = useState('18');
  const [templeLength, setTempleLength] = useState('140');
  const [totalWidth, setTotalWidth] = useState('138');

  // Pricing & Stock
  const [price, setPrice] = useState('1499');
  const [discountPrice, setDiscountPrice] = useState('2499');
  const [stockQuantity, setStockQuantity] = useState('15');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [sku, setSku] = useState(() => 'NU-TITAN-' + Math.floor(1000 + Math.random() * 9000));
  const [barcode, setBarcode] = useState(() => 'NU890' + Math.floor(100000 + Math.random() * 900000));

  // Try-On & Images
  const [isTryonEnabled, setIsTryonEnabled] = useState(true);
  const [isPrescriptionCompatible, setIsPrescriptionCompatible] = useState(true);
  const [isFeatured, setIsFeatured] = useState(true);
  const [isNewArrival, setIsNewArrival] = useState(true);
  const [primaryImage, setPrimaryImage] = useState('https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=800&auto=format&fit=crop&q=80');
  const [sideImage, setSideImage] = useState('https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&auto=format&fit=crop&q=80');
  const [angleImage, setAngleImage] = useState('');
  const [modelImage, setModelImage] = useState('');
  const [caseImage, setCaseImage] = useState('');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!name.trim() || !sku.trim() || !price) {
      setErrorMsg('Product name, SKU, and price are mandatory.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        category_id: parseInt(categoryId),
        brand_id: 1,
        sku: sku.trim(),
        barcode: barcode.trim(),
        price: parseFloat(price),
        discount_price: discountPrice ? parseFloat(discountPrice) : null,
        stock_quantity: parseInt(stockQuantity) || 0,
        low_stock_threshold: parseInt(lowStockThreshold) || 5,
        frame_shape: frameShape,
        frame_material: frameMaterial,
        frame_size: frameSize,
        frame_color: frameColor,
        gender: gender,
        lens_width: parseInt(lensWidth) || 52,
        bridge_width: parseInt(bridgeWidth) || 18,
        temple_length: parseInt(templeLength) || 140,
        total_frame_width: parseInt(totalWidth) || 138,
        is_tryon_enabled: isTryonEnabled ? 1 : 0,
        is_prescription_compatible: isPrescriptionCompatible ? 1 : 0,
        is_featured: isFeatured ? 1 : 0,
        is_new_arrival: isNewArrival ? 1 : 0,
        description: description.trim() || `${brandName} ${frameMaterial} ${frameShape} optical eyewear chassis.`,
        images: [
          { image_url: primaryImage, view_type: 'front' },
          ...(sideImage ? [{ image_url: sideImage, view_type: 'side' }] : []),
          ...(angleImage ? [{ image_url: angleImage, view_type: 'angle' }] : []),
          ...(modelImage ? [{ image_url: modelImage, view_type: 'model' }] : []),
          ...(caseImage ? [{ image_url: caseImage, view_type: 'case' }] : [])
        ]
      };

      const res = await api.post('/admin/products.php', payload);
      if (res.success) {
        setSuccessMsg(`Frame '${name}' successfully registered and stocked in vault!`);
        setTimeout(() => {
          navigate('/admin/products');
        }, 1500);
      } else {
        setErrorMsg(res.message || 'Failed to save product.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error saving product to database.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <Link 
            to="/admin/products"
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <span className="text-xs uppercase font-extrabold tracking-wider text-brand-cyan">
              Catalog Studio (Screen 19)
            </span>
            <h1 className="text-2xl font-extrabold text-white">
              Add Eyewear Frame &amp; 3D Try-On
            </h1>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="btn-primary text-xs py-2.5 px-5 font-bold rounded-xl flex items-center gap-2 shadow-cyan-glow disabled:opacity-50"
        >
          {saving ? (
            <span>Saving to Database...</span>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Publish Frame</span>
            </>
          )}
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-teal-950/50 border border-teal-500/40 text-teal-200 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-teal-400" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Form Controls (Left 8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Step Tabs */}
          <div className="flex items-center gap-2 border-b border-white/10 pb-2">
            {[
              { id: 'specs', label: '1. Frame Specs' },
              { id: 'geometry', label: '2. Dimensions & Fit' },
              { id: 'pricing', label: '3. Pricing & Stock' },
              { id: 'tryon', label: '4. 3D Try-On & Images' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`text-xs font-bold px-3.5 py-2 rounded-xl transition-all ${
                  activeTab === tab.id
                    ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: Specs */}
          {activeTab === 'specs' && (
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <h3 className="text-xs uppercase font-bold tracking-wider text-brand-cyan border-b border-white/10 pb-2">
                Basic Eyewear Identification
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Product Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Netra Titanium Hexa Aviator"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Primary Optical Category *</label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full glass-input rounded-xl px-3 py-2 text-xs font-medium cursor-pointer"
                    >
                      <option value="1">Eyeglasses (Prescription Frames)</option>
                      <option value="2">Sunglasses &amp; Polarized</option>
                      <option value="3">Computer / Blue-Cut Protection</option>
                      <option value="4">Reading Glasses (+1.00 to +3.50)</option>
                      <option value="5">Kids &amp; Teens Eyewear</option>
                      <option value="6">Progressive &amp; Bifocal Luxury</option>
                      <option value="7">Sports &amp; Protective Goggles</option>
                      <option value="8">Contact Lenses &amp; Solutions</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Sub-Category / Collection</label>
                    <select
                      value={subCategory}
                      onChange={(e) => setSubCategory(e.target.value)}
                      className="w-full glass-input rounded-xl px-3 py-2 text-xs font-medium cursor-pointer"
                    >
                      <option value="Daily Essentials">Daily Essentials</option>
                      <option value="Executive Formal">Executive Formal &amp; Corporate</option>
                      <option value="Ultra-Light Titanium">Ultra-Light Titanium (&lt;15g)</option>
                      <option value="Italian Acetate">Handcrafted Italian Acetate</option>
                      <option value="Retro Vintage">Retro Vintage &amp; Aviator</option>
                      <option value="Polarized Outdoors">Polarized Driving &amp; Outdoors</option>
                      <option value="Gamer Anti-Fatigue">Gamer Screen Fatigue 420nm</option>
                      <option value="Senior Reading Comfort">Senior Reading Comfort</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Target Demographic / Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full glass-input rounded-xl px-3 py-2 text-xs font-medium cursor-pointer"
                    >
                      <option value="Unisex">Unisex (All Adults)</option>
                      <option value="Men">Men / Male</option>
                      <option value="Women">Women / Female</option>
                      <option value="Kids">Kids &amp; Children (Ages 4-14)</option>
                      <option value="Seniors">Seniors / Old Age (+50)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Brand Collection</label>
                    <input
                      type="text"
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      className="w-full glass-input rounded-xl px-3.5 py-2 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">Product Clinical Description</label>
                  <textarea
                    rows="3"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optical characteristics, ergonomic weight, hinge flexibility..."
                    className="w-full glass-input rounded-xl px-3.5 py-2 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Geometry */}
          {activeTab === 'geometry' && (
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <h3 className="text-xs uppercase font-bold tracking-wider text-brand-cyan border-b border-white/10 pb-2">
                Optical Frame Geometry &amp; Sizing Standard
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Lens Width (mm)</label>
                  <input
                    type="number"
                    value={lensWidth}
                    onChange={(e) => setLensWidth(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Bridge Width (mm)</label>
                  <input
                    type="number"
                    value={bridgeWidth}
                    onChange={(e) => setBridgeWidth(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Temple Length (mm)</label>
                  <input
                    type="number"
                    value={templeLength}
                    onChange={(e) => setTempleLength(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Total Width (mm)</label>
                  <input
                    type="number"
                    value={totalWidth}
                    onChange={(e) => setTotalWidth(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs font-mono text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Frame Shape</label>
                  <select
                    value={frameShape}
                    onChange={(e) => setFrameShape(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs font-medium cursor-pointer"
                  >
                    <option value="Rectangle">Rectangle</option>
                    <option value="Round">Round</option>
                    <option value="Aviator">Aviator</option>
                    <option value="Cat Eye">Cat Eye</option>
                    <option value="Hexagonal">Hexagonal</option>
                    <option value="Square">Square</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">Frame Material</label>
                  <select
                    value={frameMaterial}
                    onChange={(e) => setFrameMaterial(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs font-medium cursor-pointer"
                  >
                    <option value="Beta Titanium">Beta Titanium</option>
                    <option value="Handmade Acetate">Handmade Acetate</option>
                    <option value="TR90 Memory Polymer">TR90 Memory Polymer</option>
                    <option value="Stainless Steel">Stainless Steel</option>
                    <option value="Mixed Metal">Mixed Metal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">Frame Fit Size</label>
                  <select
                    value={frameSize}
                    onChange={(e) => setFrameSize(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-xs font-medium cursor-pointer"
                  >
                    <option value="Narrow">Narrow (&lt;130mm)</option>
                    <option value="Medium">Medium (131-139mm)</option>
                    <option value="Wide">Wide (&gt;140mm)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">Primary Color</label>
                  <input
                    type="text"
                    value={frameColor}
                    onChange={(e) => setFrameColor(e.target.value)}
                    className="w-full glass-input rounded-xl px-3.5 py-2 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Pricing & Stock */}
          {activeTab === 'pricing' && (
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <h3 className="text-xs uppercase font-bold tracking-wider text-brand-cyan border-b border-white/10 pb-2">
                Commercial Pricing &amp; Warehouse Vault Stock
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Customer Selling Price (₹) *</label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm font-bold font-mono text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">MRP / Strike Price (₹)</label>
                  <input
                    type="number"
                    value={discountPrice}
                    onChange={(e) => setDiscountPrice(e.target.value)}
                    className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Initial Vault Stock Units</label>
                  <input
                    type="number"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    className="w-full glass-input rounded-xl px-3.5 py-2 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">Low Stock Warning Threshold</label>
                  <input
                    type="number"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(e.target.value)}
                    className="w-full glass-input rounded-xl px-3.5 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Internal Inventory SKU</label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full glass-input rounded-xl px-3.5 py-2 text-xs font-mono text-brand-cyan"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">Retail Barcode (Code128 / EAN)</label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="w-full glass-input rounded-xl px-3.5 py-2 text-xs font-mono text-brand-teal"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: 3D Try-On & Images */}
          {activeTab === 'tryon' && (
            <div className="glass-card rounded-2xl p-6 space-y-5">
              <h3 className="text-xs uppercase font-bold tracking-wider text-brand-cyan border-b border-white/10 pb-2">
                Virtual Try-On Calibration &amp; Gallery
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  
                  {/* Image 1: Front 3D AR */}
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                    <ImageUploadDropzone
                      value={primaryImage}
                      onChange={setPrimaryImage}
                      label="1. Front View (3D AR Try-On)"
                      sublabel="Upload PNG or capture live with webcam"
                      prefix="frame_front_3d"
                      showCameraBtn={true}
                      onLaunchCamera={() => setIsCameraModalOpen(true)}
                      required={true}
                    />
                  </div>

                  {/* Image 2: Side Profile */}
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                    <ImageUploadDropzone
                      value={sideImage}
                      onChange={setSideImage}
                      label="2. Side / Temple Profile"
                      sublabel="Shows ear stems, hinge and titanium flex"
                      prefix="frame_side"
                    />
                  </div>

                  {/* Image 3: 45 Degree Angle */}
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                    <ImageUploadDropzone
                      value={angleImage}
                      onChange={setAngleImage}
                      label="3. 45° Perspective Angle"
                      sublabel="Luxury isometric 3/4 perspective"
                      prefix="frame_angle"
                    />
                  </div>

                  {/* Image 4: Model Face */}
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                    <ImageUploadDropzone
                      value={modelImage}
                      onChange={setModelImage}
                      label="4. Model Face / Lifestyle"
                      sublabel="Real-world model wearing the frame"
                      prefix="frame_model"
                    />
                  </div>

                  {/* Image 5: Packaging & Accessories */}
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2 sm:col-span-2 lg:col-span-2">
                    <ImageUploadDropzone
                      value={caseImage}
                      onChange={setCaseImage}
                      label="5. Hard Leather Case &amp; Microfiber Kit"
                      sublabel="Packaging, protective case &amp; lens cloth"
                      prefix="frame_packaging"
                    />
                  </div>

                </div>

                {/* Feature Toggles */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isTryonEnabled}
                      onChange={(e) => setIsTryonEnabled(e.target.checked)}
                      className="accent-brand-cyan w-4 h-4"
                    />
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-brand-cyan" /> 3D Virtual Try-On
                      </div>
                      <div className="text-[10px] text-slate-400">Enable webcam fitting preview</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPrescriptionCompatible}
                      onChange={(e) => setIsPrescriptionCompatible(e.target.checked)}
                      className="accent-brand-cyan w-4 h-4"
                    />
                    <div>
                      <div className="text-xs font-bold text-white">Prescription Compatible</div>
                      <div className="text-[10px] text-slate-400">Allows attaching custom lenses</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isFeatured}
                      onChange={(e) => setIsFeatured(e.target.checked)}
                      className="accent-brand-cyan w-4 h-4"
                    />
                    <div>
                      <div className="text-xs font-bold text-white">Featured Homepage</div>
                      <div className="text-[10px] text-slate-400">Show on top curation carousels</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isNewArrival}
                      onChange={(e) => setIsNewArrival(e.target.checked)}
                      className="accent-brand-cyan w-4 h-4"
                    />
                    <div>
                      <div className="text-xs font-bold text-white">New Arrival Badge</div>
                      <div className="text-[10px] text-slate-400">Display "NEW" badge on storefront</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Live Preview Card (Right 4 Cols) */}
        <div className="lg:col-span-4 space-y-4 sticky top-24">
          <div className="glass-card rounded-2xl p-5 space-y-4 border border-brand-cyan/30">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-cyan block">
              Storefront Live Card Preview
            </span>

            <div className="aspect-[4/3] rounded-xl bg-[#070E1A] p-4 flex items-center justify-center border border-white/10 relative overflow-hidden">
              {isTryonEnabled && (
                <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-cyan/20 text-brand-cyan flex items-center gap-1 border border-brand-cyan/30">
                  <Sparkles className="w-3 h-3" /> 3D Try-On
                </span>
              )}
              <img
                src={primaryImage || '/logo_symbol.png'}
                alt="preview"
                className="max-h-full max-w-full object-contain filter drop-shadow-lg"
              />
            </div>

            <div>
              <div className="text-[10px] font-mono text-brand-cyan font-semibold">{sku}</div>
              <h4 className="font-extrabold text-sm text-white mt-0.5">
                {name || 'Untitled Optical Frame'}
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">
                {frameShape} &bull; {frameMaterial} &bull; {frameSize} Fit
              </p>
            </div>

            <div className="flex items-baseline justify-between border-t border-white/10 pt-3">
              <div>
                <span className="text-lg font-black text-white font-mono">₹{price}</span>
                {discountPrice && (
                  <span className="text-xs text-slate-400 line-through ml-2 font-mono">
                    ₹{discountPrice}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-bold text-teal-400">
                {stockQuantity} In Stock
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5 font-mono text-[10px] text-slate-400 text-center">
              Geometry: {lensWidth} □ {bridgeWidth} — {templeLength} mm
            </div>
          </div>
        </div>
      </div>

      {/* Live 3D Frame Webcam Capture Modal */}
      <CameraFrameCaptureModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCaptureComplete={(capturedUrl) => {
          setPrimaryImage(capturedUrl);
          setIsTryonEnabled(true);
        }}
      />

    </div>
  );
};
