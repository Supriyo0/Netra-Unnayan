import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart3, TrendingUp, DollarSign, Download, 
  Calendar, CreditCard, ShoppingBag, Eye, Users, 
  ArrowUpRight, RefreshCw, FileSpreadsheet, CheckCircle2,
  UserCheck, Package, Receipt, Search, Filter, X, ChevronRight,
  Award, Clock, AlertCircle
} from 'lucide-react';
import api from '../../api/client';
import { downloadExcelFile, downloadCSVFile } from '../../utils/excelExport';

export const AdminReportsPage = () => {
  const [timeRange, setTimeRange] = useState('month'); // 'today' | 'week' | 'month' | 'year' | 'custom'
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [loading, setLoading] = useState(true);
  const [exportNotice, setExportNotice] = useState(false);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');

  // Modals state
  const [selectedStaffProducts, setSelectedStaffProducts] = useState(null);
  const [selectedStaffBills, setSelectedStaffBills] = useState(null);

  // Report Data State
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState('');

  const fetchReports = async () => {
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
        setError(res.message || 'Failed to fetch report data');
      }
    } catch (err) {
      console.error('Reports fetch error:', err);
      setError(err.message || 'Network error fetching report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (timeRange !== 'custom') {
      fetchReports();
    }
  }, [timeRange]);

  const handleApplyCustomDate = (e) => {
    e?.preventDefault();
    if (!customStart || !customEnd) {
      setError('Please select both start and end dates');
      return;
    }
    fetchReports();
  };

  // Excel (.xls) Exporter
  const handleExportSummaryExcel = () => {
    if (!reportData) return;
    const summary = reportData.summary || {};
    const headers = [
      { key: 'metric', label: 'Metric Name / Indicator' },
      { key: 'value', label: 'Value / Volume' },
      { key: 'notes', label: 'Classification & Notes' }
    ];

    const rows = [
      { metric: 'Period Range', value: `${reportData.start_date || timeRange} to ${reportData.end_date || 'Now'}`, notes: timeRange.toUpperCase() },
      { metric: 'Gross Sales Revenue', value: `₹${parseFloat(summary.gross_revenue || 0).toLocaleString('en-IN')}`, notes: 'All Non-Cancelled Orders' },
      { metric: 'Total Orders Count', value: summary.total_orders || 0, notes: 'Completed & Processing' },
      { metric: 'Total Eyewear Units Sold', value: summary.total_units_sold || 0, notes: 'Frames, Sunglasses, Lenses' },
      { metric: 'Average Order Value (AOV)', value: `₹${Math.round(summary.avg_order_value || 0).toLocaleString('en-IN')}`, notes: 'Per Order Ticket' },
      { metric: 'In-Store POS Revenue', value: `₹${parseFloat(summary.pos_revenue || 0).toLocaleString('en-IN')}`, notes: 'Counter Billing (Cash/Card/UPI)' },
      { metric: 'Online Orders Revenue', value: `₹${parseFloat(summary.online_revenue || 0).toLocaleString('en-IN')}`, notes: 'Pre-paid UPI / COD' },
      { metric: 'Doctor Clinic Appointments', value: summary.doctor_appointments || 0, notes: 'Digha Clinic Footfalls' },
      { metric: 'Home Eye Checkup Visits', value: summary.home_visits || 0, notes: 'Doorstep Refraction Diagnostics' }
    ];

    const filename = `Netra_Unnayan_Financial_Report_${timeRange}_${new Date().toISOString().slice(0, 10)}`;
    downloadExcelFile(filename, 'Executive Summary', headers, rows, `Netra Unnayan Financial & Store Intelligence (${timeRange.toUpperCase()})`);
    setExportNotice('Excel Report exported successfully (.xls)!');
    setTimeout(() => setExportNotice(false), 3500);
  };

  // CSV Exporter with UTF-8 BOM
  const handleExportSummaryCSV = () => {
    if (!reportData) return;
    const summary = reportData.summary || {};
    const headers = [
      { key: 'metric', label: 'Metric Name' },
      { key: 'value', label: 'Value' },
      { key: 'notes', label: 'Notes' }
    ];

    const rows = [
      { metric: 'Gross Revenue (INR)', value: summary.gross_revenue || 0, notes: 'Total Non-Cancelled' },
      { metric: 'Total Orders', value: summary.total_orders || 0, notes: 'Orders Count' },
      { metric: 'Units Sold', value: summary.total_units_sold || 0, notes: 'Frames & Lenses' },
      { metric: 'Average Order Value', value: summary.avg_order_value || 0, notes: 'AOV' },
      { metric: 'POS Counter Revenue', value: summary.pos_revenue || 0, notes: 'In-Store' },
      { metric: 'Online Revenue', value: summary.online_revenue || 0, notes: 'Web Storefront' },
      { metric: 'Doctor Appointments', value: summary.doctor_appointments || 0, notes: 'Clinic Appointments' },
      { metric: 'Home Eye Tests', value: summary.home_visits || 0, notes: 'Doorstep Diagnostic Visits' }
    ];

    const filename = `Netra_Unnayan_Executive_Report_${timeRange}_${new Date().toISOString().slice(0, 10)}`;
    downloadCSVFile(filename, headers, rows);
    setExportNotice('CSV Report exported successfully (.csv)!');
    setTimeout(() => setExportNotice(false), 3500);
  };

  const handleExportStaffProductCSV = (staff) => {
    if (!staff) return;
    const headers = [
      { key: 'product_name', label: 'Product Name' },
      { key: 'product_sku', label: 'SKU' },
      { key: 'category_name', label: 'Category' },
      { key: 'units_sold', label: 'Units Sold' },
      { key: 'avg_unit_price', label: 'Avg Unit Price (INR)' },
      { key: 'total_revenue', label: 'Total Revenue (INR)' }
    ];
    const rows = (staff.products_sold || []).map(p => ({
      product_name: p.product_name,
      product_sku: p.product_sku || 'N/A',
      category_name: p.category_name || 'Eyewear',
      units_sold: p.units_sold,
      avg_unit_price: p.avg_unit_price,
      total_revenue: p.total_revenue
    }));
    const cleanName = (staff.full_name || staff.name || 'Staff').replace(/\s+/g, '_');
    downloadExcelFile(`Staff_Sales_${cleanName}_${timeRange}`, `${cleanName} Products`, headers, rows, `Products Sold by ${cleanName}`);
  };

  const summary = reportData?.summary || {
    gross_revenue: 0,
    gross_revenue_formatted: '₹0',
    total_orders: 0,
    total_units_sold: 0,
    avg_order_value: 0,
    avg_order_value_formatted: '₹0',
    doctor_appointments: 0,
    home_visits: 0,
    pos_revenue: 0,
    online_revenue: 0,
    active_staff_count: 0
  };

  const filteredStaff = (reportData?.staff_performance || []).filter(st => 
    st.name?.toLowerCase().includes(staffSearchQuery.toLowerCase()) ||
    st.email?.toLowerCase().includes(staffSearchQuery.toLowerCase()) ||
    st.role?.toLowerCase().includes(staffSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-extrabold tracking-wider text-brand-cyan">
              Enterprise Sales Intelligence &amp; Auditing
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono">
              Live DB Synced
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-brand-cyan" />
            Store Sales, Reports &amp; Staff Billing Ledger
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time reconciliation of in-store POS staff billing, products sold per team member, online orders, and clinical footfalls.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Time Range Selector */}
          <div className="flex items-center rounded-xl bg-slate-950/80 border border-white/10 p-1 text-xs font-semibold shadow-inner">
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
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  timeRange === tab.id
                    ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/40 shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <Link
            to="/admin/staff-sales"
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all text-xs flex items-center gap-1.5 font-bold"
            title="Go to Dedicated Staff Sales Ledger"
          >
            <UserCheck className="w-4 h-4 text-brand-cyan" />
            <span>Staff Sales Ledger &rarr;</span>
          </Link>

          <button
            onClick={fetchReports}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all"
            title="Refresh Report Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-cyan' : ''}`} />
          </button>

          {/* Excel Export Button */}
          <button
            onClick={handleExportSummaryExcel}
            disabled={!reportData}
            className="btn-primary text-xs py-2 px-3.5 font-bold rounded-xl flex items-center gap-2 shadow-cyan-glow"
            title="Download formatted Excel Spreadsheet (.xls)"
          >
            <FileSpreadsheet className="w-4 h-4 text-slate-950" />
            <span>Export Excel (.xls)</span>
          </button>

          {/* CSV Export Button */}
          <button
            onClick={handleExportSummaryCSV}
            disabled={!reportData}
            className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5"
            title="Download CSV format"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Custom Date Range Picker Bar */}
      {timeRange === 'custom' && (
        <form onSubmit={handleApplyCustomDate} className="p-4 rounded-2xl glass-card border border-brand-cyan/30 flex flex-wrap items-center gap-4 bg-brand-cyan/[0.03]">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand-cyan" />
            <span className="text-xs font-bold text-white">Custom Range:</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-[11px] text-slate-400">From:</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="glass-input rounded-xl px-3 py-1.5 text-xs text-white"
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-[11px] text-slate-400">To:</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="glass-input rounded-xl px-3 py-1.5 text-xs text-white"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-1.5 rounded-xl bg-brand-cyan hover:bg-brand-cyan/80 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Filter className="w-3 h-3" />}
            <span>Apply Filter</span>
          </button>
        </form>
      )}

      {exportNotice && (
        <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs text-center flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> CSV Financial &amp; Staff Report generated and downloaded successfully!
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-400/40 text-rose-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Gross Sales */}
        <div className="glass-card rounded-2xl p-4 space-y-1.5 border border-white/10 hover:border-brand-cyan/30 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="uppercase font-bold tracking-wider text-[10px]">Gross Sales</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono">
            {summary.gross_revenue_formatted || `₹${Number(summary.gross_revenue || 0).toLocaleString('en-IN')}`}
          </div>
          <p className="text-[10px] text-slate-400">
            POS ₹{Number(summary.pos_revenue || 0).toLocaleString('en-IN')} &bull; Online ₹{Number(summary.online_revenue || 0).toLocaleString('en-IN')}
          </p>
        </div>

        {/* Orders Fulfilled */}
        <div className="glass-card rounded-2xl p-4 space-y-1.5 border border-white/10 hover:border-brand-cyan/30 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="uppercase font-bold tracking-wider text-[10px]">Total Invoices</span>
            <ShoppingBag className="w-3.5 h-3.5 text-brand-cyan" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono">
            {summary.total_orders} Orders
          </div>
          <p className="text-[10px] text-slate-400">
            {summary.total_units_sold} optical frames &amp; lens pairs
          </p>
        </div>

        {/* Average Order Value */}
        <div className="glass-card rounded-2xl p-4 space-y-1.5 border border-white/10 hover:border-brand-cyan/30 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="uppercase font-bold tracking-wider text-[10px]">Avg Order (AOV)</span>
            <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono">
            {summary.avg_order_value_formatted || `₹${summary.avg_order_value}`}
          </div>
          <p className="text-[10px] text-slate-400">Frame + lens coating package</p>
        </div>

        {/* Active Staff Members */}
        <div className="glass-card rounded-2xl p-4 space-y-1.5 border border-white/10 hover:border-brand-cyan/30 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="uppercase font-bold tracking-wider text-[10px]">Active Staff</span>
            <Users className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono">
            {summary.active_staff_count || (reportData?.staff_performance?.length || 0)} Staff
          </div>
          <p className="text-[10px] text-slate-400">Optometrists &amp; Billing Staff</p>
        </div>

        {/* Clinical Footfalls */}
        <div className="glass-card rounded-2xl p-4 space-y-1.5 border border-white/10 hover:border-brand-cyan/30 transition-all col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="uppercase font-bold tracking-wider text-[10px]">Clinical Consults</span>
            <Eye className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono">
            {(summary.doctor_appointments || 0) + (summary.home_visits || 0)}
          </div>
          <p className="text-[10px] text-slate-400">
            {summary.doctor_appointments || 0} Clinic &bull; {summary.home_visits || 0} Home Visits
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION: STAFF BILLING & SALES PERFORMANCE LEDGER (PRIMARY USER REQUEST) */}
      {/* ========================================================================= */}
      <div className="glass-card rounded-2xl p-6 space-y-5 border border-brand-cyan/30 shadow-xl bg-gradient-to-b from-white/[0.02] to-transparent">
        
        {/* Header with Search & Quick Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-cyan/20 to-teal-500/20 border border-brand-cyan/30 flex items-center justify-center text-brand-cyan shadow-sm">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white">
                  Staff Billing &amp; Sales Performance Ledger
                </h2>
                <span className="text-[10px] uppercase font-mono tracking-wider text-brand-cyan bg-brand-cyan/10 px-2.5 py-0.5 rounded-full border border-brand-cyan/20 font-bold">
                  {(reportData?.staff_performance || []).length} Staff Members
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Detailed sales breakdown for each staff/team member (including converted customers) with product details and invoice drill-down
              </p>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search staff name or role..."
              value={staffSearchQuery}
              onChange={(e) => setStaffSearchQuery(e.target.value)}
              className="w-full glass-input rounded-xl pl-9 pr-3 py-1.5 text-xs text-white"
            />
          </div>
        </div>

        {/* Staff Table */}
        {loading ? (
          <div className="py-12 text-center space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-brand-cyan" />
            <p className="text-xs text-slate-400">Calculating staff billing records...</p>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="py-10 text-center space-y-2 bg-white/[0.02] rounded-2xl border border-white/5">
            <Users className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-xs text-slate-300 font-semibold">No staff billing records found for this timeframe.</p>
            <p className="text-[11px] text-slate-500">Try choosing another period like "This Month" or "This Year".</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="py-3 px-3">Staff / Team Member</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3 text-center">Bills Created</th>
                  <th className="py-3 px-3 text-center">Units Sold</th>
                  <th className="py-3 px-3 text-right">Total Revenue</th>
                  <th className="py-3 px-3">Payment Methods</th>
                  <th className="py-3 px-3 text-right">Actions &amp; Product Drill-down</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredStaff.map((staff, idx) => {
                  const pay = staff.payment_breakdown || {};
                  return (
                    <tr key={staff.admin_id || idx} className="hover:bg-white/[0.02] transition-colors">
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-cyan/20 to-teal-500/30 border border-brand-cyan/40 flex items-center justify-center text-brand-cyan font-bold text-xs uppercase shadow-sm">
                            {staff.name?.slice(0, 2) || 'ST'}
                          </div>
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{staff.name}</span>
                              {idx === 0 && Number(staff.total_revenue) > 0 && (
                                <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold" title="Top Sales Staff">
                                  <Award className="w-2.5 h-2.5" /> Top Performer
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">{staff.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          staff.role === 'super_admin' 
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : staff.role === 'staff'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30'
                        }`}>
                          {staff.role?.replace('_', ' ') || 'Staff'}
                        </span>
                      </td>

                      {/* Total Bills */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="font-mono font-bold text-white text-xs bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                          {staff.total_bills}
                        </span>
                      </td>

                      {/* Units Sold */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="font-mono text-slate-300 text-xs">
                          {staff.total_units_sold} pcs
                        </span>
                      </td>

                      {/* Total Revenue */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="font-mono font-extrabold text-white text-sm">
                          {staff.total_revenue_formatted || `₹${Number(staff.total_revenue || 0).toLocaleString('en-IN')}`}
                        </div>
                      </td>

                      {/* Payment Methods Breakdown */}
                      <td className="py-3.5 px-3">
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                          {pay.CASH?.count > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20" title={`Cash: ₹${pay.CASH.amount}`}>
                              Cash: ₹{pay.CASH.amount}
                            </span>
                          )}
                          {pay.UPI?.count > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20" title={`UPI: ₹${pay.UPI.amount}`}>
                              UPI: ₹{pay.UPI.amount}
                            </span>
                          )}
                          {pay.CARD?.count > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20" title={`Card: ₹${pay.CARD.amount}`}>
                              Card: ₹{pay.CARD.amount}
                            </span>
                          )}
                          {pay.COD?.count > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20" title={`COD: ₹${pay.COD.amount}`}>
                              COD: ₹{pay.COD.amount}
                            </span>
                          )}
                          {Object.keys(pay).length === 0 && (
                            <span className="text-slate-500 text-[10px]">—</span>
                          )}
                        </div>
                      </td>

                      {/* Actions Drill-down Buttons */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* View Product Details Button */}
                          <button
                            type="button"
                            onClick={() => setSelectedStaffProducts(staff)}
                            className="px-2.5 py-1 rounded-lg bg-brand-cyan/10 hover:bg-brand-cyan/20 border border-brand-cyan/30 text-brand-cyan text-[11px] font-bold flex items-center gap-1 transition-all"
                            title="View all products & SKUs sold by this staff member"
                          >
                            <Package className="w-3 h-3" />
                            <span>Products ({staff.products_sold?.length || 0})</span>
                          </button>

                          {/* View Invoices / Bills Button */}
                          <button
                            type="button"
                            onClick={() => setSelectedStaffBills(staff)}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-[11px] font-bold flex items-center gap-1 transition-all"
                            title="View bills created by this staff member"
                          >
                            <Receipt className="w-3 h-3" />
                            <span>Bills</span>
                          </button>

                          {/* Export CSV for Staff */}
                          <button
                            type="button"
                            onClick={() => handleExportStaffProductCSV(staff)}
                            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-brand-cyan transition-colors"
                            title="Download CSV for this staff member"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Two-Column Graphs & Channel Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Sales by Payment Method (Left 6) */}
        <div className="lg:col-span-6 glass-card rounded-2xl p-6 space-y-5">
          <h3 className="text-xs uppercase font-bold tracking-wider text-brand-cyan border-b border-white/10 pb-2 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-brand-cyan" />
              Sales Revenue by Payment Method
            </span>
            <span className="text-slate-400 text-[11px] font-normal capitalize">{timeRange}</span>
          </h3>

          <div className="space-y-3 pt-1">
            {(reportData?.payment_methods || []).map((pm, i) => (
              <div key={i} className="flex items-center justify-between text-xs p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-2.5">
                  <span className={`w-3 h-3 rounded-full ${
                    pm.method === 'CASH' ? 'bg-emerald-400' :
                    pm.method === 'UPI' ? 'bg-brand-cyan' :
                    pm.method === 'CARD' ? 'bg-purple-400' : 'bg-amber-400'
                  }`} />
                  <div>
                    <div className="font-bold text-white">{pm.method}</div>
                    <div className="text-[10px] text-slate-400">{pm.count} transactions ({pm.percentage}%)</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-extrabold text-white text-sm">
                    ₹{Number(pm.total_amount || 0).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            ))}
            {(!reportData?.payment_methods || reportData.payment_methods.length === 0) && (
              <div className="py-6 text-center text-slate-500 text-xs">No payment records found.</div>
            )}
          </div>
        </div>

        {/* Category Contribution (Right 6) */}
        <div className="lg:col-span-6 glass-card rounded-2xl p-6 space-y-5">
          <h3 className="text-xs uppercase font-bold tracking-wider text-brand-cyan border-b border-white/10 pb-2 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Package className="w-4 h-4 text-brand-cyan" />
              Category Performance Breakdown
            </span>
            <span className="text-slate-400 text-[11px] font-normal capitalize">{timeRange}</span>
          </h3>

          <div className="space-y-3 pt-1">
            {(reportData?.categories || []).map((cat, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-white">{cat.category}</span>
                  <span className="text-slate-300 font-mono">
                    ₹{Number(cat.revenue || 0).toLocaleString('en-IN')} ({cat.units_sold} units)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-brand-cyan to-brand-teal rounded-full" 
                    style={{ width: `${Math.min(100, Math.max(5, cat.percentage || 10))}%` }} 
                  />
                </div>
              </div>
            ))}
            {(!reportData?.categories || reportData.categories.length === 0) && (
              <div className="py-6 text-center text-slate-500 text-xs">No category sales data yet.</div>
            )}
          </div>
        </div>

      </div>

      {/* Recent Transactions Audit Table */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div>
            <h3 className="text-xs uppercase font-bold tracking-wider text-brand-cyan flex items-center gap-2">
              <Receipt className="w-4 h-4 text-brand-cyan" />
              Recent Billing Invoices &amp; Counter Ledger
            </h3>
            <p className="text-[11px] text-slate-400">All authenticated retail POS slips and online orders</p>
          </div>
          <span className="text-slate-400 text-[11px] font-mono">
            Showing {(reportData?.recent_orders || []).length} recent transactions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="py-2.5 px-2">Invoice / Ref</th>
                <th className="py-2.5 px-2">Customer</th>
                <th className="py-2.5 px-2">Billed By Staff</th>
                <th className="py-2.5 px-2">Channel</th>
                <th className="py-2.5 px-2">Timestamp</th>
                <th className="py-2.5 px-2">Status</th>
                <th className="py-2.5 px-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(reportData?.recent_orders || []).map((t, idx) => (
                <tr key={t.id || t.order_id || idx} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-2 font-mono text-brand-cyan font-bold">
                    {t.invoice_number || t.order_number || `#ORD-${t.id || t.order_id}`}
                  </td>
                  <td className="py-3 px-2 font-bold text-white">
                    {t.customer_name || 'Walk-in Guest'}
                  </td>
                  <td className="py-3 px-2 text-slate-300">
                    <span className="px-2 py-0.5 rounded bg-white/5 text-[11px] text-slate-300 border border-white/5">
                      {t.staff_name || 'Counter Staff'}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-slate-300 font-mono text-[11px]">
                    {t.payment_method || 'POS'}
                  </td>
                  <td className="py-3 px-2 text-slate-400 font-mono text-[11px]">
                    {t.created_at || 'Recently'}
                  </td>
                  <td className="py-3 px-2">
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                      t.payment_status === 'PAID' || t.status === 'completed' || t.status === 'delivered'
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'bg-amber-500/15 text-amber-300'
                    }`}>
                      {t.payment_status || t.status || 'Active'}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right font-mono font-extrabold text-white text-sm">
                    ₹{Number(t.total_amount || t.amount || 0).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
              {(!reportData?.recent_orders || reportData.recent_orders.length === 0) && (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">
                    No transactions recorded for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: STAFF PRODUCTS SOLD BREAKDOWN DRILL-DOWN                         */}
      {/* ========================================================================= */}
      {selectedStaffProducts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-brand-cyan/40 rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-cyan/20 border border-brand-cyan/40 flex items-center justify-center text-brand-cyan font-bold text-sm">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <span>Products Sold by {selectedStaffProducts.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-cyan/20 text-brand-cyan font-mono">
                      {selectedStaffProducts.role}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Product-wise quantity and revenue contribution for {timeRange.toUpperCase()} ({reportData?.start_date} to {reportData?.end_date})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExportStaffProductCSV(selectedStaffProducts)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-brand-cyan font-bold flex items-center gap-1.5 border border-white/10"
                >
                  <Download className="w-3.5 h-3.5" /> CSV
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStaffProducts(null)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {(!selectedStaffProducts.products_sold || selectedStaffProducts.products_sold.length === 0) ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No individual product line items recorded for this staff member in the selected time range.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400 font-semibold uppercase text-[10px]">
                        <th className="py-2.5 px-3">Product Name &amp; Description</th>
                        <th className="py-2.5 px-3">SKU / Model</th>
                        <th className="py-2.5 px-3 text-center">Units Sold</th>
                        <th className="py-2.5 px-3 text-right">Avg Unit Price</th>
                        <th className="py-2.5 px-3 text-right">Total Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {selectedStaffProducts.products_sold.map((prod, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.02]">
                          <td className="py-3 px-3">
                            <div className="font-bold text-white">{prod.product_name}</div>
                          </td>
                          <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                            {prod.product_sku || '—'}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-brand-cyan">
                            {prod.units_sold} pcs
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-300">
                            ₹{Number(prod.unit_price || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-extrabold text-emerald-400 text-sm">
                            {prod.total_revenue_formatted || `₹${Number(prod.total_revenue || 0).toLocaleString('en-IN')}`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Total Products: <strong className="text-white">{selectedStaffProducts.products_sold?.length || 0} unique SKUs</strong>
              </span>
              <div className="text-right">
                <span className="text-slate-400 mr-2">Staff Gross Revenue:</span>
                <strong className="text-brand-cyan font-mono text-sm">
                  {selectedStaffProducts.total_revenue_formatted || `₹${Number(selectedStaffProducts.total_revenue || 0).toLocaleString('en-IN')}`}
                </strong>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: STAFF BILLING INVOICES LIST                                      */}
      {/* ========================================================================= */}
      {selectedStaffBills && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-brand-cyan/40 rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 font-bold text-sm">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <span>Invoices Created by {selectedStaffBills.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-mono">
                      {selectedStaffBills.total_bills} Total Bills
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Individual invoice tickets billed by this staff member
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStaffBills(null)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {(!selectedStaffBills.recent_bills || selectedStaffBills.recent_bills.length === 0) ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No invoice tickets recorded for this staff member in this timeframe.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400 font-semibold uppercase text-[10px]">
                        <th className="py-2.5 px-3">Invoice Number</th>
                        <th className="py-2.5 px-3">Customer Name</th>
                        <th className="py-2.5 px-3">Phone</th>
                        <th className="py-2.5 px-3">Payment Method</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {selectedStaffBills.recent_bills.map((bill, idx) => (
                        <tr key={bill.order_id || idx} className="hover:bg-white/[0.02]">
                          <td className="py-3 px-3 font-mono text-brand-cyan font-bold">
                            {bill.invoice_number || bill.order_number || `#ORD-${bill.order_id}`}
                          </td>
                          <td className="py-3 px-3 font-bold text-white">
                            {bill.customer_name || 'Walk-in Customer'}
                          </td>
                          <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                            {bill.customer_phone || '—'}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] font-mono text-slate-300">
                              {bill.payment_method || 'POS'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                            {bill.created_at}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-extrabold text-white text-sm">
                            ₹{Number(bill.total_amount || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Staff ID: <strong className="text-white font-mono">{selectedStaffBills.admin_id}</strong>
              </span>
              <button
                type="button"
                onClick={() => setSelectedStaffBills(null)}
                className="btn-primary text-xs py-1.5 px-4 rounded-xl"
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
export default AdminReportsPage;
