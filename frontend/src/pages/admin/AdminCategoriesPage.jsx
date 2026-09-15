import React, { useState, useEffect } from 'react';
import { 
  Layers, Plus, Trash2, Edit, CheckCircle2, XCircle, 
  Eye, RefreshCw, Sparkles, Image as ImageIcon, ArrowUpRight
} from 'lucide-react';
import api from '../../api/client';
import { ImageUploadDropzone } from '../../components/common/ImageUploadDropzone';

export const AdminCategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    image_url: '',
    display_order: 0,
    is_active: 1
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/categories.php');
      if (res.success) {
        setCategories(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      image_url: '',
      display_order: categories.length + 1,
      is_active: 1
    });
    setShowModal(true);
  };

  const openEditModal = (cat) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name || '',
      slug: cat.slug || '',
      description: cat.description || '',
      image_url: cat.image_url || '',
      display_order: cat.display_order || 0,
      is_active: cat.is_active ? 1 : 0
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        action: editingCategory ? 'update' : 'create',
        ...(editingCategory ? { id: editingCategory.id } : {}),
        ...formData
      };
      const res = await api.post('/admin/categories.php', payload);
      if (res.success) {
        setMessage({ type: 'success', text: res.message || 'Saved successfully!' });
        setShowModal(false);
        fetchCategories();
      } else {
        setMessage({ type: 'error', text: res.error || 'Failed to save category.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || err.message });
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    try {
      const res = await api.post('/admin/categories.php', {
        action: 'toggle_status',
        id,
        is_active: currentStatus ? 0 : 1
      });
      if (res.success) {
        fetchCategories();
      }
    } catch (err) {
      console.error('Status toggle failed:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category? Products in this category may need reallocation.')) return;
    try {
      let res;
      try {
        res = await api.delete(`/admin/categories.php?id=${id}`);
      } catch {
        res = await api.post('/admin/categories.php', { action: 'delete', id });
      }
      if (res && res.success) {
        setMessage({ type: 'success', text: 'Category deleted successfully.' });
        fetchCategories();
      } else {
        setMessage({ type: 'error', text: res?.message || 'Failed to delete category.' });
      }
    } catch (err) {
      console.error('Delete failed:', err);
      setMessage({ type: 'error', text: err.response?.data?.message || err.message });
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white font-heading flex items-center gap-2.5">
            <Layers className="w-7 h-7 text-brand-cyan" />
            Categories &amp; Storefront Roundels
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage circular category avatars, icons, display order, and eyewear classifications.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchCategories}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all text-xs flex items-center gap-1.5"
            title="Refresh Categories"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={openCreateModal}
            className="btn-primary py-2 px-4 rounded-xl text-xs font-bold shadow-cyan-glow flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-xs font-semibold ${
          message.type === 'success' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
        }`}>
          {message.text}
        </div>
      )}

      {/* Categories Grid / Table */}
      <div className="bg-[#0A192F] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Active Catalog Categories ({categories.length})
          </span>
          <span className="text-[11px] text-slate-400">
            Displayed as circular roundels on homepage
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="text-xs">Loading categories catalog...</div>
          </div>
        ) : categories.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Layers className="w-12 h-12 mx-auto text-slate-600" />
            <div className="text-sm font-bold text-slate-300">No categories created yet</div>
            <p className="text-xs text-slate-500">Add your first category to power storefront roundels.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-white/[0.02] text-slate-400 border-b border-white/10 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4">Roundel Avatar</th>
                  <th className="py-3 px-4">Category Name &amp; Slug</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-brand-cyan">
                      #{cat.display_order}
                    </td>
                    <td className="py-3 px-4">
                      <div className="w-12 h-12 rounded-full border-2 border-brand-cyan/40 bg-[#060D17] overflow-hidden flex items-center justify-center p-0.5">
                        {cat.image_url ? (
                          <img 
                            src={cat.image_url} 
                            alt={cat.name} 
                            className="w-full h-full object-cover rounded-full"
                            onError={(e) => { e.target.src = '/logo_symbol.png'; }}
                          />
                        ) : (
                          <Layers className="w-5 h-5 text-brand-cyan" />
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-white text-sm">{cat.name}</div>
                      <div className="text-[11px] font-mono text-slate-400">/{cat.slug}</div>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-400">
                      {cat.description || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => toggleStatus(cat.id, cat.is_active)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          cat.is_active
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-700/50 text-slate-400 border border-white/10'
                        }`}
                      >
                        {cat.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        <span>{cat.is_active ? 'Live' : 'Hidden'}</span>
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(cat)}
                          className="p-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-600 text-cyan-700 dark:text-cyan-300 hover:text-white dark:hover:text-slate-950 border border-cyan-500/30 transition-all cursor-pointer shadow-xs"
                          title="Edit Category"
                        >
                          <Edit className="w-4 h-4 stroke-[2.2]" />
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id)}
                          className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-600 text-rose-600 dark:text-rose-300 hover:text-white dark:hover:text-white border border-rose-500/40 transition-all cursor-pointer shadow-xs"
                          title="Delete Category"
                        >
                          <Trash2 className="w-4 h-4 stroke-[2.2]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0A192F] border border-white/15 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white font-heading">
                {editingCategory ? 'Edit Category Roundel' : 'Add New Category Roundel'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white text-xl leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Japanese Titanium, Blue Cut, Sunglasses"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#060D17] border border-white/10 text-white text-xs focus:border-brand-cyan focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  URL Slug (Optional, auto-generated)
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="e.g. japanese-titanium"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#060D17] border border-white/10 text-white text-xs focus:border-brand-cyan focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Category Image &amp; Circular Roundel *
                </label>
                <div className="mb-2">
                  <ImageUploadDropzone
                    value={formData.image_url}
                    onChange={(url) => setFormData({ ...formData, image_url: url })}
                    label="Upload Category Image"
                    sublabel="Click or drag PNG/JPG to upload to server"
                    prefix="category"
                  />
                </div>
                <input
                  type="text"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="Or paste image URL (https://...)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#060D17] border border-white/10 text-white text-xs focus:border-brand-cyan focus:outline-none"
                />
                {formData.image_url && (
                  <div className="mt-2 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full border-2 border-brand-cyan bg-[#060D17] overflow-hidden">
                      <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[11px] text-slate-400">Circular Roundel Live Preview</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Description / Subtitle
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ultra-lightweight Japanese aerospace grade frames..."
                  className="w-full px-3.5 py-2 rounded-xl bg-[#060D17] border border-white/10 text-white text-xs focus:border-brand-cyan focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#060D17] border border-white/10 text-white text-xs focus:border-brand-cyan focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Visibility Status
                  </label>
                  <select
                    value={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: parseInt(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#060D17] border border-white/10 text-white text-xs focus:border-brand-cyan focus:outline-none"
                  >
                    <option value={1}>Live / Visible</option>
                    <option value={0}>Draft / Hidden</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary px-5 py-2 rounded-xl text-xs font-bold shadow-cyan-glow flex items-center gap-2"
                >
                  {saving ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
