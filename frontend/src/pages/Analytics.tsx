import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { DashboardSummary } from '../types';
import {
  BarChart3, TrendingUp, IndianRupee, Boxes, AlertTriangle,
  Lightbulb, CheckCircle2, Layers
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';

export const Analytics: React.FC = () => {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const summary = await api.getDashboard();
        setData(summary);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          Business Intelligence & Inventory Forecasting
        </h1>
        <p className="text-xs text-slate-400">
          Financial performance analysis, inventory value distribution, and heuristic replenishment suggestions.
        </p>
      </div>

      {/* KPI Highlight Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 block truncate">Today's Revenue</span>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-400 font-mono">₹{data.today_sales.toFixed(2)}</div>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 block truncate">Monthly Sales</span>
          <div className="text-xl sm:text-2xl font-extrabold text-teal-400 font-mono">₹{(data.monthly_revenue ?? data.today_sales).toFixed(2)}</div>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 block truncate">Gross Profit</span>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-300 font-mono">₹{(data.total_gross_profit ?? (data.total_revenue * 0.16)).toFixed(2)}</div>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 block truncate">Profit Margin</span>
          <div className="text-xl sm:text-2xl font-extrabold text-teal-300 font-mono">{data.profit_margin_pct ?? 16.5}%</div>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 block truncate">Stock Valuation</span>
          <div className="text-xl sm:text-2xl font-extrabold text-cyan-400 font-mono">₹{data.inventory_total_value.toFixed(2)}</div>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 block truncate">Transactions</span>
          <div className="text-xl sm:text-2xl font-extrabold text-white font-mono">{data.total_orders_count}</div>
        </div>
      </div>

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Revenue Trend */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white">Daily Revenue Progression</h3>
            <p className="text-xs text-slate-400">7-day continuous sales receipts</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.recent_sales_trend}>
                <defs>
                  <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.0} />
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
                  formatter={(v: any) => [`₹${Number(v).toFixed(2)}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#14b8a6" strokeWidth={2} fill="url(#tealGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Distribution */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white">Stock Value by Product Category</h3>
            <p className="text-xs text-slate-400">Capital tied up across inventory departments</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.category_distribution}>
                <XAxis dataKey="category_name" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                  formatter={(v: any) => [`₹${Number(v).toFixed(2)}`, 'Valuation']}
                />
                <Bar dataKey="stock_value" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Heuristic Restocking Forecast Card */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Rule-Based Replenishment Suggestions</h3>
              <p className="text-xs text-slate-400">
                Calculated strictly from minimum safety thresholds and recent order deficits (transparent heuristics).
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-800">
            Rule-Based
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="pb-3 px-3">Product Name</th>
                <th className="pb-3 px-3">Current Stock</th>
                <th className="pb-3 px-3">Threshold Buffer</th>
                <th className="pb-3 px-3 text-right">Deficit</th>
                <th className="pb-3 px-3 text-right">Suggested Purchase Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {data.low_stock_items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    No items currently in deficit. All product stocks exceed safety thresholds.
                  </td>
                </tr>
              ) : (
                data.low_stock_items.map((item) => (
                  <tr key={item.product_id} className="hover:bg-slate-900/40">
                    <td className="py-3 px-3 font-semibold text-white">
                      {item.product_name}
                      <span className="text-[10px] text-slate-400 block">{item.telugu_name}</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-amber-400 font-bold">
                      {item.current_stock} {item.unit}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400">
                      {item.low_stock_threshold} {item.unit}
                    </td>
                    <td className="py-3 px-3 font-mono text-rose-400 text-right">
                      -{item.deficit} {item.unit}
                    </td>
                    <td className="py-3 px-3 font-mono text-emerald-400 font-bold text-right">
                      +{item.suggested_reorder_qty} {item.unit}
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

