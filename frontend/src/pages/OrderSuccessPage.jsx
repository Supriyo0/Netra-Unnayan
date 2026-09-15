import React, { useState } from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import { 
  CheckCircle, QrCode, ArrowRight, ShieldCheck, 
  Copy, ExternalLink, AlertCircle, FileText, Clock, Printer
} from 'lucide-react';
import api from '../api/client';
import { InvoiceModal } from '../components/common/InvoiceModal';

export const OrderSuccessPage = () => {
  const { orderNumber } = useParams();
  const location = useLocation();
  const orderData = location.state?.orderData || null;

  const [showInvoiceModal, setShowInvoiceModal] = useState(true);
  const [utrInput, setUtrInput] = useState('');
  const [utrSubmitted, setUtrSubmitted] = useState(false);
  const [utrLoading, setUtrLoading] = useState(false);
  const [utrMessage, setUtrMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const totalAmount = orderData?.total_amount || 0;
  const isUpi = orderData?.payment_mode === 'UPI';
  const upiData = orderData?.upi_data;

  const handleCopyUpi = () => {
    if (upiData?.upi_id) {
      navigator.clipboard.writeText(upiData.upi_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleVerifyUtr = async (e) => {
    e.preventDefault();
    if (!utrInput.trim()) return;

    setUtrLoading(true);
    setUtrMessage('');
    try {
      const res = await api.post('/payments/verify_upi.php', {
        order_number: orderNumber,
        utr: utrInput.trim()
      });
      if (res.success) {
        setUtrSubmitted(true);
        setUtrMessage(res.message || 'UTR received. Payment under verification.');
      } else {
        setUtrMessage(res.message || 'Failed to submit UTR.');
      }
    } catch (err) {
      setUtrMessage(err.message || 'Verification submission failed.');
    } finally {
      setUtrLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
      
      {/* Top Success Banner */}
      <div className="glass-card-glow rounded-3xl p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-teal-500/20 text-teal-400 border border-teal-400/40 flex items-center justify-center mx-auto shadow-cyan-glow">
          <CheckCircle className="w-10 h-10" />
        </div>

        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-brand-teal">
            Order Confirmed &amp; Queued For Production
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Thank You For Trusting Netra Unnayan!
          </h1>
          <p className="text-xs text-slate-300 mt-2">
            Order Number: <strong className="text-brand-cyan font-mono text-base px-2 py-0.5 rounded bg-white/5">{orderNumber}</strong>
          </p>
        </div>

        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Our optical laboratory team has received your frame specifications and will begin precision lens surfacing following optometrist review.
        </p>

        <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-xs">
          <button 
            type="button"
            onClick={() => setShowInvoiceModal(true)}
            className="px-5 py-2.5 rounded-xl bg-brand-cyan hover:bg-cyan-400 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 shadow-cyan-glow cursor-pointer transition-all"
          >
            <Printer className="w-4 h-4" /> View &amp; Print Invoice
          </button>
          <Link 
            to={`/order-tracking?order=${orderNumber}`} 
            className="btn-primary py-2.5 px-5 text-xs inline-flex items-center gap-1.5"
          >
            <Clock className="w-4 h-4" /> Live Order Tracking
          </Link>
          <Link 
            to="/shop" 
            className="btn-secondary py-2.5 px-5 text-xs inline-flex items-center gap-1.5"
          >
            Continue Shopping
          </Link>
        </div>
      </div>

      {/* UPI PAYMENT DEEP LINK & QR CODE SECTION */}
      {isUpi && (
        <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-6 border border-brand-cyan/40">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-brand-teal">
                Action Required
              </span>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <QrCode className="w-5 h-5 text-brand-cyan" /> Complete UPI Payment: ₹{totalAmount}
              </h3>
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold animate-pulse">
              Payment Pending
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-center">
            
            {/* Dynamic QR Code */}
            <div className="text-center space-y-3 p-4 rounded-2xl bg-[#070E1A] border border-white/10">
              <div className="w-48 h-48 bg-white rounded-xl p-2 mx-auto flex items-center justify-center shadow-lg">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiData?.deep_link || `upi://pay?pa=9382293614@upi&pn=NETRA%20UNNAYAN&am=${totalAmount}&cu=INR`)}`} 
                  alt="UPI QR Code"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="text-[11px] text-slate-300">
                Scan with any UPI App (GPay, PhonePe, Paytm)
              </div>
            </div>

            {/* UPI Details & App Launch Button */}
            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-white/5 space-y-1 font-mono">
                <div className="text-slate-400 text-[10px] uppercase">Merchant UPI VPA</div>
                <div className="flex items-center justify-between text-white font-bold text-sm">
                  <span>{upiData?.upi_id || '9382293614@upi'}</span>
                  <button 
                    onClick={handleCopyUpi} 
                    className="p-1 rounded bg-white/10 text-brand-cyan hover:bg-white/20"
                    title="Copy UPI ID"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                {copied && <span className="text-[10px] text-teal-400 font-sans">Copied to clipboard!</span>}
              </div>

              {/* Mobile Deep Link CTA */}
              <a 
                href={upiData?.deep_link || `upi://pay?pa=9382293614@upi&pn=NETRA%20UNNAYAN&am=${totalAmount}&cu=INR`}
                className="w-full btn-primary py-3 text-xs font-bold flex items-center justify-center gap-2 rounded-xl"
              >
                <span>Pay ₹{totalAmount} in UPI App</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <p className="text-[11px] text-slate-400">
                After completing the payment in your UPI app, please enter the 12-digit UTR/Transaction ID below to expedite order verification.
              </p>
            </div>
          </div>

          {/* UTR Submission Form */}
          <form onSubmit={handleVerifyUtr} className="pt-4 border-t border-white/10 space-y-3">
            <label className="block text-xs font-bold text-white">
              Enter 12-Digit UPI Transaction Reference (UTR)
            </label>
            <div className="flex gap-2">
              <input 
                type="text"
                required
                maxLength="18"
                placeholder="e.g. 625894120357"
                value={utrInput}
                onChange={(e) => setUtrInput(e.target.value)}
                disabled={utrSubmitted}
                className="flex-1 glass-input rounded-xl px-4 py-2 text-xs font-mono tracking-widest uppercase"
              />
              <button 
                type="submit"
                disabled={utrLoading || utrSubmitted}
                className="btn-secondary text-xs px-5 py-2 rounded-xl shrink-0 disabled:opacity-50"
              >
                {utrLoading ? 'Verifying...' : utrSubmitted ? 'Submitted' : 'Verify UTR'}
              </button>
            </div>

            {utrMessage && (
              <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                utrSubmitted ? 'bg-teal-950/40 text-teal-200 border border-teal-500/30' : 'bg-rose-950/40 text-rose-200 border border-rose-500/30'
              }`}>
                {utrSubmitted ? <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                <span>{utrMessage}</span>
              </div>
            )}
          </form>

        </div>
      )}

      {/* Cancellation Notice */}
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-300 space-y-1">
        <p className="font-bold text-white flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-brand-cyan" /> 12-Hour Cancellation Window
        </p>
        <p className="text-slate-400 text-[11px] leading-relaxed">
          Standard cancellation is permitted within 12 hours of order placement or prior to commencement of customized lens edging in our lab. You can cancel or check live manufacturing updates directly from the order tracking link.
        </p>
      </div>

      {/* Instant Order Confirmation Invoice Modal */}
      {showInvoiceModal && (
        <InvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          invoiceData={{
            invoiceNumber: orderData?.invoice_number || `NU-INV-${orderNumber}`,
            orderNumber: orderNumber,
            invoiceDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            type: 'ORDER',
            isGstInvoice: false,
            status: orderData?.order_status || 'Confirmed',
            paymentMode: orderData?.payment_mode === 'COD' ? 'Cash on Delivery (COD)' : (orderData?.payment_mode || 'UPI'),
            paymentStatus: orderData?.payment_mode === 'COD' ? 'Pay on Delivery' : 'Payment Received / Verifying',
            customerName: orderData?.customer_name || 'Valued Customer',
            customerPhone: orderData?.customer_phone || '—',
            customerEmail: orderData?.customer_email || '—',
            customerAddress: [orderData?.shipping_address_line1, orderData?.shipping_city, orderData?.shipping_state, orderData?.shipping_pincode].filter(Boolean).join(', ') || 'Doorstep Optical Delivery',
            items: (orderData?.items || []).map(it => ({
              ...it,
              product_name: it.name || it.product_name,
              selected_size: it.frame_size || it.selected_size || 'Medium',
              selected_color: it.frame_color || it.selected_color || 'Matte Black',
              image_url: it.image_url || it.primary_image || '/logo_symbol.png'
            })),
            subtotal: Number(orderData?.subtotal || totalAmount),
            discountAmount: Number(orderData?.discount_amount || 0),
            shippingFee: Number(orderData?.shipping_fee || 0),
            totalAmount: Number(totalAmount),
            cashier: 'Netra Web Operations',
            warrantyNote: '1-Year Optical Guarantee on Frame & Multi-Coat Optics',
            prescription: orderData?.prescription || null
          }}
        />
      )}

    </div>
  );
};
