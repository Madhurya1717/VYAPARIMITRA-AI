import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Product, Customer, Sale } from '../types';
import {
  Receipt, Plus, Trash2, IndianRupee, QrCode, Printer,
  CheckCircle2, AlertCircle, Search, User, CreditCard, X, ShoppingCart
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
  const taxAmount = 0;
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
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full bg-[#F8F5ED]">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#28332C] tracking-tight flex items-center gap-2">
            Sales & Billing (POS Register)
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#E4EFE6] text-[#3C9970] border border-[#789B82]/30">
              Bharat POS
            </span>
          </h1>
          <p className="text-xs text-[#7D887F] font-medium mt-0.5">
            Rapid point-of-sale checkout, instant invoice generation, and Bharat UPI QR payments.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-[#FEE2E2] border border-[#FCA5A5] rounded-2xl text-xs text-[#DC2626] font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Grid: Catalog on left, Bill on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Product Picker */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white p-3.5 rounded-2xl border border-[#E5E9E3] flex items-center gap-3 shadow-xs">
            <Search className="w-4 h-4 text-[#52745F]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products by English name, Telugu name (బియ్యం), or SKU..."
              className="w-full bg-transparent text-xs text-[#28332C] placeholder-[#7D887F] focus:outline-none font-medium"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 max-h-[620px] overflow-y-auto sage-scrollbar pr-1">
            {filteredProducts.map((p) => {
              const inStock = p.current_stock > 0;
              return (
                <button
                  key={p.id}
                  onClick={() => handleAddToCart(p)}
                  disabled={!inStock}
                  className={`p-4 rounded-2xl text-left transition-all border flex flex-col justify-between space-y-3 ${
                    inStock
                      ? 'bg-white hover:bg-[#EDF5EF] hover:border-[#789B82] border-[#E5E9E3] cursor-pointer shadow-xs group'
                      : 'bg-[#F8F5ED] opacity-40 border-[#E5E9E3] cursor-not-allowed'
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold text-[#28332C] block truncate group-hover:text-[#52745F] transition-colors">
                      {p.name}
                    </span>
                    <span className="text-[11px] text-[#52745F] font-medium block truncate">
                      {p.telugu_name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-2.5 border-t border-[#E5E9E3]">
                    <span className="font-mono font-black text-[#28332C] text-sm">₹{p.selling_price.toFixed(2)}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                      p.is_low_stock
                        ? 'bg-[#FEF3C7] text-[#D97706] border border-[#FCD34D]'
                        : 'bg-[#E4EFE6] text-[#3C9970]'
                    }`}>
                      {p.current_stock} {p.unit}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Cart & Checkout Ledger */}
        <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-3xl border border-[#E5E9E3] shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E9E3]">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#52745F]" />
                <h2 className="text-sm font-bold text-[#28332C]">Current Cart / బిల్లింగ్</h2>
              </div>
              <span className="text-xs font-mono font-bold text-[#52745F] bg-[#EDF5EF] px-2.5 py-1 rounded-xl">
                {cart.length} item(s)
              </span>
            </div>

            {/* Customer Khata Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#7D887F] uppercase tracking-wider block">
                Select Customer (Khata)
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full text-xs font-medium bg-[#F8F5ED] border border-[#E5E9E3] rounded-xl px-3 py-2 text-[#28332C] focus:outline-none focus:border-[#789B82]"
              >
                <option value="">Walk-in Customer (నగదు / Walk-in)</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone}) - Khata: ₹{c.credit_balance}
                  </option>
                ))}
              </select>
            </div>

            {/* Cart Items List */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto sage-scrollbar pr-1">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#7D887F] space-y-1">
                  <ShoppingCart className="w-8 h-8 text-[#789B82]/40 mx-auto" />
                  <p>Cart is empty. Select items from the catalog.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#F8F5ED] border border-[#E5E9E3] text-xs"
                  >
                    <div className="flex-1 truncate pr-2">
                      <div className="font-bold text-[#28332C] truncate">{item.product.name}</div>
                      <div className="text-[10px] text-[#7D887F]">
                        ₹{item.unit_price} / {item.product.unit}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-[#E5E9E3] rounded-lg bg-white overflow-hidden">
                        <button
                          onClick={() => handleUpdateQuantity(item.product.id, item.quantity - 1)}
                          className="px-2 py-0.5 text-[#28332C] hover:bg-[#EDF5EF] font-bold"
                        >
                          -
                        </button>
                        <span className="px-2 text-xs font-mono font-bold text-[#28332C]">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQuantity(item.product.id, item.quantity + 1)}
                          className="px-2 py-0.5 text-[#28332C] hover:bg-[#EDF5EF] font-bold"
                        >
                          +
                        </button>
                      </div>

                      <span className="font-mono font-bold text-[#28332C] w-16 text-right">
                        ₹{(item.quantity * item.unit_price).toFixed(2)}
                      </span>

                      <button
                        onClick={() => handleRemoveFromCart(item.product.id)}
                        className="text-[#7D887F] hover:text-[#DC2626] p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pricing & Checkout */}
          <div className="pt-4 border-t border-[#E5E9E3] space-y-3">
            <div className="space-y-1.5 text-xs text-[#7D887F]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-mono font-bold text-[#28332C]">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Discount (₹):</span>
                <input
                  type="number"
                  min="0"
                  value={discountAmount || ''}
                  onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                  className="w-20 text-right px-2 py-0.5 border border-[#E5E9E3] rounded-lg bg-[#F8F5ED] text-xs font-mono text-[#28332C]"
                />
              </div>
              <div className="flex justify-between text-sm font-black text-[#28332C] pt-2 border-t border-[#E5E9E3]">
                <span>Total Amount:</span>
                <span className="font-mono text-base text-[#3C9970]">₹{totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'upi', label: 'Bharat UPI' },
                { id: 'cash', label: 'Cash (నగదు)' },
                { id: 'credit', label: 'Khata Credit' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id as any)}
                  className={`py-2 text-[11px] font-bold rounded-xl border transition-all ${
                    paymentMethod === m.id
                      ? 'bg-[#52745F] text-white border-[#52745F] shadow-xs'
                      : 'bg-[#F8F5ED] text-[#7D887F] border-[#E5E9E3] hover:text-[#28332C]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Checkout Button (Terracotta accent) */}
            <button
              onClick={handleCheckout}
              disabled={isSubmitting || cart.length === 0}
              className="w-full py-3 rounded-2xl bg-[#C77B52] hover:bg-[#B66A42] disabled:opacity-50 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <IndianRupee className="w-4 h-4" />
              <span>{isSubmitting ? 'Recording Invoice...' : `Complete Sale • ₹${totalAmount.toFixed(2)}`}</span>
            </button>
          </div>
        </div>

      </div>

      {/* Tax Invoice Modal */}
      {createdSale && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 border border-[#E5E9E3] shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E9E3]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#3C9970]" />
                <span className="text-sm font-bold text-[#28332C]">Sale Recorded Successfully</span>
              </div>
              <button
                onClick={() => setCreatedSale(null)}
                className="p-1 rounded-xl text-[#7D887F] hover:text-[#28332C] hover:bg-[#EDF5EF]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Tax Invoice Container */}
            <div className="printable-invoice bg-white text-[#28332C] p-5 rounded-2xl space-y-4 shadow-xs border border-[#E5E9E3]">
              <div className="text-center border-b border-[#E5E9E3] pb-3">
                <h2 className="text-base font-extrabold text-[#28332C] uppercase tracking-tight">
                  {business?.name || 'Sri Lakshmi Kirana & General Stores'}
                </h2>
                <p className="text-[11px] text-[#7D887F]">
                  {business?.address || 'Shop #4, Market Road, Near Clock Tower, Tenali, AP - 522201'}
                </p>
                <p className="text-[10px] text-[#7D887F] font-mono mt-0.5">
                  Phone: {business?.phone || '+91 98765 43210'} | GSTIN: {business?.gstin || '37AAAAA0000A1Z5'}
                </p>
                <div className="mt-2 inline-block px-3 py-0.5 bg-[#EDF5EF] rounded text-[10px] font-bold uppercase tracking-wider text-[#52745F]">
                  Retail Tax Invoice / పన్ను రసీదు
                </div>
              </div>

              {/* Invoice Meta */}
              <div className="grid grid-cols-2 text-xs text-[#28332C] py-1 border-b border-[#E5E9E3]">
                <div>
                  <span className="block text-[10px] text-[#7D887F] uppercase">Invoice No</span>
                  <span className="font-mono font-bold text-[#52745F]">#{createdSale.invoice_number}</span>
                  {createdSale.customer_name && (
                    <div className="mt-1">
                      <span className="block text-[10px] text-[#7D887F] uppercase">Customer</span>
                      <span className="font-semibold text-[#28332C]">{createdSale.customer_name}</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <span className="block text-[10px] text-[#7D887F] uppercase">Date</span>
                  <span className="font-mono text-[#7D887F]">
                    {new Date(createdSale.created_at || Date.now()).toLocaleDateString('en-IN')}
                  </span>
                  <div className="mt-1">
                    <span className="block text-[10px] text-[#7D887F] uppercase">Payment</span>
                    <span className="font-bold uppercase text-[#3C9970] font-mono">{createdSale.payment_method}</span>
                  </div>
                </div>
              </div>

              {/* Itemized Table */}
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E9E3] text-[10px] text-[#7D887F] uppercase font-bold">
                    <th className="py-1">Item</th>
                    <th className="py-1 text-center">Qty</th>
                    <th className="py-1 text-right">Rate</th>
                    <th className="py-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E9E3]/50 text-[#28332C]">
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
              <div className="border-t border-[#E5E9E3] pt-2 space-y-1 text-xs">
                <div className="flex justify-between text-[#7D887F]">
                  <span>Subtotal:</span>
                  <span className="font-mono font-bold text-[#28332C]">₹{createdSale.subtotal.toFixed(2)}</span>
                </div>
                {createdSale.discount_amount > 0 && (
                  <div className="flex justify-between text-[#3C9970] font-medium">
                    <span>Discount:</span>
                    <span className="font-mono">-₹{createdSale.discount_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-[#28332C] border-t border-[#E5E9E3] pt-1.5">
                  <span>Net Payable / మొత్తం:</span>
                  <span className="font-mono text-base text-[#3C9970] font-black">₹{createdSale.total_amount.toFixed(2)}</span>
                </div>
              </div>

              {/* Bharat UPI QR Code */}
              <div className="pt-2 border-t border-[#E5E9E3] flex flex-col items-center justify-center space-y-1 text-center">
                <div className="w-24 h-24 bg-[#28332C] rounded-xl p-2 flex items-center justify-center">
                  <div className="text-white space-y-1">
                    <QrCode className="w-12 h-12 text-white mx-auto" />
                    <span className="text-[7px] font-mono font-bold block text-[#789B82]">BHARAT UPI QR</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-[#28332C]">Scan to Pay via PhonePe / GPay / Paytm</span>
                <p className="text-[10px] text-[#52745F] pt-1 italic font-bold">
                  మీ వ్యాపారానికి ధన్యవాదాలు! Thank you for your visit!
                </p>
              </div>
            </div>

            {/* Print & Close */}
            <div className="flex items-center gap-3 no-print">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-[#EDF5EF] hover:bg-[#E4EFE6] text-[#52745F] border border-[#E5E9E3] flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print Tax Receipt
              </button>
              <button
                onClick={() => setCreatedSale(null)}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-[#52745F] hover:bg-[#3D5747] text-white shadow-xs transition-all cursor-pointer"
              >
                New Bill / కొత్తది
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default Billing;
