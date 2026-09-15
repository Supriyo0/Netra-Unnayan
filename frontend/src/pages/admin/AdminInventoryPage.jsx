import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Boxes, AlertTriangle, Plus, Search, RefreshCw, ArrowUpRight, 
  ArrowDownRight, FileText, CheckCircle2, History, Filter, X, Barcode, Edit3 
} from 'lucide-react';
import api from '../../api/client';
import { BarcodeModal } from '../../components/common/BarcodeModal';

export default function AdminInventoryPage() {
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'ledger'
  const [inventory, setInventory] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [selectedBarcodeProduct, setSelectedBarcodeProduct] = useState(null);

  // Adjustment Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adjustType, setAdjustType] = useState('restock'); // restock, damage, return, audit
  const [quantityDelta, setQuantityDelta] = useState(1);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      const [invRes, ledgerRes] = await Promise.all([
        api.get('/admin/inventory.php', { params: { search: search || undefined, low_stock: filterLowStock ? 1 : undefined } }),
        api.get('/admin/inventory.php', { params: { view: 'ledger' } })
      ]);

      if (invRes?.success) {
        setInventory(invRes.data?.products || (Array.isArray(invRes.data) ? invRes.data : []));
      }
      if (ledgerRes?.success) {
        setTransactions(ledgerRes.data?.transactions || (Array.isArray(ledgerRes.data) ? ledgerRes.data : []));
      }
    } catch (err) {
      console.error('Failed to load inventory data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, [filterLowStock]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchInventoryData();
  };

  const handleOpenAdjust = (product) => {
    setSelectedProduct(product);
    setAdjustType('restock');
    setQuantityDelta(5);
    setReferenceNumber('');
    setNotes('');
    setFeedback('');
    setAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;

    try {
      setSubmitting(true);
      setFeedback('');
      const deltaVal = adjustType === 'damage' ? -Math.abs(parseInt(quantityDelta)) : Math.abs(parseInt(quantityDelta));
      
      const res = await api.post('/admin/inventory.php', {
        product_id: selectedProduct.id,
        transaction_type: adjustType,
        quantity: deltaVal,
        reference_number: referenceNumber,
        notes: notes
      });

      if (res?.success || res?.data?.success) {
        setFeedback('Inventory updated and recorded in audit ledger!');
        setTimeout(() => {
          setAdjustModalOpen(false);
          fetchInventoryData();
        }, 1200);
      } else {
        alert(res?.message || res?.data?.message || 'Failed to adjust inventory');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error processing inventory adjustment');
    } finally {
      setSubmitting(false);
    }
  };

  // Metrics
  const totalProducts = inventory.length;
  const totalUnits = inventory.reduce((sum, item) => sum + parseInt(item.stock_quantity || 0), 0);
  const lowStockCount = inventory.filter((item) => (item.stock_quantity || 0) <= (item.min_stock_alert || 5)).length;
  const totalValuation = inventory.reduce((sum, item) => sum + (parseFloat(item.price || 0) * parseInt(item.stock_quantity || 0)), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-slate-900 dark:text-white flex items-center gap-2">
            <Boxes className="w-7 h-7 text-brand-cyan" />
            Inventory Control &amp; Audit Ledger
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real-time optical stock tracking, instant barcode lookup, and tamper-proof double-entry inventory ledger
          </p>
        </div>
        <button 
          onClick={fetchInventoryData}
          className="btn-secondary px-4 py-2 flex items-center gap-2 text-sm font-semibold"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Sync Stock
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Total Optical SKUs</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{totalProducts}</div>
          <div className="text-[11px] text-slate-400 mt-1">Frames, Sunglasses &amp; Readers</div>
        </div>

        <div className="glass-card p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Physical Stock Units</div>
          <div className="text-2xl font-bold text-brand-cyan mt-1">{totalUnits}</div>
          <div className="text-[11px] text-slate-400 mt-1">Available across shelves</div>
        </div>

        <div className="glass-card p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Low Stock Alerts</div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-2">
            {lowStockCount}
            {lowStockCount > 0 && <AlertTriangle className="w-5 h-5 text-amber-500 animate-pulse" />}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Needs supplier restock</div>
        </div>

        <div className="glass-card p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Retail Valuation</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            ₹{totalValuation.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Total catalog retail worth</div>
        </div>
      </div>

      {/* Tab Switcher & Search Bar */}
      <div className="glass-card p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'inventory'
                ? 'bg-brand-cyan text-slate-950 shadow-cyan-glow'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Boxes className="w-4 h-4" />
            Stock Inventory
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'ledger'
                ? 'bg-brand-cyan text-slate-950 shadow-cyan-glow'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            Audit Ledger ({transactions.length})
          </button>
        </div>

        {activeTab === 'inventory' && (
          <div className="flex items-center gap-3 w-full md:w-auto">
            <form onSubmit={handleSearch} className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search SKU, name, brand..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-9 py-1.5 text-xs w-full"
              />
            </form>

            <button
              onClick={() => setFilterLowStock(!filterLowStock)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                filterLowStock 
                  ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200'
                  : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400'
              }`}
            >
              <Filter className="w-3 h-3" />
              Low Stock Only
            </button>
          </div>
        )}
      </div>

      {/* Tab 1: Live Inventory Table */}
      {activeTab === 'inventory' && (
        <div className="glass-card rounded-2xl overflow-hidden border border-neutral-200/70 dark:border-neutral-800/80 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-900/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 text-xs uppercase font-medium">
                <tr>
                  <th className="px-5 py-3.5">Product & SKU</th>
                  <th className="px-5 py-3.5">Dimensions</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Price</th>
                  <th className="px-5 py-3.5">In Stock</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-12 text-center text-neutral-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary-500" />
                      Loading inventory...
                    </td>
                  </tr>
                ) : inventory.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-12 text-center text-neutral-500">
                      No optical products found.
                    </td>
                  </tr>
                ) : (
                  inventory.map((item) => {
                    const isLow = (item.stock_quantity || 0) <= (item.min_stock_alert || 5);
                    const isOut = (item.stock_quantity || 0) <= 0;

                    return (
                      <tr key={item.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-neutral-900 dark:text-white">
                            {item.name}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-mono text-primary-600 dark:text-primary-400 font-medium">
                              {item.sku}
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedBarcodeProduct(item)}
                              className="px-2 py-0.5 rounded-md bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-[10px] font-mono flex items-center gap-1 transition-all shadow-sm group"
                              title="Click to view full scannable barcode & print thermal sticker"
                            >
                              <Barcode className="w-3.5 h-3.5 text-primary-500 group-hover:scale-110 transition-transform" />
                              <span className="font-bold">BARCODE</span>
                            </button>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-mono text-xs text-neutral-600 dark:text-neutral-400">
                          {item.lens_width ? `${item.lens_width} □ ${item.bridge_width || 18} — ${item.temple_length || 140}` : 'Standard'}
                        </td>
                        <td className="px-5 py-4 text-xs text-neutral-500 capitalize">
                          {item.category_name || item.gender || 'Eyeglasses'}
                        </td>
                        <td className="px-5 py-4 font-bold text-neutral-900 dark:text-white">
                          ₹{parseFloat(item.price).toLocaleString('en-IN')}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-base font-bold font-mono ${
                            isOut ? 'text-red-600 dark:text-red-400' :
                            isLow ? 'text-amber-600 dark:text-amber-400' :
                            'text-neutral-900 dark:text-white'
                          }`}>
                            {item.stock_quantity}
                          </span>
                          <span className="text-[11px] text-neutral-400 ml-1">units</span>
                        </td>
                        <td className="px-5 py-4">
                          {isOut ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">
                              Out of Stock
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                              Low Stock (≤{item.min_stock_alert || 5})
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                              In Stock
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openAdjustModal(item)}
                              className="btn-secondary py-1.5 px-3 text-xs inline-flex items-center gap-1.5"
                              title="Adjust Stock Quantity"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Adjust</span>
                            </button>
                            <Link
                              to={`/admin/products/edit/${item.id}`}
                              className="btn-secondary py-1.5 px-3 text-xs inline-flex items-center gap-1.5 hover:text-brand-cyan hover:border-brand-cyan/40"
                              title="Edit Frame Details & Price"
                            >
                              <Edit3 className="w-3 h-3 text-brand-cyan" />
                              <span>Edit</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Double-Entry Transaction Audit Ledger */}
      {activeTab === 'ledger' && (
        <div className="glass-card rounded-2xl overflow-hidden border border-neutral-200/70 dark:border-neutral-800/80 shadow-sm">
          <div className="p-4 bg-neutral-50 dark:bg-neutral-900/60 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <History className="w-4 h-4 text-primary-600" />
              Double-Entry Inventory Audit Ledger
            </h3>
            <span className="text-xs text-neutral-500">
              Immutable historical records of every barcode scan, POS sale, and lab adjustment
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-900/40 text-neutral-500 dark:text-neutral-400 text-xs uppercase font-medium">
                <tr>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Delta</th>
                  <th className="px-5 py-3">Before / After</th>
                  <th className="px-5 py-3">Reference / Notes</th>
                  <th className="px-5 py-3">Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-12 text-center text-neutral-500">
                      No transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => {
                    const isPositive = parseInt(tx.quantity) > 0;

                    return (
                      <tr key={tx.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                        <td className="px-5 py-3 text-xs text-neutral-500 whitespace-nowrap">
                          {new Date(tx.created_at).toLocaleString('en-IN', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                        </td>
                        <td className="px-5 py-3">
                          <div className="font-semibold text-neutral-900 dark:text-white text-xs">
                            {tx.product_name}
                          </div>
                          <div className="text-[11px] font-mono text-neutral-500">
                            {tx.sku}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium uppercase bg-neutral-100 dark:bg-neutral-800">
                            {tx.transaction_type?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-0.5 font-bold font-mono text-xs ${
                            isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                            {isPositive ? `+${tx.quantity}` : tx.quantity}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-neutral-600 dark:text-neutral-400">
                          {tx.stock_before} → <span className="font-bold text-neutral-900 dark:text-white">{tx.stock_after}</span>
                        </td>
                        <td className="px-5 py-3 text-xs">
                          <div className="text-neutral-800 dark:text-neutral-200">
                            {tx.reference_number || '—'}
                          </div>
                          {tx.notes && (
                            <div className="text-[11px] text-neutral-500 italic">
                              "{tx.notes}"
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3 text-xs text-neutral-500">
                          {tx.created_by_name || 'System / POS'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {adjustModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-lg shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold font-heading text-neutral-900 dark:text-white">
                  Adjust Stock Quantity
                </h3>
                <p className="text-xs text-neutral-500">
                  {selectedProduct.name} ({selectedProduct.sku})
                </p>
              </div>
              <button 
                onClick={() => setAdjustModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {feedback && (
              <div className="m-5 mb-0 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-300 rounded-lg text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {feedback}
              </div>
            )}

            <form onSubmit={handleAdjustSubmit} className="p-5 space-y-4">
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl flex items-center justify-between text-xs">
                <span className="text-neutral-500">Current Shelf Stock:</span>
                <span className="font-bold text-base font-mono text-neutral-900 dark:text-white">
                  {selectedProduct.stock_quantity} units
                </span>
              </div>

              <div>
                <label className="text-xs text-neutral-500 font-medium block mb-1">
                  Adjustment Reason / Type
                </label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value)}
                  className="input-field py-2 text-sm w-full"
                >
                  <option value="restock">Restock / New Supplier Batch (+)</option>
                  <option value="damage">Damaged / Scratched in Store (-)</option>
                  <option value="return">Customer Exchange / Return (+)</option>
                  <option value="audit">Physical Inventory Audit Adjustment</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-neutral-500 font-medium block mb-1">
                  Quantity ({adjustType === 'damage' ? 'Deduct Units' : 'Add Units'})
                </label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={quantityDelta}
                  onChange={(e) => setQuantityDelta(e.target.value)}
                  className="input-field py-2 text-sm w-full font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-neutral-500 font-medium block mb-1">
                  Reference / Invoice # (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. INV-SUPP-8921 or PO-2026-03"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="input-field py-2 text-sm w-full"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-500 font-medium block mb-1">
                  Internal Audit Note
                </label>
                <textarea
                  rows="2"
                  placeholder="Reason for adjustment, inspector initials..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input-field py-2 text-sm w-full"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="btn-secondary py-2 px-4 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary py-2 px-5 text-xs flex items-center gap-2"
                >
                  {submitting ? 'Saving...' : 'Apply & Record in Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interactive Barcode & Scanner Modal */}
      <BarcodeModal
        isOpen={!!selectedBarcodeProduct}
        onClose={() => setSelectedBarcodeProduct(null)}
        product={selectedBarcodeProduct}
      />

    </div>
  );
}
