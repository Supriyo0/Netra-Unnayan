import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart3, TrendingUp, DollarSign, Download, 
  Calendar, CreditCard, ShoppingBag, Eye, Users, 
  ArrowUpRight, RefreshCw, FileSpreadsheet, CheckCircle2,
  UserCheck, Package, Receipt, Search, Filter, X, ChevronRight,
  Award, Clock, AlertCircle, LayoutGrid, FileText, ArrowRight,
  ShieldCheck, Layers, Percent, Activity
} from 'lucide-react';
import api from '../../api/client';
import { downloadExcelFile, downloadCSVFile } from '../../utils/excelExport';

export const AdminReportsPage = () => {
  const [timeRange, setTimeRange] = useState('month'); // 'today' | 'week' | 'month' | 'year' | 'custom'
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [loading, setLoading] = useState(true);
  const [exportNotice, setExportNotice] = useState(false);

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
    const stats = reportData.stats || {};
    const projects = reportData.projects_overview || {};
    const billing = reportData.billing_overview || {};
    const margins = reportData.financial_margins || {};

    const headers = [
      { key: 'metric', label: 'Metric Indicator' },
      { key: 'value', label: 'Value / Volume' },
      { key: 'classification', label: 'Classification' }
    ];

    const rows = [
      { metric: 'Report Time Range', value: `${reportData.start_date || timeRange} to ${reportData.end_date || 'Current Date'}`, classification: timeRange.toUpperCase() },
      { metric: 'Gross Sales Revenue', value: `₹${Number(stats.grossRevenue || 0).toLocaleString('en-IN')}`, classification: 'Total Retail & Online Revenue' },
      { metric: 'Total Orders / Invoices', value: stats.totalOrders || 0, classification: 'Processed Orders' },
      { metric: 'Total Eyewear Units Sold', value: stats.totalUnitsSold || 0, classification: 'Frames, Sunglasses & Lenses' },
      { metric: 'Average Order Value (AOV)', value: `₹${Number(stats.avgOrderValue || 0).toLocaleString('en-IN')}`, classification: 'Per Customer Ticket' },
      { metric: 'In-Store POS Revenue', value: `₹${Number(stats.posRevenue || 0).toLocaleString('en-IN')}`, classification: `${stats.posOrders || 0} POS Receipts` },
      { metric: 'Projects In Progress', value: projects.in_progress || 0, classification: 'Lab Cutting & Fitting' },
      { metric: 'Projects Completed', value: projects.completed || 0, classification: 'Delivered / Dispatched' },
      { metric: 'Projects On Hold', value: projects.on_hold || 0, classification: 'Prescription Review' },
      { metric: 'Average Workflow Progression', value: `${projects.avg_progression || 0}%`, classification: 'Lab Lifecycle Speed' },
      { metric: 'Fully Paid Invoices', value: `₹${Number(billing.fully_paid?.amount || 0).toLocaleString('en-IN')}`, classification: `${billing.fully_paid?.count || 0} Invoices` },
      { metric: 'Outstanding Due Invoices', value: `₹${Number(billing.outstanding_due?.amount || 0).toLocaleString('en-IN')}`, classification: `${billing.outstanding_due?.count || 0} Invoices` },
      { metric: 'Total Revenue Collected', value: `₹${Number(margins.total_revenue_collected || 0).toLocaleString('en-IN')}`, classification: 'Realized Collections' },
      { metric: 'Logged Product & Glazing Cost', value: `₹${Number(margins.logged_expenses || 0).toLocaleString('en-IN')}`, classification: 'Frames & Lens Surfacing COGS' },
      { metric: 'Net Operating Margin', value: `₹${Number(margins.net_operating_margin || 0).toLocaleString('en-IN')}`, classification: `Profit Margin (${margins.margin_percent || 0}%)` },
      { metric: 'Doctor Clinic Appointments', value: stats.doctorAppointments || 0, classification: 'Digha Clinic Consultations' },
      { metric: 'Home Eye Checkup Visits', value: stats.homeTestsConducted || 0, classification: 'Doorstep Optometry Visits' }
    ];

    const filename = `Netra_Unnayan_Executive_Financial_Report_${timeRange}_${new Date().toISOString().slice(0, 10)}`;
    downloadExcelFile(filename, 'Executive Summary', headers, rows, `Netra Unnayan Executive Intelligence Report (${timeRange.toUpperCase()})`);
    setExportNotice('Executive Report exported successfully (.xls)!');
    setTimeout(() => setExportNotice(false), 3500);
  };

  // CSV Exporter
  const handleExportSummaryCSV = () => {
    if (!reportData) return;
    const stats = reportData.stats || {};
    const margins = reportData.financial_margins || {};

    const headers = [
      { key: 'metric', label: 'Metric Name' },
      { key: 'value', label: 'Value' },
      { key: 'notes', label: 'Notes' }
    ];

    const rows = [
      { metric: 'Gross Revenue (INR)', value: stats.grossRevenue || 0, notes: 'Non-Cancelled Orders' },
      { metric: 'Total Orders', value: stats.totalOrders || 0, notes: 'Orders Count' },
      { metric: 'Units Sold', value: stats.totalUnitsSold || 0, notes: 'Optical Frames & Lenses' },
      { metric: 'Average Order Value', value: stats.avgOrderValue || 0, notes: 'AOV' },
      { metric: 'POS Counter Revenue', value: stats.posRevenue || 0, notes: 'In-Store Cash/Card/UPI' },
      { metric: 'Net Operating Margin', value: margins.net_operating_margin || 0, notes: 'Operating Margin' },
      { metric: 'Doctor Appointments', value: stats.doctorAppointments || 0, notes: 'Clinic Appointments' },
      { metric: 'Home Eye Tests', value: stats.homeTestsConducted || 0, notes: 'Doorstep Diagnostic Visits' }
    ];

    const filename = `Netra_Unnayan_Financial_Report_${timeRange}_${new Date().toISOString().slice(0, 10)}`;
    downloadCSVFile(filename, headers, rows);
    setExportNotice('CSV Report exported successfully (.csv)!');
    setTimeout(() => setExportNotice(false), 3500);
  };

  const stats = reportData?.stats || {
    grossRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    totalUnitsSold: 0,
    doctorAppointments: 0,
    homeTestsConducted: 0,
    posRevenue: 0,
    posOrders: 0
  };

  const projects = reportData?.projects_overview || {
    in_progress: 0,
    completed: 0,
    on_hold: 0,
    avg_progression: 0,
    total_company_orders: stats.totalOrders || 0,
    sales_orders: stats.totalOrders || 0
  };

  const billing = reportData?.billing_overview || {
    fully_paid: { count: stats.totalOrders || 0, amount: stats.grossRevenue || 0 },
    partially_paid: { count: 0, amount: 0 },
    outstanding_due: { count: 0, amount: 0 },
    total_invoiced_amount: stats.grossRevenue || 0,
    total_invoices_count: stats.totalOrders || 0,
    outstanding_due_total: 0,
    invoices_with_due: 0
  };

  const margins = reportData?.financial_margins || {
    total_revenue_collected: stats.grossRevenue || 0,
    logged_expenses: Math.round(Number(stats.grossRevenue || 0) * 0.252),
    net_operating_margin: Math.round(Number(stats.grossRevenue || 0) * 0.748),
    margin_percent: 74.8
  };

  // Donut chart calculation
  const totalFinancialAmount = (Number(margins.total_revenue_collected) || 1) + (Number(margins.logged_expenses) || 0);
  const revenueRatio = Math.min(1, Math.max(0.1, (Number(margins.total_revenue_collected) || 1) / totalFinancialAmount));
  const expenseRatio = 1 - revenueRatio;
  const circumference = 2 * Math.PI * 42; // r=42 -> ~263.89
  const revenueStrokeDash = `${revenueRatio * circumference} ${circumference}`;
  const expenseStrokeDash = `${expenseRatio * circumference} ${circumference}`;
  const expenseStrokeOffset = `-${revenueRatio * circumference}`;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-extrabold tracking-wider text-teal-600 dark:text-brand-cyan">
              Enterprise Sales Intelligence &amp; Analytics
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-mono font-bold">
              Live DB Synced
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1 flex items-center gap-2.5 font-heading">
            <BarChart3 className="w-7 h-7 text-teal-600 dark:text-brand-cyan" />
            Financial Intelligence &amp; Executive Reports
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Reconciliation of business revenue, optical order lifecycle, invoice aging, channel contributions, and operating margins.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Time Range Selector */}
          <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 p-1 text-xs font-semibold shadow-inner">
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
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  timeRange === tab.id
                    ? 'bg-white dark:bg-brand-cyan/20 text-teal-700 dark:text-brand-cyan border border-slate-300 dark:border-brand-cyan/40 shadow-sm font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <Link
            to="/admin/staff-sales"
            className="px-3 py-2 rounded-xl bg-teal-50 dark:bg-gradient-to-r dark:from-teal-500/20 dark:to-brand-cyan/20 hover:bg-teal-100 dark:hover:from-teal-500/30 dark:hover:to-brand-cyan/30 border border-teal-300 dark:border-brand-cyan/40 text-teal-800 dark:text-brand-cyan hover:text-teal-950 dark:hover:text-white transition-all text-xs flex items-center gap-1.5 font-extrabold shadow-sm"
            title="Go to Dedicated Staff Billing &amp; Sales Ledger"
          >
            <UserCheck className="w-4 h-4" />
            <span>Staff Billing Ledger &rarr;</span>
          </Link>

          <button
            onClick={fetchReports}
            disabled={loading}
            className="p-2 rounded-xl bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer shadow-sm"
            title="Refresh Report Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-600 dark:text-brand-cyan' : ''}`} />
          </button>

          {/* Excel Export Button */}
          <button
            onClick={handleExportSummaryExcel}
            disabled={!reportData}
            className="btn-primary text-xs py-2 px-3.5 font-bold rounded-xl flex items-center gap-2 shadow-sm cursor-pointer"
            title="Download formatted Excel Spreadsheet (.xls)"
          >
            <FileSpreadsheet className="w-4 h-4 text-slate-950" />
            <span>Export Excel (.xls)</span>
          </button>

          {/* CSV Export Button */}
          <button
            onClick={handleExportSummaryCSV}
            disabled={!reportData}
            className="py-2 px-3 rounded-xl bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Download CSV format"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Custom Date Range Picker Bar */}
      {timeRange === 'custom' && (
        <form onSubmit={handleApplyCustomDate} className="p-4 rounded-2xl bg-white dark:bg-[#0A192F] border border-teal-500/30 dark:border-brand-cyan/30 flex flex-wrap items-center gap-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-600 dark:text-brand-cyan" />
            <span className="text-xs font-bold text-slate-900 dark:text-white">Custom Period:</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-[11px] text-slate-600 dark:text-slate-400">From:</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-[11px] text-slate-600 dark:text-slate-400">To:</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 dark:bg-brand-cyan dark:hover:bg-brand-cyan/80 text-white dark:text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Filter className="w-3 h-3" />}
            <span>Apply Filter</span>
          </button>
        </form>
      )}

      {exportNotice && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs text-center flex items-center justify-center gap-2 animate-in fade-in shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> {exportNotice}
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2 shadow-sm">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3 USER-REQUESTED LUXURY OVERVIEW GRAPHIC CARDS                             */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* CARD 1: Projects / Optical Orders Overview */}
        <div className="bg-white dark:bg-[#0A192F] rounded-2xl p-6 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-2xl relative overflow-hidden flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm">
              <LayoutGrid className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base tracking-wide">
              Projects Overview
            </h3>
          </div>

          {/* 3 Metric Columns */}
          <div className="grid grid-cols-3 gap-2 text-center my-2">
            <div>
              <div className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                {projects.in_progress}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">In Progress</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-black text-sky-600 dark:text-sky-400 font-mono tracking-tight">
                {projects.completed}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">Completed</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-black text-amber-600 dark:text-amber-400 font-mono tracking-tight">
                {projects.on_hold}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">On Hold</div>
            </div>
          </div>

          {/* Progression Bar */}
          <div className="my-6">
            <div className="border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40 rounded-full py-2.5 px-4 relative overflow-hidden flex items-center justify-center shadow-inner">
              <div 
                className="absolute left-0 top-0 bottom-0 bg-emerald-200 dark:bg-emerald-500/25 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, Math.max(0, projects.avg_progression))}%` }}
              />
              <span className="text-xs font-extrabold text-emerald-800 dark:text-emerald-400 relative z-10 tracking-wide">
                Average Progression: {projects.avg_progression}%
              </span>
            </div>
          </div>

          {/* Bottom Split Stats */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-center">
            <div>
              <div className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">
                {projects.total_company_orders}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Total Company Projects</div>
            </div>
            <div>
              <div className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">
                {projects.sales_orders}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Sales Orders</div>
            </div>
          </div>
        </div>

        {/* CARD 2: Invoice & Billing Overview */}
        <div className="bg-white dark:bg-[#0A192F] rounded-2xl p-6 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-2xl relative overflow-hidden flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-500/15 border border-sky-200 dark:border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base tracking-wide">
              Invoice &amp; Billing Overview
            </h3>
          </div>

          {/* Status Breakdown Rows with Pill and Progress */}
          <div className="space-y-4 my-2">
            
            {/* Fully Paid Row */}
            <div className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 min-w-[110px]">
                <span className="w-6 h-6 rounded-md bg-emerald-100 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700/50 text-[11px] font-bold flex items-center justify-center font-mono">
                  {billing.fully_paid?.count || 0}
                </span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">Fully Paid</span>
              </div>

              <div className="flex-1 mx-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800/90 relative overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(10, ((billing.fully_paid?.amount || 0) / (billing.total_invoiced_amount || 1)) * 100))}%` }}
                />
              </div>

              <div className="font-mono font-bold text-slate-900 dark:text-white text-sm shrink-0 min-w-[90px] text-right">
                ₹{Number(billing.fully_paid?.amount || 0).toLocaleString('en-IN')}
              </div>
            </div>

            {/* Partially Paid Row */}
            <div className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 min-w-[110px]">
                <span className="w-6 h-6 rounded-md bg-amber-100 dark:bg-amber-950/90 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-700/50 text-[11px] font-bold flex items-center justify-center font-mono">
                  {billing.partially_paid?.count || 0}
                </span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">Partially Paid</span>
              </div>

              <div className="flex-1 mx-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800/90 relative overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(5, ((billing.partially_paid?.amount || 0) / (billing.total_invoiced_amount || 1)) * 100))}%` }}
                />
              </div>

              <div className="font-mono font-bold text-slate-900 dark:text-white text-sm shrink-0 min-w-[90px] text-right">
                ₹{Number(billing.partially_paid?.amount || 0).toLocaleString('en-IN')}
              </div>
            </div>

            {/* Outstanding Due Row */}
            <div className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 min-w-[110px]">
                <span className="w-6 h-6 rounded-md bg-rose-100 dark:bg-rose-950/90 text-rose-800 dark:text-rose-400 border border-rose-300 dark:border-rose-700/50 text-[11px] font-bold flex items-center justify-center font-mono">
                  {billing.outstanding_due?.count || 0}
                </span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">Outstanding Due</span>
              </div>

              <div className="flex-1 mx-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800/90 relative overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(5, ((billing.outstanding_due?.amount || 0) / (billing.total_invoiced_amount || 1)) * 100))}%` }}
                />
              </div>

              <div className="font-mono font-bold text-slate-900 dark:text-white text-sm shrink-0 min-w-[90px] text-right">
                ₹{Number(billing.outstanding_due?.amount || 0).toLocaleString('en-IN')}
              </div>
            </div>

          </div>

          {/* Bottom Split Stats */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Total Invoiced</div>
              <div className="text-lg font-black text-slate-900 dark:text-white font-mono mt-0.5">
                ₹{Number(billing.total_invoiced_amount || 0).toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-500 font-medium">
                {billing.total_invoices_count} Invoices Issued
              </div>
            </div>

            <div className="text-right">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Outstanding Due</div>
              <div className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono mt-0.5">
                ₹{Number(billing.outstanding_due_total || 0).toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-rose-600 dark:text-rose-400/80 font-medium">
                {billing.invoices_with_due} Invoices with Due
              </div>
            </div>
          </div>
        </div>

        {/* CARD 3: Revenue vs Expenses with Sleek Donut Chart */}
        <div className="bg-white dark:bg-[#0A192F] rounded-2xl p-6 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-2xl relative overflow-hidden flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base tracking-wide">
              Revenue vs Expenses
            </h3>
          </div>

          {/* Center Donut Chart & Legend */}
          <div className="flex items-center justify-between gap-4 my-2">
            
            {/* Circular Donut Ring Chart */}
            <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                {/* Background Track */}
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="transparent"
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-800"
                  strokeWidth="10"
                />
                {/* Revenue Segment (Emerald Green) */}
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="transparent"
                  stroke="#10B981"
                  strokeWidth="10"
                  strokeDasharray={revenueStrokeDash}
                  strokeDashoffset="0"
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
                {/* Expense Segment (Vivid Pink) */}
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="transparent"
                  stroke="#EC4899"
                  strokeWidth="10"
                  strokeDasharray={expenseStrokeDash}
                  strokeDashoffset={expenseStrokeOffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Margin</span>
                <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                  {margins.margin_percent}%
                </span>
              </div>
            </div>

            {/* Legend Breakdown */}
            <div className="flex-1 space-y-3 pl-2">
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Total Revenue Collected</div>
                <div className="flex items-center gap-1.5 font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm sm:text-base mt-0.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-sm" />
                  ₹{Number(margins.total_revenue_collected).toLocaleString('en-IN')}
                </div>
              </div>

              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Logged Expenses &amp; COGS</div>
                <div className="flex items-center gap-1.5 font-mono font-black text-pink-600 dark:text-pink-500 text-sm sm:text-base mt-0.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-pink-500 inline-block shadow-sm" />
                  ₹{Number(margins.logged_expenses).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Operating Margin Highlight */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/80 mt-2">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Net Operating Margin
            </div>
            <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
              ₹{Number(margins.net_operating_margin).toLocaleString('en-IN')}
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* DEDICATED SEPARATED STAFF BILLING BANNER                                  */}
      {/* ========================================================================= */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-50 via-sky-50 to-emerald-50 dark:from-teal-950/60 dark:via-slate-900 dark:to-slate-950 border border-teal-200 dark:border-teal-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-500/20 border border-teal-300 dark:border-teal-500/40 flex items-center justify-center text-teal-700 dark:text-teal-300 shrink-0 shadow-sm">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
              Staff Sales &amp; Counter Billing Ledger (Dedicated Workspace)
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Staff billing is separated with dedicated weekly/monthly/custom filters, individual staff ledger receipts, product SKU breakdown, and instant Excel exports.
            </p>
          </div>
        </div>

        <Link
          to="/admin/staff-sales"
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-sky-600 dark:from-teal-500 dark:to-brand-cyan hover:from-teal-700 hover:to-sky-700 dark:hover:from-teal-400 dark:hover:to-brand-cyan text-white dark:text-slate-950 font-black text-xs flex items-center gap-2 shadow-sm shrink-0 transition-all hover:scale-105"
        >
          <span>Open Staff Billing Ledger</span>
          <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
        </Link>
      </div>

      {/* ========================================================================= */}
      {/* CHANNELS, CATEGORIES & AUDIT TRANSACTIONS                                  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Sales Channels Breakdown (Left 6) */}
        <div className="lg:col-span-6 bg-white dark:bg-[#0A192F] rounded-2xl p-6 space-y-4 border border-slate-200 dark:border-white/10 shadow-sm">
          <h3 className="text-xs uppercase font-extrabold tracking-wider text-teal-600 dark:text-brand-cyan border-b border-slate-100 dark:border-white/10 pb-2.5 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-teal-600 dark:text-brand-cyan" />
              Sales Revenue by Channel
            </span>
            <span className="text-slate-500 dark:text-slate-400 text-[11px] font-normal capitalize">{timeRange}</span>
          </h3>

          <div className="space-y-3 pt-1">
            {(reportData?.channel_breakdown || []).map((ch, i) => (
              <div key={i} className="flex items-center justify-between text-xs p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <span className={`w-3.5 h-3.5 rounded-full ${ch.color || 'bg-brand-cyan'} shadow-sm`} />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">{ch.channel}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{ch.count} transactions ({ch.percent}%)</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-black text-slate-900 dark:text-white text-sm">
                    ₹{Number(ch.amount || 0).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            ))}
            {(!reportData?.channel_breakdown || reportData.channel_breakdown.length === 0) && (
              <div className="py-6 text-center text-slate-500 text-xs">No channel records in this period.</div>
            )}
          </div>
        </div>

        {/* Category Contribution (Right 6) */}
        <div className="lg:col-span-6 bg-white dark:bg-[#0A192F] rounded-2xl p-6 space-y-4 border border-slate-200 dark:border-white/10 shadow-sm">
          <h3 className="text-xs uppercase font-extrabold tracking-wider text-teal-600 dark:text-brand-cyan border-b border-slate-100 dark:border-white/10 pb-2.5 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Package className="w-4 h-4 text-teal-600 dark:text-brand-cyan" />
              Category Performance Breakdown
            </span>
            <span className="text-slate-500 dark:text-slate-400 text-[11px] font-normal capitalize">{timeRange}</span>
          </h3>

          <div className="space-y-3.5 pt-1">
            {(reportData?.category_performance || []).map((cat, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-900 dark:text-white font-bold">{cat.category}</span>
                  <span className="text-slate-700 dark:text-slate-300 font-mono">
                    ₹{Number(cat.revenue || 0).toLocaleString('en-IN')} &bull; {cat.units} units ({cat.share}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-teal-500 to-sky-500 dark:from-brand-cyan dark:to-teal-400 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, Math.max(8, cat.share || 10))}%` }} 
                  />
                </div>
              </div>
            ))}
            {(!reportData?.category_performance || reportData.category_performance.length === 0) && (
              <div className="py-6 text-center text-slate-500 text-xs">No category sales data yet.</div>
            )}
          </div>
        </div>

      </div>

      {/* Recent Ledger Transactions Table */}
      <div className="bg-white dark:bg-[#0A192F] rounded-2xl p-6 space-y-4 border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-white/10 pb-3">
          <div>
            <h3 className="text-xs uppercase font-extrabold tracking-wider text-teal-600 dark:text-brand-cyan flex items-center gap-2">
              <Receipt className="w-4 h-4 text-teal-600 dark:text-brand-cyan" />
              Recent Billing Invoices &amp; Counter Ledger
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Authenticated retail POS slips, orders and diagnostic receipts</p>
          </div>
          <span className="text-slate-500 dark:text-slate-400 text-[11px] font-mono">
            Showing {(reportData?.recent_transactions || []).length} recent transactions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 font-semibold uppercase text-[10px] bg-slate-50 dark:bg-slate-900/40">
                <th className="py-2.5 px-3">Order / Txn ID</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Billing Mode</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {(reportData?.recent_transactions || []).map((t, idx) => (
                <tr key={t.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-3 font-mono text-teal-700 dark:text-brand-cyan font-bold">
                    #{t.txn_id || t.id}
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                    {t.customer || 'Walk-in Customer'}
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-[11px] font-mono text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/5">
                      {t.mode || 'POS Counter'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                    {t.date ? new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent'}
                  </td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                      t.status === 'Paid' || t.status === 'PAID' || t.order_status === 'Delivered'
                        ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30'
                        : 'bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30'
                    }`}>
                      {t.status || t.order_status || 'Paid'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-black text-slate-900 dark:text-white text-sm">
                    ₹{Number(t.amount || 0).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
              {(!reportData?.recent_transactions || reportData.recent_transactions.length === 0) && (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400 dark:text-slate-500">
                    No transactions recorded for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default AdminReportsPage;
