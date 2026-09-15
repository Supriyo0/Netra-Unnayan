import React, { useRef, useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  Printer, X, CheckCircle2, ShieldCheck, Eye, Sparkles, 
  MapPin, Phone, Mail, Globe, Facebook, Instagram, Youtube,
  User, Building, Award, Stethoscope, ShoppingBag
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
  return `Rupees ${str.trim()} Only.`;
}

export const InvoiceModal = ({ isOpen, onClose, invoiceData }) => {
  const printRef = useRef(null);
  const [verifyQrDataUrl, setVerifyQrDataUrl] = useState('');
  const [upiQrDataUrl, setUpiQrDataUrl] = useState('');

  const activeData = invoiceData || {};

  const {
    invoiceNumber = 'NU/INV/2026/00123',
    orderNumber = 'NU-ORD-00123',
    invoiceDate = '15 Sep 2026',
    invoiceTime = '11:32 AM',
    type = 'POS', // 'POS' | 'ORDER'
    isGstInvoice = true,
    status = 'Paid & Delivered',
    paymentMode = 'UPI',
    paymentStatus = 'Payment Received',
    transactionId = '629455389712',
    customerName = 'Mr. Rakesh Patra',
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
    upi_id = '',
    payment_qr = '',
    payment_qr_image = ''
  } = activeData;

  // Calculate totals
  const defaultSampleItems = [
    {
      product_name: 'Urban Black Eyeglass Frame',
      frame_size: '52 ▢ 18 - 140',
      frame_color: 'Black',
      material: 'Acetate',
      product_sku: 'NU-FRM-00123',
      quantity: 1,
      unit_price: 1499.00,
      discount: 200.00,
      total_price: 1299.00,
      image_url: 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=150&auto=format&fit=crop&q=80'
    },
    {
      product_name: '1.56 Anti-Glare Lenses (With Power)',
      details: 'Type: Single Vision | Coating: Anti-Glare | Index: 1.56',
      product_sku: 'NU-LEN-001',
      quantity: 1,
      unit_price: 1200.00,
      discount: 0.00,
      total_price: 1200.00,
      image_url: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=150&auto=format&fit=crop&q=80'
    },
    {
      product_name: 'Premium Hard Case',
      details: 'Color: Black | With Cleaning Cloth',
      product_sku: 'NU-ACC-001',
      quantity: 1,
      unit_price: 299.00,
      discount: 0.00,
      total_price: 299.00,
      image_url: 'https://images.unsplash.com/photo-1509695503492-41224713a072?w=150&auto=format&fit=crop&q=80'
    },
    {
      product_name: 'Lens Cleaning Kit',
      details: '100ml Spray + Microfiber Cloth',
      product_sku: 'NU-ACC-002',
      quantity: 1,
      unit_price: 199.00,
      discount: 0.00,
      total_price: 199.00,
      image_url: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=150&auto=format&fit=crop&q=80'
    }
  ];

  const activeItems = (items && items.length > 0) ? items : defaultSampleItems;

  const calculatedSubtotal = Number(
    subtotal || activeItems.reduce((acc, it) => acc + (Number(it.unit_price || it.price || 0) * (it.quantity || 1)), 0)
  );
  const calculatedDiscount = Number(discountAmount || activeItems.reduce((acc, it) => acc + Number(it.discount || 0), 0));
  const calculatedShipping = Number(shippingFee || 0);
  const calculatedTotal = Number(totalAmount || Math.max(0, calculatedSubtotal - calculatedDiscount + calculatedShipping));

  // Scannable Online Verification QR: points to valid live order tracking route
  const invoiceVerifyUrl = `https://netraunnayan.com/order-tracking?order=${encodeURIComponent(orderNumber || invoiceNumber)}`;
  const verifyQrFallback = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=1&data=${encodeURIComponent(invoiceVerifyUrl)}`;

  // Payment UPI QR: ONLY if admin explicitly provided upi_id or payment_qr image
  const configuredUpiId = (upi_id || activeData.payment_upi || (typeof window !== 'undefined' ? localStorage.getItem('nu_admin_upi_id') : '') || '').trim();
  const configuredQrImage = (payment_qr || payment_qr_image || (typeof window !== 'undefined' ? localStorage.getItem('nu_admin_payment_qr') : '') || '').trim();
  const hasConfiguredPaymentQr = Boolean(configuredUpiId || configuredQrImage);

  const upiPayload = configuredUpiId ? `upi://pay?pa=${configuredUpiId}&pn=Netra%20Unnayan&am=${calculatedTotal}&tn=Invoice%20${invoiceNumber}` : '';
  const upiQrFallback = upiPayload ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=1&data=${encodeURIComponent(upiPayload)}` : '';

  // Generate offline base64 QR codes synchronously
  useEffect(() => {
    let isMounted = true;
    if (isOpen && invoiceData && invoiceVerifyUrl) {
      QRCode.toDataURL(invoiceVerifyUrl, {
        width: 160,
        margin: 1,
        color: { dark: '#002D5B', light: '#ffffff' }
      }).then(url => {
        if (isMounted) setVerifyQrDataUrl(url);
      }).catch(() => {});
    }

    if (isOpen && invoiceData && upiPayload && !configuredQrImage) {
      QRCode.toDataURL(upiPayload, {
        width: 160,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      }).then(url => {
        if (isMounted) setUpiQrDataUrl(url);
      }).catch(() => {});
    }
    return () => { isMounted = false; };
  }, [isOpen, invoiceData, invoiceVerifyUrl, upiPayload, configuredQrImage]);

  if (!isOpen || !invoiceData) return null;

  const handlePrint = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    window.focus();
    window.print();
  };

  const rx = prescription || activeData.rx || {
    right_sph: '-1.50',
    left_sph: '-1.25',
    right_cyl: '-0.75',
    left_cyl: '-0.50',
    right_axis: '180',
    left_axis: '170',
    right_add: '+1.00',
    left_add: '+1.00',
    pd: '63 mm (Single PD)'
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:overflow-visible">
      
      {/* Screen Wrapper */}
      <div 
        id="printable-invoice-container" 
        className="relative w-full max-w-4xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 print:border-none print:shadow-none print:rounded-none print:max-w-none print:w-full print:m-0 print:p-0"
      >
        
        {/* Screen Top Action Bar (Hidden in Physical Print) */}
        <div className="print:hidden bg-slate-950 text-white px-5 py-3.5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand-cyan" />
            <span className="font-extrabold text-sm font-heading tracking-wide">
              {isGstInvoice ? 'Official Tax Invoice' : 'Retail Invoice / Bill of Supply'} &bull; {invoiceNumber}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-brand-cyan hover:bg-cyan-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-cyan-glow transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save A4 PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* =========================================================================
            EXACT PIXEL-MATCH PRINTABLE INVOICE CANVAS (1-PAGE STRICT A4 DIMENSION)
           ========================================================================= */}
        <div 
          ref={printRef}
          className="p-5 sm:p-7 bg-white text-slate-900 font-sans text-[11px] leading-tight selection:bg-cyan-100"
          style={{ width: '100%', boxSizing: 'border-box' }}
        >
          
          {/* ================= 1. HEADER ROW ================= */}
          <div className="grid grid-cols-12 gap-3 items-center pb-2.5">
            
            {/* Left Col (5 cols): Logo & 6 Category Icons */}
            <div className="col-span-5 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <svg className="w-9 h-9 text-[#002D5B] shrink-0" viewBox="0 0 100 100" fill="none">
                      <circle cx="50" cy="50" r="45" stroke="#002D5B" strokeWidth="6" />
                      <circle cx="50" cy="50" r="28" fill="#00B4D8" />
                      <circle cx="50" cy="50" r="14" fill="#002D5B" />
                      <path d="M50 15 L70 35 L60 35 L60 65 L40 65 L40 35 L30 35 Z" fill="#00F5D4" opacity="0.9" />
                    </svg>
                    <div>
                      <h1 className="text-xl font-black tracking-tight text-[#002D5B] uppercase leading-none font-heading">
                        NETRA UNNAYAN
                      </h1>
                      <p className="text-[10px] font-semibold text-slate-600 tracking-wide mt-0.5">
                        Clarity You Can Trust
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 6 Category Icons Row */}
              <div className="flex items-start gap-2 pt-1 text-slate-700">
                {[
                  { name: 'Eyeglasses Frames', icon: '👓' },
                  { name: 'Sunglasses', icon: '🕶️' },
                  { name: 'Computer Glasses', icon: '💻' },
                  { name: 'Prescription Lenses', icon: '🔍' },
                  { name: 'Home Eye Testing', icon: '🏠' },
                  { name: 'Eye Doctor Consultation', icon: '👨‍⚕️' }
                ].map((cat, idx) => (
                  <div key={idx} className="flex flex-col items-center text-center w-11">
                    <div className="w-5 h-5 rounded-full border border-cyan-800 flex items-center justify-center text-[10px] bg-cyan-50/60">
                      {cat.icon}
                    </div>
                    <span className="text-[7.5px] font-bold text-slate-600 mt-0.5 leading-[9px] line-clamp-2">
                      {cat.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Middle Col (3 cols): Stylish Cursive Slogan */}
            <div className="col-span-3 text-center flex flex-col items-center justify-center">
              <div 
                style={{ 
                  fontFamily: "'Dancing Script', 'Caveat', cursive", 
                  fontSize: '22px', 
                  color: '#002D5B', 
                  lineHeight: 1.1,
                  transform: 'rotate(-4deg)'
                }}
                className="font-bold italic"
              >
                Better Vision<br />
                <span className="relative">
                  Brighter Tomorrow
                  <svg className="w-20 h-2 absolute -bottom-1 left-1/2 -translate-x-1/2 text-cyan-600" viewBox="0 0 100 15" fill="none">
                    <path d="M5 10 Q 50 0, 95 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </span>
              </div>
            </div>

            {/* Right Col (4 cols): Store Contact & Eyewear Graphic */}
            <div className="col-span-4 flex items-center justify-end gap-3 text-[9.5px] text-slate-700">
              <div className="space-y-0.5 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <MapPin className="w-3 h-3 text-cyan-800 shrink-0" />
                  <span className="leading-tight">Digha Bypass Rd, Jatimati, Digha<br />Purba Medinipur, West Bengal 721428</span>
                </div>
                <div className="flex items-center justify-end gap-1.5 pt-0.5">
                  <Phone className="w-3 h-3 text-cyan-800 shrink-0" />
                  <span className="font-mono font-bold">+91 6294 553 897</span>
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <Mail className="w-3 h-3 text-cyan-800 shrink-0" />
                  <span>info@netraunnayan.in</span>
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <Globe className="w-3 h-3 text-cyan-800 shrink-0" />
                  <span className="font-mono">www.netraunnayan.in</span>
                </div>
              </div>

              {/* Eyeglasses Graphic on the right */}
              <div className="flex flex-col items-center shrink-0 w-28">
                <img 
                  src="https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=200&auto=format&fit=crop&q=80" 
                  alt="Eyewear Frame" 
                  className="w-24 h-12 object-contain rounded drop-shadow-sm"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <span className="text-[7.5px] font-black uppercase tracking-widest text-cyan-900 mt-0.5 whitespace-nowrap">
                  SEE A CLEARER TOMORROW
                </span>
              </div>
            </div>

          </div>

          {/* ================= 2. DARK NAVY INVOICE TITLE BANNER ================= */}
          <div className="bg-[#002D5B] text-white p-3 rounded-xl flex items-center justify-between gap-3 mt-1 shadow-sm">
            
            {/* Title */}
            <div>
              <h2 className="text-2xl font-black uppercase tracking-wide leading-none text-white font-heading">
                {isGstInvoice ? 'TAX INVOICE' : 'RETAIL INVOICE'}
              </h2>
              <p className="text-[8.5px] font-bold uppercase tracking-[0.25em] text-cyan-300 mt-1">
                EYEWEAR FOR A BRIGHTER LIFE
              </p>
            </div>

            {/* Meta Table */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[9.5px] border-l border-white/20 pl-3">
              <div className="text-slate-300">Invoice No</div>
              <div className="font-mono font-bold text-cyan-200">: {invoiceNumber}</div>
              <div className="text-slate-300">Invoice Date</div>
              <div>: {invoiceDate}</div>
              <div className="text-slate-300">Order Type</div>
              <div>: {type === 'POS' ? 'Offline Sale (Counter)' : 'Online Store Order'}</div>
              <div className="text-slate-300">Payment Mode</div>
              <div className="font-bold">: {paymentMode}</div>
              <div className="text-slate-300">Staff</div>
              <div>: {cashier || 'Supriyo Naskar'}</div>
            </div>

            {/* Scan to View Product QR Box + Thank You message */}
            <div className="flex items-center gap-2.5">
              <div className="bg-white p-1.5 rounded-lg text-slate-950 text-center shrink-0 border border-slate-200 shadow-sm">
                <span className="text-[8px] font-black uppercase tracking-tight text-[#002D5B] block mb-0.5">
                  Scan to View Product
                </span>
                <img 
                  src={verifyQrDataUrl || verifyQrFallback} 
                  alt="Scan to View Product" 
                  width="52"
                  height="52"
                  style={{ width: '52px', height: '52px', display: 'block' }}
                  className="object-contain mx-auto"
                />
              </div>
              <div className="text-left text-white text-[9.5px] leading-tight font-medium max-w-[90px]">
                Thank You<br />
                for Choosing<br />
                <strong className="text-cyan-300 font-bold">Netra Unnayan</strong>
              </div>
            </div>

          </div>

          {/* ================= 3. BILL TO & STORE DETAILS ================= */}
          <div className="grid grid-cols-2 gap-4 mt-2.5">
            
            {/* Bill To (Customer) */}
            <div className="border border-slate-300 rounded-xl p-2.5 bg-slate-50/70 text-slate-800">
              <div className="flex items-center gap-1.5 text-[#002D5B] font-black text-[10px] uppercase tracking-wider border-b border-slate-200 pb-1 mb-1.5">
                <User className="w-3.5 h-3.5 text-cyan-800" />
                <span>Bill To (Customer)</span>
              </div>
              <div className="space-y-0.5 text-[9.5px]">
                <div className="grid grid-cols-12">
                  <span className="col-span-3 text-slate-600">Name</span>
                  <span className="col-span-9 font-bold text-slate-950">: {customerName}</span>
                </div>
                <div className="grid grid-cols-12">
                  <span className="col-span-3 text-slate-600">Phone</span>
                  <span className="col-span-9 font-mono font-bold text-slate-900">: {customerPhone}</span>
                </div>
                <div className="grid grid-cols-12">
                  <span className="col-span-3 text-slate-600">Address</span>
                  <span className="col-span-9 text-slate-700 leading-tight">: {customerAddress}</span>
                </div>
              </div>
            </div>

            {/* Store Details */}
            <div className="border border-slate-300 rounded-xl p-2.5 bg-slate-50/70 text-slate-800">
              <div className="flex items-center gap-1.5 text-[#002D5B] font-black text-[10px] uppercase tracking-wider border-b border-slate-200 pb-1 mb-1.5">
                <Building className="w-3.5 h-3.5 text-cyan-800" />
                <span>Store Details</span>
              </div>
              <div className="space-y-0.5 text-[9.5px]">
                <div className="font-extrabold text-slate-950 text-[10.5px]">Netra Unnayan</div>
                <div className="text-slate-700">Digha Bypass Rd, Jatimati, Digha</div>
                <div className="text-slate-700">Purba Medinipur, West Bengal 721428</div>
                <div className="text-slate-700">
                  <strong className="font-mono text-slate-900">+91 6294 553 897</strong> &bull; info@netraunnayan.in
                </div>
                <div className="text-slate-700 pt-0.5">
                  GSTIN : <strong className="font-mono text-slate-900">19ABCDE1234F1Z5 (Sample)</strong>
                </div>
              </div>
            </div>

          </div>

          {/* ================= 4. PRODUCTS LINE ITEMS TABLE ================= */}
          <div className="border border-slate-300 rounded-xl overflow-hidden mt-2.5">
            <table className="w-full text-left text-[9.5px]">
              <thead className="bg-[#002D5B] text-white font-bold uppercase tracking-wider text-[8.5px]">
                <tr>
                  <th className="py-2 px-2 w-6 text-center">#</th>
                  <th className="py-2 px-2.5">Product</th>
                  <th className="py-2 px-2.5">Details</th>
                  <th className="py-2 px-2 text-center font-mono">SKU</th>
                  <th className="py-2 px-1.5 text-center">Qty</th>
                  <th className="py-2 px-2 text-right">Unit Price (₹)</th>
                  <th className="py-2 px-2 text-right">Discount (₹)</th>
                  <th className="py-2 px-2.5 text-right font-bold">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {activeItems.map((it, idx) => {
                  const rate = Number(it.unit_price || it.price || 0);
                  const qty = Number(it.quantity || 1);
                  const disc = Number(it.discount || 0);
                  const lineTotal = Number(it.total_price || ((rate * qty) - disc));
                  const imgUrl = it.image_url || it.primary_image || '/logo_symbol.png';

                  // Details string
                  let detailText = it.details || '';
                  if (!detailText) {
                    const sizeStr = it.frame_size || it.selected_size || it.size;
                    const colorStr = it.frame_color || it.selected_color || it.color;
                    const matStr = it.material || 'Acetate';
                    if (sizeStr || colorStr) {
                      detailText = `Size: ${sizeStr || '52 ▢ 18 - 140'}\nColor: ${colorStr || 'Black'} | Material: ${matStr}`;
                    } else if (it.lens_type) {
                      detailText = `Type: Single Vision\nCoating: Anti-Glare | Index: 1.56`;
                    }
                  }

                  return (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="py-1.5 px-2 text-center text-slate-500 font-mono">{idx + 1}</td>
                      <td className="py-1.5 px-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-7 rounded border border-slate-200 bg-white p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
                            <img 
                              src={imgUrl} 
                              alt={it.product_name || it.name} 
                              className="max-h-full max-w-full object-contain"
                              onError={(e) => { e.currentTarget.src = '/logo_symbol.png'; }}
                            />
                          </div>
                          <span className="font-extrabold text-slate-950 text-[9.5px] leading-tight">
                            {it.product_name || it.name || 'Optical Eyewear'}
                          </span>
                        </div>
                      </td>
                      <td className="py-1.5 px-2.5 text-slate-600 text-[8.5px] leading-tight whitespace-pre-line">
                        {detailText}
                      </td>
                      <td className="py-1.5 px-2 text-center font-mono text-slate-600 text-[8.5px]">
                        {it.product_sku || it.sku || `NU-OPT-00${idx + 1}`}
                      </td>
                      <td className="py-1.5 px-1.5 text-center font-bold text-slate-900 font-mono">
                        {qty}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono text-slate-700">
                        {rate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono text-slate-500">
                        {disc.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-black font-mono text-slate-950">
                        {lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ================= 5. PRESCRIPTION DETAILS & TOTALS ================= */}
          <div className="grid grid-cols-12 gap-4 mt-2.5 items-start">
            
            {/* Left 7 cols: Prescription Details (If Applicable) */}
            <div className="col-span-7 border border-slate-300 rounded-xl p-2 bg-slate-50/60">
              <div className="bg-[#EBF5FB] text-[#002D5B] font-black text-[9.5px] uppercase tracking-wider py-1 px-2 rounded-lg flex items-center gap-1.5 mb-1.5">
                <Eye className="w-3.5 h-3.5 text-cyan-800" />
                <span>Prescription Details (If Applicable)</span>
              </div>
              <table className="w-full text-center text-[8.5px] border border-slate-200 bg-white rounded overflow-hidden">
                <thead className="bg-[#EBF5FB] text-[#002D5B] font-bold">
                  <tr>
                    <th className="py-1 px-1 border-r border-slate-200 w-16">Param</th>
                    <th className="py-1 px-2 border-r border-slate-200">Right Eye (OD)</th>
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
                    <td className="py-1 px-2 border-r border-slate-200">{rx?.right_axis || '180'}</td>
                    <td className="py-1 px-2">{rx?.left_axis || '170'}</td>
                  </tr>
                  <tr>
                    <td className="py-1 px-1 font-bold text-slate-700 bg-slate-50 border-r border-slate-200">ADD</td>
                    <td className="py-1 px-2 border-r border-slate-200">{rx?.right_add || rx?.add_power || '+1.00'}</td>
                    <td className="py-1 px-2">{rx?.left_add || rx?.add_power || '+1.00'}</td>
                  </tr>
                  <tr>
                    <td className="py-1 px-1 font-bold text-slate-700 bg-slate-50 border-r border-slate-200">PD</td>
                    <td colSpan="2" className="py-1 px-2 font-semibold text-slate-800">
                      {rx?.pd ? `${rx.pd} mm (Single PD)` : '63 mm (Single PD)'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Right 5 cols: Financial Summary */}
            <div className="col-span-5 border border-slate-300 rounded-xl p-2.5 bg-slate-50/60 space-y-1 text-[9.5px]">
              <div className="flex justify-between text-slate-700">
                <span>Subtotal</span>
                <span className="font-mono font-bold">₹ {calculatedSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Total Discount</span>
                <span className="font-mono text-slate-900 font-bold">- ₹ {calculatedDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Shipping Charges</span>
                <span className="font-mono font-bold">₹ {calculatedShipping.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              
              {/* Grand Total Solid Navy Box */}
              <div className="bg-[#002D5B] text-white px-3 py-2 rounded-lg flex items-center justify-between mt-1 shadow-sm">
                <span className="font-black text-xs uppercase tracking-wider font-heading">Grand Total</span>
                <span className="text-base font-black font-mono text-white">
                  ₹ {calculatedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Amount In Words */}
              <div className="text-[8.5px] text-slate-700 pt-1 leading-tight">
                <strong>Amount in Words:</strong><br />
                <span className="text-[#002D5B] font-bold">{numberToWords(calculatedTotal)}</span>
              </div>
            </div>

          </div>

          {/* ================= 6. PAYMENT INFO, UPI & SIGNATORY ================= */}
          <div className="grid grid-cols-12 gap-3 mt-2.5 border-t border-b border-slate-200 py-2 items-center">
            
            {/* Col 1 (4 cols): Payment Information */}
            <div className="col-span-4 space-y-1 text-[9px] text-slate-800">
              <div className="flex items-center gap-1.5 font-black text-[#002D5B] uppercase tracking-wider text-[9.5px]">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-800" />
                <span>Payment Information</span>
              </div>
              <div className="grid grid-cols-12">
                <span className="col-span-6 text-slate-600">UPI Transaction ID</span>
                <span className="col-span-6 font-mono font-bold text-slate-900">: {transactionId || '629455389712'}</span>
              </div>
              <div className="grid grid-cols-12">
                <span className="col-span-6 text-slate-600">Payment Date</span>
                <span className="col-span-6 font-mono text-slate-800">: {invoiceDate}, {invoiceTime}</span>
              </div>
              <div className="grid grid-cols-12">
                <span className="col-span-6 text-slate-600">Payment Status</span>
                <span className="col-span-6 font-bold text-emerald-600 flex items-center gap-1">
                  : <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Payment Received
                </span>
              </div>
            </div>

            {/* Col 2 (4 cols): Scan to Pay (UPI) - ONLY IF ADMIN CONFIGURED UPI ID */}
            <div className="col-span-4 flex items-center justify-center min-h-[70px]">
              {hasConfiguredPaymentQr ? (
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-xl p-1.5 w-full">
                  <img 
                    src={configuredQrImage || upiQrDataUrl || upiQrFallback} 
                    alt="Scan to Pay UPI" 
                    width="54"
                    height="54"
                    style={{ width: '54px', height: '54px', display: 'block' }}
                    className="object-contain rounded bg-white p-0.5 border border-slate-200 shrink-0"
                  />
                  <div className="text-left leading-tight">
                    <span className="text-[8px] font-black uppercase tracking-wider text-[#002D5B] block">
                      Scan to Pay (UPI)
                    </span>
                    <span className="text-[9px] font-extrabold text-slate-900 block mt-0.5">
                      NETRA UNNAYAN
                    </span>
                    <span className="text-[7.5px] font-mono text-slate-600 block">
                      UPI ID: {configuredUpiId}
                    </span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[7.5px] font-black bg-cyan-100 text-cyan-900 px-1 rounded">BHIM</span>
                      <span className="text-[7.5px] font-black bg-emerald-100 text-emerald-900 px-1 rounded">UPI</span>
                      <span className="text-[6.5px] text-slate-500 font-medium">Scan &amp; Pay with any UPI App</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full" />
              )}
            </div>

            {/* Col 3 (4 cols): Authorized Signatory */}
            <div className="col-span-4 flex items-center justify-end relative">
              <div className="flex flex-col items-center text-center pr-3 z-10">
                {/* Signature Cursive Font */}
                <div 
                  style={{ 
                    fontFamily: "'Dancing Script', 'Caveat', cursive", 
                    fontSize: '26px', 
                    color: '#002D5B', 
                    fontWeight: 700, 
                    lineHeight: 1 
                  }}
                  className="select-none tracking-wide"
                >
                  {cashier || 'Supriya Naskar'}
                </div>
                <div className="w-32 h-[1px] bg-slate-400 mt-1 mb-1" />
                <div className="text-[9px] font-extrabold text-slate-900 uppercase tracking-wider">
                  Authorized Signatory
                </div>
                <div className="text-[8px] text-slate-600 font-medium">
                  For Netra Unnayan
                </div>
              </div>

              {/* Watermark Eye on the right side */}
              <div className="opacity-15 flex flex-col items-center pointer-events-none select-none pl-2">
                <svg className="w-12 h-12 text-cyan-800" viewBox="0 0 100 100" fill="none">
                  <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="4" />
                  <circle cx="50" cy="50" r="20" fill="currentColor" />
                  <circle cx="50" cy="50" r="8" fill="#fff" />
                </svg>
                <span className="text-[6px] font-black tracking-widest text-slate-700 uppercase mt-0.5 text-center leading-[8px]">
                  VISION CARE<br />PEOPLE ALWAYS
                </span>
              </div>
            </div>

          </div>

          {/* ================= 7. TERMS & CONDITIONS & FOOTER ================= */}
          <div className="flex items-start justify-between gap-4 mt-2 text-[8px] text-slate-600 leading-tight">
            
            {/* Terms List */}
            <div className="space-y-0.5 max-w-xl">
              <strong className="text-slate-900 block text-[8.5px] uppercase tracking-wider">Terms &amp; Conditions:</strong>
              <div>1. Goods once sold will not be taken back except in case of manufacturing defect as per our policy.</div>
              <div>2. Prescription lenses are custom-made. Returns or monetary refunds are not permitted once lens edging/cutting has commenced.</div>
              <div>3. Frame exchange is allowed within 7 days if unused and in original condition with packaging.</div>
              <div>4. This is a system generated invoice and does not require a physical signature.</div>
            </div>

            {/* Social & Thank you */}
            <div className="flex items-center gap-4 shrink-0 pr-2">
              <div className="flex items-center gap-1.5 text-slate-500">
                <span className="text-[8px] font-bold text-slate-700">Follow Us</span>
                <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                  <Facebook className="w-3 h-3" />
                </div>
                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center text-[10px]">
                  <Instagram className="w-3 h-3" />
                </div>
                <div className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px]">
                  <Youtube className="w-3 h-3" />
                </div>
              </div>

              <div className="h-7 w-[1px] bg-slate-300" />

              <div 
                style={{ fontFamily: "'Dancing Script', 'Caveat', cursive", fontSize: '18px', color: '#002D5B', lineHeight: 1 }}
                className="font-bold italic text-right"
              >
                Thank You<br />
                <span className="text-[11px] font-normal text-slate-600">For Your Trust ❤️</span>
              </div>
            </div>

          </div>

          {/* ================= 8. BOTTOM SOLID NAVY BAR ================= */}
          <div className="bg-[#002D5B] text-white py-1.5 px-3 rounded-lg flex items-center justify-between text-[8px] font-bold tracking-wider mt-2">
            <span className="text-cyan-200">NETRA UNNAYAN | Clarity You Can Trust</span>
            <span className="flex items-center gap-1 text-slate-200">
              <ShieldCheck className="w-3 h-3 text-cyan-400 inline" /> Genuine Products
            </span>
            <span className="flex items-center gap-1 text-slate-200">
              <Stethoscope className="w-3 h-3 text-cyan-400 inline" /> Expert Eye Care Support
            </span>
            <span className="flex items-center gap-1 text-slate-200">
              <Award className="w-3 h-3 text-amber-400 inline" /> Trusted Local Store
            </span>
          </div>

        </div>

      </div>

    </div>
  );
};
