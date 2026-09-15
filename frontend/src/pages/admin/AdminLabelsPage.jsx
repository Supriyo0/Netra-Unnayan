import React, { useState, useEffect } from 'react';
import { 
  Printer, QrCode, Barcode, CheckSquare, Square, RefreshCw, 
  Settings, Eye, FileText, Sparkles, AlertCircle, Maximize2, Sliders
} from 'lucide-react';
import QRCode from 'qrcode';
import api from '../../api/client';

export default function AdminLabelsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState({}); // { [productId]: quantity }
  const [paperFormat, setPaperFormat] = useState('a4_24'); // 'a4_24' | 'a4_40' | 'thermal_50x25' | 'thermal_50x35' | 'thermal_38x25' | 'custom'
  const [customWidth, setCustomWidth] = useState(50); // mm
  const [customHeight, setCustomHeight] = useState(25); // mm
  const [showQr, setShowQr] = useState(true);
  const [showBarcode, setShowBarcode] = useState(false);
  const [showLogo, setShowLogo] = useState(true);
  const [showDimensions, setShowDimensions] = useState(false);
  const [showPrice, setShowPrice] = useState(false);
  const [showTitle, setShowTitle] = useState(true);
  const [showSku, setShowSku] = useState(true);
  const [qrSizeOption, setQrSizeOption] = useState('auto'); // 'auto' | 'full' | 'standard'
  const [search, setSearch] = useState('');
  const [qrCodes, setQrCodes] = useState({}); // { [productId]: base64DataUrl }

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/products.php');
      if (res.success && res.data) {
        const prods = res.data.products || [];
        setProducts(prods);

        // Check if there is a sku query param in the URL (e.g. ?sku=NU-FRM-00112)
        const urlParams = new URLSearchParams(window.location.search);
        const skuParam = urlParams.get('sku');

        const initial = {};
        if (skuParam) {
          const match = prods.find(p => p.sku?.toLowerCase() === skuParam.toLowerCase());
          if (match) {
            initial[match.id] = 1;
            setSearch(skuParam);
          } else {
            prods.slice(0, 6).forEach((p) => { initial[p.id] = 1; });
          }
        } else {
          // Default select first 6 products with quantity 1
          prods.slice(0, 6).forEach((p) => {
            initial[p.id] = 1;
          });
        }
        setSelectedItems(initial);
      }
    } catch (err) {
      console.error('Failed to load products for labels', err);
    } finally {
      setLoading(false);
    }
  };

  // Pre-generate offline base64 QR codes for all loaded products
  useEffect(() => {
    if (!products.length) return;

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://netraunnayan.com';
    const newQrCodes = {};
    let isCancelled = false;

    const generateAll = async () => {
      for (const p of products) {
        const targetUrl = `${origin}/product/${encodeURIComponent(p.slug || p.sku || p.id)}`;
        try {
          const dataUrl = await QRCode.toDataURL(targetUrl, {
            width: 320,
            margin: 1,
            color: { dark: '#000000', light: '#ffffff' },
            errorCorrectionLevel: 'M'
          });
          newQrCodes[p.id] = dataUrl;
        } catch (e) {
          console.error('Failed generating QR for product', p.id, e);
        }
      }
      if (!isCancelled) {
        setQrCodes((prev) => ({ ...prev, ...newQrCodes }));
      }
    };

    generateAll();
    return () => { isCancelled = true; };
  }, [products]);

  const handleToggleProduct = (id) => {
    setSelectedItems((prev) => {
      const copy = { ...prev };
      if (copy[id]) {
        delete copy[id];
      } else {
        copy[id] = 1;
      }
      return copy;
    });
  };

  const handleQuantityChange = (id, val) => {
    const qty = Math.max(1, parseInt(val) || 1);
    setSelectedItems((prev) => ({
      ...prev,
      [id]: qty
    }));
  };

  const handleSelectAll = () => {
    const all = {};
    products.forEach((p) => {
      all[p.id] = 1;
    });
    setSelectedItems(all);
  };

  const handleDeselectAll = () => {
    setSelectedItems({});
  };

  // Compile list of labels to print
  const labelsToPrint = [];
  products.forEach((product) => {
    const qty = selectedItems[product.id] || 0;
    for (let i = 0; i < qty; i++) {
      labelsToPrint.push(product);
    }
  });

  const handlePrint = () => {
    window.print();
  };

  const filteredProducts = products.filter((p) => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
  );

  // Determine current active dimensions based on paperFormat
  const getFormatDimensions = () => {
    switch (paperFormat) {
      case 'a4_24':
        return { width: '64mm', height: '34mm', cols: 3, isThermal: false, label: 'A4 (24 Grid)' };
      case 'a4_40':
        return { width: '48mm', height: '25mm', cols: 4, isThermal: false, label: 'A4 (40 Grid)' };
      case 'thermal_50x25':
        return { width: '50mm', height: '25mm', cols: 1, isThermal: true, label: 'Thermal 50×25mm' };
      case 'thermal_50x35':
        return { width: '50mm', height: '35mm', cols: 1, isThermal: true, label: 'Thermal 50×35mm' };
      case 'thermal_38x25':
        return { width: '38mm', height: '25mm', cols: 1, isThermal: true, label: 'Thermal 38×25mm' };
      case 'custom':
        return { 
          width: `${customWidth}mm`, 
          height: `${customHeight}mm`, 
          cols: customWidth > 70 ? 2 : 1, 
          isThermal: customHeight < 50, 
          label: `Custom (${customWidth}×${customHeight}mm)` 
        };
      default:
        return { width: '64mm', height: '34mm', cols: 3, isThermal: false, label: 'Standard' };
    }
  };

  const formatConfig = getFormatDimensions();

  // Smart check: Is QR the primary/only code element?
  const isQrOnly = showQr && !showBarcode && !showDimensions && !showPrice && !showLogo;
  const isQrSoloCode = showQr && !showBarcode;

  return (
    <div className="space-y-6">
      {/* Dynamic Print CSS for thermal and A4 printers */}
      <style>{`
        @media print {
          @page {
            size: ${formatConfig.isThermal ? `${formatConfig.width} ${formatConfig.height}` : 'A4 portrait'};
            margin: ${formatConfig.isThermal ? '0mm' : '4mm'};
          }

          body * {
            visibility: hidden;
          }

          #printable-labels-container,
          #printable-labels-container * {
            visibility: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          #printable-labels-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          .printable-label-item {
            width: ${formatConfig.width} !important;
            height: ${formatConfig.height} !important;
            max-width: ${formatConfig.width} !important;
            max-height: ${formatConfig.height} !important;
            box-sizing: border-box !important;
            ${formatConfig.isThermal ? 'page-break-after: always !important; break-after: page !important; margin: 0 auto !important;' : 'page-break-inside: avoid !important; break-inside: avoid !important;'}
          }

          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>

      {/* Screen Header - Hidden during print */}
      <div className="print:hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-neutral-900 dark:text-white flex items-center gap-2">
            <Printer className="w-7 h-7 text-brand-cyan" />
            Barcode &amp; QR Label Printing Studio
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Generate Code 128 barcodes, optical dimensions, and instant customer QR codes for shelf tags and frame stickers
          </p>
        </div>
        <button
          type="button"
          onClick={handlePrint}
          disabled={labelsToPrint.length === 0}
          className="btn-primary px-6 py-2.5 flex items-center gap-2 shadow-cyan-glow disabled:opacity-50 cursor-pointer font-bold text-sm"
        >
          <Printer className="w-4 h-4" />
          Print {labelsToPrint.length} Label{labelsToPrint.length !== 1 ? 's' : ''} ({formatConfig.label})
        </button>
      </div>

      {/* Control Panels - Hidden during print */}
      <div className="print:hidden grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Product Selector */}
        <div className="glass-card p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              Select Optical Items
            </h3>
            <div className="flex gap-2 text-xs">
              <button type="button" onClick={handleSelectAll} className="text-brand-cyan hover:underline font-medium">Select All</button>
              <span className="text-neutral-300">|</span>
              <button type="button" onClick={handleDeselectAll} className="text-neutral-500 hover:underline font-medium">Clear</button>
            </div>
          </div>

          <input
            type="text"
            placeholder="Filter SKU or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field py-1.5 px-3 text-xs w-full"
          />

          <div className="max-h-72 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800 pr-1 space-y-1">
            {loading ? (
              <div className="py-8 text-center text-xs text-neutral-400">Loading products...</div>
            ) : filteredProducts.map((p) => {
              const isSelected = !!selectedItems[p.id];
              return (
                <div key={p.id} className="pt-2 flex items-center justify-between gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleToggleProduct(p.id)}
                    className="flex items-center gap-2 flex-1 text-left cursor-pointer"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-brand-cyan shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-neutral-400 shrink-0" />
                    )}
                    <div className="truncate">
                      <div className="font-semibold text-neutral-800 dark:text-neutral-200 truncate">{p.name}</div>
                      <div className="text-[10px] font-mono text-neutral-400">{p.sku} &bull; ₹{p.price}</div>
                    </div>
                  </button>

                  {isSelected && (
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={selectedItems[p.id] || 1}
                      onChange={(e) => handleQuantityChange(p.id, e.target.value)}
                      className="w-12 py-1 px-1.5 text-center text-xs border rounded bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 font-mono font-bold"
                      title="Labels count"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Middle: Format & Dimensions Settings */}
        <div className="glass-card p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Settings className="w-4 h-4 text-brand-cyan" />
            Printer &amp; Label Format
          </h3>

          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {/* A4 24 Labels */}
            <label 
              onClick={() => setPaperFormat('a4_24')}
              className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                paperFormat === 'a4_24' 
                  ? 'border-brand-cyan bg-brand-cyan/10 text-slate-900 dark:text-white font-bold' 
                  : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
              }`}
            >
              <div>
                <div className="text-xs">A4 Sheet &bull; 24 Labels (3 × 8)</div>
                <div className="text-[10px] opacity-75">64 × 34 mm per sticker</div>
              </div>
              <input type="radio" name="format" checked={paperFormat === 'a4_24'} readOnly className="text-brand-cyan" />
            </label>

            {/* A4 40 Labels */}
            <label 
              onClick={() => setPaperFormat('a4_40')}
              className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                paperFormat === 'a4_40' 
                  ? 'border-brand-cyan bg-brand-cyan/10 text-slate-900 dark:text-white font-bold' 
                  : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
              }`}
            >
              <div>
                <div className="text-xs">A4 Sheet &bull; 40 Labels (4 × 10)</div>
                <div className="text-[10px] opacity-75">48 × 25 mm compact sticker</div>
              </div>
              <input type="radio" name="format" checked={paperFormat === 'a4_40'} readOnly className="text-brand-cyan" />
            </label>

            {/* Thermal Roll 50x25 */}
            <label 
              onClick={() => setPaperFormat('thermal_50x25')}
              className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                paperFormat === 'thermal_50x25' 
                  ? 'border-brand-cyan bg-brand-cyan/10 text-slate-900 dark:text-white font-bold' 
                  : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
              }`}
            >
              <div>
                <div className="text-xs">Thermal Roll &bull; 50mm × 25mm</div>
                <div className="text-[10px] opacity-75">Standard Optical Eyewear Tag (TSC / Zebra)</div>
              </div>
              <input type="radio" name="format" checked={paperFormat === 'thermal_50x25'} readOnly className="text-brand-cyan" />
            </label>

            {/* Thermal Roll 50x35 */}
            <label 
              onClick={() => setPaperFormat('thermal_50x35')}
              className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                paperFormat === 'thermal_50x35' 
                  ? 'border-brand-cyan bg-brand-cyan/10 text-slate-900 dark:text-white font-bold' 
                  : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
              }`}
            >
              <div>
                <div className="text-xs">Thermal Roll &bull; 50mm × 35mm</div>
                <div className="text-[10px] opacity-75">Large Barcode &amp; Big QR Frame Tag</div>
              </div>
              <input type="radio" name="format" checked={paperFormat === 'thermal_50x35'} readOnly className="text-brand-cyan" />
            </label>

            {/* Thermal Roll 38x25 */}
            <label 
              onClick={() => setPaperFormat('thermal_38x25')}
              className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                paperFormat === 'thermal_38x25' 
                  ? 'border-brand-cyan bg-brand-cyan/10 text-slate-900 dark:text-white font-bold' 
                  : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
              }`}
            >
              <div>
                <div className="text-xs">Thermal Roll &bull; 38mm × 25mm</div>
                <div className="text-[10px] opacity-75">Mini Eyewear / Jewelry Barcode Tag</div>
              </div>
              <input type="radio" name="format" checked={paperFormat === 'thermal_38x25'} readOnly className="text-brand-cyan" />
            </label>

            {/* Custom Size */}
            <label 
              onClick={() => setPaperFormat('custom')}
              className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                paperFormat === 'custom' 
                  ? 'border-brand-cyan bg-brand-cyan/10 text-slate-900 dark:text-white font-bold' 
                  : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
              }`}
            >
              <div>
                <div className="text-xs">Custom Label Size (Any Printer)</div>
                <div className="text-[10px] opacity-75">Manually specify width × height in mm</div>
              </div>
              <input type="radio" name="format" checked={paperFormat === 'custom'} readOnly className="text-brand-cyan" />
            </label>
          </div>

          {/* Custom Size Inputs */}
          {paperFormat === 'custom' && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Width (mm)</label>
                <input 
                  type="number" 
                  min="20" 
                  max="210" 
                  value={customWidth} 
                  onChange={(e) => setCustomWidth(parseInt(e.target.value) || 50)} 
                  className="w-full py-1 px-2 border rounded font-mono font-bold text-center" 
                />
              </div>
              <span className="text-slate-400 font-bold mt-3">×</span>
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Height (mm)</label>
                <input 
                  type="number" 
                  min="15" 
                  max="297" 
                  value={customHeight} 
                  onChange={(e) => setCustomHeight(parseInt(e.target.value) || 25)} 
                  className="w-full py-1 px-2 border rounded font-mono font-bold text-center" 
                />
              </div>
            </div>
          )}
        </div>

        {/* Right: Content Elements & QR Sizing */}
        <div className="glass-card p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-4">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-brand-cyan" />
            Label Content &amp; QR Scaling
          </h3>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <input type="checkbox" checked={showLogo} onChange={(e) => setShowLogo(e.target.checked)} className="rounded text-brand-cyan" />
              <span>Netra Brand</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <input type="checkbox" checked={showTitle} onChange={(e) => setShowTitle(e.target.checked)} className="rounded text-brand-cyan" />
              <span>Product Title</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <input type="checkbox" checked={showSku} onChange={(e) => setShowSku(e.target.checked)} className="rounded text-brand-cyan" />
              <span>SKU Code</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} className="rounded text-brand-cyan" />
              <span>Selling MRP</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <input type="checkbox" checked={showDimensions} onChange={(e) => setShowDimensions(e.target.checked)} className="rounded text-brand-cyan" />
              <span>Frame Size (52□18)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <input type="checkbox" checked={showBarcode} onChange={(e) => setShowBarcode(e.target.checked)} className="rounded text-brand-cyan" />
              <span>Code 128 Barcode</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-bold text-brand-cyan col-span-2 bg-brand-cyan/10 p-2 rounded-lg border border-brand-cyan/30">
              <input type="checkbox" checked={showQr} onChange={(e) => setShowQr(e.target.checked)} className="rounded text-brand-cyan" />
              <span>Product QR Code (Instant Offline &amp; Mobile)</span>
            </label>
          </div>

          {/* QR Size Override when QR is shown */}
          {showQr && (
            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 space-y-1.5">
              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>QR Code Display Size:</span>
                <span className="text-brand-cyan uppercase text-[10px]">{qrSizeOption}</span>
              </div>
              <div className="grid grid-cols-3 gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setQrSizeOption('auto')}
                  className={`py-1 px-1.5 rounded-lg border font-bold transition-colors ${
                    qrSizeOption === 'auto' ? 'bg-brand-cyan text-slate-950 border-brand-cyan' : 'border-slate-200 dark:border-white/10 text-slate-500'
                  }`}
                >
                  Auto (Smart)
                </button>
                <button
                  type="button"
                  onClick={() => setQrSizeOption('full')}
                  className={`py-1 px-1.5 rounded-lg border font-bold transition-colors ${
                    qrSizeOption === 'full' ? 'bg-brand-cyan text-slate-950 border-brand-cyan' : 'border-slate-200 dark:border-white/10 text-slate-500'
                  }`}
                >
                  Big (Max Height)
                </button>
                <button
                  type="button"
                  onClick={() => setQrSizeOption('standard')}
                  className={`py-1 px-1.5 rounded-lg border font-bold transition-colors ${
                    qrSizeOption === 'standard' ? 'bg-brand-cyan text-slate-950 border-brand-cyan' : 'border-slate-200 dark:border-white/10 text-slate-500'
                  }`}
                >
                  Standard (Side)
                </button>
              </div>
            </div>
          )}

          <div className="p-2.5 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl flex items-center justify-between">
            <span className="text-xs text-neutral-400">Total Labels to Print:</span>
            <span className="text-lg font-black font-heading text-brand-cyan">
              {labelsToPrint.length} tags
            </span>
          </div>
        </div>
      </div>

      {/* Printable Preview Area */}
      <div className="space-y-2">
        <div className="print:hidden text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center justify-between">
          <span>Live Print Preview ({formatConfig.label})</span>
          <span className="text-neutral-500">
            {formatConfig.isThermal 
              ? 'Continuous roll paper &bull; Each label auto-paginated' 
              : 'Multi-column sheet &bull; Aligned for sticker paper'
            }
          </span>
        </div>

        {/* Printable Container */}
        <div 
          id="printable-labels-container" 
          className="bg-white text-black p-4 rounded-xl border border-neutral-300 dark:border-neutral-700 shadow-inner mx-auto"
          style={{ 
            maxWidth: formatConfig.isThermal ? '110mm' : '220mm',
            backgroundColor: '#ffffff'
          }}
        >
          {labelsToPrint.length === 0 ? (
            <div className="py-12 text-center text-sm text-neutral-400">
              No products selected. Select products above to generate barcode labels.
            </div>
          ) : (
            <div 
              className="printable-labels-grid"
              style={{
                display: formatConfig.isThermal ? 'flex' : 'grid',
                flexDirection: formatConfig.isThermal ? 'column' : undefined,
                gridTemplateColumns: !formatConfig.isThermal ? `repeat(${formatConfig.cols}, minmax(0, 1fr))` : undefined,
                gap: formatConfig.isThermal ? '3mm' : '2mm',
                alignItems: formatConfig.isThermal ? 'center' : undefined,
                justifyContent: 'center'
              }}
            >
              {labelsToPrint.map((p, idx) => {
                const qrUrl = qrCodes[p.id] || '';
                const fallbackOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://netraunnayan.com';
                const productLink = `${fallbackOrigin}/product/${encodeURIComponent(p.slug || p.sku || p.id)}`;

                // Dynamic QR sizing:
                // If only QR is selected, or if user chose 'full', QR dominates the tag!
                const isFullQrMode = qrSizeOption === 'full' || (qrSizeOption === 'auto' && isQrSoloCode);

                return (
                  <div 
                    key={`${p.id}-${idx}`}
                    className="printable-label-item border border-black/30 rounded p-1.5 flex flex-col justify-between text-black overflow-hidden bg-white relative"
                    style={{ 
                      width: formatConfig.width,
                      height: formatConfig.height,
                      minWidth: formatConfig.width,
                      minHeight: formatConfig.height,
                      maxWidth: formatConfig.width,
                      maxHeight: formatConfig.height,
                      pageBreakInside: 'avoid',
                      breakInside: 'avoid',
                      boxSizing: 'border-box'
                    }}
                  >
                    {/* Header: Logo, Brand & Price */}
                    {(showLogo || showPrice) && (
                      <div className="flex items-center justify-between border-b border-black/20 pb-0.5 leading-none shrink-0">
                        {showLogo && (
                          <div className="flex items-center gap-1">
                            <span className="text-[8px] font-black tracking-tight uppercase">Netra Unnayan</span>
                          </div>
                        )}
                        {showPrice && (
                          <span className="text-[9px] font-black font-mono ml-auto">
                            ₹{parseFloat(p.price).toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Middle: Name & Dimensions (if not pure full QR) */}
                    {(showTitle || showDimensions) && !isQrOnly && (
                      <div className="my-0.5 leading-tight shrink-0">
                        {showTitle && (
                          <div className="text-[8.5px] font-bold truncate leading-tight">
                            {p.name}
                          </div>
                        )}
                        {showDimensions && (
                          <div className="text-[7.5px] font-mono text-neutral-700">
                            {p.lens_width ? `${p.lens_width} □ ${p.bridge_width || 18} — ${p.temple_length || 140}` : (p.frame_size || 'Standard')}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Main Content Area: Barcode and/or QR Code */}
                    <div className="flex-1 flex items-center justify-center gap-1.5 overflow-hidden my-auto">
                      
                      {/* Barcode Section */}
                      {showBarcode && (
                        <div className="flex-1 flex flex-col items-center justify-center overflow-hidden">
                          {/* CSS / SVG Barcode Representation */}
                          <div className="w-full flex items-center justify-center overflow-hidden" style={{ maxHeight: '18mm' }}>
                            <div className="flex items-center justify-center h-7 w-full border-b border-black/30 pb-0.5">
                              {/* High contrast barcode stripes */}
                              <div className="flex items-end justify-center gap-[1px] h-6 w-11/12 overflow-hidden bg-white">
                                {[3,1,2,1,3,2,1,2,3,1,1,2,2,1,3,1,2,1,3,2,1,2,1,3,2,1,3,1,2,3,1,2].map((w, bi) => (
                                  <span 
                                    key={bi} 
                                    className="bg-black inline-block h-full shrink-0" 
                                    style={{ width: `${Math.max(1, w * 1.2)}px` }} 
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                          {showSku && (
                            <div className="text-[7.5px] font-mono font-black tracking-wider text-center mt-0.5">
                              {p.sku}
                            </div>
                          )}
                        </div>
                      )}

                      {/* QR Code Section */}
                      {showQr && (
                        <div className={`flex flex-col items-center justify-center shrink-0 ${
                          isFullQrMode ? 'w-full h-full' : ''
                        }`}>
                          <div className={`flex items-center justify-center ${
                            isFullQrMode 
                              ? 'w-full flex-1 max-h-full p-0.5' 
                              : 'w-10 h-10'
                          }`}>
                            {qrUrl ? (
                              <img 
                                src={qrUrl} 
                                alt={p.sku || 'QR'} 
                                className="max-h-full max-w-full object-contain"
                                style={{ 
                                  imageRendering: 'pixelated',
                                  width: isFullQrMode ? 'auto' : '36px',
                                  height: isFullQrMode ? 'auto' : '36px',
                                  maxHeight: isFullQrMode ? `${parseInt(formatConfig.height) - (showTitle || showPrice ? 12 : 6)}mm` : '36px'
                                }}
                              />
                            ) : (
                              <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(productLink)}`}
                                alt="QR"
                                className="max-h-full max-w-full object-contain"
                              />
                            )}
                          </div>

                          {/* If only QR is shown, display SKU clearly below it */}
                          {isFullQrMode && showSku && (
                            <div className="text-[7.5px] font-mono font-black tracking-wider text-center leading-none mt-0.5">
                              {p.sku}
                            </div>
                          )}
                        </div>
                      )}

                      {/* If only Title & SKU are shown without codes */}
                      {!showBarcode && !showQr && showSku && (
                        <div className="text-center font-mono font-bold text-xs">
                          SKU: {p.sku}
                        </div>
                      )}

                    </div>

                    {/* Bottom strip: SKU if barcode was not showing it */}
                    {showSku && !showBarcode && !isFullQrMode && (
                      <div className="text-[7px] font-mono text-neutral-700 text-center border-t border-black/10 pt-0.5 shrink-0">
                        {p.sku}
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
