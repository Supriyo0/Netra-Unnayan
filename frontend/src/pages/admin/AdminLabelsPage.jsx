import React, { useState, useEffect } from 'react';
import { 
  Printer, QrCode, Barcode, CheckSquare, Square, RefreshCw, 
  Settings, Eye, FileText, Sparkles, AlertCircle 
} from 'lucide-react';
import api from '../../api/client';

export default function AdminLabelsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState({}); // { [productId]: quantity }
  const [paperFormat, setPaperFormat] = useState('a4_24'); // 'a4_24' | 'thermal_roll'
  const [showQr, setShowQr] = useState(true);
  const [showBarcode, setShowBarcode] = useState(true);
  const [showLogo, setShowLogo] = useState(true);
  const [showDimensions, setShowDimensions] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [search, setSearch] = useState('');

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
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Screen Header - Hidden during print */}
      <div className="print:hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-neutral-900 dark:text-white flex items-center gap-2">
            <Printer className="w-7 h-7 text-primary-600" />
            Barcode & QR Label Printing Studio
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Generate Code 128 barcodes, optical dimensions, and instant customer QR codes for shelf tags and frames
          </p>
        </div>
        <button
          onClick={handlePrint}
          disabled={labelsToPrint.length === 0}
          className="btn-primary px-6 py-2.5 flex items-center gap-2 shadow-lg disabled:opacity-50"
        >
          <Printer className="w-4 h-4" />
          Print {labelsToPrint.length} Labels
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
              <button onClick={handleSelectAll} className="text-primary-600 hover:underline">Select All</button>
              <span className="text-neutral-300">|</span>
              <button onClick={handleDeselectAll} className="text-neutral-500 hover:underline">Clear</button>
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
                    onClick={() => handleToggleProduct(p.id)}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-primary-600 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-neutral-400 shrink-0" />
                    )}
                    <div className="truncate">
                      <div className="font-semibold text-neutral-800 dark:text-neutral-200 truncate">{p.name}</div>
                      <div className="text-[10px] font-mono text-neutral-400">{p.sku} • ₹{p.price}</div>
                    </div>
                  </button>

                  {isSelected && (
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={selectedItems[p.id] || 1}
                      onChange={(e) => handleQuantityChange(p.id, e.target.value)}
                      className="w-12 py-1 px-1.5 text-center text-xs border rounded bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 font-mono"
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
            <Settings className="w-4 h-4 text-primary-600" />
            Paper & Thermal Format
          </h3>

          <div className="space-y-2">
            <label 
              onClick={() => setPaperFormat('a4_24')}
              className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                paperFormat === 'a4_24' 
                  ? 'border-primary-600 bg-primary-50/50 dark:bg-primary-950/20 text-primary-900 dark:text-white' 
                  : 'border-neutral-200 dark:border-neutral-800 text-neutral-600'
              }`}
            >
              <div>
                <div className="font-semibold text-xs">A4 Sheet — 24 Labels Grid</div>
                <div className="text-[11px] text-neutral-500">3 columns × 8 rows (64 × 34 mm per sticker)</div>
              </div>
              <input type="radio" name="format" checked={paperFormat === 'a4_24'} readOnly className="text-primary-600" />
            </label>

            <label 
              onClick={() => setPaperFormat('thermal_roll')}
              className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                paperFormat === 'thermal_roll' 
                  ? 'border-primary-600 bg-primary-50/50 dark:bg-primary-950/20 text-primary-900 dark:text-white' 
                  : 'border-neutral-200 dark:border-neutral-800 text-neutral-600'
              }`}
            >
              <div>
                <div className="font-semibold text-xs">Continuous Thermal Roll (Optical)</div>
                <div className="text-[11px] text-neutral-500">50mm × 25mm barcode roll for TSC / Zebra</div>
              </div>
              <input type="radio" name="format" checked={paperFormat === 'thermal_roll'} readOnly className="text-primary-600" />
            </label>
          </div>

          <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
            <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Label Content Elements</div>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showLogo} onChange={(e) => setShowLogo(e.target.checked)} className="rounded text-primary-600" />
                <span>Netra Logo</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showBarcode} onChange={(e) => setShowBarcode(e.target.checked)} className="rounded text-primary-600" />
                <span>Code 128 Barcode</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showQr} onChange={(e) => setShowQr(e.target.checked)} className="rounded text-primary-600" />
                <span>Product QR Code</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showDimensions} onChange={(e) => setShowDimensions(e.target.checked)} className="rounded text-primary-600" />
                <span>Frame Size (52□18)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} className="rounded text-primary-600" />
                <span>Selling MRP</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right: Print instructions & Summary */}
        <div className="glass-card p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary-600" />
              Optical Tagging Standards
            </h3>
            <ul className="text-xs text-neutral-500 space-y-2 mt-3 list-disc pl-4 leading-relaxed">
              <li>Laser/inkjet printers: Select <strong>A4 Sheet</strong>, set Margins to <strong>None</strong> in print preview dialog.</li>
              <li>Thermal optical printers: Select <strong>Continuous Thermal Roll</strong> with 100% scale.</li>
              <li>Customers can scan the QR code with their mobile phone to view full specifications, frame dimensions, and try on virtually.</li>
            </ul>
          </div>

          <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl">
            <div className="text-xs text-neutral-400">Total Labels Ready</div>
            <div className="text-2xl font-bold font-heading text-neutral-900 dark:text-white">
              {labelsToPrint.length} tags
            </div>
          </div>
        </div>
      </div>

      {/* Printable Preview Area */}
      <div className="space-y-2">
        <div className="print:hidden text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center justify-between">
          <span>Live Print Preview ({paperFormat === 'a4_24' ? 'A4 24-Grid' : 'Thermal Roll'})</span>
          <span className="text-neutral-500">Only the labels below will be sent to the physical printer</span>
        </div>

        {/* Printable Container */}
        <div className={`bg-white text-black p-4 rounded-xl border border-neutral-300 dark:border-neutral-700 shadow-inner ${
          paperFormat === 'a4_24' ? 'max-w-[210mm] mx-auto' : 'max-w-[80mm] mx-auto'
        }`}>
          {labelsToPrint.length === 0 ? (
            <div className="py-12 text-center text-sm text-neutral-400">
              No products selected. Select products above to generate barcode labels.
            </div>
          ) : paperFormat === 'a4_24' ? (
            /* A4 3x8 Grid */
            <div className="grid grid-cols-3 gap-2 p-1">
              {labelsToPrint.map((p, idx) => (
                <div 
                  key={`${p.id}-${idx}`}
                  className="border border-neutral-300 rounded p-2 flex flex-col justify-between h-[36mm] text-black overflow-hidden bg-white"
                  style={{ pageBreakInside: 'avoid' }}
                >
                  {/* Top Bar: Brand & Price */}
                  <div className="flex items-center justify-between border-b border-neutral-200 pb-1">
                    <div className="flex items-center gap-1">
                      {showLogo && (
                        <img 
                          src="/public_assets/logo_symbol.png" 
                          alt="Netra" 
                          className="w-3.5 h-3.5 object-contain" 
                        />
                      )}
                      <span className="text-[9px] font-bold tracking-tight uppercase">Netra Unnayan</span>
                    </div>
                    {showPrice && (
                      <span className="text-[10px] font-bold font-mono">
                        ₹{parseFloat(p.price).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>

                  {/* Middle: Product Name & Dimensions */}
                  <div className="my-0.5">
                    <div className="text-[9px] font-semibold leading-tight line-clamp-1">
                      {p.name}
                    </div>
                    {showDimensions && (
                      <div className="text-[8px] font-mono text-neutral-600">
                        {p.lens_width ? `${p.lens_width} □ ${p.bridge_width || 18} — ${p.temple_length || 140}` : '52 □ 18 — 140'}
                      </div>
                    )}
                  </div>

                  {/* Bottom: Barcode and/or QR */}
                  <div className="flex items-center justify-between gap-1 pt-1 border-t border-neutral-100">
                    {showBarcode && (
                      <div className="flex-1 flex flex-col items-center">
                        {/* CSS Code 128 / Barcode Simulation */}
                        <div className="h-6 w-full flex items-center justify-center overflow-hidden">
                          <img 
                            src={`http://127.0.0.1:8000/api/admin/labels.php?action=barcode_svg&code=${encodeURIComponent(p.sku)}`} 
                            alt={p.sku} 
                            className="h-6 max-w-full object-contain"
                            onError={(e) => {
                              // Fallback visual barcode
                              e.target.style.display = 'none';
                            }}
                          />
                        </div>
                        <div className="text-[8px] font-mono tracking-wider font-semibold">
                          {p.sku}
                        </div>
                      </div>
                    )}

                    {showQr && (
                      <div className="shrink-0 flex flex-col items-center">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`http://localhost:5173/product/${p.slug || p.id}`)}`} 
                          alt="QR" 
                          className="w-7 h-7 object-contain" 
                        />
                        <span className="text-[6px] text-neutral-500 font-mono">Scan Specs</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Continuous Thermal Roll (50x25mm) */
            <div className="space-y-3">
              {labelsToPrint.map((p, idx) => (
                <div 
                  key={`${p.id}-${idx}`}
                  className="border border-neutral-300 rounded p-1.5 flex flex-col justify-between h-[30mm] text-black overflow-hidden bg-white"
                  style={{ pageBreakInside: 'avoid' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-bold uppercase">Netra Unnayan</span>
                    {showPrice && (
                      <span className="text-[9px] font-bold font-mono">
                        ₹{parseFloat(p.price).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>

                  <div className="text-[8px] font-medium truncate">
                    {p.name}
                  </div>

                  {showDimensions && (
                    <div className="text-[7px] font-mono text-neutral-600">
                      {p.lens_width ? `${p.lens_width} □ ${p.bridge_width || 18} — ${p.temple_length || 140}` : '52 □ 18 — 140'}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-1">
                    {showBarcode && (
                      <div className="flex-1 flex flex-col items-center">
                        <div className="h-5 w-full flex items-center justify-center">
                          <img 
                            src={`http://127.0.0.1:8000/api/admin/labels.php?action=barcode_svg&code=${encodeURIComponent(p.sku)}`} 
                            alt={p.sku} 
                            className="h-5 max-w-full object-contain"
                          />
                        </div>
                        <div className="text-[7px] font-mono font-bold">{p.sku}</div>
                      </div>
                    )}
                    {showQr && (
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`http://localhost:5173/product/${p.slug || p.id}`)}`} 
                        alt="QR" 
                        className="w-6 h-6 object-contain" 
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
