import React, { useRef, useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  Printer, X, CheckCircle2, ShieldCheck, Eye, Sparkles, 
  MapPin, Phone, Mail, FileText, Check, QrCode, Facebook, Instagram, Youtube
} from 'lucide-react';

function numberToWords(num) {
  const amount = Math.round(Number(num) || 0);
  if (amount <= 0) return 'Rupees Zero Only';

  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const n = ('000000000' + amount).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return `Rupees ${amount} Only`;
  let str = '';
  str += (Number(n[1]) !== 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
  str += (Number(n[2]) !== 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
  str += (Number(n[3]) !== 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
  str += (Number(n[4]) !== 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
  str += (Number(n[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
  return `Rupees ${str.trim()} Only`;
}

export const InvoiceModal = ({ isOpen, onClose, invoiceData }) => {
  const printRef = useRef(null);
  const [verifyQrDataUrl, setVerifyQrDataUrl] = useState('');
  const [upiQrDataUrl, setUpiQrDataUrl] = useState('');

  if (!isOpen || !invoiceData) return null;

  const {
    invoiceNumber = 'NU/INV/2026/00123',
    orderNumber = 'NU-ORD-00123',
    invoiceDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    type = 'POS', // 'POS' | 'ORDER'
    isGstInvoice = false,
    status = 'Paid & Delivered',
    paymentMode = 'UPI',
    paymentStatus = 'Payment Received',
    customerName = 'Walk-in Customer',
    customerPhone = '+91 98765 43210',
    customerEmail = 'info@netraunnayan.in',
    customerAddress = 'Jatimati, Digha, Purba Medinipur, West Bengal 721428',
    items = [],
    subtotal = 0,
    discountAmount = 0,
    shippingFee = 0,
    taxAmount = 0,
    totalAmount = 0,
    cashier = 'Supriyo Naskar',
    warrantyNote = '1-Year Optical Warranty on Frame & Multi-Coat Optics',
    prescription = null,
    notes = '',
    payment_qr = '',
    payment_qr_image = ''
  } = invoiceData;

  const calculatedSubtotal = Number(subtotal || items.reduce((acc, it) => acc + (Number(it.unit_price || it.price || 0) * (it.quantity || 1)), 0));
  const calculatedDiscount = Number(discountAmount || 0);
  const calculatedShipping = Number(shippingFee || 0);
  const calculatedTotal = Number(totalAmount || Math.max(0, calculatedSubtotal - calculatedDiscount + calculatedShipping));

  // Scannable Online Verification QR
  const invoiceVerifyUrl = `https://netraunnayan.com/track?order=${encodeURIComponent(orderNumber || invoiceNumber)}`;
  const verifyQrFallback = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=2&data=${encodeURIComponent(invoiceVerifyUrl)}`;

  // Payment UPI QR
  const upiPayload = `upi://pay?pa=netraunnayan@okaxis&pn=Netra%20Unnayan&am=${calculatedTotal}&tn=Invoice%20${invoiceNumber}`;
  const upiQrFallback = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=2&data=${encodeURIComponent(upiPayload)}`;

  const adminUploadedQr = payment_qr || payment_qr_image || (typeof window !== 'undefined' ? localStorage.getItem('nu_admin_payment_qr') : '') || '';

  // Generate offline base64 QR codes synchronously/instantly
  useEffect(() => {
    let isMounted = true;
    if (invoiceVerifyUrl) {
      QRCode.toDataURL(invoiceVerifyUrl, {
        width: 140,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      }).then(url => {
        if (isMounted) setVerifyQrDataUrl(url);
      }).catch(err => console.error('Verify QR error:', err));
    }
    if (upiPayload && !adminUploadedQr) {
      QRCode.toDataURL(upiPayload, {
        width: 160,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      }).then(url => {
        if (isMounted) setUpiQrDataUrl(url);
      }).catch(err => console.error('UPI QR error:', err));
    }
    return () => { isMounted = false; };
  }, [invoiceVerifyUrl, upiPayload, adminUploadedQr]);

  const handlePrint = () => {
    window.print();
  };

  const rx = prescription || invoiceData.rx || null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static">
      
      {/* Screen Container */}
      <div 
        id="printable-invoice-container" 
        className="relative w-full max-w-4xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 print:border-none print:shadow-none print:rounded-none print:max-w-none"
      >
        
        {/* Screen Controls Header (Hidden on physical print) */}
        <div className="print:hidden bg-slate-950 text-white px-5 py-3.5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-cyan" />
            <span className="font-extrabold text-sm font-heading tracking-wide">
              {isGstInvoice ? 'Official Tax Invoice' : 'Retail Invoice / Bill of Supply'} &bull; {invoiceNumber}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl bg-brand-cyan hover:bg-cyan-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-cyan-glow transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save A4 PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* =========================================================================
            A4 PRINTABLE INVOICE CANVAS (CALIBRATED FOR EXACT 1-PAGE A4 FIT)
           ========================================================================= */}
        <div 
          ref={printRef}
          className="p-5 sm:p-7 bg-white text-slate-900 font-sans text-[11px] leading-tight selection:bg-cyan-100"
          style={{ width: '100%', boxSizing: 'border-box' }}
        >
          
          {/* 1. TOP HEADER BRANDING & CONTACT */}
          <div className="flex items-start justify-between gap-4 pb-3">
            
            {/* Logo & Category Badges */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <img 
                  src="/logo_full.png" 
                  alt="Netra Unnayan" 
                  className="h-12 object-contain"
                  onError={(e) => { e.currentTarget.src = '/logo_symbol.png'; }}
                />
              </div>

              {/* 6 Category Circular Icons */}
              <div className="flex items-center gap-3 text-slate-700 pt-1">
                {[
                  { name: 'Eyeglasses Frames', icon: '👓' },
                  { name: 'Sunglasses', icon: '🕶️' },
                  { name: 'Computer Glasses', icon: '💻' },
                  { name: 'Prescription Lenses', icon: '🔍' },
                  { name: 'Home Eye Testing', icon: '🏠' },
                  { name: 'Eye Doctor Consultation', icon: '👨‍⚕️' }
                ].map((cat, idx) => (
                  <div key={idx} className="flex flex-col items-center text-center w-12">
                    <div className="w-6 h-6 rounded-full border border-cyan-800 flex items-center justify-center text-[11px] bg-cyan-50/50">
                      {cat.icon}
                    </div>
                    <span className="text-[8px] font-bold text-slate-600 mt-0.5 leading-[10px] line-clamp-2">
                      {cat.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Slogan in Script */}
            <div className="hidden sm:block text-center pt-1">
              <div 
                style={{ fontFamily: "'Dancing Script', 'Caveat', cursive", fontSize: '24px', color: '#0B2847', lineHeight: 1 }}
                className="font-bold italic"
              >
                Better Vision<br />Brighter Tomorrow
              </div>
            </div>

            {/* Store Contact - Clean Right Aligned */}
            <div className="text-right text-[10px] text-slate-700 space-y-0.5">
              <div className="text-[9px] text-slate-500 font-mono">
                www.netraunnayan.in
              </div>
              <div className="pt-1 flex items-center justify-end gap-2">
                <img 
                  src="/logo_symbol.png" 
                  alt="Optical Eyewear" 
                  className="h-6 object-contain opacity-85"
                />
                <span className="text-[8px] font-black uppercase tracking-wider text-slate-500">
                  SEE A CLEARER TOMORROW
                </span>
              </div>
            </div>
          </div>

          {/* 2. DARK NAVY INVOICE TITLE BANNER */}
          <div className="bg-[#0B2847] text-white p-3 rounded-xl flex items-center justify-between gap-4 mt-1">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-wide leading-none text-white">
                {isGstInvoice ? 'TAX INVOICE' : 'RETAIL INVOICE'}
              </h2>
              <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-cyan-300 mt-1">
                EYEWEAR FOR A BRIGHTER LIFE
              </p>
            </div>

            {/* Invoice Meta Table */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] font-medium border-l border-white/20 pl-4">
              <div>Invoice No</div>
              <div className="font-mono font-bold text-cyan-200">: {invoiceNumber}</div>
              <div>Invoice Date</div>
              <div>: {invoiceDate}</div>
              <div>Order Type</div>
              <div>: {type === 'POS' ? 'Offline Sale (Counter)' : 'Online Store Order'}</div>
              <div>Payment Mode</div>
              <div className="font-bold">: {paymentMode}</div>
              <div>Staff / Cashier</div>
              <div>: {cashier || 'Supriyo Naskar'}</div>
            </div>

            {/* Scan to View Invoice QR */}
            <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg text-slate-950 shrink-0 border border-slate-200 shadow-xs">
              <img 
                src={verifyQrDataUrl || verifyQrFallback} 
                alt="Scan to View Invoice" 
                width="56"
                height="56"
                style={{ width: '56px', height: '56px', display: 'block' }}
                className="object-contain shrink-0"
              />
              <div className="text-left leading-tight pr-1">
                <span className="text-[8px] font-black uppercase tracking-wider text-cyan-900 block">
                  Scan to View
                </span>
                <span className="text-[9px] font-extrabold text-slate-900 block">
                  Invoice Online
                </span>
                <span className="text-[7px] text-slate-500 block mt-0.5 font-mono">
                  Official Record
                </span>
              </div>
            </div>
          </div>

          {/* 3. BILL TO & STORE DETAILS */}
          <div className="grid grid-cols-2 gap-3 mt-3">
            
            {/* Bill To */}
            <div className="border border-slate-300 rounded-xl p-2.5 bg-slate-50/70 text-slate-800">
              <div className="flex items-center gap-1.5 text-cyan-900 font-extrabold text-[10px] uppercase tracking-wider border-b border-slate-200 pb-1 mb-1.5">
                <span>👤 Bill To (Customer)</span>
              </div>
              <div className="space-y-0.5 text-[10px]">
                <div className="font-extrabold text-xs text-slate-950">{customerName}</div>
                <div>Phone: <strong className="font-mono text-slate-900">{customerPhone}</strong></div>
                {customerEmail && customerEmail !== '—' && (
                  <div>Email: <span className="text-slate-700">{customerEmail}</span></div>
                )}
                <div className="text-slate-600 line-clamp-2">Address: {customerAddress}</div>
              </div>
            </div>

            {/* Store Details */}
            <div className="border border-slate-300 rounded-xl p-2.5 bg-slate-50/70 text-slate-800">
              <div className="flex items-center gap-1.5 text-cyan-900 font-extrabold text-[10px] uppercase tracking-wider border-b border-slate-200 pb-1 mb-1.5">
                <span>🏢 Store Details</span>
              </div>
              <div className="space-y-0.5 text-[10px]">
                <div className="font-extrabold text-xs text-slate-950">Netra Unnayan Optical Hub</div>
                <div>Digha Bypass Rd, Jatimati, Digha, Purba Medinipur, WB 721428</div>
                <div>Phone: <strong className="font-mono text-slate-900">+91 6294 553 897</strong> &bull; info@netraunnayan.in</div>
                <div>
                  {isGstInvoice ? (
                    <span>GSTIN: <strong className="font-mono text-slate-900">19ABCDE1234F1Z5</strong></span>
                  ) : (
                    <span className="text-[9px] text-slate-500 italic">Retail Bill of Supply (Composite / Non-GST)</span>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* 4. PRODUCTS LINE ITEMS TABLE */}
          <div className="border border-slate-300 rounded-xl overflow-hidden mt-3">
            <table className="w-full text-left text-[10px]">
              <thead className="bg-[#0B2847] text-white font-bold uppercase tracking-wider text-[9px]">
                <tr>
                  <th className="py-2 px-2.5 w-6 text-center">#</th>
                  <th className="py-2 px-2.5">Product</th>
                  <th className="py-2 px-2.5">Details</th>
                  <th className="py-2 px-2.5 text-center font-mono">SKU</th>
                  <th className="py-2 px-2 text-center">Qty</th>
                  <th className="py-2 px-2.5 text-right">Unit Price (₹)</th>
                  <th className="py-2 px-2 text-right">Discount (₹)</th>
                  <th className="py-2 px-2.5 text-right font-bold">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.length > 0 ? (
                  items.map((it, idx) => {
                    const rate = Number(it.unit_price || it.price || 0);
                    const qty = Number(it.quantity || 1);
                    const lineTotal = Number(it.total_price || (rate * qty));
                    const imgUrl = it.image_url || it.primary_image || '/logo_symbol.png';
                    const sizeStr = it.frame_size || it.selected_size || it.size || 'Medium';
                    const colorStr = it.frame_color || it.selected_color || it.color || 'Matte Black';

                    return (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="py-1.5 px-2.5 text-center text-slate-500 font-mono">{idx + 1}</td>
                        <td className="py-1.5 px-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-9 h-7 rounded border border-slate-200 bg-white p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
                              <img 
                                src={imgUrl} 
                                alt={it.product_name || it.name} 
                                className="max-h-full max-w-full object-contain"
                                onError={(e) => { e.currentTarget.src = '/logo_symbol.png'; }}
                              />
                            </div>
                            <span className="font-bold text-slate-900 text-[10px] leading-tight">
                              {it.product_name || it.name || 'Optical Eyewear Frame'}
                            </span>
                          </div>
                        </td>
                        <td className="py-1.5 px-2.5 text-slate-600 text-[9px] leading-tight">
                          <div>Size: <strong className="text-slate-900">{sizeStr}</strong> &bull; Color: <strong className="text-slate-900">{colorStr}</strong></div>
                          {it.lens_type && (
                            <div className="text-cyan-800 font-semibold mt-0.5">Optics: {it.lens_type}</div>
                          )}
                        </td>
                        <td className="py-1.5 px-2.5 text-center font-mono text-slate-600 text-[9px]">
                          {it.product_sku || it.sku || 'NU-OPT-001'}
                        </td>
                        <td className="py-1.5 px-2 text-center font-bold text-slate-900 font-mono">
                          {qty}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-mono text-slate-700">
                          {rate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-500">
                          {Number(it.discount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-extrabold font-mono text-slate-950">
                          {lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8" className="py-4 text-center text-slate-400">
                      No line items on this invoice.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 5. PRESCRIPTION DETAILS & FINANCIAL TOTALS (SIDE-BY-SIDE) */}
          <div className="grid grid-cols-12 gap-3 mt-3">
            
            {/* Left 7 cols: Prescription Details (If Applicable) */}
            <div className="col-span-7 border border-slate-300 rounded-xl p-2 bg-slate-50/60">
              <div className="flex items-center gap-1.5 text-cyan-950 font-extrabold text-[10px] uppercase tracking-wider mb-1.5">
                <Eye className="w-3.5 h-3.5 text-cyan-800" />
                <span>Prescription Details (If Applicable)</span>
              </div>
              <table className="w-full text-center text-[9px] border border-slate-200 bg-white rounded overflow-hidden">
                <thead className="bg-cyan-900 text-white font-bold">
                  <tr>
                    <th className="py-1 px-1 border-r border-cyan-800">Param</th>
                    <th className="py-1 px-2 border-r border-cyan-800">Right Eye (OD)</th>
                    <th className="py-1 px-2">Left Eye (OS)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono">
                  <tr>
                    <td className="py-1 px-1 font-bold text-slate-700 bg-slate-50 border-r border-slate-200">SPH</td>
                    <td className="py-1 px-2 border-r border-slate-200">{rx?.right_sph || '-1.50'}</td>
                    <td className="py-1 px-2">{rx?.left_sph || '-1.25'}</td>
                  </tr>
                  <tr>
                    <td className="py-1 px-1 font-bold text-slate-700 bg-slate-50 border-r border-slate-200">CYL</td>
                    <td className="py-1 px-2 border-r border-slate-200">{rx?.right_cyl || '-0.75'}</td>
                    <td className="py-1 px-2">{rx?.left_cyl || '-0.50'}</td>
                  </tr>
                  <tr>
                    <td className="py-1 px-1 font-bold text-slate-700 bg-slate-50 border-r border-slate-200">AXIS</td>
                    <td className="py-1 px-2 border-r border-slate-200">{rx?.right_axis || '180°'}</td>
                    <td className="py-1 px-2">{rx?.left_axis || '170°'}</td>
                  </tr>
                  <tr>
                    <td className="py-1 px-1 font-bold text-slate-700 bg-slate-50 border-r border-slate-200">ADD / PD</td>
                    <td className="py-1 px-2 border-r border-slate-200">{rx?.add_power ? `+${rx.add_power}` : '+1.00'}</td>
                    <td className="py-1 px-2">{rx?.pd ? `${rx.pd} mm` : '63 mm (Single PD)'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Right 5 cols: Totals Summary */}
            <div className="col-span-5 border border-slate-300 rounded-xl p-2.5 bg-slate-50/60 space-y-1 text-[10px]">
              <div className="flex justify-between text-slate-700">
                <span>Subtotal</span>
                <span className="font-mono font-bold">₹{calculatedSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Total Discount</span>
                <span className="font-mono text-emerald-700 font-bold">- ₹{calculatedDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Shipping Charges</span>
                <span className="font-mono">₹{calculatedShipping.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              
              {/* Grand Total Bar */}
              <div className="bg-[#0B2847] text-white p-2 rounded-lg flex items-center justify-between mt-1.5 shadow-sm">
                <span className="font-black text-xs uppercase tracking-wider">Grand Total</span>
                <span className="text-base font-black font-mono text-cyan-200">
                  ₹{calculatedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Amount In Words */}
              <div className="text-[9px] text-slate-600 pt-1 leading-tight">
                <strong>Amount in Words:</strong> {numberToWords(calculatedTotal)}
              </div>
            </div>

          </div>

          {/* 6. PAYMENT INFO, PAYMENT QR & AUTHORIZED SIGNATORY */}
          <div className="grid grid-cols-12 gap-3 mt-3 border-t border-b border-slate-200 py-2.5">
            
            {/* Col 1 (4 cols): Payment Information */}
            <div className="col-span-4 space-y-1 text-[10px] text-slate-800">
              <div className="flex items-center gap-1.5 font-extrabold text-cyan-950 uppercase tracking-wider">
                <span>💳 Payment Information</span>
              </div>
              <div>Mode / Channel: <strong className="font-mono uppercase">{paymentMode}</strong></div>
              <div>Date: <span className="font-mono">{invoiceDate}</span></div>
              <div className="text-[9px] text-slate-500 pt-0.5">
                Warranty: <span className="text-slate-700">{warrantyNote}</span>
              </div>
            </div>

            {/* Col 2 (4 cols): Scan to Pay (UPI) */}
            <div className="col-span-4 flex items-center gap-2.5 bg-slate-50 border border-slate-300 rounded-xl p-2">
              <img 
                src={adminUploadedQr || upiQrDataUrl || upiQrFallback} 
                alt="Scan to Pay UPI" 
                width="64"
                height="64"
                style={{ width: '64px', height: '64px', minWidth: '64px', minHeight: '64px', display: 'block' }}
                className="object-contain rounded bg-white p-0.5 border border-slate-200 shrink-0"
              />
              <div className="text-left leading-tight">
                <span className="text-[9px] font-black uppercase tracking-wider text-cyan-950 block">
                  Scan to Pay (UPI)
                </span>
                <span className="text-[10px] font-extrabold text-slate-900 block mt-0.5">
                  NETRA UNNAYAN
                </span>
                <span className="text-[8px] font-mono text-slate-600 block">
                  UPI ID: netraunnayan@okaxis
                </span>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[8px] font-black bg-cyan-100 text-cyan-900 px-1 rounded">BHIM</span>
                  <span className="text-[8px] font-black bg-emerald-100 text-emerald-900 px-1 rounded">UPI</span>
                  <span className="text-[7px] text-slate-500 font-medium">Any App</span>
                </div>
              </div>
            </div>

            {/* Col 3 (4 cols): Authorized Signatory */}
            <div className="col-span-4 flex flex-col items-center justify-center text-center relative">
              {/* Calligraphy Signature Text */}
              <div 
                style={{ 
                  fontFamily: "'Dancing Script', 'Caveat', cursive", 
                  fontSize: '28px', 
                  color: '#0B2847', 
                  fontWeight: 700, 
                  lineHeight: 1 
                }}
                className="select-none tracking-wide"
              >
                Sagar Sahoo
              </div>
              <div className="w-36 h-[1.5px] bg-slate-400 mt-1 mb-1" />
              <div className="text-[10px] font-extrabold text-slate-900 uppercase tracking-wider">
                Authorized Signatory
              </div>
              <div className="text-[9px] text-slate-600 font-medium">
                For Netra Unnayan
              </div>
            </div>

          </div>

          {/* 7. TERMS & CONDITIONS & THANK YOU */}
          <div className="flex items-start justify-between gap-4 mt-2.5 pt-1 text-[9px] text-slate-600 leading-tight">
            
            {/* Terms List */}
            <div className="space-y-0.5 max-w-xl">
              <strong className="text-slate-900 block text-[9px] uppercase tracking-wider">Terms &amp; Conditions:</strong>
              <div>1. Goods once sold will not be taken back except in case of manufacturing defect as per policy.</div>
              <div>2. Prescription lenses are custom-made; returns or refunds are not permitted once edging/cutting commences.</div>
              <div>3. Frame exchange is allowed within 7 days if unused and in original condition with packaging.</div>
              <div>4. This is a computer-generated invoice and valid without physical rubber stamp.</div>
            </div>

            {/* Social, WhatsApp & Thank you */}
            <div className="text-right shrink-0">
              <div className="flex items-center justify-end gap-2 text-slate-500 mb-1">
                <span className="text-[8px] font-bold text-slate-700">Follow Us</span>
                <Facebook className="w-3.5 h-3.5 text-blue-600 cursor-pointer" />
                <Instagram className="w-3.5 h-3.5 text-rose-500 cursor-pointer" />
                <Youtube className="w-3.5 h-3.5 text-red-600 cursor-pointer" />
              </div>
              {/* WhatsApp contact button */}
              <a
                href={`https://wa.me/919382293614?text=${encodeURIComponent('Hello Netra Unnayan! I have a query regarding my invoice.')}`}
                target="_blank"
                rel="noreferrer"
                className="print:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366] text-white text-[10px] font-bold mb-1.5 hover:bg-[#20BD5A] transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Chat on WhatsApp
              </a>
              <div 
                style={{ fontFamily: "'Dancing Script', 'Caveat', cursive", fontSize: '20px', color: '#0B2847', lineHeight: 1 }}
                className="font-bold italic"
              >
                Thank You For Your Trust ❤️
              </div>
            </div>

          </div>

          {/* 8. BOTTOM DARK NAVY BAR */}
          <div className="bg-[#0B2847] text-white p-2 rounded-lg flex items-center justify-between text-[9px] font-bold tracking-wider mt-2.5">
            <span className="text-cyan-200">NETRA UNNAYAN &bull; Clarity You Can Trust</span>
            <span className="flex items-center gap-1 text-slate-300">
              <CheckCircle2 className="w-3 h-3 text-emerald-400 inline" /> Genuine Products
            </span>
            <span className="flex items-center gap-1 text-slate-300">
              <ShieldCheck className="w-3 h-3 text-cyan-400 inline" /> Expert Eye Care Support
            </span>
            <span className="flex items-center gap-1 text-slate-300">
              <Sparkles className="w-3 h-3 text-amber-400 inline" /> Trusted Local Store
            </span>
          </div>

        </div>

      </div>

    </div>
  );
};
