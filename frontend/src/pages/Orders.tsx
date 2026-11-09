import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';
import { Order } from '../types';
import {
  Clock, CheckCircle2, AlertCircle, ShoppingBag, Phone, User,
  ChevronRight, Check, X, Calendar, RefreshCw, Sparkles, ArrowRight
} from 'lucide-react';

export const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchOrders = useCallback(async (statusFilter?: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const data = await api.listOrders(statusFilter || undefined);
      if (!controller.signal.aborted) {
        setOrders(Array.isArray(data) ? data : []);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Failed to load orders:', err);
        setError(err.message || 'Unable to connect to orders service.');
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchOrders(selectedStatus);
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [selectedStatus, fetchOrders]);

  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    setUpdatingId(orderId);
    try {
      const updated = await api.updateOrderStatus(orderId, {
        status: nextStatus,
        payment_status: nextStatus === 'fulfilled' ? 'paid' : undefined
      });
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
    } catch (err: any) {
      console.error('Failed to update order status:', err);
      alert(err.message || 'Failed to update order status');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-[#FEF3C7] text-[#D97706] border-[#FCD34D]';
      case 'ready':
        return 'bg-[#E0F2FE] text-[#0284C7] border-[#BAE6FD]';
      case 'fulfilled':
        return 'bg-[#E4EFE6] text-[#3C9970] border-[#A7F3D0]';
      case 'cancelled':
        return 'bg-[#FEE2E2] text-[#DC2626] border-[#FCA5A5]';
      default:
        return 'bg-[#F8F5ED] text-[#7D887F] border-[#E5E9E3]';
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full bg-[#F8F5ED]">
      
      {/* Title & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#28332C] tracking-tight flex items-center gap-2">
            Orders & Advance Bookings
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#E4EFE6] text-[#3C9970] border border-[#789B82]/30">
              {orders.length}
            </span>
          </h1>
          <p className="text-xs text-[#7D887F] font-medium mt-0.5">
            Track customer phone orders, WhatsApp reservations, and counter pickups.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-[#E5E9E3] shadow-xs">
            {['', 'pending', 'ready', 'fulfilled'].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                  selectedStatus === st
                    ? 'bg-[#52745F] text-white shadow-xs'
                    : 'text-[#7D887F] hover:text-[#28332C]'
                }`}
              >
                {st === '' ? 'All Orders' : st}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchOrders(selectedStatus)}
            disabled={loading}
            className="p-2 bg-white rounded-xl border border-[#E5E9E3] text-[#7D887F] hover:text-[#28332C] transition-colors shadow-xs disabled:opacity-50"
            title="Refresh Orders"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#52745F]' : ''}`} />
          </button>
        </div>
      </div>

      {/* 1. LOADING STATE */}
      {loading && (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#E5E9E3] shadow-xs space-y-3">
          <div className="w-10 h-10 border-3 border-[#52745F] border-t-transparent rounded-full animate-spin mx-auto" />
          <h3 className="text-sm font-bold text-[#28332C]">Loading customer orders...</h3>
          <p className="text-xs text-[#7D887F]">Connecting to Sri Lakshmi Kirana order repository</p>
        </div>
      )}

      {/* 2. ERROR STATE WITH RETRY BUTTON */}
      {!loading && error && (
        <div className="bg-[#FEE2E2] rounded-3xl p-8 border border-[#FCA5A5] text-center space-y-3 max-w-lg mx-auto shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-white text-[#DC2626] flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-black text-[#DC2626]">Failed to Load Orders</h3>
          <p className="text-xs text-[#DC2626] leading-relaxed">{error}</p>
          <button
            onClick={() => fetchOrders(selectedStatus)}
            className="mt-2 px-5 py-2 rounded-xl bg-[#52745F] text-white text-xs font-bold shadow-xs hover:bg-[#3D5747] transition-all flex items-center gap-2 mx-auto active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* 3. EMPTY STATE */}
      {!loading && !error && orders.length === 0 && (
        <div className="bg-white p-14 text-center rounded-3xl border border-[#E5E9E3] space-y-3 shadow-xs max-w-xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-[#EDF5EF] text-[#52745F] flex items-center justify-center mx-auto">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-[#28332C]">No orders found</h3>
          <p className="text-xs text-[#7D887F] max-w-md mx-auto leading-relaxed">
            {selectedStatus
              ? `There are currently no customer orders in "${selectedStatus}" status.`
              : 'No advance customer orders registered yet. Orders placed via voice commands or phone will appear here.'}
          </p>
          {selectedStatus && (
            <button
              onClick={() => setSelectedStatus('')}
              className="mt-2 text-xs font-bold text-[#52745F] hover:underline inline-flex items-center gap-1"
            >
              <span>View all orders</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* 4. SUCCESS: ORDERS GRID */}
      {!loading && !error && orders.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {orders.map((ord) => (
            <div
              key={ord.id}
              className="bg-white p-5 rounded-2xl border border-[#E5E9E3] hover:border-[#789B82] transition-all shadow-xs space-y-4 flex flex-col justify-between group"
            >
              <div className="space-y-3">
                {/* Header: Order Number & Status Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#52745F] bg-[#EDF5EF] px-2.5 py-1 rounded-xl border border-[#E5E9E3]">
                    {ord.order_number}
                  </span>
                  <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${getStatusBadge(ord.status)}`}>
                    {ord.status}
                  </span>
                </div>

                {/* Customer Details */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-[#7D887F]" />
                    <span className="text-xs font-bold text-[#28332C]">
                      {ord.customer_name || 'Walk-in / Phone Customer'}
                    </span>
                  </div>
                  {ord.customer_phone && (
                    <div className="flex items-center gap-2 text-[11px] text-[#7D887F] font-mono">
                      <Phone className="w-3 h-3 text-[#7D887F]" />
                      <span>{ord.customer_phone}</span>
                    </div>
                  )}
                </div>

                {/* Items List */}
                <div className="p-3 bg-[#F8F5ED] rounded-xl space-y-1.5 border border-[#E5E9E3]/70">
                  <span className="text-[10px] font-bold uppercase text-[#7D887F] block">
                    Ordered Items ({ord.items?.length || 0}):
                  </span>
                  <div className="space-y-1 max-h-28 overflow-y-auto sage-scrollbar pr-1">
                    {ord.items && ord.items.map((it, i) => (
                      <div key={it.id || i} className="flex justify-between text-xs text-[#28332C]">
                        <span className="truncate pr-2 font-medium">{it.product_name}</span>
                        <span className="font-mono text-[#7D887F] shrink-0">x{it.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {ord.notes && (
                  <p className="text-[11px] text-[#7D887F] italic bg-[#EDF5EF] p-2 rounded-lg">
                    "{ord.notes}"
                  </p>
                )}
              </div>

              {/* Order Footer & Actions */}
              <div className="pt-3 border-t border-[#E5E9E3] space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-[#7D887F] block">Total Amount</span>
                    <span className="text-sm font-black text-[#28332C] font-mono">
                      ₹{ord.total_amount.toFixed(2)}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    ord.payment_status === 'paid'
                      ? 'bg-[#E4EFE6] text-[#3C9970]'
                      : 'bg-[#FEF3C7] text-[#D97706]'
                  }`}>
                    {ord.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                  </span>
                </div>

                {/* State Transition Actions */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {ord.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(ord.id, 'ready')}
                        disabled={updatingId === ord.id}
                        className="py-1.5 px-3 rounded-xl bg-[#52745F] hover:bg-[#3D5747] text-white text-[11px] font-bold transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                        <span>Mark Ready</span>
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(ord.id, 'cancelled')}
                        disabled={updatingId === ord.id}
                        className="py-1.5 px-3 rounded-xl bg-[#F8F5ED] hover:bg-[#FEE2E2] text-[#DC2626] border border-[#E5E9E3] text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                        <span>Cancel</span>
                      </button>
                    </>
                  )}

                  {ord.status === 'ready' && (
                    <button
                      onClick={() => handleUpdateStatus(ord.id, 'fulfilled')}
                      disabled={updatingId === ord.id}
                      className="col-span-2 py-2 px-3 rounded-xl bg-[#3C9970] hover:bg-[#2E7C5A] text-white text-[11px] font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Fulfill & Mark Paid</span>
                    </button>
                  )}

                  {ord.status === 'fulfilled' && (
                    <div className="col-span-2 text-center py-1 text-[11px] font-bold text-[#3C9970] flex items-center justify-center gap-1 bg-[#E4EFE6] rounded-xl">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Order Fulfilled</span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default Orders;
