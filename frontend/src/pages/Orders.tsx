import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Order } from '../types';
import {
  Clock, CheckCircle2, AlertCircle, ShoppingBag, Phone, User,
  ChevronRight, Check, X
} from 'lucide-react';

export const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await api.listOrders(selectedStatus || undefined);
      setOrders(data);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [selectedStatus]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'ready':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'fulfilled':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      
      {/* Title & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Orders & Advance Bookings
          </h1>
          <p className="text-xs text-slate-400">
            Track customer phone orders, WhatsApp reservations, and advance counter pickups.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-2xl border border-slate-800 self-start sm:self-auto">
          {['', 'pending', 'ready', 'fulfilled'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                selectedStatus === st
                  ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {st === '' ? 'All Orders' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {orders.length === 0 ? (
          <div className="col-span-full glass-panel p-12 text-center text-xs text-slate-400 rounded-3xl border border-slate-800 space-y-2">
            <ShoppingBag className="w-8 h-8 text-slate-500 mx-auto" />
            <p>No customer orders currently in this status.</p>
          </div>
        ) : (
          orders.map((ord) => (
            <div key={ord.id} className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-3 flex flex-col justify-between">
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-white">{ord.order_number}</span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${getStatusBadge(ord.status)}`}>
                    {ord.status}
                  </span>
                </div>

                {/* Customer Contact */}
                <div className="p-3 bg-slate-900/80 rounded-2xl border border-slate-800/80 space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-200 font-semibold">
                    <User className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{ord.customer_name || 'Walk-in Customer'}</span>
                  </div>
                  {ord.customer_phone && (
                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span>{ord.customer_phone}</span>
                    </div>
                  )}
                </div>

                {/* Items */}
                <div className="space-y-1.5 text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Ordered Items:</span>
                  <div className="divide-y divide-slate-800/60 max-h-36 overflow-y-auto pr-1">
                    {ord.items.map((itm) => (
                      <div key={itm.id} className="py-1.5 flex justify-between text-slate-300">
                        <span>{itm.product_name} x {itm.quantity}</span>
                        <span className="font-mono">₹{itm.total_price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Total & Action */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block">Total Amount</span>
                  <span className="text-sm font-bold font-mono text-emerald-400">
                    ₹{ord.total_amount.toFixed(2)}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {new Date(ord.created_at).toLocaleDateString()}
                </div>
              </div>

            </div>
          ))
        )}
      </div>

    </div>
  );
};
