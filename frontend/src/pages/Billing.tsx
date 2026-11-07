import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Product, Customer, Sale } from '../types';
import {
  Receipt, Plus, Trash2, IndianRupee, QrCode, Printer,
  CheckCircle2, AlertCircle, Search, User, CreditCard, X
} from 'lucide-react';

export const Billing: React.FC = () => {
  const { business } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Cart state
  const [cart, setCart] = useState<Array<{ product: Product; quantity: number; unit_price: number }>>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'credit'>('upi');
  
  const [createdSale, setCreatedSale] = useState<Sale | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [prods, custs] = await Promise.all([
          api.listProducts(),
          api.listCustomers(),
        ]);
        setProducts(prods);
        setCustomers(custs);
      } catch (err) {
        console.error('Failed to load billing data:', err);
      }
    };
    loadData();
  }, []);

  const handleAddToCart = (product: Product) => {
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      if (existing.quantity + 1 > product.current_stock) {
        alert(`Cannot add more. Current stock is ${product.current_stock} ${product.unit}`);
        return;
      }
      setCart(cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      if (product.current_stock < 1) {
        alert(`Cannot add. Current stock is ${product.current_stock} ${product.unit}`);
        return;
      }
      setCart([...cart, { product, quantity: 1, unit_price: product.selling_price }]);
    }
  };

  const handleUpdateQuantity = (productId: string, qty: number) => {
    if (qty <= 0) {
      setCart(cart.filter(item => item.product.id !== productId));
      return;
    }
    const item = cart.find(i => i.product.id === productId);
    if (item && qty > item.product.current_stock) {
      alert(`Exceeds available stock: ${item.product.current_stock} ${item.product.unit}`);
      return;
    }
    setCart(cart.map(i => i.product.id === productId ? { ...i, quantity: qty } : i));
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
  const taxAmount = 0; // Tax exempted / included in retail groceries
  const totalAmount = Math.max(0, subtotal + taxAmount - discountAmount);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const sale = await api.createSale({
        customer_id: selectedCustomerId || undefined,
        items: cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        payment_method: paymentMethod,
        notes: 'POS Register Sale',
      });

      setCreatedSale(sale);
      setCart([]);
      setDiscountAmount(0);
      // Refresh products to show updated stock
      const updatedProds = await api.listProducts();
      setProducts(updatedProds);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete sale transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.telugu_name && p.telugu_name.includes(searchTerm)) ||
    (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Sales & Billing (POS Register)
          </h1>
          <p className="text-xs text-slate-400">
            Rapid point-of-sale checkout, instant invoice generation, and Bharat UPI QR payments.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-950/40 border border-rose-800/50 rounded-xl text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Grid: Catalog on left, Bill on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Product Picker */}
        <div className="lg:col-span-7 space-y-4">
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products by English name, Telugu name (బియ్యం), or SKU..."
              className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto pr-1">
            {filteredProducts.map((p) => {
              const inStock = p.current_stock > 0;
              return (
                <button
                  key={p.id}
                  onClick={() => handleAddToCart(p)}
                  disabled={!inStock}
                  className={`p-3 rounded-2xl glass-panel-card text-left transition-all border flex flex-col justify-between space-y-2 ${
                    inStock
                      ? 'hover:border-emerald-500/50 hover:bg-slate-900/80 border-slate-800/80 cursor-pointer'
                      : 'opacity-40 border-slate-900 cursor-not-allowed'
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold text-slate-200 block truncate">{p.name}</span>
                    <span className="text-[11px] text-slate-400 block truncate">{p.telugu_name}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/60">
                    <span className="font-mono font-bold text-emerald-400">₹{p.selling_price.toFixed(2)}</span>
                    <span className={`text-[10px] ${p.is_low_stock ? 'text-amber-400 font-bold' : 'text-slate-400'}`}>
                      {p.current_stock} {p.unit}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Active Bill / Receipt */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 shadow-xl space-y-5 flex flex-col justify-between min-h-[500px]">
            
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">Current Bill / రసీదు</h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">{cart.length} items</span>
              </div>

              {/* Customer Selector */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Select Customer (Optional)</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Walk-in Customer / కౌంటర్ కస్టమర్</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              {/* Itemized Table */}
              <div className="max-h-56 overflow-y-auto divide-y divide-slate-800/80 pr-1">
                {cart.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 space-y-1">
                    <p>Cart is currently empty.</p>
                    <p className="text-[11px]">Click items from catalog or use the voice assistant to add!</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.product.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                      <div className="flex-1 truncate">
                        <span className="font-semibold text-slate-200 block truncate">{item.product.name}</span>
                        <span className="text-[10px] text-slate-400">₹{item.unit_price} / {item.product.unit}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0.5"
                          step="0.5"
                          value={item.quantity}
                          onChange={(e) => handleUpdateQuantity(item.product.id, parseFloat(e.target.value) || 0)}
                          className="w-16 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-center font-mono text-white text-xs"
                        />
                        <span className="w-16 text-right font-mono font-bold text-slate-200">
                          ₹{(item.quantity * item.unit_price).toFixed(2)}
                        </span>
                        <button
                          onClick={() => handleRemoveFromCart(item.product.id)}
                          className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Calculations & Checkout Button */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Subtotal:</span>
                  <span className="font-mono">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Discount (₹):</span>
                  <input
                    type="number"
                    min="0"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                    className="w-20 bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-right font-mono text-xs text-white"
                  />
                </div>
                <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-slate-800">
                  <span>Total Amount:</span>
                  <span className="font-mono text-emerald-400 text-lg">₹{totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                {[
                  { id: 'upi', label: 'UPI QR', icon: QrCode },
                  { id: 'cash', label: 'Cash', icon: IndianRupee },
                  { id: 'credit', label: 'Store Credit', icon: CreditCard },
                ].map((pm) => {
                  const Icon = pm.icon;
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setPaymentMethod(pm.id as any)}
                      className={`py-2 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                        paymentMethod === pm.id
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{pm.label}</span>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleCheckout}
                disabled={cart.length === 0 || isSubmitting}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-bold text-xs shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Creating Bill & QR...' : `Complete Bill (₹${totalAmount.toFixed(2)})`}</span>
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* Invoice Created Modal with Printable GST Layout & Bharat UPI QR */}
      {createdSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-lg glass-panel bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 no-print">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>Tax Invoice Generated / పన్ను రసీదు</span>
              </div>
              <button
                onClick={() => setCreatedSale(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Tax Invoice Container */}
            <div className="printable-invoice bg-white text-slate-900 p-6 rounded-2xl space-y-4 shadow-sm border border-slate-200">
              {/* Header */}
              <div className="text-center border-b border-slate-300 pb-3">
                <h2 className="text-lg font-extrabold text-slate-900 uppercase tracking-tight">
                  {business?.name || 'Sri Lakshmi Kirana & General Stores'}
                </h2>
                <p className="text-xs text-slate-600">
                  {business?.address || 'Shop #4, Market Road, Near Clock Tower, Tenali, AP - 522201'}
                </p>
                <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                  Phone: {business?.phone || '+91 98765 43210'} | GSTIN: {business?.gstin || '37AAAAA0000A1Z5'}
                </p>
                <div className="mt-2 inline-block px-3 py-0.5 bg-slate-100 rounded text-[10px] font-bold uppercase tracking-wider text-slate-700">
                  Retail Tax Invoice / పన్ను రసీదు
                </div>
              </div>

              {/* Invoice Meta */}
              <div className="grid grid-cols-2 text-xs text-slate-700 py-1 border-b border-slate-200">
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase">Invoice No</span>
                  <span className="font-mono font-bold text-slate-900">{createdSale.invoice_number}</span>
                  {createdSale.customer_name && (
                    <div className="mt-1">
                      <span className="block text-[10px] text-slate-500 uppercase">Customer</span>
                      <span className="font-semibold text-slate-900">{createdSale.customer_name}</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <span className="block text-[10px] text-slate-500 uppercase">Date & Time</span>
                  <span className="font-mono text-slate-800">
                    {new Date(createdSale.created_at || Date.now()).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                  <div className="mt-1">
                    <span className="block text-[10px] text-slate-500 uppercase">Payment Mode</span>
                    <span className="font-bold uppercase text-emerald-700 font-mono">{createdSale.payment_method}</span>
                  </div>
                </div>
              </div>

              {/* Itemized Table */}
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-300 text-[10px] text-slate-500 uppercase">
                    <th className="py-1"># Item</th>
                    <th className="py-1 text-center">Qty</th>
                    <th className="py-1 text-right">Rate</th>
                    <th className="py-1 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {createdSale.items && createdSale.items.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td className="py-1.5 font-medium">{item.product_name}</td>
                      <td className="py-1.5 text-center font-mono">{item.quantity}</td>
                      <td className="py-1.5 text-right font-mono">₹{item.unit_price.toFixed(2)}</td>
                      <td className="py-1.5 text-right font-mono font-semibold">₹{item.total_price.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Calculations */}
              <div className="border-t border-slate-300 pt-2 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono">₹{createdSale.subtotal.toFixed(2)}</span>
                </div>
                {createdSale.discount_amount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span className="font-mono">-₹{createdSale.discount_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>GST / Tax:</span>
                  <span className="font-mono">{createdSale.tax_amount > 0 ? `₹${createdSale.tax_amount.toFixed(2)}` : 'Exempt / Retail'}</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-slate-900 border-t border-slate-300 pt-1.5">
                  <span>Net Payable / మొత్తం:</span>
                  <span className="font-mono text-base text-emerald-800">₹{createdSale.total_amount.toFixed(2)}</span>
                </div>
              </div>

              {/* Bharat UPI QR Code */}
              <div className="pt-2 border-t border-slate-200 flex flex-col items-center justify-center space-y-1 text-center">
                <div className="w-28 h-28 bg-slate-900 rounded-xl p-2 flex items-center justify-center">
                  <div className="text-white space-y-1">
                    <QrCode className="w-14 h-14 text-white mx-auto" />
                    <span className="text-[8px] font-mono font-bold block text-emerald-400">BHARAT UPI QR</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-800">Scan to Pay via UPI (PhonePe / GPay / Paytm)</span>
                <span className="text-[9px] font-mono text-slate-500 break-all">{createdSale.invoice?.qr_payload}</span>
                <p className="text-[10px] text-slate-600 pt-1 italic font-semibold">
                  మీ వ్యాపారానికి ధన్యవాదాలు! Thank you for your visit!
                </p>
              </div>
            </div>

            {/* Print & Close */}
            <div className="flex items-center gap-3 no-print">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" /> Print Tax Receipt
              </button>
              <button
                onClick={() => setCreatedSale(null)}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-emerald-400 hover:bg-emerald-300 text-slate-950"
              >
                Done / కొత్త బిల్లు
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

