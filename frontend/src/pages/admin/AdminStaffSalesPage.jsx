import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  UserCheck, DollarSign, ShoppingBag, Receipt, Package, 
  Download, FileSpreadsheet, RefreshCw, Search, Filter, 
  Calendar, Award, Eye, Clock, Phone, Mail, ChevronRight, 
  CheckCircle2, XCircle, AlertCircle, Sparkles, TrendingUp,
  BarChart3, Layers, CreditCard, Printer, Tag
} from 'lucide-react';
import api from '../../api/client';
import { downloadExcelFile, downloadCSVFile } from '../../utils/excelExport';

export const AdminStaffSalesPage = () => {
  const [timeRange, setTimeRange] = useState('month'); // 'today' | 'week' | 'month' | 'year' | 'custom'
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [exportNotice, setExportNotice] = useState(null);

  // Modals
  const [selectedStaffProducts, setSelectedStaffProducts] = useState(null);
  const [selectedStaffBills, setSelectedStaffBills] = useState(null);
  const [invoiceModalData, setInvoiceModalData] = useState(null);

  // Backend Report Data
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState('');

  const fetchStaffReports = async () => {
    try {
      setLoading(true);
      setError('');
      let url = `/admin/reports.php?range=${timeRange}`;
      if (timeRange === 'custom') {
        if (customStart) url += `&start_date=${customStart}`;
        if (customEnd) url += `&end_date=${customEnd}`;
      }
      const res = await api.get(url);
      if (res.success && res.data) {
        setReportData(res.data);
      } else {
        setError(res.message || 'Failed to fetch staff sales data');
      }
    } catch (err) {
      console.error('Staff sales fetch error:', err);
      setError(err.message || 'Network error fetching staff sales data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (timeRange !== 'custom') {
      fetchStaffReports();
    }
  }, [timeRange]);

  const handleApplyCustomDate = (e) => {
    e?.preventDefault();
    if (!customStart || !customEnd) {
      setError('Please select both start and end dates');
      return;
    }
    fetchStaffReports();
  };

  const staffPerformance = reportData?.staff_performance || [];
  const grossRevenue = reportData?.summary?.gross_revenue || 0;

  // Filtered staff list
  const filteredStaff = staffPerformance.filter(st => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      st.full_name?.toLowerCase().includes(q) ||
      st.username?.toLowerCase().includes(q) ||
      st.email?.toLowerCase().includes(q) ||
      st.phone?.toLowerCase().includes(q) ||
      st.role_name?.toLowerCase().includes(q);

    const matchesRole = roleFilter === 'all' || st.role_slug === roleFilter || st.role_name?.toLowerCase() === roleFilter.toLowerCase();
    return matchesSearch && matchesRole;
  });

  // Calculate Aggregates for Staff
  const totalStaffSales = staffPerformance.reduce((acc, s) => acc + (s.total_sales || 0), 0);
  const totalStaffBills = staffPerformance.reduce((acc, s) => acc + (s.total_bills || 0), 0);
  const totalStaffUnits = staffPerformance.reduce((acc, s) => acc + (s.total_units || 0), 0);
  const topPerformer = [...staffPerformance].sort((a, b) => (b.total_sales || 0) - (a.total_sales || 0))[0];

  // --------------------------------------------------------------------------
  // EXCEL & CSV EXPORT HANDLERS
  // --------------------------------------------------------------------------
  const handleExportStaffSummaryExcel = () => {
    if (!reportData) return;
    const headers = [
      { key: 'rank', label: 'Rank' },
      { key: 'name', label: 'Staff Full Name' },
      { key: 'email', label: 'Email Address' },
      { key: 'phone', label: 'Phone Number' },
      { key: 'role', label: 'Staff Role' },
      { key: 'bills', label: 'Total Invoices / Bills' },
      { key: 'units', label: 'Units Sold (Frames/Lenses)' },
      { key: 'sales', label: 'Total Billed Revenue (₹)' },
      { key: 'share', label: 'Store Revenue Share (%)' },
      { key: 'avg_bill', label: 'Avg Ticket Value (₹)' },
      { key: 'cash', label: 'Cash Sales (₹)' },
      { key: 'upi', label: 'UPI Sales (₹)' },
      { key: 'card', label: 'Card Sales (₹)' },
      { key: 'cod', label: 'COD Sales (₹)' }
    ];

    const rows = staffPerformance.map((st, idx) => {
      const p = st.payment_breakdown || {};
      const share = totalStaffSales > 0 ? ((st.total_sales / totalStaffSales) * 100).toFixed(1) : '0';
      const avg = st.total_bills > 0 ? Math.round(st.total_sales / st.total_bills) : 0;
      return {
        rank: idx + 1,
        name: st.full_name || st.username,
        email: st.email || '',
        phone: st.phone || '',
        role: st.role_name || 'Staff',
        bills: st.total_bills || 0,
        units: st.total_units || 0,
        sales: `₹${st.total_sales?.toLocaleString('en-IN') || 0}`,
        share: `${share}%`,
        avg_bill: `₹${avg?.toLocaleString('en-IN')}`,
        cash: `₹${(p.CASH || 0).toLocaleString('en-IN')}`,
        upi: `₹${(p.UPI || 0).toLocaleString('en-IN')}`,
        card: `₹${(p.CARD || 0).toLocaleString('en-IN')}`,
        cod: `₹${(p.COD || 0).toLocaleString('en-IN')}`
      };
    });

    const filename = `Netra_Unnayan_Staff_Sales_Performance_${timeRange}_${new Date().toISOString().slice(0, 10)}`;
    downloadExcelFile(filename, 'Staff Sales Ledger', headers, rows, `Netra Unnayan Staff Billing & Sales Audit (${timeRange.toUpperCase()})`);
    showNotice('Excel Spreadsheet exported successfully (.xls)!');
  };

  const handleExportStaffSummaryCSV = () => {
    if (!reportData) return;
    const headers = [
      { key: 'name', label: 'Staff Name' },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Role' },
      { key: 'bills', label: 'Total Invoices' },
      { key: 'units', label: 'Units Sold' },
      { key: 'sales', label: 'Revenue (INR)' },
      { key: 'cash', label: 'Cash (INR)' },
      { key: 'upi', label: 'UPI (INR)' },
      { key: 'card', label: 'Card (INR)' },
      { key: 'cod', label: 'COD (INR)' }
    ];

    const rows = staffPerformance.map((st) => {
      const p = st.payment_breakdown || {};
      return {
        name: st.full_name || st.username,
        email: st.email || '',
        role: st.role_name || 'Staff',
        bills: st.total_bills || 0,
        units: st.total_units || 0,
        sales: st.total_sales || 0,
        cash: p.CASH || 0,
        upi: p.UPI || 0,
        card: p.CARD || 0,
        cod: p.COD || 0
      };
    });

    const filename = `Netra_Unnayan_Staff_Sales_${timeRange}_${new Date().toISOString().slice(0, 10)}`;
    downloadCSVFile(filename, headers, rows);
    showNotice('CSV with UTF-8 BOM exported successfully (.csv)!');
  };

  const handleExportSingleStaffProducts = (st) => {
    if (!st || !st.products_sold) return;
    const headers = [
      { key: 'product_name', label: 'Product / Lens Name' },
      { key: 'product_sku', label: 'SKU Code' },
      { key: 'category_name', label: 'Category' },
      { key: 'units_sold', label: 'Units Sold' },
      { key: 'avg_unit_price', label: 'Avg Unit Price (₹)' },
      { key: 'total_revenue', label: 'Total Revenue (₹)' }
    ];

    const rows = st.products_sold.map(p => ({
      product_name: p.product_name,
      product_sku: p.product_sku || 'N/A',
      category_name: p.category_name || 'Eyewear',
      units_sold: p.units_sold,
      avg_unit_price: `₹${parseFloat(p.avg_unit_price || 0).toLocaleString('en-IN')}`,
      total_revenue: `₹${parseFloat(p.total_revenue || 0).toLocaleString('en-IN')}`
    }));

    const cleanStaffName = (st.full_name || st.username).replace(/\s+/g, '_');
    downloadExcelFile(`Staff_Products_${cleanStaffName}_${timeRange}`, `${cleanStaffName} Products`, headers, rows, `Products Sold by ${st.full_name} (${timeRange.toUpperCase()})`);
    showNotice(`Product breakdown for ${st.full_name} exported (.xls)!`);
  };

  const handleExportSingleStaffBills = (st) => {
    if (!st || !st.recent_bills) return;
    const headers = [
      { key: 'invoice_number', label: 'Invoice Number' },
      { key: 'order_number', label: 'Order Number' },
      { key: 'created_at', label: 'Date & Time' },
      { key: 'customer_name', label: 'Customer / Patient' },
      { key: 'customer_phone', label: 'Phone Number' },
      { key: 'payment_mode', label: 'Payment Mode' },
      { key: 'payment_status', label: 'Payment Status' },
      { key: 'order_status', label: 'Order Status' },
      { key: 'total_amount', label: 'Total Amount (₹)' }
    ];

    const rows = st.recent_bills.map(b => ({
      invoice_number: b.invoice_number,
      order_number: b.order_number,
      created_at: b.created_at,
      customer_name: b.customer_name || 'Walk-in Guest',
      customer_phone: b.customer_phone || 'N/A',
      payment_mode: b.payment_mode || 'CASH',
      payment_status: b.payment_status || 'Paid',
      order_status: b.order_status || 'Completed',
      total_amount: `₹${parseFloat(b.total_amount || 0).toLocaleString('en-IN')}`
    }));

    const cleanStaffName = (st.full_name || st.username).replace(/\s+/g, '_');
    downloadExcelFile(`Staff_Invoices_${cleanStaffName}_${timeRange}`, `${cleanStaffName} Invoices`, headers, rows, `Invoices Billed by ${st.full_name} (${timeRange.toUpperCase()})`);
    showNotice(`Invoices ledger for ${st.full_name} exported (.xls)!`);
  };

  const showNotice = (txt) => {
    setExportNotice(txt);
    setTimeout(() => setExportNotice(null), 4000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-extrabold tracking-wider text-brand-cyan">
              Enterprise POS &amp; Staff Operations
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-bold">
              Live Auditing Active
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1 flex items-center gap-2.5">
            <UserCheck className="w-7 h-7 text-brand-cyan" />
            Staff Sales, Counter Billing &amp; Products Ledger
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track individual sales performance, itemized products sold per staff member, invoice slips, and cashier cash/UPI settlements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link
            to="/admin/reports"
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all text-xs flex items-center gap-1.5"
            title="Go to Financial Overview Reports"
          >
            <BarChart3 className="w-4 h-4 text-sky-400" />
            <span className="hidden sm:inline">Store Financials</span>
          </Link>

          <Link
            to="/admin/pos"
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all text-xs flex items-center gap-1.5 font-bold"
            title="Open POS Counter"
          >
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">POS Counter</span>
          </Link>

          <button
            onClick={fetchStaffReports}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-cyan' : ''}`} />
          </button>

          {/* Excel Export Button */}
          <button
            onClick={handleExportStaffSummaryExcel}
            disabled={!reportData || staffPerformance.length === 0}
            className="btn-primary py-2 px-4 rounded-xl text-xs font-bold shadow-cyan-glow flex items-center gap-2"
            title="Download full formatted Excel spreadsheet (.xls)"
          >
            <FileSpreadsheet className="w-4 h-4 text-slate-950" />
            <span>Export Excel (.xls)</span>
          </button>

          {/* CSV Export Button */}
          <button
            onClick={handleExportStaffSummaryCSV}
            disabled={!reportData || staffPerformance.length === 0}
            className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5"
            title="Download CSV format"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Export Toast Notice */}
      {exportNotice && (
        <div className="p-3.5 rounded-xl text-xs font-bold flex items-center justify-between gap-3 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{exportNotice}</span>
          </div>
          <button onClick={() => setExportNotice(null)} className="text-slate-400 hover:text-white font-bold">&times;</button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Date Range Toolbar & Navigation Tabs */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-3 bg-[#0A192F] border border-white/10 rounded-2xl">
        {/* Preset Range Selector */}
        <div className="flex items-center rounded-xl bg-[#060D17] border border-white/10 p-1 text-xs font-semibold overflow-x-auto scrollbar-none">
          {[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This Week' },
            { id: 'month', label: 'This Month' },
            { id: 'year', label: 'This Year' },
            { id: 'custom', label: 'Custom Date' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTimeRange(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                timeRange === tab.id
                  ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/40 shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Custom Date Inputs */}
        {timeRange === 'custom' && (
          <form onSubmit={handleApplyCustomDate} className="flex flex-wrap items-center gap-2 bg-[#060D17] p-2 rounded-xl border border-white/10">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-[#0A192F] border border-white/10 text-white text-xs focus:border-brand-cyan focus:outline-none"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-[#0A192F] border border-white/10 text-white text-xs focus:border-brand-cyan focus:outline-none"
            />
            <button
              type="submit"
              className="btn-primary px-3 py-1 rounded-lg text-xs font-bold"
            >
              Apply Filter
            </button>
          </form>
        )}

        {/* Search & Role Filter */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search staff name, email, role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-[#060D17] border border-white/10 text-white text-xs placeholder:text-slate-500 focus:border-brand-cyan focus:outline-none w-52 sm:w-64"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#060D17] border border-white/10 text-white text-xs focus:border-brand-cyan focus:outline-none"
          >
            <option value="all">All Roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="manager">Manager</option>
            <option value="staff">Staff / Cashier</option>
            <option value="optometrist">Optometrist</option>
          </select>
        </div>
      </div>

      {/* Staff Executive Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Staff Sales */}
        <div className="bg-[#0A192F] border border-brand-cyan/30 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-brand-cyan uppercase tracking-wider">
              Total Staff Sales Revenue
            </span>
            <div className="w-8 h-8 rounded-xl bg-brand-cyan/10 border border-brand-cyan/30 flex items-center justify-center text-brand-cyan">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white mt-2 font-mono">
            ₹{totalStaffSales.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
            <span className="text-emerald-400 font-bold">&#10003; {totalStaffBills} Counter Invoices</span>
            <span>&bull;</span>
            <span>{timeRange.toUpperCase()}</span>
          </div>
        </div>

        {/* Card 2: Eyewear Units Sold */}
        <div className="bg-[#0A192F] border border-emerald-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Total Units Sold by Staff
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white mt-2 font-mono">
            {totalStaffUnits} <span className="text-sm text-slate-400 font-sans font-normal">frames/lenses</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Avg {totalStaffBills > 0 ? (totalStaffUnits / totalStaffBills).toFixed(1) : 0} items per counter ticket
          </div>
        </div>

        {/* Card 3: Top Performer Staff */}
        <div className="bg-[#0A192F] border border-amber-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              Top Billing Performer
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-white mt-2 truncate">
            {topPerformer ? (topPerformer.full_name || topPerformer.username) : '—'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span className="text-amber-300 font-bold font-mono">
              ₹{(topPerformer?.total_sales || 0).toLocaleString('en-IN')}
            </span>
            <span>{topPerformer?.total_bills || 0} Bills</span>
          </div>
        </div>

        {/* Card 4: Active Staff Count */}
        <div className="bg-[#0A192F] border border-purple-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
              Active Billing Staff
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white mt-2 font-mono">
            {filteredStaff.length} <span className="text-sm text-slate-400 font-sans font-normal">members</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Store counter clerks, optometrists &amp; cashiers
          </div>
        </div>
      </div>

      {/* Staff Billing Performance Table */}
      <div className="bg-[#0A192F] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Receipt className="w-4 h-4 text-brand-cyan" />
              Staff Members Sales &amp; Product Details Ledger
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Click on <strong>Products Sold</strong> or <strong>Invoices Ledger</strong> to inspect itemized receipts.
            </p>
          </div>

          <span className="text-xs font-mono text-brand-cyan font-bold">
            Showing {filteredStaff.length} of {staffPerformance.length} staff
          </span>
        </div>

        {loading ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="text-xs font-bold">Loading staff billing ledger...</div>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <UserCheck className="w-12 h-12 mx-auto text-slate-600" />
            <div className="text-sm font-bold text-slate-300">No staff billing records found</div>
            <p className="text-xs text-slate-500">Try adjusting your date range or search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-white/[0.02] text-slate-400 border-b border-white/10 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4 text-center">Invoices Billed</th>
                  <th className="py-3 px-4 text-center">Units Sold</th>
                  <th className="py-3 px-4">Total Revenue</th>
                  <th className="py-3 px-4">Payment Methods</th>
                  <th className="py-3 px-4 text-right">Details &amp; Audit Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredStaff.map((st, idx) => {
                  const p = st.payment_breakdown || {};
                  const share = totalStaffSales > 0 ? ((st.total_sales / totalStaffSales) * 100).toFixed(1) : 0;
                  const isLeader = idx === 0 && st.total_sales > 0;

                  return (
                    <tr key={st.staff_id} className="hover:bg-white/[0.02] transition-colors">
                      {/* 1. Staff Member Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                            isLeader 
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm' 
                              : 'bg-white/5 text-slate-200 border-white/10'
                          }`}>
                            {(st.full_name || st.username || 'S').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm flex items-center gap-1.5">
                              <span>{st.full_name || st.username}</span>
                              {isLeader && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                                  Top Seller
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400">{st.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Role */}
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-500/15 text-brand-cyan border border-brand-cyan/30">
                          {st.role_name || 'Staff'}
                        </span>
                      </td>

                      {/* 3. Invoices Billed */}
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-200 text-sm">
                        {st.total_bills}
                      </td>

                      {/* 4. Units Sold */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono font-bold text-emerald-400 text-sm">
                          {st.total_units}
                        </span>
                        <div className="text-[10px] text-slate-500">frames / lenses</div>
                      </td>

                      {/* 5. Total Revenue */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-black text-white text-sm">
                          ₹{st.total_sales.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <span className="text-brand-cyan font-bold">{share}%</span>
                          <span>of staff total</span>
                        </div>
                      </td>

                      {/* 6. Payment Modes Breakdown */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {p.CASH > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[10px] font-mono border border-emerald-500/30">
                              Cash: ₹{p.CASH.toLocaleString('en-IN')}
                            </span>
                          )}
                          {p.UPI > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 text-[10px] font-mono border border-sky-500/30">
                              UPI: ₹{p.UPI.toLocaleString('en-IN')}
                            </span>
                          )}
                          {p.CARD > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 text-[10px] font-mono border border-purple-500/30">
                              Card: ₹{p.CARD.toLocaleString('en-IN')}
                            </span>
                          )}
                          {p.COD > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[10px] font-mono border border-amber-500/30">
                              COD: ₹{p.COD.toLocaleString('en-IN')}
                            </span>
                          )}
                          {(!p.CASH && !p.UPI && !p.CARD && !p.COD) && (
                            <span className="text-slate-500 text-[11px]">—</span>
                          )}
                        </div>
                      </td>

                      {/* 7. Action Buttons */}
                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {/* View Products Sold Modal Button */}
                        <button
                          onClick={() => setSelectedStaffProducts(st)}
                          className="py-1.5 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-brand-cyan hover:text-white border border-brand-cyan/30 text-xs font-bold inline-flex items-center gap-1 transition-all"
                          title="View all products and lenses sold by this staff member"
                        >
                          <Package className="w-3.5 h-3.5" />
                          <span>Products ({st.products_sold?.length || 0})</span>
                        </button>

                        {/* View Invoices Ledger Modal Button */}
                        <button
                          onClick={() => setSelectedStaffBills(st)}
                          className="py-1.5 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-emerald-400 hover:text-white border border-emerald-500/30 text-xs font-bold inline-flex items-center gap-1 transition-all"
                          title="View all bills generated by this staff member"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Invoices ({st.recent_bills?.length || 0})</span>
                        </button>

                        {/* Quick Single-Staff Excel Download */}
                        <button
                          onClick={() => handleExportSingleStaffBills(st)}
                          className="p-1.5 rounded-xl bg-white/5 hover:bg-emerald-600 text-slate-300 hover:text-white border border-white/10 text-xs inline-flex items-center transition-all"
                          title={`Download ${st.full_name}'s detailed Excel spreadsheet`}
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL 1: ITEMISED PRODUCTS SOLD PER STAFF MEMBER
         ========================================================================= */}
      {selectedStaffProducts && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0A192F] border border-white/15 rounded-2xl w-full max-w-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-xs font-bold text-brand-cyan uppercase tracking-wider">
                  Product Sales Breakdown
                </span>
                <h3 className="text-lg font-black text-white font-heading mt-0.5">
                  {selectedStaffProducts.full_name || selectedStaffProducts.username} — All Items Sold
                </h3>
                <p className="text-[11px] text-slate-400">
                  Period: {timeRange.toUpperCase()} &bull; Total {selectedStaffProducts.total_units} units across {selectedStaffProducts.products_sold?.length || 0} unique models
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportSingleStaffProducts(selectedStaffProducts)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                  title="Download products Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export Excel</span>
                </button>
                <button
                  onClick={() => setSelectedStaffProducts(null)}
                  className="text-slate-400 hover:text-white text-xl leading-none px-2"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Products Table */}
            <div className="overflow-y-auto flex-1 border border-white/10 rounded-xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-white/[0.04] text-slate-400 border-b border-white/10 uppercase tracking-wider font-semibold text-[10px] sticky top-0 bg-[#0A192F]">
                  <tr>
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-center">Units Sold</th>
                    <th className="py-2.5 px-3 text-right">Avg Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Total Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(selectedStaffProducts.products_sold || []).map((prod, pIdx) => (
                    <tr key={pIdx} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 px-3 font-bold text-white">
                        {prod.product_name}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-brand-cyan text-[11px]">
                        {prod.product_sku || 'NU-OPT'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {prod.category_name || 'Eyewear'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-400">
                        {prod.units_sold}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        ₹{parseFloat(prod.avg_unit_price || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                        ₹{parseFloat(prod.total_revenue || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs">
              <span className="text-slate-400">
                Total Products Billed: <strong className="text-white">{selectedStaffProducts.products_sold?.length || 0}</strong>
              </span>
              <button
                onClick={() => setSelectedStaffProducts(null)}
                className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: INVOICES & BILLS LEDGER PER STAFF MEMBER
         ========================================================================= */}
      {selectedStaffBills && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0A192F] border border-white/15 rounded-2xl w-full max-w-4xl p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Counter Invoices &amp; Receipts Ledger
                </span>
                <h3 className="text-lg font-black text-white font-heading mt-0.5">
                  {selectedStaffBills.full_name || selectedStaffBills.username} — Billed Orders
                </h3>
                <p className="text-[11px] text-slate-400">
                  Total {selectedStaffBills.total_bills} bills generated &bull; Gross Revenue ₹{selectedStaffBills.total_sales?.toLocaleString('en-IN')}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportSingleStaffBills(selectedStaffBills)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                  title="Download Invoices Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export Excel</span>
                </button>
                <button
                  onClick={() => setSelectedStaffBills(null)}
                  className="text-slate-400 hover:text-white text-xl leading-none px-2"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Invoices Table */}
            <div className="overflow-y-auto flex-1 border border-white/10 rounded-xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-white/[0.04] text-slate-400 border-b border-white/10 uppercase tracking-wider font-semibold text-[10px] sticky top-0 bg-[#0A192F]">
                  <tr>
                    <th className="py-2.5 px-3">Invoice / Order #</th>
                    <th className="py-2.5 px-3">Date &amp; Time</th>
                    <th className="py-2.5 px-3">Customer / Patient</th>
                    <th className="py-2.5 px-3">Payment</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Bill Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(selectedStaffBills.recent_bills || []).map((bill, bIdx) => (
                    <tr key={bIdx} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 px-3">
                        <div className="font-mono font-bold text-white text-xs">
                          {bill.invoice_number}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Ref: #{bill.order_number}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                        {bill.created_at}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-white">{bill.customer_name || 'Walk-in Guest'}</div>
                        {bill.customer_phone && (
                          <div className="text-[10px] text-slate-400 font-mono">{bill.customer_phone}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/5 text-brand-cyan border border-white/10">
                          {bill.payment_mode || 'CASH'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          {bill.order_status || 'Completed'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-white text-sm">
                        ₹{parseFloat(bill.total_amount || 0).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs">
              <span className="text-slate-400">
                Displaying <strong className="text-white">{selectedStaffBills.recent_bills?.length || 0}</strong> recent transactions
              </span>
              <button
                onClick={() => setSelectedStaffBills(null)}
                className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStaffSalesPage;
