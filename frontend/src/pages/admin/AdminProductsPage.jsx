import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, Search, Filter, Sparkles, QrCode, Edit3, 
  Trash2, ExternalLink, AlertTriangle, CheckCircle2, 
  Layers, Package, Eye, RefreshCw, Barcode
} from 'lucide-react';
import api from '../../api/client';
import { BarcodeModal } from '../../components/common/BarcodeModal';

export const AdminProductsPage = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedBarcodeProduct, setSelectedBarcodeProduct] = useState(null);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/products.php');
      if (res.success && res.data?.products) {
        setProducts(res.data.products);
      }
    } catch (err) {
      console.error('Failed to load admin products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDeleteProduct = async (id) => {
    setDeleteLoading(true);
    try {
      const res = await api.delete(`/admin/products.php?id=${id}`);
      if (res.success) {
        setProducts(products.filter(p => p.id !== id));
        setDeleteConfirmId(null);
      } else {
        alert(res.message || 'Failed to delete product.');
      }
    } catch (err) {
      alert(err.message || 'Error deleting product.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filtered = products.filter(p => {
    const matchesSearch = 
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'all' || String(p.category_id) === String(selectedCategory);
    return matchesSearch && matchesCat;
  });

  const totalSKUs = products.length;
  const totalStock = products.reduce((acc, p) => acc + (parseInt(p.stock_quantity) || 0), 0);
  const lowStockCount = products.filter(p => (parseInt(p.stock_quantity) || 0) <= (parseInt(p.low_stock_threshold) || 5)).length;
  const tryOnCount = products.filter(p => p.is_tryon_enabled === 1).length;

  return (
    <div className="space-y-6">
      
      {/* Header with Title and Add CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <span className="text-xs uppercase font-extrabold tracking-wider text-brand-cyan">
            Optical Catalog Management (Screen 18)
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Eyewear Products &amp; Frames
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Maintain optical chassis, prices, 3D try-on calibration, and inventory counts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchProducts}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-cyan' : ''}`} />
          </button>
          <Link
            to="/admin/products/new"
            className="btn-primary text-xs py-2.5 px-4 font-bold rounded-xl flex items-center gap-2 shadow-cyan-glow"
          >
            <Plus className="w-4 h-4" /> Add New Frame
          </Link>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-cyan/15 text-brand-cyan flex items-center justify-center font-bold">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Total SKUs</div>
            <div className="text-xl font-extrabold text-white font-mono">{totalSKUs}</div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-400 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Stock in Vault</div>
            <div className="text-xl font-extrabold text-white font-mono">{totalStock} Units</div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Low Stock Alert</div>
            <div className="text-xl font-extrabold text-white font-mono">{lowStockCount} Models</div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 uppercase font-semibold">3D Try-On Ready</div>
            <div className="text-xl font-extrabold text-white font-mono">{tryOnCount} Frames</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="glass-card rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Name, SKU, or Barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full glass-input rounded-xl pl-9 pr-4 py-2 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="glass-input rounded-xl px-3 py-2 text-xs bg-[#091527] text-white"
          >
            <option value="all">All Categories</option>
            <option value="1">Men's Eyeglasses</option>
            <option value="2">Women's Eyeglasses</option>
            <option value="3">Polarized Sunglasses</option>
            <option value="4">Kids Eyewear</option>
            <option value="5">Computer Blue-Cut</option>
            <option value="6">Reading Glasses</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-3.5">Frame Image</th>
                <th className="p-3.5">Product Details</th>
                <th className="p-3.5">SKU &amp; Barcode</th>
                <th className="p-3.5">Dimensions</th>
                <th className="p-3.5">Selling Price</th>
                <th className="p-3.5">Stock Status</th>
                <th className="p-3.5">3D Try-On</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-12 text-center text-slate-400">
                    <div className="w-8 h-8 rounded-full border-2 border-brand-cyan border-t-transparent animate-spin mx-auto mb-2" />
                    Loading catalog inventory...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-12 text-center text-slate-400">
                    No eyewear models match your search criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const stock = parseInt(p.stock_quantity) || 0;
                  const threshold = parseInt(p.low_stock_threshold) || 5;
                  const isLow = stock <= threshold;

                  return (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                      
                      {/* Image Thumbnail */}
                      <td className="p-3.5">
                        <div className="w-14 h-14 rounded-xl bg-[#070E1A] border border-white/10 p-1 flex items-center justify-center shrink-0">
                          <img
                            src={p.primary_image || '/logo_symbol.png'}
                            alt={p.name}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      </td>

                      {/* Name & Category */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">{p.name}</div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
                          {p.category_name || 'Eyeglasses'} &bull; <span className="capitalize">{p.frame_shape}</span>
                        </div>
                        {p.is_featured === 1 && (
                          <span className="inline-block mt-1 text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30">
                            Featured
                          </span>
                        )}
                      </td>

                      {/* SKU & Barcode */}
                      <td className="p-3.5">
                        <div className="font-mono text-sky-700 dark:text-brand-cyan font-extrabold text-[11px]">{p.sku}</div>
                        <button
                          type="button"
                          onClick={() => setSelectedBarcodeProduct(p)}
                          className="font-mono text-slate-700 dark:text-slate-300 hover:text-sky-700 dark:hover:text-brand-cyan text-[10px] font-semibold flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-300 dark:border-white/10 transition-colors cursor-pointer"
                          title="Click to view full barcode sticker & mobile scanner QR"
                        >
                          <Barcode className="w-3.5 h-3.5 text-sky-600 dark:text-brand-cyan" />
                          <span>{p.barcode || p.sku}</span>
                        </button>
                      </td>

                      {/* Dimensions */}
                      <td className="p-3.5 font-mono text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                        {p.dimensions_label || `${p.lens_width || 52}-${p.bridge_width || 18}-${p.temple_length || 140}`}
                        <div className="text-[10px] text-slate-600 dark:text-slate-500 capitalize">{p.frame_size} Fit</div>
                      </td>

                      {/* Price */}
                      <td className="p-3.5">
                        <div className="font-extrabold text-slate-900 dark:text-white font-mono text-sm">
                          ₹{p.price}
                        </div>
                        {p.discount_price && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 line-through font-mono font-medium">
                            MRP ₹{p.discount_price}
                          </div>
                        )}
                      </td>

                      {/* Stock Status */}
                      <td className="p-3.5">
                        {stock === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-400 font-bold text-[10px]">
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 font-bold text-[10px]">
                            <AlertTriangle className="w-3 h-3" /> {stock} left
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-500/15 text-teal-300 font-bold text-[10px]">
                            <CheckCircle2 className="w-3 h-3" /> {stock} In Vault
                          </span>
                        )}
                      </td>

                      {/* Try-On Indicator */}
                      <td className="p-3.5">
                        {p.is_tryon_enabled === 1 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand-cyan/20 text-brand-cyan text-[10px] font-bold">
                            <Sparkles className="w-3.5 h-3.5" /> 3D Ready
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">Disabled</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/admin/products/edit/${p.id}`}
                            className="p-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-600 text-cyan-700 dark:text-cyan-300 hover:text-white dark:hover:text-slate-950 border border-cyan-500/30 inline-flex items-center transition-all shadow-xs"
                            title="Edit Frame Details, Images & Pricing"
                          >
                            <Edit3 className="w-4 h-4 stroke-[2.2]" />
                          </Link>
                          <Link
                            to={`/product/${p.sku}`}
                            target="_blank"
                            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700/40 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-white/10 inline-flex items-center transition-all shadow-xs"
                            title="View on Storefront"
                          >
                            <ExternalLink className="w-4 h-4 stroke-[2.2]" />
                          </Link>
                          <Link
                            to={`/admin/labels?sku=${p.sku}`}
                            className="p-2 rounded-xl bg-teal-500/15 hover:bg-teal-600 text-teal-700 dark:text-teal-300 hover:text-white dark:hover:text-slate-950 border border-teal-500/30 inline-flex items-center transition-all shadow-xs"
                            title="Print Barcode Label"
                          >
                            <QrCode className="w-4 h-4 stroke-[2.2]" />
                          </Link>
                          <button
                            onClick={() => setDeleteConfirmId(p.id)}
                            className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-600 text-rose-600 dark:text-rose-300 hover:text-white dark:hover:text-white border border-rose-500/40 inline-flex items-center transition-all cursor-pointer shadow-xs"
                            title="Archive / Delete Frame"
                          >
                            <Trash2 className="w-4 h-4 stroke-[2.2]" />
                          </button>
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

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0A192F] border border-slate-200 dark:border-rose-500/40 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-slate-900 dark:text-white">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-500/30">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Archive Eyewear Frame?</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                This will deactivate the product from the public storefront while retaining historical sales and prescription audit records.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="btn-secondary text-xs py-2.5 rounded-xl font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteProduct(deleteConfirmId)}
                disabled={deleteLoading}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2.5 rounded-xl shadow-sm transition-all"
              >
                {deleteLoading ? 'Archiving...' : 'Yes, Archive'}
              </button>
            </div>
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
};
