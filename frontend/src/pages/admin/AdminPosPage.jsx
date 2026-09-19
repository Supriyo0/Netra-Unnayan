import React, { useState, useEffect, useRef } from 'react';
import { 
  Barcode, Search, Plus, Minus, Trash2, Printer, 
  CheckCircle2, AlertCircle, ShoppingCart, User, CreditCard, 
  DollarSign, X, Check, Camera, Video, ShieldCheck, History, 
  FileText, Sparkles, RefreshCw, Eye, Tag, PenLine
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { InvoiceModal } from '../../components/common/InvoiceModal';

export const AdminPosPage = () => {
  const { user } = useAuth();

  // Mode: 'COUNTER' | 'ARCHIVE'
  const [activeView, setActiveView] = useState('COUNTER');

  // Search & Hardware Scanner
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Camera Barcode Scanner
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const lastScannedCodeRef = useRef('');
  const lastScannedTimeRef = useRef(0);

  // Cart for POS Bill
  const [posItems, setPosItems] = useState([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [warrantyNote, setWarrantyNote] = useState('1-Year Optical Warranty on Frame & Multi-Coat Optics');

  // Customer Details
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('Digha Store Counter');
  const [paymentMode, setPaymentMode] = useState('UPI'); // CASH, UPI, CARD
  const [isGstInvoice, setIsGstInvoice] = useState(false); // DEFAULT: Non-GST
  const [billNotes, setBillNotes] = useState('');

  // Execution & Invoices
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [isDeletingInvoice, setIsDeletingInvoice] = useState(false);

  // Invoices Archive
  const [archiveInvoices, setArchiveInvoices] = useState([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveSearch, setArchiveSearch] = useState('');

  // Store settings (UPI / QR)
  const [storeSettings, setStoreSettings] = useState({ upi_id: '', upi_qr_image: '' });

  // Hardware barcode scanner buffer listener (rapid keystrokes)
  const barcodeBuffer = useRef('');
  const lastKeyTime = useRef(Date.now());

  useEffect(() => {
    api.get('/admin/settings.php').then(res => {
      if (res.success && res.data) {
        setStoreSettings({
          upi_id: res.data.upi_id || '',
          upi_qr_image: res.data.upi_qr_image || ''
        });
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Barcode scanners type very rapidly (< 70ms between key events) and end with 'Enter'
      const now = Date.now();
      const diff = now - lastKeyTime.current;
      lastKeyTime.current = now;

      if (diff > 120) {
        barcodeBuffer.current = '';
      }

      if (e.key === 'Enter') {
        if (barcodeBuffer.current.length >= 3) {
          e.preventDefault();
          lookupAndAddByCode(barcodeBuffer.current);
          barcodeBuffer.current = '';
        }
      } else if (e.key.length === 1) {
        barcodeBuffer.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [posItems]);

  // Play audio confirmation chime on scan
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch {
      // ignore
    }
  };

  const lookupAndAddByCode = async (code) => {
    if (!code || !code.trim()) return;
    const cleanCode = code.trim();
    try {
      const res = await api.get(`/products/by_sku.php?code=${encodeURIComponent(cleanCode)}`);
      if (res.success && res.data) {
        addProductToBill(res.data);
        return;
      }
    } catch (err) {
      // Continue to full search
    }

    try {
      const sRes = await api.get(`/products?search=${encodeURIComponent(cleanCode)}&limit=1`);
      if (sRes.success && sRes.data?.products?.length > 0) {
        addProductToBill(sRes.data.products[0]);
        return;
      }
    } catch (err) {
      console.warn('Scanned / searched product not found:', cleanCode);
    }
  };

  // Search input with debounce & catalog browser
  const fetchSearchProducts = async (term = '') => {
    setIsSearching(true);
    try {
      const endpoint = term.trim() 
        ? `/products?search=${encodeURIComponent(term.trim())}&limit=20` 
        : `/products?limit=20`;
      const res = await api.get(endpoint);
      if (res.success) {
        setSearchResults(res.data?.products || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (!searchInput.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      fetchSearchProducts(searchInput);
    }, 180);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults.length > 0) {
        addProductToBill(searchResults[0], true);
      } else if (searchInput.trim()) {
        lookupAndAddByCode(searchInput.trim());
      }
    }
  };

  const addProductToBill = (product, keepOpen = false, customSize = null, customColor = null) => {
    playBeep();

    let sizesList = ['Small', 'Medium', 'Large'];
    if (product.available_sizes) {
      try {
        const parsed = typeof product.available_sizes === 'string' ? JSON.parse(product.available_sizes) : product.available_sizes;
        if (Array.isArray(parsed) && parsed.length > 0) sizesList = parsed;
        else sizesList = product.available_sizes.split(',').map(s => s.trim()).filter(Boolean);
      } catch {
        sizesList = product.available_sizes.split(',').map(s => s.trim()).filter(Boolean);
      }
    } else if (product.frame_size) {
      sizesList = [product.frame_size];
    }

    let colorsList = ['Matte Black', 'Tortoise Amber', 'Gunmetal Grey', 'Rose Gold', 'Silver', 'Gold'];
    if (product.available_colors) {
      try {
        const parsed = typeof product.available_colors === 'string' ? JSON.parse(product.available_colors) : product.available_colors;
        if (Array.isArray(parsed) && parsed.length > 0) colorsList = parsed;
        else colorsList = product.available_colors.split(',').map(c => c.trim()).filter(Boolean);
      } catch {
        colorsList = product.available_colors.split(',').map(c => c.trim()).filter(Boolean);
      }
    } else if (product.frame_color) {
      colorsList = [product.frame_color];
    }

    const chosenSize = customSize || product.frame_size || sizesList[0] || 'Medium';
    const chosenColor = customColor || product.frame_color || colorsList[0] || 'Matte Black';

    setPosItems((prev) => {
      const existingIdx = prev.findIndex(
        p => p.product_id === product.id && p.frame_size === chosenSize && p.frame_color === chosenColor
      );
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += 1;
        return updated;
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          sku: product.sku,
          unit_price: product.discount_price !== null && product.discount_price !== undefined 
            ? Number(product.discount_price) 
            : Number(product.price),
          stock_quantity: product.stock_quantity,
          quantity: 1,
          frame_size: chosenSize,
          frame_color: chosenColor,
          available_sizes: sizesList,
          available_colors: colorsList,
          lens_type: '',
          lens_price: 0
        }
      ];
    });
    if (!keepOpen) {
      setSearchInput('');
      setSearchResults([]);
    }
  };

  const updateItemSize = (index, size) => {
    setPosItems(prev => {
      const updated = [...prev];
      updated[index].frame_size = size;
      return updated;
    });
  };

  const updateItemColor = (index, color) => {
    setPosItems(prev => {
      const updated = [...prev];
      updated[index].frame_color = color;
      return updated;
    });
  };

  const updateItemQty = (index, qty) => {
    if (qty <= 0) {
      removeItem(index);
      return;
    }
    setPosItems((prev) => {
      const updated = [...prev];
      updated[index].quantity = qty;
      return updated;
    });
  };

  const removeItem = (index) => {
    setPosItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // =========================================================================
  // CUSTOM ITEM FORM — for non-catalog items (repairs, lens charges, etc.)
  // =========================================================================
  const [customItemForm, setCustomItemForm] = useState({
    name: '',
    sku: '',
    unit_price: '',
    quantity: 1,
    addon_label: '',   // Optional add-on label (e.g. "Lens Fitting Charge")
    addon_price: 0     // Optional add-on price per unit
  });
  const [showCustomItemForm, setShowCustomItemForm] = useState(false);

  const addCustomItemToBill = () => {
    const name = customItemForm.name.trim();
    const price = parseFloat(customItemForm.unit_price);
    const qty = Math.max(1, parseInt(customItemForm.quantity) || 1);
    const addonPrice = Math.max(0, parseFloat(customItemForm.addon_price) || 0);
    const addonLabel = customItemForm.addon_label.trim();

    if (!name) {
      setErrorMessage('Custom item name is required.');
      return;
    }
    if (isNaN(price) || price <= 0) {
      setErrorMessage('Custom item price must be a positive number.');
      return;
    }

    playBeep();
    setErrorMessage('');

    const customSku = customItemForm.sku.trim() || `CUSTOM-${Date.now()}`;
    const effectiveName = addonLabel ? `${name} (+${addonLabel})` : name;

    setPosItems(prev => [
      ...prev,
      {
        product_id: 0,           // 0 = custom item, no DB product
        is_custom: true,
        name: effectiveName,
        sku: customSku,
        unit_price: price,
        stock_quantity: 9999,    // unlimited virtual stock
        quantity: qty,
        frame_size: '',
        frame_color: '',
        available_sizes: [],
        available_colors: [],
        lens_type: addonLabel || '',
        lens_price: addonPrice
      }
    ]);

    // Reset form
    setCustomItemForm({ name: '', sku: '', unit_price: '', quantity: 1, addon_label: '', addon_price: 0 });
    setShowCustomItemForm(false);
  };

  // =========================================================================
  const startCamera = async () => {
    setCameraModalOpen(true);
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Check if native BarcodeDetector is available
      if ('BarcodeDetector' in window) {
        const barcodeDetector = new window.BarcodeDetector({
          formats: ['code_128', 'qr_code', 'ean_13', 'ean_8', 'upc_a', 'code_39']
        });

        scanIntervalRef.current = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const barcodes = await barcodeDetector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const code = barcodes[0].rawValue;
              const now = Date.now();
              // Debounce repeat scans of same code to 1.2s, allow re-scan to increment
              if (code !== lastScannedCodeRef.current || now - lastScannedTimeRef.current > 1200) {
                lastScannedCodeRef.current = code;
                lastScannedTimeRef.current = now;
                lookupAndAddByCode(code);
              }
            }
          } catch {
            // detector pass error ignore
          }
        }, 250);
      } else {
        setCameraError('Native camera barcode detection is not supported in this browser. Please use Google Chrome, Edge, or a USB barcode scanner, or search SKU manually.');
      }
    } catch (err) {
      setCameraError('Camera access denied or unavailable: ' + err.message);
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraModalOpen(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Totals calculation
  const subtotal = posItems.reduce((sum, item) => sum + (item.unit_price + item.lens_price) * item.quantity, 0);
  const finalTotal = Math.max(0, subtotal - Number(discountAmount || 0));

  // Finalize Bill
  const handleFinalizeBill = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (posItems.length === 0) {
      setErrorMessage('Please add at least one optical item to the bill.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customer_name: customerName.trim() || 'Walk-in Customer',
        customer_phone: customerPhone.trim() || '9876543210',
        customer_address: customerAddress.trim() || 'Digha Store Counter',
        payment_mode: paymentMode,
        is_gst_invoice: isGstInvoice ? 1 : 0,
        warranty_note: warrantyNote,
        discount_amount: Number(discountAmount || 0),
        notes: [billNotes.trim(), `Warranty: ${warrantyNote}`].filter(Boolean).join(' | '),
        items: posItems.map(item => ({
          product_id: item.product_id,
          is_custom: item.is_custom || false,
          product_name: item.name,
          product_sku: item.sku,
          unit_price: item.unit_price,
          quantity: item.quantity,
          lens_type: item.lens_type,
          lens_price: item.lens_price,
          frame_size: item.frame_size || '',
          frame_color: item.frame_color || ''
        }))
      };

      const res = await api.post('/admin/pos/create_bill.php', payload);
      if (res.success && res.data) {
        const inv = res.data;
        // Open Master Tax/Retail Invoice Modal immediately
        setSelectedInvoiceForModal({
          invoiceNumber: inv.invoice_number,
          orderNumber: inv.order_number,
          invoiceDate: inv.invoice_date || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          type: 'POS',
          isGstInvoice: isGstInvoice,
          status: 'Paid & Delivered',
          paymentMode: inv.payment_mode || paymentMode,
          paymentStatus: 'Payment Received',
          customerName: inv.customer_name || customerName,
          customerPhone: inv.customer_phone || customerPhone,
          customerAddress: inv.customer_address || customerAddress,
          items: (inv.items || posItems).map(it => ({
            ...it,
            product_name: it.product_name || it.name,
            selected_size: it.frame_size || 'Medium',
            selected_color: it.frame_color || 'Matte Black',
            image_url: it.image_url || it.primary_image || '/logo_symbol.png'
          })),
          subtotal: inv.subtotal,
          discountAmount: inv.discount_amount,
          shippingFee: 0,
          totalAmount: inv.total_amount,
          cashier: inv.cashier || (user?.full_name || 'Sagar Shaoo'),
          warrantyNote: inv.warranty_note || warrantyNote,
          notes: billNotes
        });

        // Reset current POS cart
        setPosItems([]);
        setDiscountAmount(0);
        setCustomerName('Walk-in Customer');
        setCustomerPhone('');
        setBillNotes('');
      } else {
        setErrorMessage(res.message || 'Failed to finalize bill.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'POS billing failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch Invoices Archive
  const fetchArchiveInvoices = async () => {
    setArchiveLoading(true);
    try {
      const res = await api.get('/admin/invoices.php');
      if (res.success && res.data?.invoices) {
        setArchiveInvoices(res.data.invoices);
      }
    } catch (err) {
      console.error('Failed to load invoices archive:', err);
    } finally {
      setArchiveLoading(false);
    }
  };

  useEffect(() => {
    if (activeView === 'ARCHIVE') {
      fetchArchiveInvoices();
    }
  }, [activeView]);

  const filteredArchive = archiveInvoices.filter(inv => 
    (inv.invoice_number || '').toLowerCase().includes(archiveSearch.toLowerCase()) ||
    (inv.customer_name || '').toLowerCase().includes(archiveSearch.toLowerCase()) ||
    (inv.customer_phone || '').includes(archiveSearch)
  );

  const handleDeleteConfirm = async (restoreStock) => {
    if (!invoiceToDelete) return;
    setIsDeletingInvoice(true);
    try {
      const res = await api.delete(`/admin/invoices.php?id=${invoiceToDelete.id}&restore_stock=${restoreStock ? 1 : 0}`);
      if (res.success) {
        setArchiveInvoices(prev => prev.filter(inv => inv.id !== invoiceToDelete.id));
        setInvoiceToDelete(null);
      } else {
        alert(res.message || 'Failed to delete invoice');
      }
    } catch (err) {
      alert(err.message || 'Error deleting invoice');
    } finally {
      setIsDeletingInvoice(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & Tab Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <span className="text-xs uppercase font-extrabold tracking-wider text-brand-cyan">
            Storefront Billing &amp; Invoicing
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2.5 mt-1 font-heading">
            <ShoppingCart className="w-7 h-7 text-brand-cyan" />
            POS Counter Billing &amp; Invoices
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Instant barcode scanning (camera &amp; USB hardware), walk-in checkout, automatic stock reduction &amp; tax invoice
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 p-1 rounded-2xl bg-white/5 border border-white/10">
          <button
            onClick={() => setActiveView('COUNTER')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeView === 'COUNTER'
                ? 'bg-brand-cyan text-slate-950 shadow-cyan-glow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Counter POS</span>
          </button>
          <button
            onClick={() => setActiveView('ARCHIVE')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeView === 'ARCHIVE'
                ? 'bg-brand-cyan text-slate-950 shadow-cyan-glow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Invoices Archive</span>
            {archiveInvoices.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40 text-brand-cyan font-mono">
                {archiveInvoices.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* =========================================================================
          VIEW 1: COUNTER BILLING
         ========================================================================= */}
      {activeView === 'COUNTER' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Search, Camera Scanner, Item Table */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Fast Search, Camera Scanner, & Hardware Barcode Input */}
            <div className="relative z-50 glass-card rounded-2xl p-4 space-y-3 border border-slate-200 dark:border-white/10 shadow-sm">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-5 h-5 text-brand-cyan absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search frame by name, brand, SKU or barcode (e.g. Titanium, Sovereign, Aviator, NU-FRM-00101)..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onFocus={() => { if (searchResults.length === 0) fetchSearchProducts(searchInput); }}
                    onKeyDown={handleSearchKeyDown}
                    className="w-full glass-input rounded-xl pl-11 pr-20 py-3 text-xs font-medium"
                    autoFocus
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    {isSearching && (
                      <RefreshCw className="w-4 h-4 text-brand-cyan animate-spin" />
                    )}
                    {searchInput && (
                      <button
                        type="button"
                        onClick={() => { setSearchInput(''); setSearchResults([]); }}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full transition-colors"
                        title="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Browse Catalog Dropdown Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    if (searchResults.length > 0) setSearchResults([]);
                    else fetchSearchProducts(searchInput);
                  }}
                  className="px-3.5 py-3 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-brand-cyan/20 text-slate-700 dark:text-slate-200 hover:text-brand-cyan border border-slate-300 dark:border-white/10 font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 transition-all shadow-sm"
                  title="Browse optical catalog dropdown to select multiple items"
                >
                  <Sparkles className="w-4 h-4 text-brand-cyan" />
                  <span>{searchResults.length > 0 ? 'Close Catalog' : 'Browse Catalog'}</span>
                </button>

                <button
                  type="button"
                  onClick={startCamera}
                  className="px-4 py-3 rounded-xl bg-brand-cyan/20 hover:bg-brand-cyan/30 text-brand-cyan border border-brand-cyan/40 font-bold text-xs flex items-center justify-center gap-2 shrink-0 transition-all shadow-sm"
                  title="Scan barcode with device camera"
                >
                  <Camera className="w-4 h-4" />
                  <span>Scan Camera</span>
                </button>
              </div>

              {/* Quick Search Keywords / Popular Frames */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px]">
                <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider mr-1">
                  Quick Search:
                </span>
                {[
                  'Titanium Pure', 
                  'Aviator', 
                  'Wayfarer', 
                  'Rimless', 
                  'Reading', 
                  'Blue Cut',
                  'Geometric Hex'
                ].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setSearchInput(tag);
                      fetchSearchProducts(tag);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-brand-cyan/15 dark:hover:bg-brand-cyan/20 text-slate-700 dark:text-slate-300 hover:text-brand-cyan border border-slate-200 dark:border-white/10 transition-colors text-[11px]"
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* Instant Search Suggestions Dropdown with Multiple Selection */}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-[100] mt-2 bg-white dark:bg-slate-900 rounded-2xl border-2 border-brand-cyan shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden divide-y divide-slate-100 dark:divide-white/10 max-h-96 overflow-y-auto">
                  <div className="p-3 bg-slate-100 dark:bg-slate-950 text-[11px] text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider flex items-center justify-between sticky top-0 z-20 backdrop-blur-md border-b border-slate-200 dark:border-white/10">
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-brand-cyan" />
                      <span>{searchResults.length} Products Found &bull; Click to add multiple items</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSearchResults([])}
                      className="px-3 py-1 rounded-xl bg-brand-cyan hover:bg-brand-cyan/90 text-slate-950 font-extrabold text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Done ({posItems.reduce((acc, it) => acc + it.quantity, 0)} In Bill)</span>
                    </button>
                  </div>
                  {searchResults.map((p) => {
                    const inCartItem = posItems.find(it => it.product_id === p.id || it.sku === p.sku);
                    const qtyInCart = inCartItem?.quantity || 0;
                    return (
                      <div
                        key={p.id}
                        className={`p-3.5 hover:bg-brand-cyan/10 flex items-center justify-between text-xs transition-colors group ${
                          qtyInCart > 0 ? 'bg-brand-cyan/5 dark:bg-brand-cyan/[0.08] border-l-4 border-brand-cyan' : ''
                        }`}
                      >
                        <div 
                          onClick={() => addProductToBill(p, true)}
                          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                        >
                          <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-black/50 p-1 flex items-center justify-center shrink-0 border border-slate-200 dark:border-white/10 overflow-hidden">
                            <img 
                              src={p.primary_image || p.image_url || '/logo_symbol.png'} 
                              alt={p.name} 
                              className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                              onError={(e) => { e.currentTarget.src = '/logo_symbol.png'; }}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-white block text-xs truncate group-hover:text-brand-cyan transition-colors">
                                {p.name}
                              </span>
                              {p.brand_name && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                                  {p.brand_name}
                                </span>
                              )}
                              {qtyInCart > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-brand-cyan text-slate-950 shadow-sm flex items-center gap-1">
                                  <Check className="w-3 h-3" /> In Bill ({qtyInCart})
                                </span>
                              )}
                            </div>
                            <span className="text-slate-500 dark:text-slate-400 text-[11px] font-mono block mt-0.5">
                              SKU: <strong className="text-brand-cyan">{p.sku}</strong> &bull; Size: {p.frame_size || 'Medium'} &bull; Shape: {p.frame_shape || '—'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <div className="text-right">
                            <span className="font-extrabold text-slate-900 dark:text-white block font-mono text-sm">
                              ₹{(p.discount_price || p.price)?.toLocaleString('en-IN')}
                            </span>
                            <span className={`text-[10px] font-bold block ${p.stock_quantity > 0 ? 'text-teal-600 dark:text-teal-400' : 'text-rose-500'}`}>
                              {p.stock_quantity > 0 ? `${p.stock_quantity} in stock` : 'Out of stock'}
                            </span>
                          </div>

                          {qtyInCart > 0 ? (
                            <div className="flex items-center gap-1 bg-brand-cyan/20 border border-brand-cyan/40 rounded-xl p-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const idx = posItems.findIndex(it => it.product_id === p.id || it.sku === p.sku);
                                  if (idx > -1) updateItemQty(idx, qtyInCart - 1);
                                }}
                                className="w-6 h-6 rounded-lg bg-white/20 hover:bg-white/30 text-slate-900 dark:text-white font-black text-xs flex items-center justify-center transition-colors"
                                title="Decrease quantity"
                              >
                                -
                              </button>
                              <span className="w-5 text-center font-extrabold text-xs text-slate-900 dark:text-white font-mono">
                                {qtyInCart}
                              </span>
                              <button
                                type="button"
                                onClick={() => addProductToBill(p, true)}
                                className="w-6 h-6 rounded-lg bg-brand-cyan hover:bg-brand-cyan/90 text-slate-950 font-black text-xs flex items-center justify-center transition-colors"
                                title="Add one more"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => addProductToBill(p, true)}
                              className="px-3.5 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1 shadow-sm bg-brand-cyan hover:bg-brand-cyan/90 text-slate-950 transition-all"
                              title="Add to bill (keeps dropdown open)"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add to Bill</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 sticky bottom-0 z-10 flex items-center justify-between border-t border-slate-200 dark:border-white/10">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Select as many frames as needed:
                    </span>
                    <button
                      type="button"
                      onClick={() => setSearchResults([])}
                      className="px-4 py-1.5 rounded-xl bg-brand-cyan hover:bg-brand-cyan/90 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-cyan-glow"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Done Selecting ({posItems.reduce((acc, it) => acc + it.quantity, 0)} Items)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ========== CUSTOM ITEM PANEL ========== */}
            <div className="glass-card rounded-2xl border border-purple-500/30 shadow-sm overflow-hidden">
              {/* Header Toggle */}
              <button
                type="button"
                onClick={() => setShowCustomItemForm(prev => !prev)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-purple-500/5 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
                    <PenLine className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-white block">Add Custom / Unlisted Item</span>
                    <span className="text-[10px] text-slate-400">Repairs, services, lens charges, or any item not in catalog</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 font-mono font-bold">NO STOCK DEDUCTED</span>
                  <span className={`text-purple-400 transition-transform duration-200 ${showCustomItemForm ? 'rotate-180' : ''}`}>▼</span>
                </div>
              </button>

              {/* Collapsible Form Body */}
              {showCustomItemForm && (
                <div className="px-5 pb-5 pt-1 border-t border-purple-500/20 space-y-3 bg-purple-500/[0.03]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    {/* Item Name */}
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                        <Tag className="w-3 h-3 text-purple-400" /> Item / Service Name *
                      </label>
                      <input
                        type="text"
                        value={customItemForm.name}
                        onChange={e => setCustomItemForm(p => ({ ...p, name: e.target.value }))}
                        placeholder="e.g. Progressive Lens Fitting, Frame Repair, Cleaning Kit, Consultation Charge..."
                        className="w-full glass-input rounded-xl px-3.5 py-2 text-xs"
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomItemToBill(); } }}
                      />
                    </div>

                    {/* Price */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Unit Price (₹) *</label>
                      <input
                        type="number"
                        min="1"
                        value={customItemForm.unit_price}
                        onChange={e => setCustomItemForm(p => ({ ...p, unit_price: e.target.value }))}
                        placeholder="e.g. 350"
                        className="w-full glass-input rounded-xl px-3.5 py-2 text-xs font-mono"
                      />
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Quantity</label>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setCustomItemForm(p => ({ ...p, quantity: Math.max(1, (p.quantity || 1) - 1) }))}
                          className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-sm flex items-center justify-center transition-colors">−</button>
                        <input
                          type="number"
                          min="1"
                          value={customItemForm.quantity}
                          onChange={e => setCustomItemForm(p => ({ ...p, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                          className="flex-1 glass-input rounded-xl px-3 py-2 text-xs font-mono text-center"
                        />
                        <button type="button" onClick={() => setCustomItemForm(p => ({ ...p, quantity: (p.quantity || 1) + 1 }))}
                          className="w-8 h-8 rounded-lg bg-brand-cyan/20 hover:bg-brand-cyan/30 text-brand-cyan font-bold text-sm flex items-center justify-center transition-colors">+</button>
                      </div>
                    </div>

                    {/* Optional Add-on Label */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Add-on Charge Label <span className="text-slate-500 font-normal">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={customItemForm.addon_label}
                        onChange={e => setCustomItemForm(p => ({ ...p, addon_label: e.target.value }))}
                        placeholder="e.g. Anti-Glare Coating, Lens Fitting"
                        className="w-full glass-input rounded-xl px-3.5 py-2 text-xs"
                      />
                    </div>

                    {/* Optional Add-on Price */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Add-on Price (₹) <span className="text-slate-500 font-normal">(optional)</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={customItemForm.addon_price || ''}
                        onChange={e => setCustomItemForm(p => ({ ...p, addon_price: parseFloat(e.target.value) || 0 }))}
                        placeholder="0"
                        className="w-full glass-input rounded-xl px-3.5 py-2 text-xs font-mono"
                      />
                    </div>

                    {/* Custom SKU — optional */}
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Custom SKU / Code <span className="text-slate-500 font-normal">(optional — auto-generated if blank)</span>
                      </label>
                      <input
                        type="text"
                        value={customItemForm.sku}
                        onChange={e => setCustomItemForm(p => ({ ...p, sku: e.target.value }))}
                        placeholder="e.g. SRV-LENS-01 (leave blank to auto-generate)"
                        className="w-full glass-input rounded-xl px-3.5 py-2 text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Preview & Add Button */}
                  {customItemForm.name && customItemForm.unit_price > 0 && (
                    <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs flex items-center justify-between gap-2">
                      <div className="text-slate-300 leading-relaxed">
                        <strong className="text-white">{customItemForm.name}</strong>
                        {customItemForm.addon_label && <span className="text-purple-300"> + {customItemForm.addon_label}</span>}
                        <span className="mx-2 text-slate-500">×{customItemForm.quantity || 1}</span>
                        <span className="font-mono text-brand-cyan font-bold">
                          = ₹{(((parseFloat(customItemForm.unit_price) || 0) + (parseFloat(customItemForm.addon_price) || 0)) * (parseInt(customItemForm.quantity) || 1)).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={addCustomItemToBill}
                      className="flex-1 btn-primary py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-cyan-glow"
                    >
                      <Plus className="w-4 h-4" />
                      Add Custom Item to Bill
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowCustomItemForm(false); setCustomItemForm({ name: '', sku: '', unit_price: '', quantity: 1, addon_label: '', addon_price: 0 }); }}
                      className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-bold transition-colors border border-white/10"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* POS Bill Items Table */}
            <div className="glass-card rounded-2xl p-5 space-y-4 overflow-x-auto border border-white/10">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-cyan flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  <span>Invoice Items ({posItems.length})</span>
                </h3>
                {posItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setPosItems([])}
                    className="text-[11px] text-rose-400 hover:underline"
                  >
                    Clear All Items
                  </button>
                )}
              </div>

              {posItems.length === 0 ? (
                <div className="py-14 text-center text-xs text-slate-500 space-y-2">
                  <Barcode className="w-12 h-12 mx-auto opacity-30 text-brand-cyan" />
                  <p className="font-medium text-slate-400">No items added yet.</p>
                  <p className="text-[11px] text-slate-500">
                    Use the search bar above, tap <strong>Scan with Camera</strong>, or scan with a USB machine.
                  </p>
                </div>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-slate-400 border-b border-white/10 font-bold text-[11px]">
                      <th className="py-2.5">Item / Frame</th>
                      <th className="py-2.5">Unit Price</th>
                      <th className="py-2.5 text-center">Qty</th>
                      <th className="py-2.5 text-right">Total</th>
                      <th className="py-2.5 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {posItems.map((it, idx) => (
                      <tr key={idx} className={`hover:bg-white/[0.02] ${it.is_custom ? 'bg-purple-500/[0.03]' : ''}`}>
                        <td className="py-3.5 font-sans">
                          <div className="flex items-center gap-2 flex-wrap">
                            <strong className="text-white font-bold text-sm">{it.name}</strong>
                            {it.is_custom && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 font-mono font-bold uppercase tracking-wider">CUSTOM</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2.5 flex-wrap mt-1">
                            <span className="text-brand-cyan text-[10px] font-mono">{it.sku}</span>
                            {/* Only show size/color selectors for catalog items */}
                            {!it.is_custom && (
                              <>
                                {/* Size Selector */}
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-slate-400 font-medium">Size:</span>
                                  <select
                                    value={it.frame_size || 'Medium'}
                                    onChange={(e) => updateItemSize(idx, e.target.value)}
                                    className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-900 border border-white/20 text-white focus:border-brand-cyan outline-none cursor-pointer"
                                  >
                                    {(it.available_sizes?.length > 0 ? it.available_sizes : ['Small', 'Medium', 'Large', 'Extra Large']).map(s => (
                                      <option key={s} value={s}>{s}</option>
                                    ))}
                                  </select>
                                </div>
                                {/* Color Selector */}
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-slate-400 font-medium">Color:</span>
                                  <select
                                    value={it.frame_color || 'Matte Black'}
                                    onChange={(e) => updateItemColor(idx, e.target.value)}
                                    className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-900 border border-white/20 text-white focus:border-brand-cyan outline-none cursor-pointer"
                                  >
                                    {(it.available_colors?.length > 0 ? it.available_colors : ['Matte Black', 'Tortoise Amber', 'Gunmetal Grey', 'Rose Gold', 'Silver', 'Gold', 'Transparent Crystal']).map(c => (
                                      <option key={c} value={c}>{c}</option>
                                    ))}
                                  </select>
                                </div>
                              </>
                            )}
                            {it.is_custom && it.lens_type && (
                              <span className="text-[10px] text-purple-300 font-medium">+ {it.lens_type}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 text-slate-300">
                          ₹{it.unit_price}
                        </td>
                        <td className="py-3.5 text-center">
                          <div className="inline-flex items-center gap-1.5 bg-white/5 rounded-xl p-1 border border-white/10">
                            <button 
                              type="button"
                              onClick={() => updateItemQty(idx, it.quantity - 1)}
                              className="p-1 hover:bg-white/10 rounded-lg text-slate-300 transition-colors"
                              title="Decrease quantity by 1"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-7 text-center font-bold text-white text-xs">{it.quantity}</span>
                            <button 
                              type="button"
                              onClick={() => updateItemQty(idx, it.quantity + 1)}
                              className="p-1 hover:bg-white/10 rounded-lg text-slate-300 transition-colors"
                              title="Increase quantity by 1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5 text-right font-bold text-white text-sm">
                          ₹{(it.unit_price * it.quantity).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 text-center">
                          <button 
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                            title="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: Customer, Discount, Warranty, Payment Mode */}
          <div className="lg:col-span-4 space-y-6">
            <div className="glass-card rounded-2xl p-6 space-y-4 border border-white/10">
              
              <h3 className="text-xs font-black uppercase tracking-wider text-sky-700 dark:text-brand-cyan border-b border-slate-200 dark:border-white/10 pb-2">
                Customer &amp; Payment Details
              </h3>

              <div>
                <label className="block text-[11px] text-slate-300 mb-1">Customer Name</label>
                <input 
                  type="text" 
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Walk-in Customer"
                  className="w-full glass-input rounded-xl px-3.5 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 mb-1">Customer Phone</label>
                <input 
                  type="tel" 
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. 9830123456"
                  className="w-full glass-input rounded-xl px-3.5 py-2 text-xs"
                />
              </div>

              {/* GST vs NON-GST Selector (Default: Non-GST) */}
              <div className="bg-slate-100 dark:bg-white/5 p-3 rounded-xl border border-slate-200 dark:border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-900 dark:text-white block">
                    Tax / Invoice Format
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {isGstInvoice ? 'GST Tax Invoice (18%)' : 'Non-GST Retail Memo (Default)'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGstInvoice(prev => !prev)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isGstInvoice 
                      ? 'bg-amber-500 text-slate-950 shadow-sm' 
                      : 'bg-brand-cyan text-slate-950 font-extrabold shadow-sm'
                  }`}
                >
                  {isGstInvoice ? '✓ GST Enabled' : '✓ Non-GST (Default)'}
                </button>
              </div>

              {/* Payment Mode Selector */}
              <div>
                <label className="block text-[11px] text-slate-300 mb-1 font-bold">Payment Method</label>
                <div className="grid grid-cols-3 gap-2 text-xs font-bold">
                  {['CASH', 'UPI', 'CARD'].map((pm) => (
                    <button
                      key={pm}
                      type="button"
                      onClick={() => setPaymentMode(pm)}
                      className={`py-2 rounded-xl border text-center font-black transition-all cursor-pointer ${
                        paymentMode === pm 
                          ? 'bg-brand-cyan text-slate-950 border-brand-cyan shadow-sm' 
                          : 'bg-white dark:bg-white/5 border-slate-300 dark:border-white/10 text-slate-800 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 shadow-xs'
                      }`}
                    >
                      {pm}
                    </button>
                  ))}
                </div>
              </div>

              {/* Discount Amount */}
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">Discount Amount (₹)</label>
                <input 
                  type="number"
                  min="0"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full glass-input rounded-xl px-3.5 py-2 text-xs font-mono"
                  placeholder="0"
                />
              </div>

              {/* Optical Warranty Note */}
              <div>
                <label className="block text-[11px] text-slate-300 mb-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                  <span>Optical Warranty Certificate Note</span>
                </label>
                <input 
                  type="text"
                  value={warrantyNote}
                  onChange={(e) => setWarrantyNote(e.target.value)}
                  className="w-full glass-input rounded-xl px-3.5 py-2 text-xs"
                  placeholder="e.g. 1-Year Optical Warranty on Frame & Lenses"
                />
              </div>

              {/* Doctor / Prescription Note */}
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">Bill / Rx Note (Optional)</label>
                <input 
                  type="text"
                  value={billNotes}
                  onChange={(e) => setBillNotes(e.target.value)}
                  className="w-full glass-input rounded-xl px-3.5 py-2 text-xs"
                  placeholder="e.g. Power SPH -1.50, Blue-cut AR coating"
                />
              </div>

              {/* Totals Breakdown */}
              <div className="border-t border-white/10 pt-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Subtotal</span>
                  <span className="font-mono font-bold">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-teal-400 font-semibold">
                    <span>Discount Applied</span>
                    <span className="font-mono">-₹{discountAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="border-t border-slate-200 dark:border-white/10 pt-2 flex justify-between items-baseline">
                  <span className="font-bold text-slate-900 dark:text-white text-sm">Grand Total</span>
                  <span className="text-2xl font-black text-sky-700 dark:text-brand-cyan font-mono">₹{finalTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Error Display above Button */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/20 border border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span className="font-semibold">{errorMessage}</span>
                </div>
              )}

              {/* Finalize Button */}
              <button
                type="button"
                onClick={handleFinalizeBill}
                disabled={isSubmitting || posItems.length === 0}
                className="w-full py-3.5 px-4 rounded-xl bg-brand-cyan hover:bg-cyan-400 text-slate-950 font-black text-xs shadow-cyan-glow flex items-center justify-center gap-2 disabled:opacity-60 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-600 dark:disabled:text-slate-400 disabled:shadow-none transition-all cursor-pointer hover:scale-[1.01] active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 text-slate-950 animate-spin" />
                    <span>Finalizing &amp; Deducting Stock...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                    <span>Finalize &amp; Deduct Stock (₹{finalTotal.toLocaleString('en-IN')})</span>
                  </>
                )}
              </button>

              <p className="text-[10px] text-slate-500 text-center">
                Stock automatically decreases upon finalized invoice generation.
              </p>

            </div>
          </div>

        </div>
      )}

      {/* =========================================================================
          VIEW 2: INVOICES ARCHIVE
         ========================================================================= */}
      {activeView === 'ARCHIVE' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0A192F] p-4 rounded-2xl border border-white/10">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by invoice number, customer name, phone..."
                value={archiveSearch}
                onChange={(e) => setArchiveSearch(e.target.value)}
                className="w-full glass-input rounded-xl pl-10 pr-4 py-2 text-xs"
              />
            </div>
            <button
              onClick={fetchArchiveInvoices}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${archiveLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Invoices</span>
            </button>
          </div>

          <div className="bg-[#0A192F] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            {archiveLoading ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <div className="w-8 h-8 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin mx-auto" />
                <div className="text-xs">Loading all generated invoices...</div>
              </div>
            ) : filteredArchive.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <FileText className="w-10 h-10 mx-auto opacity-40 text-slate-500" />
                <p className="font-bold text-sm text-slate-300">No invoices found</p>
                <p className="text-xs text-slate-500">POS counter bills and customer orders will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-white/[0.02] text-slate-400 border-b border-white/10 uppercase tracking-wider font-semibold text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Customer &amp; Phone</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Mode</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredArchive.map((inv) => (
                      <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-brand-cyan">{inv.invoice_number}</span>
                          {inv.order_number && (
                            <div className="text-[10px] text-slate-500 font-mono">Ref: {inv.order_number}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {inv.invoice_date || (inv.created_at ? new Date(inv.created_at).toLocaleDateString() : '—')}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{inv.customer_name || 'Walk-in Customer'}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{inv.customer_phone || '—'}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono uppercase">
                            {inv.invoice_type || 'POS'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold uppercase text-slate-300">
                          {inv.payment_mode || 'CASH'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-extrabold text-white text-sm">
                          ₹{parseFloat(inv.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedInvoiceForModal({
                              invoiceNumber: inv.invoice_number,
                              orderNumber: inv.order_number || `ORD-${inv.order_id}`,
                              invoiceDate: inv.invoice_date || (inv.created_at ? new Date(inv.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
                              type: inv.invoice_type || 'POS',
                              status: inv.order_status || 'Delivered',
                              paymentMode: inv.payment_mode || 'CASH',
                              paymentStatus: inv.payment_status || 'Paid',
                              customerName: inv.customer_name || 'Walk-in Customer',
                              customerPhone: inv.customer_phone || '—',
                              customerAddress: inv.customer_address || 'Digha Store Counter',
                              items: inv.items || [],
                              subtotal: inv.subtotal || inv.total_amount,
                              discountAmount: inv.discount_amount || 0,
                              totalAmount: inv.total_amount,
                              warrantyNote: '1-Year Optical Frame & Multi-Coat Optics Warranty',
                              notes: inv.order_notes || ''
                            })}
                            className="px-3 py-1 rounded-lg bg-brand-cyan/20 hover:bg-brand-cyan/30 text-brand-cyan border border-brand-cyan/30 text-xs font-bold inline-flex items-center gap-1 transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>View / Print</span>
                          </button>
                          <button
                            onClick={() => setInvoiceToDelete(inv)}
                            className="ml-2 px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold inline-flex items-center gap-1 transition-colors"
                            title="Delete Invoice (with stock restore option)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          CAMERA BARCODE SCANNER MODAL
         ========================================================================= */}
      {cameraModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-lg w-full bg-slate-900 border border-white/20 rounded-3xl overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Camera className="w-5 h-5 text-brand-cyan" />
                <span>Camera Barcode Scanner</span>
              </div>
              <button
                onClick={stopCamera}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Point your camera at the Code 128 barcode or QR code on the optical frame or shelf tag.
            </p>

            {/* Video Viewport with Targeting Laser Box */}
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border-2 border-brand-cyan/40">
              <video 
                ref={videoRef} 
                className="w-full h-full object-cover" 
                playsInline 
                muted
              />

              {/* Scanning Target Reticle */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-64 h-32 border-2 border-brand-cyan rounded-xl relative shadow-[0_0_20px_rgba(0,180,216,0.5)]">
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-rose-500 animate-pulse" />
                  <span className="absolute -bottom-6 left-0 right-0 text-center text-[10px] text-brand-cyan font-bold tracking-wider uppercase">
                    Align Barcode in Box
                  </span>
                </div>
              </div>
            </div>

            {cameraError && (
              <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs">
                {cameraError}
              </div>
            )}

            <div className="flex justify-between items-center text-xs text-slate-400 pt-2">
              <span>Scanning automatically...</span>
              <button
                type="button"
                onClick={stopCamera}
                className="btn-primary py-2 px-5 text-xs rounded-xl"
              >
                Done Scanning
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          WATERMARKED TAX INVOICE & GUARANTEE CERTIFICATE MODAL
         ========================================================================= */}
      <InvoiceModal
        isOpen={!!selectedInvoiceForModal}
        onClose={() => setSelectedInvoiceForModal(null)}
        invoiceData={selectedInvoiceForModal
          ? { ...selectedInvoiceForModal, upi_id: storeSettings?.upi_id || '', payment_qr_image: storeSettings?.upi_qr_image || '' }
          : null
        }
      />

      {/* =========================================================================
          INVOICE DELETE CONFIRMATION MODAL (Add to Stock vs Delete Permanently)
         ========================================================================= */}
      {invoiceToDelete && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-md w-full bg-slate-900 border border-white/20 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <Trash2 className="w-5 h-5" />
                <span>Delete Invoice {invoiceToDelete.invoice_number}</span>
              </div>
              <button
                onClick={() => setInvoiceToDelete(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              How would you like to handle the items associated with invoice <strong className="text-white font-mono">{invoiceToDelete.invoice_number}</strong>?
            </p>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                disabled={isDeletingInvoice}
                onClick={() => handleDeleteConfirm(true)}
                className="w-full py-3 px-4 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <Check className="w-4 h-4" />
                <span>Add Back to Inventory Stock &amp; Delete</span>
              </button>

              <button
                type="button"
                disabled={isDeletingInvoice}
                onClick={() => handleDeleteConfirm(false)}
                className="w-full py-3 px-4 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Permanently (Do Not Alter Stock)</span>
              </button>

              <button
                type="button"
                onClick={() => setInvoiceToDelete(null)}
                className="w-full py-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
