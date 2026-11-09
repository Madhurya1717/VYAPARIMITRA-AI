import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Product, Category } from '../types';
import {
  ShoppingBag, Plus, Search, Filter, Tag, Check, X,
  IndianRupee, Layers, AlertCircle, Pencil, Trash2, AlertTriangle, Sparkles
} from 'lucide-react';

export const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New product form
  const [formData, setFormData] = useState({
    name: '',
    telugu_name: '',
    aliases_str: '',
    category_id: '',
    sku: '',
    current_stock: 50,
    unit: 'kg',
    cost_price: 45,
    selling_price: 55,
    low_stock_threshold: 10,
  });

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    name: '',
    telugu_name: '',
    aliases_str: '',
    category_id: '',
    sku: '',
    unit: 'kg',
    cost_price: 0,
    selling_price: 0,
    low_stock_threshold: 10,
  });

  const loadData = async () => {
    try {
      const [prods, cats] = await Promise.all([
        api.listProducts({ category_id: selectedCat || undefined }),
        api.getCategories(),
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load products:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCat]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const aliasesArray = formData.aliases_str
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(Boolean);

      await api.createProduct({
        name: formData.name,
        telugu_name: formData.telugu_name || undefined,
        aliases: aliasesArray,
        category_id: formData.category_id || undefined,
        sku: formData.sku || undefined,
        current_stock: formData.current_stock,
        unit: formData.unit,
        cost_price: formData.cost_price,
        selling_price: formData.selling_price,
        low_stock_threshold: formData.low_stock_threshold,
      });

      setIsAddModalOpen(false);
      setFormData({
        name: '',
        telugu_name: '',
        aliases_str: '',
        category_id: '',
        sku: '',
        current_stock: 50,
        unit: 'kg',
        cost_price: 45,
        selling_price: 55,
        low_stock_threshold: 10,
      });
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setEditFormData({
      name: product.name,
      telugu_name: product.telugu_name || '',
      aliases_str: (product.aliases || []).join(', '),
      category_id: product.category_id || '',
      sku: product.sku || '',
      unit: product.unit,
      cost_price: product.cost_price,
      selling_price: product.selling_price,
      low_stock_threshold: product.low_stock_threshold,
    });
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setIsSubmitting(true);
    try {
      const aliasesArray = editFormData.aliases_str
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(Boolean);

      await api.updateProduct(editingProduct.id, {
        name: editFormData.name,
        telugu_name: editFormData.telugu_name || undefined,
        aliases: aliasesArray,
        category_id: editFormData.category_id || undefined,
        sku: editFormData.sku || undefined,
        unit: editFormData.unit,
        cost_price: editFormData.cost_price,
        selling_price: editFormData.selling_price,
        low_stock_threshold: editFormData.low_stock_threshold,
      });

      setEditingProduct(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!deletingProduct) return;
    setIsSubmitting(true);
    try {
      await api.deleteProduct(deletingProduct.id);
      setDeletingProduct(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.telugu_name && p.telugu_name.includes(searchTerm)) ||
    (p.aliases && p.aliases.some(a => a.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full bg-[#F8F5ED]">
      
      {/* Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#28332C] tracking-tight flex items-center gap-2">
            Product Catalog & Vocabulary
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#E4EFE6] text-[#3C9970] border border-[#789B82]/30">
              {products.length} Items
            </span>
          </h1>
          <p className="text-xs text-[#7D887F] font-medium mt-0.5">
            Define canonical product titles, regional Telugu names, and spoken aliases for Voice AI matching.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-[#52745F] hover:bg-[#3D5747] text-white font-extrabold text-xs shadow-xs transition-all flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add New Product
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-[#E5E9E3] flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5 w-full sm:w-80 bg-[#F8F5ED] px-3.5 py-2 rounded-xl border border-[#E5E9E3]">
          <Search className="w-4 h-4 text-[#52745F]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, Telugu script, or alias..."
            className="w-full bg-transparent text-xs text-[#28332C] placeholder-[#7D887F] focus:outline-none font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="bg-[#F8F5ED] border border-[#E5E9E3] rounded-xl px-3.5 py-2 text-xs text-[#28332C] font-bold focus:outline-none focus:border-[#789B82]"
          >
            <option value="">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p) => (
          <div key={p.id} className="bg-white p-5 rounded-2xl border border-[#E5E9E3] hover:border-[#789B82] transition-all shadow-xs space-y-3 flex flex-col justify-between group">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black text-[#28332C] group-hover:text-[#52745F] transition-colors">{p.name}</h3>
                  <span className="text-xs text-[#52745F] font-bold block">{p.telugu_name}</span>
                </div>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#EDF5EF] text-[#52745F] border border-[#E5E9E3] font-bold">
                  {p.category_name || 'General'}
                </span>
              </div>

              {/* Spoken Aliases Tags */}
              <div className="pt-2">
                <span className="text-[10px] uppercase font-bold text-[#7D887F] block mb-1">
                  Recognized Voice Aliases:
                </span>
                <div className="flex flex-wrap gap-1">
                  {p.aliases.map((alias, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-[#EDF5EF] text-[#52745F] border border-[#E5E9E3]/70">
                      {alias}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Price & Stock Footer */}
            <div className="pt-3 border-t border-[#E5E9E3] flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-[#7D887F] font-medium block">Selling Price</span>
                <span className="font-mono font-black text-[#28332C] text-sm">₹{p.selling_price.toFixed(2)} / {p.unit}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] text-[#7D887F] font-medium block">Stock</span>
                  <span className={`font-mono font-bold ${p.is_low_stock ? 'text-[#D97706]' : 'text-[#3C9970]'}`}>
                    {p.current_stock} {p.unit}
                  </span>
                </div>
                <div className="flex items-center gap-1 pl-2 border-l border-[#E5E9E3]">
                  <button
                    onClick={() => handleOpenEdit(p)}
                    title="Edit Product"
                    className="p-1.5 rounded-lg bg-[#EDF5EF] hover:bg-[#E4EFE6] text-[#52745F] transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingProduct(p)}
                    title="Delete Product"
                    className="p-1.5 rounded-lg bg-[#FEE2E2] hover:bg-[#FCA5A5] text-[#DC2626] transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white border border-[#E5E9E3] rounded-3xl p-6 sm:p-7 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E5E9E3] pb-3">
              <h3 className="text-sm font-black text-[#28332C] flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#52745F]" />
                Add New Product to Catalog
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 rounded-xl text-[#7D887F] hover:text-[#28332C] hover:bg-[#EDF5EF]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#7D887F] block mb-1">Product Name (English)</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Moong Dal"
                    className="w-full bg-[#F8F5ED] border border-[#E5E9E3] rounded-xl px-3.5 py-2 text-xs text-[#28332C] font-bold focus:outline-none focus:border-[#789B82]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#7D887F] block mb-1">Telugu Title (తెలుగు పేరు)</label>
                  <input
                    type="text"
                    value={formData.telugu_name}
                    onChange={(e) => setFormData({ ...formData, telugu_name: e.target.value })}
                    placeholder="e.g. పెసరపప్పు"
                    className="w-full bg-[#F8F5ED] border border-[#E5E9E3] rounded-xl px-3.5 py-2 text-xs text-[#28332C] font-bold focus:outline-none focus:border-[#789B82]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#7D887F] block mb-1">
                  Spoken Aliases (Comma-separated for Voice Matching)
                </label>
                <input
                  type="text"
                  value={formData.aliases_str}
                  onChange={(e) => setFormData({ ...formData, aliases_str: e.target.value })}
                  placeholder="e.g. moong, pesara pappu, green gram, పప్పు"
                  className="w-full bg-[#F8F5ED] border border-[#E5E9E3] rounded-xl px-3.5 py-2 text-xs text-[#28332C] font-medium focus:outline-none focus:border-[#789B82]"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#7D887F] block mb-1">Initial Stock</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={formData.current_stock}
                    onChange={(e) => setFormData({ ...formData, current_stock: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#F8F5ED] border border-[#E5E9E3] rounded-xl px-3.5 py-2 text-xs text-[#28332C] font-mono font-bold focus:outline-none focus:border-[#789B82]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#7D887F] block mb-1">Unit</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full bg-[#F8F5ED] border border-[#E5E9E3] rounded-xl px-3.5 py-2 text-xs text-[#28332C] font-bold focus:outline-none focus:border-[#789B82]"
                  >
                    <option value="kg">kg (కిలో)</option>
                    <option value="packets">packets (ప్యాకెట్)</option>
                    <option value="pieces">pieces (ముక్కలు)</option>
                    <option value="litres">litres (లీటర్)</option>
                    <option value="bags">bags (బస్తా)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#7D887F] block mb-1">Category</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full bg-[#F8F5ED] border border-[#E5E9E3] rounded-xl px-3.5 py-2 text-xs text-[#28332C] font-bold focus:outline-none focus:border-[#789B82]"
                  >
                    <option value="">Select...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#7D887F] block mb-1">Cost Price (₹)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#F8F5ED] border border-[#E5E9E3] rounded-xl px-3.5 py-2 text-xs text-[#28332C] font-mono font-bold focus:outline-none focus:border-[#789B82]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#7D887F] block mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#F8F5ED] border border-[#E5E9E3] rounded-xl px-3.5 py-2 text-xs text-[#28332C] font-mono font-bold focus:outline-none focus:border-[#789B82]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#E5E9E3] text-xs font-bold text-[#7D887F] hover:bg-[#EDF5EF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#52745F] hover:bg-[#3D5747] text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  {isSubmitting ? 'Creating...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white border border-[#E5E9E3] rounded-3xl p-6 sm:p-7 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E5E9E3] pb-3">
              <h3 className="text-sm font-black text-[#28332C]">Edit Product: {editingProduct.name}</h3>
              <button onClick={() => setEditingProduct(null)} className="p-1 rounded-xl text-[#7D887F] hover:text-[#28332C] hover:bg-[#EDF5EF]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#7D887F] block mb-1">Product Name</label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full bg-[#F8F5ED] border border-[#E5E9E3] rounded-xl px-3.5 py-2 text-xs text-[#28332C] font-bold focus:outline-none focus:border-[#789B82]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#7D887F] block mb-1">Telugu Title</label>
                  <input
                    type="text"
                    value={editFormData.telugu_name}
                    onChange={(e) => setEditFormData({ ...editFormData, telugu_name: e.target.value })}
                    className="w-full bg-[#F8F5ED] border border-[#E5E9E3] rounded-xl px-3.5 py-2 text-xs text-[#28332C] font-bold focus:outline-none focus:border-[#789B82]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#7D887F] block mb-1">Spoken Aliases</label>
                <input
                  type="text"
                  value={editFormData.aliases_str}
                  onChange={(e) => setEditFormData({ ...editFormData, aliases_str: e.target.value })}
                  className="w-full bg-[#F8F5ED] border border-[#E5E9E3] rounded-xl px-3.5 py-2 text-xs text-[#28332C] font-medium focus:outline-none focus:border-[#789B82]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#7D887F] block mb-1">Cost Price (₹)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={editFormData.cost_price}
                    onChange={(e) => setEditFormData({ ...editFormData, cost_price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#F8F5ED] border border-[#E5E9E3] rounded-xl px-3.5 py-2 text-xs text-[#28332C] font-mono font-bold focus:outline-none focus:border-[#789B82]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#7D887F] block mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={editFormData.selling_price}
                    onChange={(e) => setEditFormData({ ...editFormData, selling_price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#F8F5ED] border border-[#E5E9E3] rounded-xl px-3.5 py-2 text-xs text-[#28332C] font-mono font-bold focus:outline-none focus:border-[#789B82]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="flex-1 py-2.5 rounded-xl border border-[#E5E9E3] text-xs font-bold text-[#7D887F] hover:bg-[#EDF5EF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#52745F] hover:bg-[#3D5747] text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  {isSubmitting ? 'Updating...' : 'Update Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white border border-[#E5E9E3] rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-[#28332C]">Delete Product</h3>
            <p className="text-xs text-[#7D887F]">
              Are you sure you want to remove <strong className="text-[#28332C]">{deletingProduct.name}</strong> from catalog?
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setDeletingProduct(null)}
                className="flex-1 py-2 rounded-xl border border-[#E5E9E3] text-xs font-bold text-[#7D887F] hover:bg-[#EDF5EF]"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProduct}
                disabled={isSubmitting}
                className="flex-1 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold shadow-xs"
              >
                {isSubmitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Products;
