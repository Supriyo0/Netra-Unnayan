import React, { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, DollarSign, Download, 
  Calendar, CreditCard, ShoppingBag, Eye, Users, 
  ArrowUpRight, RefreshCw, FileSpreadsheet, CheckCircle2
} from 'lucide-react';
import api from '../../api/client';

export const AdminReportsPage = () => {
  const [timeRange, setTimeRange] = useState('month'); // 'today' | 'week' | 'month' | 'year'
  const [loading, setLoading] = useState(false);
  const [exportNotice, setExportNotice] = useState(false);

  // Financial Stats
  const stats = {
    grossRevenue: 245890,
    totalOrders: 148,
    avgOrderValue: 1661,
    doctorAppointments: 38,
    homeTestsConducted: 24,
    revenueGrowth: '+18.4%',
  };

  const channelBreakdown = [
    { channel: 'In-Store POS Counter', percent: 62, amount: 152450, color: 'bg-brand-cyan' },
    { channel: 'Online Pre-paid UPI', percent: 26, amount: 63930, color: 'bg-brand-teal' },
    { channel: 'Cash On Delivery (COD)', percent: 12, amount: 29510, color: 'bg-purple-400' },
  ];

  const categoryPerformance = [
    { category: "Men's Eyeglasses", units: 58, revenue: 98600, share: 40 },
    { category: "Women's Eyeglasses", units: 42, revenue: 71400, share: 29 },
    { category: "Computer Blue-Cut", units: 28, revenue: 47600, share: 19 },
    { category: "Polarized Sunglasses", units: 14, revenue: 23800, share: 10 },
    { category: "Kids Eyewear", units: 6, revenue: 4490, share: 2 },
  ];

  const recentTransactions = [
    { id: 'TXN-8821', customer: 'Bikram Mondal', mode: 'In-Store POS', amount: 2499, date: '2026-09-13 14:15', status: 'Completed' },
    { id: 'TXN-8820', customer: 'Suman Das', mode: 'Online UPI', amount: 1899, date: '2026-09-13 13:40', status: 'Completed' },
    { id: 'TXN-8819', customer: 'Priyanka Dey', mode: 'In-Store POS', amount: 3200, date: '2026-09-13 12:10', status: 'Completed' },
    { id: 'TXN-8818', customer: 'Animesh Bhowmik', mode: 'COD Delivery', amount: 1499, date: '2026-09-13 11:20', status: 'Pending Courier' },
    { id: 'TXN-8817', customer: 'Tapan Pradhan', mode: 'In-Store POS', amount: 4800, date: '2026-09-13 10:45', status: 'Completed' },
  ];

  const handleExportCSV = () => {
    const headers = 'Transaction_ID,Customer,Payment_Channel,Amount_INR,Date,Status\n';
    const rows = recentTransactions.map(t => 
      `${t.id},"${t.customer}",${t.mode},${t.amount},"${t.date}",${t.status}`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `Netra_Unnayan_Revenue_Report_${timeRange}.csv`);
    a.click();
    setExportNotice(true);
    setTimeout(() => setExportNotice(false), 3000);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <span className="text-xs uppercase font-extrabold tracking-wider text-brand-cyan">
            Financial &amp; Optical Intelligence (Screen 23)
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Store Performance &amp; Reports
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Reconciliation of in-store POS register, online UPI orders, and prescription fabrication volume.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Time Range Pills */}
          <div className="flex items-center rounded-xl bg-slate-950/60 border border-white/10 p-1 text-xs font-semibold">
            {['today', 'week', 'month', 'year'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                  timeRange === range
                    ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCSV}
            className="btn-secondary text-xs py-2 px-3.5 font-bold rounded-xl flex items-center gap-2"
            title="Download CSV report"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {exportNotice && (
        <div className="p-3 rounded-xl bg-teal-500/20 border border-teal-400/40 text-teal-200 text-xs text-center flex items-center justify-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" /> CSV Report generated and downloaded successfully!
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="uppercase font-bold tracking-wider text-[10px]">Gross Sales Volume</span>
            <span className="text-emerald-400 text-[11px] font-bold flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> {stats.revenueGrowth}
            </span>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            ₹{stats.grossRevenue.toLocaleString('en-IN')}
          </div>
          <p className="text-[10px] text-slate-400">All channels combined with optical GST</p>
        </div>

        <div className="glass-card rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="uppercase font-bold tracking-wider text-[10px]">Orders Fulfilled</span>
            <span className="text-brand-cyan text-[11px] font-bold">100% QC</span>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {stats.totalOrders} Units
          </div>
          <p className="text-[10px] text-slate-400">German lab edged frames</p>
        </div>

        <div className="glass-card rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="uppercase font-bold tracking-wider text-[10px]">Average Order Value</span>
            <span className="text-teal-400 text-[11px] font-bold">AOV</span>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            ₹{stats.avgOrderValue}
          </div>
          <p className="text-[10px] text-slate-400">Chassis + lens coating addons</p>
        </div>

        <div className="glass-card rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="uppercase font-bold tracking-wider text-[10px]">Clinical Bookings</span>
            <span className="text-amber-400 text-[11px] font-bold">Clinic &amp; Home</span>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {stats.doctorAppointments + stats.homeTestsConducted}
          </div>
          <p className="text-[10px] text-slate-400">{stats.doctorAppointments} Clinic &bull; {stats.homeTestsConducted} Home Checkups</p>
        </div>
      </div>

      {/* Two-Column Graphs & Channel Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Sales by Channel (Left 6) */}
        <div className="lg:col-span-6 glass-card rounded-2xl p-6 space-y-5">
          <h3 className="text-xs uppercase font-bold tracking-wider text-brand-cyan border-b border-white/10 pb-2 flex items-center justify-between">
            <span>Sales Revenue by Channel</span>
            <span className="text-slate-400 text-[11px] font-normal">This Month</span>
          </h3>

          {/* Stacked Progress Bar */}
          <div className="w-full h-4 rounded-full overflow-hidden flex bg-white/5 border border-white/10">
            {channelBreakdown.map((ch, i) => (
              <div 
                key={i} 
                style={{ width: `${ch.percent}%` }} 
                className={`${ch.color} h-full transition-all`}
                title={`${ch.channel}: ${ch.percent}%`}
              />
            ))}
          </div>

          {/* Breakdown Items */}
          <div className="space-y-3 pt-2">
            {channelBreakdown.map((ch, i) => (
              <div key={i} className="flex items-center justify-between text-xs p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-2.5">
                  <span className={`w-3 h-3 rounded-full ${ch.color}`} />
                  <div>
                    <div className="font-bold text-white">{ch.channel}</div>
                    <div className="text-[10px] text-slate-400">{ch.percent}% of total sales</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-extrabold text-white text-sm">
                    ₹{ch.amount.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Contribution (Right 6) */}
        <div className="lg:col-span-6 glass-card rounded-2xl p-6 space-y-5">
          <h3 className="text-xs uppercase font-bold tracking-wider text-brand-cyan border-b border-white/10 pb-2 flex items-center justify-between">
            <span>Category Performance Contribution</span>
            <span className="text-slate-400 text-[11px] font-normal">Volume by Category</span>
          </h3>

          <div className="space-y-3">
            {categoryPerformance.map((cat, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-white">{cat.category}</span>
                  <span className="text-slate-300 font-mono">₹{cat.revenue.toLocaleString('en-IN')} ({cat.units} frames)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-brand-cyan to-brand-teal rounded-full" 
                    style={{ width: `${cat.share}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Recent Transactions Audit Table */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <h3 className="text-xs uppercase font-bold tracking-wider text-brand-cyan border-b border-white/10 pb-2 flex items-center justify-between">
          <span>Recent Billing Ledger &amp; Cash Registry</span>
          <span className="text-slate-400 text-[11px] font-normal">Live Synced</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="py-2.5">TXN Ref</th>
                <th className="py-2.5">Customer Name</th>
                <th className="py-2.5">Payment Method</th>
                <th className="py-2.5">Timestamp</th>
                <th className="py-2.5">Status</th>
                <th className="py-2.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recentTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-white/[0.02]">
                  <td className="py-3 font-mono text-brand-cyan font-bold">{t.id}</td>
                  <td className="py-3 font-bold text-white">{t.customer}</td>
                  <td className="py-3 text-slate-300">{t.mode}</td>
                  <td className="py-3 text-slate-400 font-mono text-[11px]">{t.date}</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-bold text-[10px]">
                      {t.status}
                    </span>
                  </td>
                  <td className="py-3 text-right font-mono font-extrabold text-white text-sm">
                    ₹{t.amount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
