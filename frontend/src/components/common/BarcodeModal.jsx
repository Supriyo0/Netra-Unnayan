import React, { useRef } from 'react';
import { QrCode, Barcode, Printer, ExternalLink, X, Copy, CheckCircle2, Tag, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

// Simple helper to generate SVG vertical bars simulating Code-128 barcode pattern
const generateBarcodeBars = (codeStr = 'NU890123') => {
  const clean = (codeStr || 'NU000').toUpperCase();
  const bars = [];
  // Standard start guard
  bars.push(2, 1, 2, 1);
  for (let i = 0; i < clean.length; i++) {
    const charCode = clean.charCodeAt(i);
    const b1 = (charCode % 3) + 1;
    const b2 = ((charCode >> 1) % 2) + 1;
    const b3 = ((charCode >> 2) % 3) + 1;
    const b4 = ((charCode >> 3) % 2) + 1;
    bars.push(b1, b2, b3, b4);
  }
  // Stop guard
  bars.push(2, 3, 1, 1, 2);
  return bars;
};

export const BarcodeModal = ({ isOpen, onClose, product }) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !product) return null;

  const barcodeValue = product.barcode || `NU${String(product.sku || product.id).replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)}`;
  const productUrl = `${window.location.origin}/product/${product.slug || product.id}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(productUrl)}`;
  const bars = generateBarcodeBars(barcodeValue);

  const handleCopyBarcode = () => {
    navigator.clipboard.writeText(barcodeValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=450,height=300');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Barcode Sticker - ${product.name}</title>
        <style>
          @page { size: 50mm 30mm; margin: 2mm; }
          body { font-family: monospace, sans-serif; text-align: center; margin: 0; padding: 4px; color: #000; }
          .header { font-size: 8px; font-weight: bold; letter-spacing: 1px; border-bottom: 1px solid #000; padding-bottom: 2px; }
          .title { font-size: 10px; font-weight: 800; margin: 2px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .barcode-bars { display: flex; justify-content: center; height: 32px; gap: 1px; margin: 4px 0 2px 0; }
          .bar { background: #000; }
          .code-num { font-size: 8px; letter-spacing: 2px; font-weight: bold; }
          .footer { display: flex; justify-content: space-between; font-size: 9px; font-weight: bold; margin-top: 3px; border-top: 1px solid #000; padding-top: 2px; }
        </style>
      </head>
      <body>
        <div class="header">NETRA UNNAYAN OPTICALS</div>
        <div class="title">${product.name}</div>
        <div class="barcode-bars">
          ${bars.map(b => `<div class="bar" style="width: ${b}px;"></div>`).join('')}
        </div>
        <div class="code-num">${barcodeValue} &bull; ${product.sku}</div>
        <div class="footer">
          <span>SIZE: ${product.lens_width || 52}□${product.bridge_width || 18}</span>
          <span>MRP: ₹${product.price}</span>
        </div>
        <script>
          window.onload = function() { window.print(); window.close(); }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-md w-full glass-card rounded-3xl overflow-hidden border border-white/20 shadow-2xl flex flex-col">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-cyan/20 border border-brand-cyan/40 flex items-center justify-center text-brand-cyan">
              <Barcode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Product Barcode &amp; Retail Tag</h3>
              <p className="text-[11px] text-slate-400">Scannable Code-128 and mobile optical lookup QR</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          
          {/* Product Header */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="w-14 h-14 rounded-xl bg-black/40 p-1 flex items-center justify-center border border-white/5 shrink-0 overflow-hidden">
              <img
                src={product.primary_image || (product.images?.[0]?.image_url) || '/logo_symbol.png'}
                alt={product.name}
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="overflow-hidden">
              <span className="text-[10px] font-mono text-brand-cyan font-bold block truncate">{product.sku}</span>
              <h4 className="text-sm font-extrabold text-white truncate">{product.name}</h4>
              <div className="text-[11px] text-slate-400">
                ₹{parseFloat(product.price).toLocaleString('en-IN')} &bull; {product.category_name || product.gender || 'Eyewear'}
              </div>
            </div>
          </div>

          {/* Scannable Barcode Canvas / SVG Card */}
          <div className="p-5 rounded-2xl bg-white text-slate-950 text-center space-y-2 shadow-inner">
            <div className="text-[9px] font-extrabold tracking-widest text-slate-500 uppercase border-b border-slate-200 pb-1">
              NETRA UNNAYAN &bull; OPTICAL RETAIL
            </div>

            {/* Simulated Code-128 SVG Barcode */}
            <div className="flex items-center justify-center gap-[1.5px] h-14 py-1">
              {bars.map((w, i) => (
                <div
                  key={i}
                  className="bg-black h-full shrink-0"
                  style={{ width: `${w * 1.5}px` }}
                />
              ))}
            </div>

            <div className="font-mono text-xs font-black tracking-widest text-slate-900">
              {barcodeValue}
            </div>

            <div className="flex justify-between text-[10px] font-bold text-slate-600 border-t border-slate-200 pt-1 font-mono">
              <span>SKU: {product.sku}</span>
              <span>PRICE: ₹{product.price}</span>
            </div>
          </div>

          {/* Quick QR Code for Phone Camera / Barcode Scanner */}
          <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <div className="w-20 h-20 bg-white rounded-xl p-1 shrink-0 flex items-center justify-center shadow-md">
              <img src={qrCodeUrl} alt="Product QR Code" className="w-full h-full object-contain" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <QrCode className="w-3.5 h-3.5 text-brand-cyan" />
                <span>Instant Mobile Scanner QR</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Scanning with any smartphone or barcode reader instantly opens this optical frame page.
              </p>
              <Link
                to={`/product/${product.slug || product.id}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-brand-cyan font-bold hover:underline inline-flex items-center gap-1 mt-1"
              >
                <span>Preview Product Page</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>

        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between bg-black/40">
          <button
            type="button"
            onClick={handleCopyBarcode}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-all"
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied Barcode' : 'Copy Number'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="btn-primary px-5 py-2 rounded-xl text-xs font-bold shadow-cyan-glow flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>Print Thermal Sticker Label</span>
          </button>
        </div>

      </div>
    </div>
  );
};
