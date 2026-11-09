import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Product, InventoryTransaction } from '../types';
import {
  Boxes, Plus, ArrowUpRight, ArrowDownRight, RefreshCw, AlertTriangle,
  Search, Filter, History, CheckCircle2, X, Sparkles, Layers
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
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full bg-[#F8F5ED]">
      
      {/* Title & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#28332C] tracking-tight flex items-center gap-2">
            Inventory & Stock Ledger
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#E4EFE6] text-[#3C9970] border border-[#789B82]/30">
              Live Stock
            </span>
          </h1>
          <p className="text-xs text-[#7D887F] font-medium mt-0.5">
            Real-time stock quantities, low-stock threshold monitoring, and complete auditable transaction history.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-[#E5E9E3] self-start sm:self-auto shadow-xs">
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'stock'
                ? 'bg-[#52745F] text-white shadow-xs'
                : 'text-[#7D887F] hover:text-[#28332C]'
            }`}
          >
            Current Stock ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'ledger'
                ? 'bg-[#52745F] text-white shadow-xs'
                : 'text-[#7D887F] hover:text-[#28332C]'
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
          <div className="bg-white p-3.5 rounded-2xl border border-[#E5E9E3] flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5 w-full sm:w-80 bg-[#F8F5ED] px-3.5 py-2 rounded-xl border border-[#E5E9E3]">
              <Search className="w-4 h-4 text-[#52745F]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search inventory items..."
                className="w-full bg-transparent text-xs text-[#28332C] placeholder-[#7D887F] focus:outline-none font-medium"
              />
            </div>

            <button
              onClick={() => setLowStockFilter(!lowStockFilter)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 transition-all cursor-pointer ${
                lowStockFilter
                  ? 'bg-[#FEF3C7] text-[#D97706] border-[#FCD34D] shadow-xs'
                  : 'bg-[#F8F5ED] text-[#7D887F] border-[#E5E9E3] hover:text-[#28332C]'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-[#D97706]" />
              <span>Low Stock Items Only</span>
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-[#E5E9E3] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E5E9E3] bg-[#EDF5EF] text-[#52745F] font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Item Name</th>
                    <th className="py-3 px-4">Telugu Title</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Available Stock</th>
                    <th className="py-3 px-4 text-right">Selling Price</th>
                    <th className="py-3 px-4 text-center">Threshold</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E9E3]/60 text-[#28332C]">
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-[#F8F5ED]/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-[#28332C]">
                        {p.name}
                        {p.sku && <span className="text-[10px] text-[#7D887F] block font-mono font-normal">{p.sku}</span>}
                      </td>
                      <td className="py-3 px-4 text-[#52745F] font-medium">{p.telugu_name || '—'}</td>
                      <td className="py-3 px-4 text-[#7D887F]">{p.category_name || 'General'}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold inline-block ${
                          p.is_low_stock
                            ? 'bg-[#FEF3C7] text-[#D97706] border border-[#FCD34D]'
                            : 'bg-[#E4EFE6] text-[#3C9970]'
                        }`}>
                          {p.current_stock} {p.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#28332C]">
                        ₹{p.selling_price.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center text-[#7D887F] font-mono text-[11px]">
                        {p.low_stock_threshold} {p.unit}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedProduct(p)}
                          className="px-3 py-1 rounded-xl text-xs font-bold bg-[#EDF5EF] hover:bg-[#E4EFE6] text-[#52745F] border border-[#E5E9E3] transition-all cursor-pointer"
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
        <div className="bg-white rounded-2xl border border-[#E5E9E3] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E5E9E3] bg-[#EDF5EF] text-[#52745F] font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Item</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Movement</th>
                  <th className="py-3 px-4 text-right">Balance After</th>
                  <th className="py-3 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E9E3]/60 text-[#28332C]">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#F8F5ED]/50 transition-colors">
                    <td className="py-3 px-4 text-[#7D887F] font-mono text-[11px]">
                      {new Date(tx.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-3 px-4 font-bold text-[#28332C]">
                      {tx.product_name || 'Item'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        tx.type === 'IN'
                          ? 'bg-[#E4EFE6] text-[#3C9970]'
                          : tx.type === 'OUT'
                          ? 'bg-[#FEE2E2] text-[#DC2626]'
                          : 'bg-[#EDF5EF] text-[#52745F]'
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold">
                      <span className={tx.quantity > 0 ? 'text-[#3C9970]' : 'text-[#DC2626]'}>
                        {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[#28332C]">
                      {tx.balance_after}
                    </td>
                    <td className="py-3 px-4 text-[#7D887F] italic text-[11px]">
                      {tx.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 border border-[#E5E9E3] shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E9E3]">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-[#52745F]" />
                <h3 className="text-sm font-bold text-[#28332C]">Adjust Inventory Stock</h3>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-1 rounded-xl text-[#7D887F] hover:text-[#28332C] hover:bg-[#EDF5EF]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div className="p-3 rounded-xl bg-[#EDF5EF] border border-[#E5E9E3] text-xs">
                <div className="font-bold text-[#28332C]">{selectedProduct.name}</div>
                <div className="text-[11px] text-[#52745F] mt-0.5">
                  Current Stock: <strong className="text-[#28332C]">{selectedProduct.current_stock} {selectedProduct.unit}</strong>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#7D887F] uppercase tracking-wider block">
                  Movement Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'IN', label: 'Inbound (+)' },
                    { id: 'OUT', label: 'Outbound (-)' },
                    { id: 'ADJUSTMENT', label: 'Audit Set (=)' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setAdjustType(m.id as any)}
                      className={`py-2 text-[11px] font-bold rounded-xl border transition-all ${
                        adjustType === m.id
                          ? 'bg-[#52745F] text-white border-[#52745F]'
                          : 'bg-[#F8F5ED] text-[#7D887F] border-[#E5E9E3] hover:text-[#28332C]'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#7D887F] uppercase tracking-wider block">
                  Quantity ({selectedProduct.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Number(e.target.value))}
                  className="w-full text-xs font-mono font-bold bg-[#F8F5ED] border border-[#E5E9E3] rounded-xl px-3 py-2 text-[#28332C] focus:outline-none focus:border-[#789B82]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#7D887F] uppercase tracking-wider block">
                  Reason / Notes
                </label>
                <input
                  type="text"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="e.g. Inbound shipment from wholesale mandi"
                  className="w-full text-xs bg-[#F8F5ED] border border-[#E5E9E3] rounded-xl px-3 py-2 text-[#28332C] focus:outline-none focus:border-[#789B82]"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="flex-1 py-2.5 rounded-xl border border-[#E5E9E3] text-xs font-bold text-[#7D887F] hover:bg-[#EDF5EF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#52745F] hover:bg-[#3D5747] text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : 'Apply Stock Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Inventory;
