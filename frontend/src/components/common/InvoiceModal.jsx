import React, { useRef, useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  Printer, X, CheckCircle2, ShieldCheck, Eye, Sparkles, 
  MapPin, Phone, Mail, Globe, Facebook, Instagram, Youtube,
  User, Building, Award, Stethoscope, ShoppingBag, Download, Loader2,
  FileText, Receipt, QrCode, Tag, MessageCircle, Share2, Send, Copy, Check,
  ExternalLink, AlertCircle
} from 'lucide-react';
import api from '../../api/client';

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
  const [printFormat, setPrintFormat] = useState('a4'); // 'a4' or 'thermal_4inch'
  const [verifyQrDataUrl, setVerifyQrDataUrl] = useState('');
  const [upiQrDataUrl, setUpiQrDataUrl] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  
  // WhatsApp and Email auto-share state
  const [sharingEmail, setSharingEmail] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [customEmailInput, setCustomEmailInput] = useState('');
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [shareToast, setShareToast] = useState(null); // { message, type }

  const activeData = invoiceData || {};

  // Universal normalization for snake_case and camelCase data
  const rawType = String(activeData.type || activeData.order_type || '').toUpperCase();
  const isDoctor = rawType === 'DOCTOR' || rawType === 'CONSULTATION' || Boolean(activeData.doctor_name || activeData.doctorName || activeData.doctor_fee);
  const isHomeEye = rawType === 'HOME_EYE' || rawType === 'HOME_VISIT' || Boolean(activeData.time_slot || activeData.service_slot || activeData.service_tier || (activeData.orderNumber && String(activeData.orderNumber).startsWith('HET-')) || (activeData.invoiceNumber && String(activeData.invoiceNumber).startsWith('NU-HET-')));

  const invoiceNumber = activeData.invoiceNumber || activeData.invoice_number || (
    isDoctor 
      ? `NU/DOC/${new Date().getFullYear()}/${activeData.id || (activeData.orderNumber ? String(activeData.orderNumber).replace(/[^0-9]/g, '').slice(-4) : '01')}`
      : isHomeEye
      ? `NU/HET/${new Date().getFullYear()}/${activeData.id || (activeData.orderNumber ? String(activeData.orderNumber).replace(/[^0-9]/g, '').slice(-4) : '01')}`
      : (activeData.order_number ? `NU/INV/${activeData.order_number.replace('NU-', '')}` : (activeData.id ? `NU/INV/${new Date().getFullYear()}/${activeData.id}` : 'NU/INV/2026/00123'))
  );

  const orderNumber = activeData.orderNumber || activeData.order_number || activeData.booking_number || (
    isDoctor ? `DOC-${activeData.id || '001'}` : isHomeEye ? `HET-${activeData.id || '001'}` : (activeData.id ? `NU-ORD-${activeData.id}` : 'NU-ORD-00123')
  );

  const ticketNo = activeData.ticket_no || activeData.ticketNo || activeData.token_no || (
    isDoctor ? `TKN-${String(activeData.id || '001').padStart(3, '0')}` : isHomeEye ? `HET-${String(activeData.id || '001').padStart(3, '0')}` : null
  );

  const invoiceDate = activeData.invoiceDate || activeData.appointmentDate || activeData.service_date || activeData.visit_date || (activeData.created_at ? new Date(activeData.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));
  const invoiceTime = activeData.invoiceTime || activeData.appointmentTime || activeData.service_slot || activeData.time_slot || (activeData.created_at ? new Date(activeData.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '11:30 AM');
  const type = isDoctor ? 'DOCTOR' : (isHomeEye ? 'HOME_EYE' : (activeData.type || (activeData.order_type === 'POS_OFFLINE' ? 'POS' : (activeData.order_type || 'ORDER'))));
  const isGstInvoice = activeData.isGstInvoice !== undefined ? activeData.isGstInvoice : false;
  const status = activeData.status || activeData.order_status || (isDoctor || isHomeEye ? 'Confirmed' : 'Paid & Delivered');
  const paymentMode = activeData.paymentMode || activeData.payment_mode || activeData.payment_method || (isDoctor ? 'CLINIC_DESK' : isHomeEye ? 'DOORSTEP_COD' : 'UPI');
  const paymentStatus = activeData.paymentStatus || activeData.payment_status || (isDoctor || isHomeEye ? (status === 'Completed' ? 'Paid' : 'Pay at Clinic / Visit') : 'Payment Received');
  const transactionId = activeData.transactionId || activeData.transaction_id || activeData.payment_id || '629455389712';
  const customerName = activeData.customerName || activeData.customer_name || activeData.patient_name || activeData.full_name || 'Walk-in Customer';
  const customerPhone = activeData.customerPhone || activeData.customer_phone || activeData.patient_phone || activeData.phone || '+91 6294 553 897';
  const customerEmail = activeData.customerEmail || activeData.customer_email || activeData.email || '';
  const customerAddress = activeData.customerAddress || (activeData.shipping_address_line1 
    ? `${activeData.shipping_address_line1}${activeData.shipping_city ? `, ${activeData.shipping_city}` : ''}${activeData.shipping_state ? `, ${activeData.shipping_state}` : ''} ${activeData.shipping_pincode ? `— ${activeData.shipping_pincode}` : ''}`
    : (activeData.shipping_address || activeData.address || (isDoctor ? 'Netra Unnayan Eye Clinic, Digha Bypass Rd, Jatimati, Digha' : 'Doorstep Service Address')));
  const cashier = activeData.cashier || (isDoctor ? 'Medical Reception Desk' : isHomeEye ? 'Mobile Dispatch Desk' : 'Sagar Sahoo');
  const doctorName = activeData.doctorName || activeData.doctor_name || (isDoctor ? 'Senior Consultant Ophthalmologist' : '');
  const doctorSpecialty = activeData.specialty || activeData.doctor_specialty || activeData.specialization || (isDoctor ? 'Cataract & Comprehensive Eye Care' : '');
  const assignedOptometrist = activeData.assigned_optometrist || (isHomeEye ? 'Senior Certified Optometrist' : '');
  const warrantyNote = activeData.warrantyNote || (isDoctor ? 'Official Consultation Slip & Optical Prescription Token' : isHomeEye ? 'Doorstep Optometry Exam & 100+ Frame Trial' : '1-Year Optical Warranty on Frame & Multi-Coat Optics');
  const prescription = activeData.prescription || activeData.rx || (activeData.prescriptions && activeData.prescriptions[0]) || null;
  const notes = activeData.notes || (isDoctor ? 'Please report 10 minutes prior to your scheduled consultation slot.' : isHomeEye ? 'Our certified optometrist will visit with computerized equipment.' : 'Thank you for choosing Netra Unnayan for your vision care!');
  const upi_id = activeData.upi_id || activeData.payment_upi || '';
  const payment_qr = activeData.payment_qr || '';
  const payment_qr_image = activeData.payment_qr_image || '';

  // Calculate items based on service type
  let activeItems = [];
  if (isDoctor) {
    const docFee = Number(activeData.totalAmount || activeData.doctor_fee || activeData.fee || 500);
    activeItems = [
      {
        product_name: `Doctor Consultation - ${doctorName}`,
        details: `Specialization: ${doctorSpecialty}\nScheduled: ${invoiceDate} at ${invoiceTime}\nVenue: Netra Unnayan Eye Care Clinic, Digha`,
        product_sku: ticketNo || orderNumber || 'DOC-SLOT-01',
        quantity: 1,
        unit_price: docFee,
        discount: 0,
        total_price: docFee,
        image_url: '/logo_symbol.png'
      }
    ];
  } else if (isHomeEye) {
    const homeFee = Number(activeData.totalAmount || activeData.service_fee || activeData.fee || 299);
    activeItems = [
      {
        product_name: 'Doorstep Home Eye Checkup Service',
        details: `Time Window: ${invoiceTime}\nScheduled: ${invoiceDate}${customerAddress ? `\nDestination: ${customerAddress}` : ''}`,
        product_sku: ticketNo || orderNumber || 'HET-SRV-01',
        quantity: 1,
        unit_price: homeFee,
        discount: 0,
        total_price: homeFee,
        image_url: '/logo_symbol.png'
      }
    ];
  } else {
    // Normal retail order items
    const rawItems = activeData.items || activeData.order_items || activeData.preview_items || [];
    activeItems = (rawItems && rawItems.length > 0) ? rawItems.map((it, idx) => {
      const pName = (it.product_name_master || it.product_name || it.name || it.title || '').trim() || 'Optical Eyewear Frame';
      const pSku = (it.product_sku_code || it.product_sku || it.sku || '').trim() || `NU-OPT-00${idx + 1}`;
      
      return {
        product_name: pName,
        product_sku: pSku,
        unit_price: Number(it.unit_price || it.price || 0),
        quantity: Number(it.quantity || 1),
        discount: Number(it.discount || it.discount_amount || 0),
        lens_type: it.lens_type || '',
        lens_price: Number(it.lens_price || 0),
        total_price: Number(it.total_price !== undefined ? it.total_price : ((Number(it.unit_price || it.price || 0) * Number(it.quantity || 1)) - Number(it.discount || 0))),
        image_url: it.image_url || it.primary_image || it.image || '/logo_symbol.png',
        frame_size: it.frame_size || it.p_frame_size || it.selected_size || it.size || '',
        frame_color: it.frame_color || it.p_frame_color || it.selected_color || it.color || '',
        material: it.material || it.frame_material || it.p_frame_material || '',
        details: it.details || ''
      };
    }) : (activeData.totalAmount || activeData.total_amount ? [
      {
        product_name: (activeData.product_name || activeData.notes || '').includes('Eyewear') ? (activeData.product_name || activeData.notes) : 'Optical Eyewear Frame & Lenses Package',
        product_sku: orderNumber || 'NU-OPT-001',
        unit_price: Number(activeData.totalAmount || activeData.total_amount || 0),
        quantity: 1,
        discount: 0,
        lens_type: prescription ? 'Prescription Optics' : 'Standard Plano Optics',
        lens_price: 0,
        total_price: Number(activeData.totalAmount || activeData.total_amount || 0),
        image_url: '/logo_symbol.png',
        frame_size: '',
        frame_color: '',
        material: '',
        details: ''
      }
    ] : [
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
      }
    ]);
  }

  const calculatedSubtotal = Number(
    activeData.subtotal !== undefined ? activeData.subtotal : (activeData.total_amount || activeItems.reduce((acc, it) => acc + (Number(it.unit_price || 0) * (it.quantity || 1)), 0))
  );
  const calculatedDiscount = Number(activeData.discountAmount !== undefined ? activeData.discountAmount : (activeData.discount_amount || activeItems.reduce((acc, it) => acc + Number(it.discount || 0), 0)));
  const calculatedShipping = Number(activeData.shippingFee !== undefined ? activeData.shippingFee : (activeData.shipping_fee || 0));
  const calculatedTotal = Number(activeData.totalAmount !== undefined ? activeData.totalAmount : (activeData.total_amount || Math.max(0, calculatedSubtotal - calculatedDiscount + calculatedShipping)));

  const rx = prescription || activeData.rx || (activeData.prescriptions && activeData.prescriptions[0]) || null;

  const hasPrescription = Boolean(
    rx && (
      (rx.right_sph !== null && rx.right_sph !== undefined && String(rx.right_sph).trim() !== '' && String(rx.right_sph).trim() !== '—' && String(rx.right_sph).trim() !== '0.00' && String(rx.right_sph).trim() !== '0') ||
      (rx.left_sph !== null && rx.left_sph !== undefined && String(rx.left_sph).trim() !== '' && String(rx.left_sph).trim() !== '—' && String(rx.left_sph).trim() !== '0.00' && String(rx.left_sph).trim() !== '0') ||
      (rx.right_cyl !== null && rx.right_cyl !== undefined && String(rx.right_cyl).trim() !== '' && String(rx.right_cyl).trim() !== '—' && String(rx.right_cyl).trim() !== '0.00' && String(rx.right_cyl).trim() !== '0') ||
      (rx.left_cyl !== null && rx.left_cyl !== undefined && String(rx.left_cyl).trim() !== '' && String(rx.left_cyl).trim() !== '—' && String(rx.left_cyl).trim() !== '0.00' && String(rx.left_cyl).trim() !== '0') ||
      (rx.right_axis !== null && rx.right_axis !== undefined && String(rx.right_axis).trim() !== '' && String(rx.right_axis).trim() !== '—') ||
      (rx.left_axis !== null && rx.left_axis !== undefined && String(rx.left_axis).trim() !== '' && String(rx.left_axis).trim() !== '—') ||
      (rx.right_add !== null && rx.right_add !== undefined && String(rx.right_add).trim() !== '' && String(rx.right_add).trim() !== '—') ||
      (rx.left_add !== null && rx.left_add !== undefined && String(rx.left_add).trim() !== '' && String(rx.left_add).trim() !== '—') ||
      (rx.add_power !== null && rx.add_power !== undefined && String(rx.add_power).trim() !== '' && String(rx.add_power).trim() !== '—')
    )
  );

  // Scannable Online Verification QR: directly shows authentic invoice when scanned from phone
  const invoiceVerifyUrl = `https://netraunnayan.com/order-tracking?order=${encodeURIComponent(orderNumber || invoiceNumber)}&view=invoice`;
  const verifyQrFallback = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=1&data=${encodeURIComponent(invoiceVerifyUrl)}`;

  const configuredUpiId = (upi_id || activeData.payment_upi || (typeof window !== 'undefined' ? localStorage.getItem('nu_admin_upi_id') : '') || '').trim();
  const configuredQrImage = (payment_qr || payment_qr_image || (typeof window !== 'undefined' ? localStorage.getItem('nu_admin_payment_qr') : '') || '').trim();
  const upiPayload = configuredUpiId ? `upi://pay?pa=${configuredUpiId}&pn=Netra%20Unnayan&am=${calculatedTotal}&tn=Invoice%20${invoiceNumber}` : '';

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

  // Initialize customer email input
  useEffect(() => {
    if (customerEmail) {
      setCustomEmailInput(customerEmail);
    }
  }, [customerEmail]);

  // Auto-dismiss share toast
  useEffect(() => {
    if (shareToast) {
      const timer = setTimeout(() => setShareToast(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [shareToast]);

  // Phone Normalization for WhatsApp
  const getCleanDigitsPhone = (p) => {
    if (!p) return '';
    let digits = String(p).replace(/[^0-9]/g, '');
    if (!digits) return '';
    if (digits.length === 10) return `91${digits}`;
    if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
    if (digits.length === 12 && digits.startsWith('91')) return digits;
    return digits;
  };

  // Build Comprehensive WhatsApp Message
  const buildWhatsAppText = () => {
    let msg = `👓 *NETRA UNNAYAN EYE CARE*\n`;
    msg += `_Clarity You Can Trust • Optical & Clinical Eye Care_\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `Hello *${customerName || 'Valued Customer'}*,\n`;
    msg += `Thank you for choosing Netra Unnayan! Here is your official invoice copy & order summary:\n\n`;
    msg += `📄 *Invoice Number:* ${invoiceNumber}\n`;
    msg += `📦 *Order / Booking Ref:* ${orderNumber || ticketNo || 'NU-ORD-01'}\n`;
    msg += `📅 *Date & Time:* ${invoiceDate} at ${invoiceTime}\n`;
    msg += `💵 *Total Amount:* ₹${Number(calculatedTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n`;
    msg += `💳 *Payment Status:* ${paymentStatus} (${paymentMode})\n\n`;

    if (isDoctor) {
      msg += `👨‍⚕️ *Consultant Doctor:* ${doctorName || 'Senior Eye Specialist'} (${doctorSpecialty})\n`;
      if (ticketNo) msg += `🎟️ *Queue Token:* ${ticketNo}\n\n`;
    } else if (isHomeEye) {
      msg += `🏠 *Service:* Doorstep Home Eye Checkup & 100+ Frame Trial\n`;
      if (ticketNo) msg += `🎟️ *Service Ref:* ${ticketNo}\n\n`;
    } else if (activeItems && activeItems.length > 0) {
      msg += `🛍️ *Items Breakdown:*\n`;
      activeItems.forEach((it, idx) => {
        msg += `  ${idx + 1}. *${it.product_name}* (Qty: ${it.quantity}) — ₹${it.total_price || it.unit_price}\n`;
        if (it.lens_type) msg += `     ↳ Lens: ${it.lens_type}\n`;
      });
      msg += `\n`;
    }

    if (hasPrescription && rx) {
      msg += `👁️ *Optical Prescription Parameters:*\n`;
      if (rx.right_sph || rx.right_cyl || rx.right_axis) {
        msg += `  • Right Eye (OD): SPH ${rx.right_sph || '0.00'} | CYL ${rx.right_cyl || '0.00'} | Axis ${rx.right_axis || '—'}°\n`;
      }
      if (rx.left_sph || rx.left_cyl || rx.left_axis) {
        msg += `  • Left Eye (OS): SPH ${rx.left_sph || '0.00'} | CYL ${rx.left_cyl || '0.00'} | Axis ${rx.left_axis || '—'}°\n`;
      }
      if (rx.right_add || rx.left_add || rx.add_power) {
        msg += `  • ADD / Near: +${rx.right_add || rx.left_add || rx.add_power}\n`;
      }
      msg += `\n`;
    }

    msg += `🔗 *View & Download Verified Invoice PDF:*\n${invoiceVerifyUrl}\n\n`;
    msg += `📍 *Clinic Address:* Digha Bypass Rd, Jatimati, Digha, West Bengal 721428\n`;
    msg += `📞 *Desk Support / WhatsApp:* +91 9382293614 / +91 6294553897\n`;
    msg += `🌐 *Online Store:* https://netraunnayan.com\n\n`;
    msg += `_Thank you for trusting us with your vision care!_ ✨`;

    return msg;
  };

  // Open WhatsApp with typed text & target phone number
  const handleShareWhatsApp = () => {
    const rawPhone = customerPhone || activeData.phone || activeData.customer_phone || '';
    const cleanPhone = getCleanDigitsPhone(rawPhone);
    const text = encodeURIComponent(buildWhatsAppText());
    
    const waUrl = cleanPhone 
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${text}`
      : `https://api.whatsapp.com/send?text=${text}`;
    
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  // Copy WhatsApp text to clipboard
  const handleCopyWhatsAppText = async () => {
    try {
      await navigator.clipboard.writeText(buildWhatsAppText());
      setCopiedWhatsApp(true);
      setShareToast({ message: 'WhatsApp message & invoice link copied to clipboard!', type: 'success' });
      setTimeout(() => setCopiedWhatsApp(false), 3000);
    } catch (err) {
      setShareToast({ message: 'Could not auto-copy. Please use the direct WhatsApp button.', type: 'error' });
    }
  };

  // Auto-send or Custom Email Dispatch via SMTP API
  const handleSendEmail = async (overrideEmail) => {
    const recipient = (overrideEmail || customEmailInput || customerEmail || '').trim();
    if (!recipient || !recipient.includes('@')) {
      setShowEmailModal(true);
      setShareToast({ message: 'Please provide a valid customer email address to send invoice.', type: 'error' });
      return;
    }

    try {
      setSharingEmail(true);
      await api.post('/admin/invoices.php', {
        action: 'send_invoice_email',
        to_email: recipient,
        to_name: customerName,
        invoice_number: invoiceNumber,
        order_number: orderNumber,
        invoice_date: invoiceDate,
        invoice_time: invoiceTime,
        total_amount: calculatedTotal,
        payment_status: paymentStatus,
        payment_mode: paymentMode,
        items: activeItems,
        prescription: rx,
        verify_url: invoiceVerifyUrl,
        notes: notes,
        service_type: type
      });

      setShowEmailModal(false);
      setShareToast({
        message: `✅ Official invoice successfully dispatched to ${recipient} via Google SMTP!`,
        type: 'success'
      });
    } catch (err) {
      console.error('Failed to send invoice email:', err);
      setShareToast({
        message: err.message || `Failed to dispatch email to ${recipient}. Please check SMTP settings.`,
        type: 'error'
      });
    } finally {
      setSharingEmail(false);
    }
  };

  // Responsive mobile scaling state
  const [mobileScale, setMobileScale] = useState(1);
  const [fitScreen, setFitScreen] = useState(true);
  const [canvasHeight, setCanvasHeight] = useState(1050);

  useEffect(() => {
    const handleMobileResize = () => {
      if (typeof window === 'undefined') return;
      const w = window.innerWidth;
      const targetWidth = printFormat === 'thermal_4inch' ? 384 : 780;

      if (printRef.current) {
        const measured = printRef.current.offsetHeight || printRef.current.scrollHeight;
        if (measured > 200) {
          setCanvasHeight(measured);
        }
      }
      if (w < (targetWidth + 40) && fitScreen) {
        const availableW = Math.max(280, w - 24);
        const newScale = Number((availableW / targetWidth).toFixed(4));
        setMobileScale(newScale);
      } else {
        setMobileScale(1);
      }
    };

    handleMobileResize();
    window.addEventListener('resize', handleMobileResize);
    const timer = setTimeout(handleMobileResize, 120);
    return () => {
      window.removeEventListener('resize', handleMobileResize);
      clearTimeout(timer);
    };
  }, [fitScreen, isOpen, invoiceData, printFormat]);

  if (!isOpen || !invoiceData) return null;

  // Download PDF Handler
  const handleDownloadPdf = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (downloadingPdf || !printRef.current) return;

    try {
      setDownloadingPdf(true);
      const html2canvasModule = (await import('html2canvas')).default || window.html2canvas;
      const { jsPDF } = await import('jspdf');

      const element = printRef.current;
      const wrapper = element.parentElement;
      const origTransform = element.style.transform;
      const origPosition = element.style.position;
      const origTop = element.style.top;
      const origLeft = element.style.left;

      const targetWidth = printFormat === 'thermal_4inch' ? 384 : 780;

      element.style.transform = 'none';
      element.style.position = 'static';
      if (wrapper) {
        wrapper.style.width = `${targetWidth}px`;
        wrapper.style.height = 'auto';
        wrapper.style.overflow = 'visible';
      }

      const canvas = await html2canvasModule(element, {
        scale: 2.5, // Ultra-sharp print density
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: targetWidth + 20
      });

      element.style.transform = origTransform;
      element.style.position = origPosition;
      element.style.top = origTop;
      element.style.left = origLeft;
      if (wrapper && mobileScale < 1 && fitScreen) {
        wrapper.style.width = `${Math.round(targetWidth * mobileScale)}px`;
        wrapper.style.height = `${Math.round(canvasHeight * mobileScale)}px`;
        wrapper.style.overflow = 'hidden';
      }

      const imgData = canvas.toDataURL('image/jpeg', 0.98);

      if (printFormat === 'thermal_4inch') {
        // 4-inch thermal roll PDF: width 104mm, dynamic height
        const pdfWidthMm = 104;
        const pdfHeightMm = (canvas.height * pdfWidthMm) / canvas.width;
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: [pdfWidthMm, Math.max(120, pdfHeightMm)]
        });
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidthMm, pdfHeightMm);
        const safeFilename = `Netra_Unnayan_Thermal_Receipt_${(invoiceNumber || 'NU-INV').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
        pdf.save(safeFilename);
      } else {
        // Standard A4 PDF
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, Math.min(297, pdfHeight));
        const safeFilename = `Netra_Unnayan_A4_Invoice_${(invoiceNumber || 'NU-INV').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
        pdf.save(safeFilename);
      }
    } catch (err) {
      console.error('PDF generation error, falling back to window.print():', err);
      window.print();
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Print Handler
  const handlePrint = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const printElement = printRef.current;
    if (!printElement) {
      window.print();
      return;
    }

    try {
      let printFrame = document.getElementById('nu-print-iframe');
      if (!printFrame) {
        printFrame = document.createElement('iframe');
        printFrame.id = 'nu-print-iframe';
        printFrame.style.position = 'fixed';
        printFrame.style.left = '-9999px';
        printFrame.style.top = '0';
        printFrame.style.width = printFormat === 'thermal_4inch' ? '420px' : '820px';
        printFrame.style.height = '1150px';
        printFrame.style.border = 'none';
        printFrame.style.visibility = 'hidden';
        printFrame.style.pointerEvents = 'none';
        document.body.appendChild(printFrame);
      }

      const frameDoc = printFrame.contentWindow.document;
      frameDoc.open();

      const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
        .map(node => node.outerHTML)
        .join('\n');

      const isThermal = printFormat === 'thermal_4inch';

      frameDoc.write(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8">
            <title>${isThermal ? 'Thermal_Receipt' : 'Invoice'}_${(invoiceNumber || 'NU-INV').replace(/[^a-zA-Z0-9_-]/g, '_')}</title>
            ${styles}
            <style>
              @page {
                size: ${isThermal ? '104mm auto' : 'A4 portrait'};
                margin: ${isThermal ? '1.5mm' : '0'};
              }
              *, *:before, *:after {
                box-sizing: border-box !important;
                visibility: visible !important;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #000000 !important;
                width: 100% !important;
                height: auto !important;
                visibility: visible !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                font-family: ${isThermal ? "'Courier New', Courier, monospace, 'Segoe UI', Arial" : "'Segoe UI', Arial, sans-serif"} !important;
              }
              .nu-iframe-print-wrapper {
                display: flex !important;
                justify-content: center !important;
                align-items: flex-start !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                visibility: visible !important;
              }
              #printable-invoice-canvas {
                width: ${isThermal ? '384px' : '780px'} !important;
                min-width: ${isThermal ? '384px' : '780px'} !important;
                max-width: ${isThermal ? '384px' : '780px'} !important;
                box-shadow: none !important;
                border: none !important;
                margin: 0 auto !important;
                visibility: visible !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              #printable-invoice-canvas * {
                visibility: visible !important;
              }
            </style>
          </head>
          <body>
            <div class="nu-iframe-print-wrapper">
              ${printElement.outerHTML}
            </div>
          </body>
        </html>
      `);
      frameDoc.close();

      setTimeout(() => {
        try {
          printFrame.contentWindow.focus();
          printFrame.contentWindow.print();
        } catch (printErr) {
          console.error('Iframe print error, falling back to window.print():', printErr);
          window.print();
        }
      }, 400);
    } catch (err) {
      console.error('Print iframe creation error, falling back to window.print():', err);
      window.print();
    }
  };

  const isThermal = printFormat === 'thermal_4inch';
  const targetWidth = isThermal ? 384 : 780;

  return (
    <div 
      id="printable-modal-scroll-wrapper"
      className="fixed inset-0 z-[70] overflow-y-auto bg-black/90 backdrop-blur-md flex flex-col items-center justify-start p-0 sm:p-4 pt-0 sm:pt-4 pb-16 print:p-0 print:m-0 print:bg-white print:static print:overflow-visible print:block print:min-h-0 print:h-auto"
    >
      
      {/* Screen Wrapper */}
      <div 
        id="printable-invoice-container" 
        className="relative w-full sm:max-w-4xl bg-slate-950 sm:bg-white text-slate-900 sm:rounded-2xl shadow-2xl border-0 sm:border border-slate-200/50 print:border-none print:shadow-none print:rounded-none print:max-w-none print:w-full print:m-0 print:p-0 print:static print:min-h-0 print:h-auto min-h-screen sm:min-h-0"
      >
        
        {/* Screen Top Action Bar with Format Selector */}
        <div className="print:hidden bg-slate-950 text-white px-3 sm:px-5 py-3 sm:py-3.5 flex flex-wrap items-center justify-between gap-2.5 border-b border-white/10 sticky top-0 z-30 shadow-md">
          
          {/* Left Title & Invoice Indicator */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2.5 h-2.5 rounded-full bg-brand-cyan animate-pulse shrink-0" />
            <span className="font-extrabold text-xs sm:text-sm font-heading tracking-wide truncate">
              {isGstInvoice ? 'Tax Invoice' : 'Retail Receipt'} &bull; <span className="font-mono text-cyan-300">{invoiceNumber}</span>
            </span>
          </div>

          {/* Center Format Switcher (A4 vs 4-Inch Thermal) */}
          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-white/15 shadow-inner">
            <button
              type="button"
              onClick={() => setPrintFormat('a4')}
              className={`px-3 py-1.5 rounded-lg font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                printFormat === 'a4' 
                  ? 'bg-brand-cyan text-slate-950 shadow-cyan-glow' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>📄 A4 Full Sheet</span>
            </button>
            <button
              type="button"
              onClick={() => setPrintFormat('thermal_4inch')}
              className={`px-3 py-1.5 rounded-lg font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                printFormat === 'thermal_4inch' 
                  ? 'bg-amber-400 text-slate-950 shadow-amber-glow' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>🧾 4" Thermal (100mm)</span>
            </button>
          </div>

          {/* Right Action Buttons: Download PDF, Print, Close */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="px-2.5 sm:px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] sm:text-xs flex items-center gap-1 sm:gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-60"
              title={`Download instant ${isThermal ? '4-inch Thermal Roll' : 'A4 Full Sheet'} PDF`}
            >
              {downloadingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="hidden sm:inline">Saving PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Download PDF</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className={`px-2.5 sm:px-3.5 py-2 rounded-xl font-black text-[11px] sm:text-xs flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
                isThermal 
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-glow' 
                  : 'bg-brand-cyan hover:bg-cyan-400 text-slate-950 shadow-cyan-glow'
              }`}
              title={`Print via ${isThermal ? '4-Inch Thermal POS Receipt Printer' : 'Standard A4 Printer'}`}
            >
              <Printer className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Print {isThermal ? '4" Thermal' : 'A4 Slip'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-rose-500 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Instant Share & Auto Dispatch Toolbar */}
        <div className="print:hidden bg-slate-900 border-b border-white/10 px-3 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-2.5 z-20 shadow-inner">
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 font-black text-amber-300 text-xs tracking-wide">
              <Share2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Share &amp; Dispatch:</span>
            </span>
            {customerPhone && (
              <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-slate-300 bg-slate-800/90 px-2 py-0.5 rounded-lg border border-slate-700">
                <Phone className="w-3 h-3 text-emerald-400" />
                {customerPhone}
              </span>
            )}
            {customerEmail && (
              <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-slate-300 bg-slate-800/90 px-2 py-0.5 rounded-lg border border-slate-700 truncate max-w-[200px]">
                <Mail className="w-3 h-3 text-sky-400" />
                {customerEmail}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* WhatsApp Share Button */}
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              title="Open WhatsApp directly with pre-typed message, receipt link, optical prescription and click Send"
            >
              <MessageCircle className="w-4 h-4 fill-white/20 stroke-[2.2]" />
              <span>Share on WhatsApp</span>
              {customerPhone && (
                <span className="hidden sm:inline-block text-[10px] bg-black/25 px-1.5 py-0.5 rounded text-emerald-100 font-mono">
                  Auto Chat
                </span>
              )}
            </button>

            {/* Email Auto-Share Button */}
            <button
              type="button"
              onClick={() => {
                if (customerEmail && customerEmail.includes('@')) {
                  handleSendEmail(customerEmail);
                } else {
                  setShowEmailModal(true);
                }
              }}
              disabled={sharingEmail}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-blue-950/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60"
              title="Auto-dispatch official invoice email via Google SMTP (netraunnayan@gmail.com)"
            >
              {sharingEmail ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Dispatching...</span>
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 stroke-[2.2]" />
                  <span>Auto Share on Mail</span>
                  <Send className="w-3 h-3 text-sky-200" />
                </>
              )}
            </button>

            {/* Copy WhatsApp Text & Link */}
            <button
              type="button"
              onClick={handleCopyWhatsAppText}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs flex items-center gap-1 border border-slate-700 transition-colors cursor-pointer"
              title="Copy formatted invoice message & link to clipboard"
            >
              {copiedWhatsApp ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-extrabold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden sm:inline">Copy Msg</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Custom Email Dispatch Modal */}
        {showEmailModal && (
          <div className="fixed inset-0 z-[80] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-white/15 text-white rounded-2xl p-5 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm">Auto-Dispatch Official Invoice</h4>
                    <p className="text-[11px] text-slate-400">Sent directly via Netra Unnayan SMTP</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 mb-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Recipient Customer Email:
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. customer@example.com"
                    value={customEmailInput}
                    onChange={(e) => setCustomEmailInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-sky-400 rounded-xl px-3 py-2 text-sm text-white outline-none font-medium"
                    autoFocus
                  />
                </div>

                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div><strong>Invoice:</strong> {invoiceNumber} ({invoiceDate})</div>
                  <div><strong>Customer:</strong> {customerName} &bull; <strong>Amount:</strong> ₹{calculatedTotal}</div>
                  <div className="text-emerald-400">Includes verified invoice link, optical prescription parameters &amp; itemized table.</div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSendEmail(customEmailInput)}
                  disabled={sharingEmail || !customEmailInput.includes('@')}
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-sky-950/50 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {sharingEmail ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending Email...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Dispatch Invoice Now</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Toast Alert */}
        {shareToast && (
          <div className="fixed bottom-6 right-6 z-[90] max-w-sm animate-in slide-in-from-bottom-5 fade-in">
            <div className={`px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-2.5 text-xs font-bold ${
              shareToast.type === 'success' 
                ? 'bg-emerald-950 text-emerald-200 border-emerald-500/50 shadow-emerald-950/50' 
                : 'bg-rose-950 text-rose-200 border-rose-500/50 shadow-rose-950/50'
            }`}>
              {shareToast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className="flex-1">{shareToast.message}</span>
              <button
                type="button"
                onClick={() => setShareToast(null)}
                className="text-white/60 hover:text-white p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Mobile Miniature vs Actual Size Toggle */}
        <div className="print:hidden sm:hidden bg-slate-900/95 px-3 py-2 flex items-center justify-between border-b border-white/10 text-[11px] text-slate-300 sticky top-14 z-20">
          <span className="flex items-center gap-1.5 text-[10.5px] font-medium text-slate-300">
            <Eye className="w-3.5 h-3.5 text-brand-cyan shrink-0" />
            {fitScreen ? `Miniature Preview (${isThermal ? '4" Thermal Roll' : 'A4'})` : 'Actual Size (Pan & Scroll)'}
          </span>
          <button
            type="button"
            onClick={() => setFitScreen(!fitScreen)}
            className="px-2.5 py-1 rounded-lg bg-brand-cyan/20 hover:bg-brand-cyan/30 text-brand-cyan font-bold text-[10.5px] border border-brand-cyan/40 transition-colors cursor-pointer"
          >
            {fitScreen ? '🔍 Zoom 100%' : '📱 Fit Screen'}
          </button>
        </div>

        {/* =========================================================================
            RENDER CANVAS: A4 LUXURY LAYOUT OR 4-INCH THERMAL LAYOUT
           ========================================================================= */}
        <div 
          className={`w-full ${fitScreen && mobileScale < 1 ? 'overflow-hidden flex justify-center items-start' : 'overflow-x-auto flex justify-start sm:justify-center'} py-3 px-2 sm:p-5 bg-slate-900 sm:bg-slate-100 print:bg-white print:p-0 print:overflow-visible`}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div 
            className="invoice-scale-wrapper print:contents"
            style={fitScreen && mobileScale < 1 ? {
              width: `${Math.round(targetWidth * mobileScale)}px`,
              height: `${Math.round(canvasHeight * mobileScale)}px`,
              position: 'relative',
              overflow: 'hidden',
              borderRadius: '8px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
              transition: 'width 0.2s ease, height 0.2s ease'
            } : {
              width: `${targetWidth}px`,
              minWidth: `${targetWidth}px`,
              position: 'relative'
            }}
          >
            
            {/* =====================================================================
                OPTION 1: 4-INCH THERMAL RECEIPT LAYOUT (100mm / 384px POS ROLL)
               ===================================================================== */}
            {isThermal ? (
              <div
                ref={printRef}
                id="printable-invoice-canvas"
                className="thermal-receipt bg-white text-slate-950 font-mono text-[11px] leading-snug p-4 sm:p-5 shadow-2xl sm:shadow-md border border-slate-300 rounded-sm"
                style={{
                  width: '384px',
                  minWidth: '384px',
                  maxWidth: '384px',
                  boxSizing: 'border-box',
                  transform: (mobileScale < 1 && fitScreen) ? `scale(${mobileScale})` : 'none',
                  transformOrigin: 'top left',
                  position: (mobileScale < 1 && fitScreen) ? 'absolute' : 'static',
                  top: 0,
                  left: 0
                }}
              >
                
                {/* 1. Thermal Header: Store Branding */}
                <div className="text-center space-y-1 pb-2 border-b-2 border-dashed border-slate-900">
                  <h1 className="text-base font-black tracking-tight uppercase leading-none font-sans">
                    NETRA UNNAYAN
                  </h1>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-800">
                    Eye Care Clinic &amp; Optical Studio
                  </p>
                  <p className="text-[9.5px] leading-tight text-slate-700">
                    Digha Bypass Rd, Jatimati, Digha, WB - 721428<br />
                    Phone: +91 6294 553 897 / 9382293614<br />
                    Web: www.netraunnayan.in
                  </p>
                  {isGstInvoice && (
                    <p className="text-[9.5px] font-bold text-slate-900">
                      GSTIN: 19ABCDE1234F1Z5
                    </p>
                  )}
                </div>

                {/* 2. Slip Title & Token Highlight Box */}
                <div className="text-center py-2 space-y-1.5">
                  <div className="font-extrabold text-[12px] uppercase tracking-wider border-y border-slate-900 py-1 bg-slate-100">
                    {isDoctor ? 'CLINIC DOCTOR CONSULTATION SLIP' : isHomeEye ? 'DOORSTEP HOME EYE TEST PASS' : (isGstInvoice ? 'TAX INVOICE' : 'RETAIL CASH MEMO')}
                  </div>

                  {ticketNo && (
                    <div className="border-2 border-slate-950 p-1.5 rounded bg-slate-50 font-black text-center">
                      <span className="text-[10px] block text-slate-600 uppercase">QUEUE TOKEN IDENTIFIER</span>
                      <span className="text-lg tracking-wider text-slate-950 font-mono">#{ticketNo}</span>
                    </div>
                  )}
                </div>

                {/* 3. Receipt Metadata Table */}
                <div className="space-y-0.5 text-[10px] pb-2 border-b border-dashed border-slate-900">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Invoice No:</span>
                    <span className="font-bold text-slate-950">{invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Order Ref:</span>
                    <span className="font-bold">{orderNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Date &amp; Time:</span>
                    <span className="font-bold">{invoiceDate} {invoiceTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Cashier/Desk:</span>
                    <span>{cashier}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Patient/Customer:</span>
                    <span className="font-bold text-slate-950">{customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Phone:</span>
                    <span className="font-bold">{customerPhone}</span>
                  </div>
                  {isDoctor && doctorName && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Specialist:</span>
                      <span className="font-bold text-slate-950">{doctorName}</span>
                    </div>
                  )}
                  {isHomeEye && assignedOptometrist && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Optometrist:</span>
                      <span className="font-bold text-slate-950">{assignedOptometrist}</span>
                    </div>
                  )}
                  {customerAddress && (
                    <div className="pt-0.5 text-[9px] text-slate-700 leading-tight">
                      <span className="text-slate-600">Address/Venue: </span>
                      {customerAddress}
                    </div>
                  )}
                </div>

                {/* 4. Prescription Diopter Matrix (If Available) */}
                {hasPrescription && rx && (
                  <div className="py-2 border-b border-dashed border-slate-900 space-y-1">
                    <div className="text-[10px] font-black text-center uppercase tracking-wider bg-slate-100 py-0.5">
                      *** OPTICAL PRESCRIPTION (RX) ***
                    </div>
                    <table className="w-full text-center text-[9.5px] border border-slate-900 border-collapse">
                      <thead>
                        <tr className="bg-slate-200 border-b border-slate-900 font-bold">
                          <th className="p-0.5 border-r border-slate-900">EYE</th>
                          <th className="p-0.5 border-r border-slate-900">SPH</th>
                          <th className="p-0.5 border-r border-slate-900">CYL</th>
                          <th className="p-0.5 border-r border-slate-900">AXIS</th>
                          <th className="p-0.5">ADD</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-slate-900">
                          <td className="p-0.5 font-bold border-r border-slate-900">R (OD)</td>
                          <td className="p-0.5 border-r border-slate-900">{rx.right_sph || '—'}</td>
                          <td className="p-0.5 border-r border-slate-900">{rx.right_cyl || '—'}</td>
                          <td className="p-0.5 border-r border-slate-900">{rx.right_axis ? `${rx.right_axis}°` : '—'}</td>
                          <td className="p-0.5">{rx.right_add || rx.add_power || '—'}</td>
                        </tr>
                        <tr>
                          <td className="p-0.5 font-bold border-r border-slate-900">L (OS)</td>
                          <td className="p-0.5 border-r border-slate-900">{rx.left_sph || '—'}</td>
                          <td className="p-0.5 border-r border-slate-900">{rx.left_cyl || '—'}</td>
                          <td className="p-0.5 border-r border-slate-900">{rx.left_axis ? `${rx.left_axis}°` : '—'}</td>
                          <td className="p-0.5">{rx.left_add || rx.add_power || '—'}</td>
                        </tr>
                      </tbody>
                    </table>
                    {(rx.pd || rx.single_pd || rx.right_pd) && (
                      <div className="text-[9px] text-right font-bold text-slate-800">
                        Pupillary Distance (PD): {rx.pd || rx.single_pd || `${rx.right_pd}/${rx.left_pd}`} mm
                      </div>
                    )}
                  </div>
                )}

                {/* 5. Itemized Table */}
                <div className="py-2 border-b border-dashed border-slate-900">
                  <div className="grid grid-cols-12 font-bold text-[9.5px] border-b border-slate-900 pb-1 mb-1 text-slate-800">
                    <div className="col-span-6">ITEM DESCRIPTION</div>
                    <div className="col-span-2 text-center">QTY</div>
                    <div className="col-span-2 text-right">RATE</div>
                    <div className="col-span-2 text-right">TOTAL</div>
                  </div>

                  <div className="space-y-1.5">
                    {activeItems.map((it, idx) => (
                      <div key={idx} className="text-[10px]">
                        <div className="font-bold text-slate-950">{idx + 1}. {it.product_name}</div>
                        {it.product_sku && (
                          <div className="text-[8.5px] text-slate-600 pl-3">SKU: {it.product_sku}</div>
                        )}
                        {it.lens_type && (
                          <div className="text-[8.5px] text-slate-600 pl-3">Optics: {it.lens_type}</div>
                        )}
                        <div className="grid grid-cols-12 text-[9.5px] pl-3 text-slate-800">
                          <div className="col-span-6 text-slate-500">Unit Rate</div>
                          <div className="col-span-2 text-center font-bold">x {it.quantity || 1}</div>
                          <div className="col-span-2 text-right font-mono">₹{Number(it.unit_price || 0).toFixed(2)}</div>
                          <div className="col-span-2 text-right font-mono font-bold text-slate-950">
                            ₹{Number(it.total_price || (it.unit_price * it.quantity)).toFixed(2)}
                          </div>
                        </div>
                        {Number(it.discount || 0) > 0 && (
                          <div className="text-[8.5px] text-emerald-800 pl-3">
                            Discount: -₹{Number(it.discount).toFixed(2)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 6. Totals & Payment Summary */}
                <div className="py-2 space-y-1 text-[10px] border-b-2 border-dashed border-slate-900">
                  <div className="flex justify-between text-slate-700">
                    <span>Subtotal:</span>
                    <span className="font-mono">₹{calculatedSubtotal.toFixed(2)}</span>
                  </div>
                  {calculatedDiscount > 0 && (
                    <div className="flex justify-between text-emerald-800 font-bold">
                      <span>Total Discount:</span>
                      <span className="font-mono">-₹{calculatedDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  {!isDoctor && !isHomeEye && calculatedShipping > 0 && (
                    <div className="flex justify-between text-slate-700">
                      <span>Shipping Fee:</span>
                      <span className="font-mono">₹{calculatedShipping.toFixed(2)}</span>
                    </div>
                  )}

                  {/* Grand Total Highlight */}
                  <div className="border-t-2 border-b-2 border-slate-950 py-1.5 my-1 flex justify-between items-center">
                    <span className="font-black text-sm uppercase">TOTAL PAYABLE:</span>
                    <span className="font-black text-base font-mono text-slate-950">
                      ₹{calculatedTotal.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between text-[9.5px]">
                    <span className="text-slate-600">Payment Mode:</span>
                    <span className="font-bold">{paymentMode} ({paymentStatus})</span>
                  </div>

                  <div className="text-[8.5px] text-slate-700 pt-0.5 leading-tight">
                    <strong>Words:</strong> {numberToWords(calculatedTotal)}
                  </div>
                </div>

                {/* 7. Desk Notes & Special Instructions (If Any) */}
                {notes && (
                  <div className="py-2 border-b border-dashed border-slate-900 text-[9.5px] space-y-0.5">
                    <span className="font-bold uppercase text-slate-900">DESK INSTRUCTIONS / NOTES:</span>
                    <p className="text-slate-800 leading-tight">{notes}</p>
                  </div>
                )}

                {/* 8. QR Code & Verification */}
                <div className="py-2.5 text-center space-y-1.5 border-b border-dashed border-slate-900">
                  <div className="flex justify-center items-center gap-3">
                    <div className="border border-slate-900 p-1 bg-white inline-block">
                      <img 
                        src={verifyQrDataUrl || verifyQrFallback} 
                        alt="Scan QR" 
                        width="64"
                        height="64"
                        style={{ width: '64px', height: '64px', display: 'block' }}
                        className="mx-auto"
                      />
                    </div>
                    <div className="text-left text-[9px] leading-tight text-slate-800">
                      <strong className="block text-slate-950 text-[10px]">SCAN TO VERIFY</strong>
                      Live Digital Slip<br />
                      Valid across all Netra<br />
                      Unnayan Clinic Desks
                    </div>
                  </div>
                </div>

                {/* 9. Policy & Thermal Cut Line */}
                <div className="pt-2 text-center text-[8.5px] text-slate-700 space-y-1 leading-tight">
                  <p className="font-bold uppercase text-slate-900">
                    {warrantyNote}
                  </p>
                  <p>
                    Prescription optics custom edged. Returns permitted only for manufacturing defects within 7 days.
                  </p>
                  <div className="font-bold text-[10px] text-slate-950 pt-1">
                    Thank You For Visiting Netra Unnayan!
                  </div>
                  <p className="text-[8px] text-slate-500">
                    Get your eyes examined every 6 months for optimal optical health.
                  </p>
                  <div className="pt-2 text-slate-400 font-mono text-[8px] tracking-widest">
                    - - - - - - - - - - - [ CUT HERE ] - - - - - - - - - - -
                  </div>
                </div>

              </div>
            ) : (
              /* =====================================================================
                  OPTION 2: A4 LUXURY FULL SHEET LAYOUT (780px / 1050px)
                 ===================================================================== */
              <div 
                ref={printRef}
                id="printable-invoice-canvas"
                className="invoice-canvas p-4 sm:p-6 md:p-8 bg-white text-slate-900 font-sans text-[9px] leading-tight selection:bg-cyan-100 shadow-2xl sm:shadow-md rounded-lg sm:rounded-none border border-slate-200 flex flex-col justify-between"
                style={{ 
                  width: '780px', 
                  minWidth: '780px', 
                  minHeight: '1050px', 
                  boxSizing: 'border-box',
                  transform: (mobileScale < 1 && fitScreen) ? `scale(${mobileScale})` : 'none',
                  transformOrigin: 'top left',
                  position: (mobileScale < 1 && fitScreen) ? 'absolute' : 'static',
                  top: 0,
                  left: 0
                }}
              >
            
            {/* 1. Header Row */}
            <div className="grid grid-cols-12 gap-2 items-center pb-2.5">
              <div className="col-span-5 space-y-2">
                <div className="flex items-center gap-2">
                  <img 
                    src="/logo_print.png"
                    alt="Netra Unnayan"
                    className="h-12 w-auto object-contain"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/logo_horizontal.png';
                    }}
                  />
                </div>

                <div className="flex items-start gap-2 pt-0.5 text-slate-700">
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

              <div className="col-span-4 flex items-start justify-end text-[9px] text-slate-700">
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
                  <div className="mt-1 text-right">
                    <span className="text-[7.5px] font-black uppercase tracking-widest text-cyan-900 bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-200">
                      SEE A CLEARER TOMORROW
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Dark Navy Invoice Title Banner */}
            <div className="bg-[#002D5B] text-white p-3 rounded-xl flex items-center justify-between gap-3 mt-1 shadow-sm">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-wide leading-none text-white font-heading">
                  {isDoctor ? 'CONSULTATION SLIP' : isHomeEye ? 'HOME TEST SLIP' : (isGstInvoice ? 'TAX INVOICE' : 'RETAIL INVOICE')}
                </h2>
                <p className="text-[8.5px] font-bold uppercase tracking-[0.25em] text-cyan-300 mt-1">
                  {isDoctor ? 'CLINICAL EYE CARE PASS • ZERO WAITING' : isHomeEye ? 'DOORSTEP CLINICAL OPTOMETRY RECEIPT' : 'EYEWEAR FOR A BRIGHTER LIFE'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[9.5px] border-l border-white/20 pl-3">
                <div className="text-slate-300">{isDoctor ? 'Token / Pass No' : isHomeEye ? 'Booking Ref No' : 'Invoice / Slip No'}</div>
                <div className="font-mono font-bold text-cyan-200">: {ticketNo || invoiceNumber}</div>
                <div className="text-slate-300">Date</div>
                <div>: {invoiceDate}</div>
                <div className="text-slate-300">{isDoctor ? 'Doctor / Slot' : isHomeEye ? 'Time Window' : 'Service Type'}</div>
                <div>: {isDoctor ? `${invoiceTime} (Clinic Consultation)` : isHomeEye ? `${invoiceTime} (Doorstep Visit)` : (type === 'POS' ? 'Offline Sale (Counter)' : 'Online Eyewear Order')}</div>
                <div className="text-slate-300">Payment Mode</div>
                <div className="font-bold">: {paymentMode} ({paymentStatus})</div>
                <div className="text-slate-300">{isDoctor ? 'Desk' : isHomeEye ? 'Dispatch' : 'Staff'}</div>
                <div>: {cashier}</div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="bg-white p-1.5 rounded-lg text-slate-950 text-center shrink-0 border border-slate-200 shadow-sm">
                  <span className="text-[8px] font-black uppercase tracking-tight text-[#002D5B] block mb-0.5">
                    Scan to Verify
                  </span>
                  <img 
                    src={verifyQrDataUrl || verifyQrFallback} 
                    alt="Scan to Verify" 
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

            {/* 3. Bill To & Destination */}
            <div className="grid grid-cols-2 gap-4 mt-2.5">
              <div className="border border-slate-300 rounded-xl p-2.5 bg-slate-50/70 text-slate-800">
                <div className="flex items-center gap-1.5 text-[#002D5B] font-black text-[10px] uppercase tracking-wider border-b border-slate-200 pb-1 mb-1.5">
                  <User className="w-3.5 h-3.5 text-cyan-800" />
                  <span>{isDoctor ? 'Patient Details' : isHomeEye ? 'Patient & Doorstep Destination' : 'Bill To (Customer)'}</span>
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

              <div className="border border-slate-300 rounded-xl p-2.5 bg-slate-50/70 text-slate-800">
                <div className="flex items-center gap-1.5 text-[#002D5B] font-black text-[10px] uppercase tracking-wider border-b border-slate-200 pb-1 mb-1.5">
                  <Building className="w-3.5 h-3.5 text-cyan-800" />
                  <span>{isDoctor ? 'Clinic Diagnostic Facility' : isHomeEye ? 'Dispatch Center' : 'Store & Clinic Details'}</span>
                </div>
                <div className="space-y-0.5 text-[9.5px]">
                  <div className="grid grid-cols-12">
                    <span className="col-span-3 text-slate-600">Clinic</span>
                    <span className="col-span-9 font-bold text-slate-950">: Netra Unnayan Eye Clinic &amp; Store</span>
                  </div>
                  <div className="grid grid-cols-12">
                    <span className="col-span-3 text-slate-600">Helpline</span>
                    <span className="col-span-9 font-mono font-bold text-cyan-900">: +91 6294 553 897 / 9382293614</span>
                  </div>
                  <div className="grid grid-cols-12">
                    <span className="col-span-3 text-slate-600">Specialist</span>
                    <span className="col-span-9 font-bold text-slate-900">: {isDoctor ? doctorName : (isHomeEye ? assignedOptometrist : 'Certified Optometrist')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Product / Service Items Table */}
            <div className="mt-2.5 border border-slate-300 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse text-[9px]">
                <thead>
                  <tr className="bg-[#002D5B] text-white font-extrabold uppercase tracking-wider text-[8.5px]">
                    <th className="py-1.5 px-2 text-center w-8">#</th>
                    <th className="py-1.5 px-3">Item / Service Details</th>
                    <th className="py-1.5 px-2 text-center w-24">Item Code / SKU</th>
                    <th className="py-1.5 px-2 text-center w-12">Qty</th>
                    <th className="py-1.5 px-2 text-right w-20">Unit Rate (₹)</th>
                    <th className="py-1.5 px-2 text-right w-16">Discount</th>
                    <th className="py-1.5 px-3 text-right w-24">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {activeItems.map((item, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="py-1.5 px-2 text-center font-bold text-slate-500">{idx + 1}</td>
                      <td className="py-1.5 px-3">
                        <div className="font-extrabold text-slate-950 text-[10px]">{item.product_name}</div>
                        {item.details && (
                          <div className="text-[8px] text-slate-500 whitespace-pre-line leading-tight mt-0.5">{item.details}</div>
                        )}
                        {item.lens_type && (
                          <div className="text-[8px] text-cyan-800 font-medium">Optics: {item.lens_type}</div>
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-center font-mono text-slate-600">{item.product_sku || '—'}</td>
                      <td className="py-1.5 px-2 text-center font-bold text-slate-900">{item.quantity || 1}</td>
                      <td className="py-1.5 px-2 text-right font-mono text-slate-800">₹{Number(item.unit_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="py-1.5 px-2 text-right font-mono text-emerald-700 font-bold">{Number(item.discount || 0) > 0 ? `-₹${Number(item.discount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}</td>
                      <td className="py-1.5 px-3 text-right font-mono font-black text-slate-950">₹{Number(item.total_price || (item.unit_price * item.quantity)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 5. Prescription Matrix & Financial Summary */}
            <div className="grid grid-cols-12 gap-3 mt-2.5">
              <div className="col-span-7 border border-slate-300 rounded-xl p-2 bg-slate-50/60">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1">
                  <div className="flex items-center gap-1.5 font-bold text-[#002D5B] text-[9.5px] uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-800" />
                    <span>Optical Prescription &amp; Clinical Diopter Matrix</span>
                  </div>
                  <span className="text-[8px] font-bold text-slate-500 font-mono">
                    {hasPrescription ? 'Verified Rx diopters' : 'Standard Plano / Non-Rx'}
                  </span>
                </div>

                <table className="w-full text-center text-[9px] border border-slate-200 bg-white rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-slate-800 border-b border-slate-200">
                      <th className="py-1 px-1 border-r border-slate-200">Eye</th>
                      <th className="py-1 px-2 border-r border-slate-200">Sph (Sphere)</th>
                      <th className="py-1 px-2 border-r border-slate-200">Cyl (Cylinder)</th>
                      <th className="py-1 px-2 border-r border-slate-200">Axis (°)</th>
                      <th className="py-1 px-2">Add (Near)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="py-1 px-1 font-bold text-slate-950 bg-slate-50 border-r border-slate-200">R (OD)</td>
                      <td className="py-1 px-2 font-mono border-r border-slate-200">{hasPrescription && rx?.right_sph ? rx.right_sph : '—'}</td>
                      <td className="py-1 px-2 font-mono border-r border-slate-200">{hasPrescription && rx?.right_cyl ? rx.right_cyl : '—'}</td>
                      <td className="py-1 px-2 font-mono border-r border-slate-200">{hasPrescription && rx?.right_axis ? `${rx.right_axis}°` : '—'}</td>
                      <td className="py-1 px-2 font-mono">{hasPrescription && (rx?.right_add || rx?.add_power) ? (rx.right_add || rx.add_power) : '—'}</td>
                    </tr>
                    <tr>
                      <td className="py-1 px-1 font-bold text-slate-950 bg-slate-50 border-r border-slate-200">L (OS)</td>
                      <td className="py-1 px-2 font-mono border-r border-slate-200">{hasPrescription && rx?.left_sph ? rx.left_sph : '—'}</td>
                      <td className="py-1 px-2 font-mono border-r border-slate-200">{hasPrescription && rx?.left_cyl ? rx.left_cyl : '—'}</td>
                      <td className="py-1 px-2 font-mono border-r border-slate-200">{hasPrescription && rx?.left_axis ? `${rx.left_axis}°` : '—'}</td>
                      <td className="py-1 px-2 font-mono">{hasPrescription && (rx?.left_add || rx?.add_power) ? (rx.left_add || rx.add_power) : '—'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="col-span-5 border border-slate-300 rounded-xl p-2.5 bg-slate-50/60 space-y-1 text-[9.5px]">
                <div className="flex justify-between text-slate-700">
                  <span>{isDoctor ? 'Consultation Fee' : isHomeEye ? 'Visit Fee' : 'Subtotal'}</span>
                  <span className="font-mono font-bold">₹ {calculatedSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                {calculatedDiscount > 0 && (
                  <div className="flex justify-between text-slate-700">
                    <span>Discount</span>
                    <span className="font-mono text-emerald-700 font-bold">
                      - ₹ {calculatedDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {!isDoctor && !isHomeEye && calculatedShipping > 0 && (
                  <div className="flex justify-between text-slate-700">
                    <span>Shipping Charges</span>
                    <span className="font-mono font-bold">₹ {calculatedShipping.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}

                <div className="bg-[#002D5B] text-white px-3 py-2 rounded-lg flex items-center justify-between mt-1 shadow-sm">
                  <span className="font-black text-xs uppercase tracking-wider font-heading">{isDoctor || isHomeEye ? 'Total Payable' : 'Grand Total'}</span>
                  <span className="text-base font-black font-mono text-white">
                    ₹ {calculatedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="text-[8.5px] text-slate-700 pt-1 leading-tight">
                  <strong>Amount in Words:</strong><br />
                  <span className="text-[#002D5B] font-bold">{numberToWords(calculatedTotal)}</span>
                </div>
              </div>
            </div>

            {/* 6. Signature & Verification */}
            <div className="grid grid-cols-12 gap-3 mt-2.5 border-t border-b border-slate-200 py-2 items-center">
              <div className="col-span-8 space-y-1 text-[9px] text-slate-800">
                <div className="flex items-center gap-1.5 font-black text-[#002D5B] uppercase tracking-wider text-[9.5px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-800" />
                  <span>{isDoctor ? 'Appointment Pass Details' : isHomeEye ? 'Visit Booking Details' : 'Invoice Details'}</span>
                </div>
                <div className="flex items-center gap-6 mt-1">
                  <div className="flex flex-col">
                    <span className="text-[8px] text-slate-500 uppercase tracking-wider font-semibold">Date</span>
                    <span className="text-[11px] font-bold text-slate-900 font-mono">{invoiceDate}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] text-slate-500 uppercase tracking-wider font-semibold">{isDoctor ? 'Token Pass No' : isHomeEye ? 'Booking Ref No' : 'Invoice No'}</span>
                    <span className="text-[10px] font-bold text-[#002D5B] font-mono">{ticketNo || invoiceNumber}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] text-slate-500 uppercase tracking-wider font-semibold">Payment Mode</span>
                    <span className="text-[10px] font-bold text-slate-800">{paymentMode}</span>
                  </div>
                </div>
              </div>

              <div className="col-span-4 flex items-center justify-end relative">
                <div className="flex flex-col items-center text-center pr-3 z-10">
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
                    Sagar Sahoo
                  </div>
                  <div className="w-32 h-[1px] bg-slate-400 mt-1 mb-1" />
                  <div className="text-[9px] font-extrabold text-slate-900 uppercase tracking-wider">
                    Authorized Signatory
                  </div>
                  <div className="text-[8px] text-slate-600 font-medium">
                    For Netra Unnayan
                  </div>
                </div>
              </div>
            </div>

            {/* 7. Terms & Instructions */}
            <div className="flex items-start justify-between gap-4 mt-2 text-[8px] text-slate-600 leading-tight">
              <div className="space-y-0.5 max-w-xl">
                <strong className="text-slate-900 block text-[8.5px] uppercase tracking-wider">Terms &amp; Instructions:</strong>
                {isDoctor ? (
                  <>
                    <div>1. This consultation token confirms your slot at Netra Unnayan Eye Clinic, Digha.</div>
                    <div>2. Please report 10 minutes prior to your token time with any previous prescription glasses or medical records.</div>
                    <div>3. Complimentary clinical follow-up review is valid within 7 days of initial consultation.</div>
                  </>
                ) : isHomeEye ? (
                  <>
                    <div>1. Doorstep checkup fee covers complete computerized refraction and live showcase of 100+ optical frames.</div>
                    <div>2. Visit fee can be settled via Cash or UPI upon completion of eye examination.</div>
                    <div>3. Eyewear ordered during home trial comes with full 1-year warranty and free doorstep delivery.</div>
                  </>
                ) : (
                  <>
                    <div>1. Goods once sold will not be taken back except in case of manufacturing defect as per policy.</div>
                    <div>2. Prescription lenses are custom-made and non-refundable once cutting commences.</div>
                    <div>3. Frame exchange is allowed within 7 days if unused and in original condition.</div>
                  </>
                )}
              </div>

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

            {/* 8. Bottom Solid Navy Bar */}
            <div className="bg-[#002D5B] text-white py-1.5 px-3 rounded-lg flex items-center justify-between text-[8px] font-bold tracking-wider mt-2">
              <span className="text-cyan-200">NETRA UNNAYAN | {isDoctor ? 'Expert Clinic Diagnostics' : isHomeEye ? 'Doorstep Optometry Care' : 'Clarity You Can Trust'}</span>
              <span className="flex items-center gap-1 text-slate-200">
                <ShieldCheck className="w-3 h-3 text-cyan-400 inline" /> {isDoctor ? 'Senior Ophthalmologist' : isHomeEye ? 'Sanitized Mobile Lab' : 'Genuine Products'}
              </span>
              <span className="flex items-center gap-1 text-slate-200">
                <Stethoscope className="w-3 h-3 text-cyan-400 inline" /> {isDoctor ? 'Zero Waiting Clinic' : isHomeEye ? '100+ Trial Frames' : 'Expert Eye Care Support'}
              </span>
              <span className="flex items-center gap-1 text-slate-200">
                <Award className="w-3 h-3 text-amber-400 inline" /> {isDoctor ? 'Digha Ophthalmic Suite' : isHomeEye ? 'Certified Optometrist' : 'Trusted Local Store'}
              </span>
            </div>

            </div>
            )}

          </div>{/* end invoice-scale-wrapper */}
        </div>{/* end scroll wrapper */}

      </div>
    </div>
  );
};
