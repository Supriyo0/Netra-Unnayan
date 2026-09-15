import React, { useRef } from 'react';
import { 
  Printer, Download, X, CheckCircle2, Clock, 
  ShieldCheck, Eye, Sparkles, MapPin, Phone, Mail, FileText
} from 'lucide-react';

export const InvoiceModal = ({ isOpen, onClose, invoiceData }) => {
  const printRef = useRef(null);

  if (!isOpen || !invoiceData) return null;

  const {
    invoiceNumber = 'NU-INV-2026-001',
    orderNumber = 'NU-ORD-001',
    invoiceDate = new Date().toISOString().split('T')[0],
    type = 'ORDER', // 'ORDER' | 'DOCTOR' | 'HOME_EYE' | 'POS'
    status = 'Confirmed',
    paymentMode = 'CASH',
    paymentStatus = 'Paid',
    customerName = 'Walk-in Customer',
    customerPhone = '—',
    customerEmail = '—',
    customerAddress = 'Digha, West Bengal',
    items = [],
    subtotal = 0,
    discountAmount = 0,
    taxAmount = 0,
    totalAmount = 0,
    warrantyNote = '1-Year Warranty on Frame & Multi-Coat Anti-Glare Optics',
    notes = '',
    doctorName = '',
    specialty = '',
    appointmentDate = '',
    appointmentTime = '',
    zoneName = ''
  } = invoiceData;

  const handlePrint = () => {
    if (!printRef.current) {
      window.print();
      return;
    }
    const printContent = printRef.current.innerHTML;
    const printWindow = window.open('', '_blank', 'width=850,height=1000');
    if (!printWindow) {
      window.print();
      return;
    }
    printWindow.document.open();
    printWindow.document.write(`<!DOCTYPE html>
<html>
  <head>
    <title>Invoice - ${invoiceNumber} | Netra Unnayan</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Outfit:wght@600;700;800;900&display=swap" rel="stylesheet">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { background: #FFFFFF; color: #0F172A; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 11px; padding: 16px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { padding: 6px 10px; text-align: left; }
      .print\\:hidden { display: none !important; }
      @page { size: A4 portrait; margin: 10mm; }
      @media print {
        body { padding: 0; background: #FFFFFF; }
        button { display: none !important; }
      }
    </style>
    ${Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).map(el => el.outerHTML).join('\n')}
  </head>
  <body class="bg-white text-slate-900">
    <div style="max-width: 800px; margin: 0 auto; background: #FFFFFF;">
      ${printContent}
    </div>
    <script>
      window.onload = function() {
        setTimeout(function() {
          window.focus();
          window.print();
          window.close();
        }, 300);
      };
    </script>
  </body>
</html>`);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static">
      
      {/* Screen Container */}
      <div id="printable-invoice-container" className="relative w-full max-w-3xl bg-white text-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 print:border-none print:shadow-none print:rounded-none">
        
        {/* Screen Controls Header (Hidden on physical print) */}
        <div className="print:hidden bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-brand-cyan" />
            <span className="font-extrabold text-sm font-heading">
              Official Tax Invoice &amp; Optical Guarantee Certificate
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl bg-brand-cyan hover:bg-cyan-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-cyan-glow transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Download PDF</span>
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
            A4 PRINTABLE INVOICE CANVAS (WITH CENTER WATERMARK LOGO)
           ========================================================================= */}
        <div 
          ref={printRef}
          className="relative p-6 sm:p-10 bg-white text-slate-900 font-sans text-xs selection:bg-cyan-100"
          style={{ minHeight: '800px' }}
        >
          {/* Subtle 4% Opacity Optical Watermark in the background */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.045] select-none z-0">
            <img 
              src="/logo_symbol.png" 
              alt="Watermark" 
              className="w-96 h-96 object-contain grayscale"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>

          <div className="relative z-10 space-y-6">
            
            {/* Top Brand Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-slate-900 pb-5">
              <div className="flex items-center gap-3">
                <img 
                  src="/logo_symbol.png" 
                  alt="Netra Unnayan" 
                  className="w-12 h-12 object-contain"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 font-heading">
                    NETRA UNNAYAN
                  </h1>
                  <p className="text-[10px] font-bold text-cyan-700 tracking-wider uppercase">
                    Optical Boutique &bull; Clinical Eye Care &bull; Precision Lab
                  </p>
                  <p className="text-[10px] text-slate-600 mt-0.5 max-w-xs leading-tight">
                    Jatimati Bypass, Old Digha Road, Purba Medinipur, West Bengal — 721428
                  </p>
                  <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                    GSTIN: 19AAAFN1234F1Z5 &bull; Reg: NU/WB/2026/089
                  </p>
                </div>
              </div>

              {/* Invoice Meta Box */}
              <div className="text-left sm:text-right space-y-1">
                <div className="inline-block px-3 py-1 rounded bg-slate-950 text-white text-[10px] font-mono font-black uppercase tracking-wider">
                  TAX INVOICE
                </div>
                <div className="font-mono text-slate-950 font-bold text-sm">
                  #{invoiceNumber}
                </div>
                <div className="text-[10px] text-slate-600">
                  Date: <strong className="text-slate-900">{invoiceDate}</strong>
                </div>
                <div className="text-[10px] text-slate-600">
                  Ref Order / Booking: <strong className="text-slate-900 font-mono">{orderNumber}</strong>
                </div>
                {/* Live Status Badge */}
                <div className="pt-1">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Status: {status}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Bill To / Customer Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-700">
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  CUSTOMER / PATIENT DETAILS
                </span>
                <div className="font-extrabold text-sm text-slate-950">
                  {customerName}
                </div>
                <div className="text-[11px] font-medium text-slate-600 flex items-center gap-1.5 mt-0.5">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span>{customerPhone}</span>
                </div>
                {customerEmail && customerEmail !== '—' && (
                  <div className="text-[11px] font-medium text-slate-600 flex items-center gap-1.5 mt-0.5">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span>{customerEmail}</span>
                  </div>
                )}
                <div className="text-[11px] text-slate-600 flex items-start gap-1.5 mt-1">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                  <span>{customerAddress}</span>
                </div>
              </div>

              <div className="space-y-1 sm:text-right">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  PAYMENT &amp; SERVICE TERMS
                </span>
                <div className="text-[11px]">
                  Payment Mode: <strong className="text-slate-950 font-bold uppercase">{paymentMode}</strong>
                </div>
                <div className="text-[11px]">
                  Payment Status: <strong className="text-emerald-700 font-bold">{paymentStatus}</strong>
                </div>
                {doctorName && (
                  <div className="text-[11px] text-cyan-800 font-bold mt-1">
                    Specialist: Dr. {doctorName} ({specialty})
                  </div>
                )}
                {appointmentDate && (
                  <div className="text-[11px] font-mono text-slate-700">
                    Slot: {appointmentDate} at {appointmentTime}
                  </div>
                )}
                {zoneName && (
                  <div className="text-[11px] text-slate-600">
                    Service Area: <strong>{zoneName}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white font-bold text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3.5">#</th>
                    <th className="py-2.5 px-3.5">Description &amp; Specifications</th>
                    <th className="py-2.5 px-3.5 font-mono text-center">SKU / Code</th>
                    <th className="py-2.5 px-3.5 text-center">Qty</th>
                    <th className="py-2.5 px-3.5 text-right">Rate (₹)</th>
                    <th className="py-2.5 px-3.5 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.length > 0 ? (
                    items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3.5 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-3.5">
                          <div className="font-bold text-slate-950">{it.product_name || it.name || 'Optical Eyewear'}</div>
                          <div className="flex items-center gap-2 flex-wrap text-[10px] text-slate-600 mt-0.5">
                            {(it.selected_size || it.frame_size || it.size) && (
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200 font-medium">
                                Size: <strong className="text-slate-900">{it.selected_size || it.frame_size || it.size}</strong>
                              </span>
                            )}
                            {(it.selected_color || it.frame_color || it.color) && (
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200 font-medium">
                                Colour: <strong className="text-slate-900">{it.selected_color || it.frame_color || it.color}</strong>
                              </span>
                            )}
                          </div>
                          {it.lens_type && (
                            <div className="text-[10px] text-cyan-800 font-semibold mt-0.5">
                              + Lens Optics: {it.lens_type} {it.lens_price > 0 ? `(₹${it.lens_price})` : ''}
                            </div>
                          )}
                          {it.notes && (
                            <div className="text-[10px] text-slate-500 italic mt-0.5">{it.notes}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5 text-center font-mono text-slate-600 text-[11px]">
                          {it.product_sku || it.sku || 'NU-GEN'}
                        </td>
                        <td className="py-2.5 px-3.5 text-center font-bold text-slate-800 font-mono">
                          {it.quantity || 1}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono text-slate-700">
                          ₹{parseFloat(it.unit_price || it.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-bold font-mono text-slate-950">
                          ₹{parseFloat(it.total_price || (it.unit_price * (it.quantity || 1)) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-3 px-3.5 text-slate-400 font-mono">1</td>
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-slate-950">
                          {type === 'DOCTOR' ? `Doctor Consultation: Dr. ${doctorName}` : type === 'HOME_EYE' ? `Home Eye Test & Doorstep Frame Trial (${zoneName})` : 'Optical Eyewear Purchase'}
                        </div>
                        <div className="text-[10px] text-slate-500">Includes computerized eye exam &amp; certified optometrist consultation.</div>
                      </td>
                      <td className="py-3 px-3.5 text-center font-mono text-slate-600 text-[11px]">—</td>
                      <td className="py-3 px-3.5 text-center font-bold text-slate-800 font-mono">1</td>
                      <td className="py-3 px-3.5 text-right font-mono text-slate-700">₹{parseFloat(totalAmount).toFixed(2)}</td>
                      <td className="py-3 px-3.5 text-right font-bold font-mono text-slate-950">₹{parseFloat(totalAmount).toFixed(2)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Calculations & Totals Grid */}
            <div className="flex flex-col sm:flex-row justify-between gap-6 pt-2">
              
              {/* Left Column: Warranty & Guarantee Notes */}
              <div className="flex-1 space-y-2.5 text-[11px] text-slate-600 bg-cyan-50/50 p-4 rounded-xl border border-cyan-100">
                <div className="font-bold text-cyan-950 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-700" />
                  <span>Comprehensive Optical Warranty &amp; Terms</span>
                </div>
                <p className="leading-relaxed text-slate-700">
                  {warrantyNote || '1-Year Warranty on frame breakage & anti-glare scratch resistance against manufacturing defects.'}
                </p>
                <div className="text-[10px] text-slate-500 space-y-0.5">
                  <p>&bull; 14-Day zero-cost frame power adjustment &amp; replacement guarantee.</p>
                  <p>&bull; Retain this tax invoice and warranty certificate for lab assistance.</p>
                </div>
                {notes && (
                  <div className="pt-1 text-[10px] text-slate-700 font-medium">
                    Note: {notes}
                  </div>
                )}
              </div>

              {/* Right Column: Mathematical Summation */}
              <div className="w-full sm:w-72 space-y-1.5 font-mono text-xs">
                <div className="flex justify-between text-slate-600 py-0.5">
                  <span>Subtotal:</span>
                  <span>₹{parseFloat(subtotal || totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                {parseFloat(discountAmount) > 0 && (
                  <div className="flex justify-between text-emerald-700 py-0.5 font-bold">
                    <span>Discount Applied:</span>
                    <span>-₹{parseFloat(discountAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500 py-0.5 text-[11px]">
                  <span>CGST (6%):</span>
                  <span>₹{(parseFloat(totalAmount) * 0.06).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500 py-0.5 text-[11px]">
                  <span>SGST (6%):</span>
                  <span>₹{(parseFloat(totalAmount) * 0.06).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-950 font-black text-base pt-2 border-t-2 border-slate-900">
                  <span className="font-sans">Grand Total:</span>
                  <span className="text-cyan-900">₹{parseFloat(totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="text-[9px] text-slate-400 text-right font-sans">
                  (Inclusive of all applicable optical taxes)
                </div>
              </div>
            </div>

            {/* Bottom Authorized Signature & Lab Stamp */}
            <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-end justify-between gap-6">
              <div className="text-[9px] text-slate-400 space-y-0.5">
                <p>Computer-generated digital tax invoice &bull; Netra Unnayan Optical Lab &amp; Clinic</p>
                <p>Digha, West Bengal &bull; Helpline: +91 98301 23456 &bull; support@netraunnayan.com</p>
              </div>

              <div className="text-center">
                <div className="w-40 border-b border-slate-400 mb-1" />
                <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider block">
                  Authorized Signatory
                </span>
                <span className="text-[9px] text-slate-400 block">
                  Netra Unnayan Clinical Services
                </span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
