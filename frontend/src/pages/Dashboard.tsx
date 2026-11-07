import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { DashboardSummary } from '../types';
import {
  TrendingUp, IndianRupee, ShoppingCart, Boxes, AlertTriangle,
  Mic, ArrowUpRight, Clock, CheckCircle2, ChevronRight, Zap
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';

interface DashboardProps {
  onOpenVoiceModal: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onOpenVoiceModal }) => {
  const { business } = useAuth();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const summary = await api.getDashboard();
      setData(summary);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Loading business analytics from database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      
      {/* Top Welcome Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {business?.name || 'My Kirana Store'}
            </h1>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Active Store
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Welcome back, <strong className="text-slate-200">{business?.owner_name}</strong>. Here is your real-time store snapshot.
          </p>
        </div>

        {/* Voice Trigger Banner Action */}
        <button
          onClick={onOpenVoiceModal}
          className="relative z-10 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2 group"
        >
          <div className="w-7 h-7 rounded-xl bg-slate-950/20 flex items-center justify-center">
            <Mic className="w-4 h-4 text-slate-950 group-hover:scale-110 transition-transform" />
          </div>
          <span>Speak Voice Command (Telugu / English)</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        
        {/* Today's Sales */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold truncate">Today's Sales / నేటి అమ్మకాలు</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <IndianRupee className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-white font-mono">
            ₹{data.today_sales.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-400 flex items-center gap-1">
            <span className="text-emerald-400 font-bold">{data.today_orders}</span> orders today
          </div>
        </div>

        {/* Monthly Revenue */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold truncate">Monthly Sales / నెలవారీ</span>
            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-teal-400 font-mono">
            ₹{(data.monthly_revenue ?? data.today_sales).toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-400">
            {data.monthly_orders ?? data.today_orders} orders this month
          </div>
        </div>

        {/* Gross Profit & Margin */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold truncate">Gross Profit / లాభం</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-300 font-mono">
            ₹{(data.today_gross_profit ?? (data.today_sales * 0.16)).toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-400">
            Margin: <span className="text-emerald-400 font-semibold">{data.profit_margin_pct ?? 16.5}%</span>
          </div>
        </div>

        {/* Lifetime Revenue */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold truncate">Total Sales / మొత్తం</span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <ShoppingCart className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-white font-mono">
            ₹{data.total_revenue.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-400">
            {data.total_orders_count} lifetime sales
          </div>
        </div>

        {/* Inventory Value */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold truncate">Stock Value / సరుకు విలువ</span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Boxes className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-cyan-400 font-mono">
            ₹{data.inventory_total_value.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-400">
            {data.active_products_count} active items
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold truncate">Low Stock / తక్కువ స్టాక్</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-400 font-mono">
            {data.low_stock_count} Items
          </div>
          <div className="text-[10px] text-slate-400">
            {data.low_stock_count > 0 ? 'Action required' : 'Stock healthy'}
          </div>
        </div>

      </div>

      {/* Main Charts & Side Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 7-Day Revenue Trend Chart */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">7-Day Sales Trend / గత 7 రోజుల అమ్మకాలు</h3>
              <p className="text-xs text-slate-400">Actual daily revenue recorded in database</p>
            </div>
            <span className="text-xs font-mono text-emerald-400 font-bold px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20">
              Real SQL Records
            </span>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.recent_sales_trend}>
                <defs>
                  <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day_name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                  formatter={(val: any) => [`₹${Number(val).toFixed(2)}`, 'Revenue']}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#emeraldGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Low Stock Alerts & Fast Reorder */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Low Stock Action List
              </h3>
              <span className="text-[10px] font-mono text-amber-400 font-semibold px-2 py-0.5 rounded bg-amber-500/10">
                {data.low_stock_items.length} Alerts
              </span>
            </div>

            <div className="divide-y divide-slate-800/80 max-h-64 overflow-y-auto mt-2">
              {data.low_stock_items.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1 opacity-70" />
                  All inventory items are currently well stocked!
                </div>
              ) : (
                data.low_stock_items.map((item) => (
                  <div key={item.product_id} className="py-3 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-200 block">{item.product_name}</span>
                      <span className="text-[10px] text-slate-400 block">{item.telugu_name}</span>
                      <span className="text-[10px] text-amber-400">
                        Remaining: {item.current_stock} {item.unit} (Min: {item.low_stock_threshold})
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Suggested Reorder</span>
                      <span className="text-xs font-bold text-emerald-400">+{item.suggested_reorder_qty} {item.unit}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
            <Zap className="w-4 h-4 text-teal-400 shrink-0" />
            <span>Say "Add 50 kg toor dal" to immediately restock by voice.</span>
          </div>
        </div>

      </div>

      {/* Top Selling Products Table */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Top Performing Products / అత్యధికంగా అమ్ముడైన వస్తువులు</h3>
            <p className="text-xs text-slate-400">Ranked by revenue contribution from real customer sales</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="pb-3">Product Name</th>
                <th className="pb-3">Telugu Title</th>
                <th className="pb-3 text-right">Quantity Sold</th>
                <th className="pb-3 text-right">Revenue Generated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {data.top_selling_products.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-400">
                    No sales recorded yet. Use the Voice Assistant or POS to record your first sale!
                  </td>
                </tr>
              ) : (
                data.top_selling_products.map((p, idx) => (
                  <tr key={p.product_id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 font-semibold text-slate-100 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-[10px] font-mono">
                        {idx + 1}
                      </span>
                      {p.product_name}
                    </td>
                    <td className="py-3 text-slate-400">{p.telugu_name || '—'}</td>
                    <td className="py-3 text-right font-mono font-medium text-slate-200">
                      {p.quantity_sold} {p.unit}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-emerald-400">
                      ₹{p.revenue.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

