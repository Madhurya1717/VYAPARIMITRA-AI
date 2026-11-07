import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Product, InventoryTransaction } from '../types';
import {
  Boxes, Plus, ArrowUpRight, ArrowDownRight, RefreshCw, AlertTriangle,
  Search, Filter, History, CheckCircle2, X
} from 'lucide-react';

export const Inventory: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [activeTab, setActiveTab] = useState<'stock' | 'ledger'>('stock');
  const [searchTerm, setSearchTerm] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  
  // Stock Adjustment Modal
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustQty, setAdjustQty] = useState<number>(10);
  const [adjustType, setAdjustType] = useState<'IN' | 'OUT' | 'ADJUSTMENT'>('IN');
  const [adjustNotes, setAdjustNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const loadData = async () => {
    try {
      const [prods, txs] = await Promise.all([
        api.listProducts({ low_stock_only: lowStockFilter }),
        api.getInventoryTransactions(50),
      ]);
      setProducts(prods);
      setTransactions(txs);
    } catch (err) {
      console.error('Failed to load inventory:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [lowStockFilter]);

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setIsSubmitting(true);
    try {
      await api.adjustStock(selectedProduct.id, adjustQty, adjustType, adjustNotes);
      setSelectedProduct(null);
      setAdjustNotes('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Stock adjustment failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.telugu_name && p.telugu_name.includes(searchTerm))
  );

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      
      {/* Title & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Inventory & Stock Ledger
          </h1>
          <p className="text-xs text-slate-400">
            Real-time stock quantities, low-stock threshold monitoring, and complete auditable transaction history.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-2xl border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'stock'
                ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Current Stock ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'ledger'
                ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Audit Ledger ({transactions.length})
          </button>
        </div>
      </div>

      {/* Tab 1: Current Stock */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          
          {/* Filter Bar */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 w-full sm:w-80 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search inventory items..."
                className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            <button
              onClick={() => setLowStockFilter(!lowStockFilter)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center gap-2 transition-all ${
                lowStockFilter
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Low Stock Items Only</span>
            </button>
          </div>

          {/* Table */}
          <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/40 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4">Item Name</th>
                    <th className="py-3.5 px-4">Telugu Title</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4 text-right">Available Stock</th>
                    <th className="py-3.5 px-4 text-right">Selling Price</th>
                    <th className="py-3.5 px-4 text-center">Threshold</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-100">
                        {p.name}
                        {p.sku && <span className="text-[10px] text-slate-400 block font-mono">{p.sku}</span>}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">{p.telugu_name || '—'}</td>
                      <td className="py-3.5 px-4 text-slate-400">{p.category_name || 'General'}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold">
                        <span className={`px-2.5 py-1 rounded-full text-xs ${
                          p.is_low_stock
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold'
                            : 'text-emerald-400'
                        }`}>
                          {p.current_stock} {p.unit}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-200">
                        ₹{p.selling_price.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-400 font-mono text-[11px]">
                        {p.low_stock_threshold} {p.unit}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedProduct(p)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                        >
                          Adjust Stock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* Tab 2: Inventory Audit Ledger */}
      {activeTab === 'ledger' && (
        <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/40 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Item</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4 text-right">Movement</th>
                  <th className="py-3.5 px-4 text-right">Balance After</th>
                  <th className="py-3.5 px-4">Reference & Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-200">
                      {tx.product_name || 'Product'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        tx.type === 'IN'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : tx.type === 'OUT'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold">
                      <span className={tx.quantity > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-200">
                      {tx.balance_after}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {tx.notes || tx.reference_type || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md glass-panel bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Adjust Stock: {selectedProduct.name}</h3>
              <button onClick={() => setSelectedProduct(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs flex justify-between">
                <span className="text-slate-400">Current Stock Balance:</span>
                <span className="font-bold text-emerald-400 font-mono">
                  {selectedProduct.current_stock} {selectedProduct.unit}
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Adjustment Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { type: 'IN', label: 'Stock Inward (+)' },
                    { type: 'OUT', label: 'Damaged / Out (-)' },
                    { type: 'ADJUSTMENT', label: 'Correction' },
                  ].map((t) => (
                    <button
                      key={t.type}
                      type="button"
                      onClick={() => setAdjustType(t.type as any)}
                      className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                        adjustType === t.type
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Quantity ({selectedProduct.unit})
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Audit Ledger Note</label>
                <input
                  type="text"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="e.g. Received new shipment from Guntur mills"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-emerald-400 hover:bg-emerald-300 text-slate-950 disabled:opacity-50"
                >
                  {isSubmitting ? 'Updating...' : 'Commit to Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

