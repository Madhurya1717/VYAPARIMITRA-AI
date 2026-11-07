import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Product, Category } from '../types';
import {
  ShoppingBag, Plus, Search, Filter, Tag, Check, X,
  IndianRupee, Layers, AlertCircle
} from 'lucide-react';

export const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
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

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.telugu_name && p.telugu_name.includes(searchTerm)) ||
    (p.aliases && p.aliases.some(a => a.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      
      {/* Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Product Catalog & Vocabulary
          </h1>
          <p className="text-xs text-slate-400">
            Define canonical product titles, regional Telugu names, and spoken aliases for Voice AI matching.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add New Product
        </button>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 w-full sm:w-80 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, Telugu script, or alias..."
            className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
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
          <div key={p.id} className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white">{p.name}</h3>
                  <span className="text-xs text-emerald-400 font-medium block">{p.telugu_name}</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {p.category_name || 'General'}
                </span>
              </div>

              {/* Spoken Aliases Tags */}
              <div className="pt-2">
                <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-1">
                  Recognized Voice Aliases:
                </span>
                <div className="flex flex-wrap gap-1">
                  {p.aliases.map((alias, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full text-[10px] bg-slate-900 text-slate-300 border border-slate-800">
                      {alias}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Price & Stock Footer */}
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Selling Price</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">₹{p.selling_price.toFixed(2)} / {p.unit}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Available Stock</span>
                <span className={`font-mono font-bold ${p.is_low_stock ? 'text-amber-400' : 'text-slate-200'}`}>
                  {p.current_stock} {p.unit}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-lg glass-panel bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                Add New Product to Catalog
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Product Name (English)</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Moong Dal"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Telugu Title (తెలుగు పేరు)</label>
                  <input
                    type="text"
                    value={formData.telugu_name}
                    onChange={(e) => setFormData({ ...formData, telugu_name: e.target.value })}
                    placeholder="e.g. పెసరపప్పు"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Spoken Aliases (Comma-separated for Voice Matching)
                </label>
                <input
                  type="text"
                  value={formData.aliases_str}
                  onChange={(e) => setFormData({ ...formData, aliases_str: e.target.value })}
                  placeholder="e.g. moong, pesara pappu, green gram, పప్పు"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Initial Stock</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={formData.current_stock}
                    onChange={(e) => setFormData({ ...formData, current_stock: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Unit</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="kg">kg (కిలో)</option>
                    <option value="litre">litre (లీటర్)</option>
                    <option value="packet">packet (ప్యాకెట్)</option>
                    <option value="bag">bag (బస్తా)</option>
                    <option value="piece">piece (ముక్క)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Threshold</label>
                  <input
                    type="number"
                    value={formData.low_stock_threshold}
                    onChange={(e) => setFormData({ ...formData, low_stock_threshold: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Cost Price (₹)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-emerald-400 hover:bg-emerald-300 text-slate-950 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Add to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
