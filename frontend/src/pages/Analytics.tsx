import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { DashboardSummary } from '../types';
import {
  BarChart3, TrendingUp, IndianRupee, Boxes, AlertTriangle,
  Lightbulb, CheckCircle2, Layers, Sparkles
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
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
      <div className="flex-1 p-6 flex items-center justify-center min-h-[60vh] bg-[#F8F5ED]">
        <div className="w-10 h-10 border-3 border-[#52745F] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full bg-[#F8F5ED]">
      
      {/* Title Header */}
      <div className="rounded-2xl border border-[#E5E9E3] bg-white p-5 sm:p-6 flex items-center justify-between gap-4 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#28332C] tracking-tight flex items-center gap-2">
            Business Intelligence & Analytics
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#E4EFE6] text-[#3C9970] border border-[#789B82]/30">
              Live BI
            </span>
          </h1>
          <p className="text-xs text-[#7D887F] font-medium mt-0.5">
            Financial performance analysis, inventory value distribution, and heuristic replenishment suggestions.
          </p>
        </div>
      </div>

      {/* KPI Highlight Cards on Clean Light Surfaces */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#E5E9E3] space-y-1 shadow-xs">
          <span className="text-[11px] font-bold text-[#7D887F] block truncate">Today's Revenue</span>
          <div className="text-xl sm:text-2xl font-black text-[#28332C] font-mono">₹{data.today_sales.toFixed(0)}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#E5E9E3] space-y-1 shadow-xs">
          <span className="text-[11px] font-bold text-[#7D887F] block truncate">Monthly Sales</span>
          <div className="text-xl sm:text-2xl font-black text-[#52745F] font-mono">₹{(data.monthly_revenue ?? data.today_sales).toFixed(0)}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#E5E9E3] space-y-1 shadow-xs">
          <span className="text-[11px] font-bold text-[#7D887F] block truncate">Gross Profit</span>
          <div className="text-xl sm:text-2xl font-black text-[#3C9970] font-mono">₹{(data.total_gross_profit ?? (data.total_revenue * 0.16)).toFixed(0)}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#E5E9E3] space-y-1 shadow-xs">
          <span className="text-[11px] font-bold text-[#7D887F] block truncate">Profit Margin</span>
          <div className="text-xl sm:text-2xl font-black text-[#52745F] font-mono">{data.profit_margin_pct ?? 16.5}%</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#E5E9E3] space-y-1 shadow-xs">
          <span className="text-[11px] font-bold text-[#7D887F] block truncate">Stock Valuation</span>
          <div className="text-xl sm:text-2xl font-black text-[#28332C] font-mono">₹{data.inventory_total_value.toFixed(0)}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#E5E9E3] space-y-1 shadow-xs">
          <span className="text-[11px] font-bold text-[#7D887F] block truncate">Transactions</span>
          <div className="text-xl sm:text-2xl font-black text-[#28332C] font-mono">{data.total_orders_count}</div>
        </div>
      </div>

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Revenue Trend */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E9E3] space-y-3 shadow-xs">
          <div>
            <h3 className="text-xs font-black text-[#28332C] uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[#52745F]" />
              Daily Revenue Progression
            </h3>
            <p className="text-[11px] text-[#7D887F]">Continuous sales receipts</p>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.recent_sales_trend || []}>
                <defs>
                  <linearGradient id="sageAnalyticsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#789B82" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#EDF5EF" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day_name" tick={{ fontSize: 11, fill: '#7D887F' }} axisLine={{ stroke: '#E5E9E3' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#7D887F' }} axisLine={{ stroke: '#E5E9E3' }} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E5E9E3',
                    fontSize: '12px',
                    color: '#28332C',
                  }}
                  formatter={(value: any) => [`₹${Number(value).toFixed(2)}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#52745F" strokeWidth={2.5} fill="url(#sageAnalyticsGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E9E3] space-y-3 shadow-xs">
          <div>
            <h3 className="text-xs font-black text-[#28332C] uppercase tracking-wider flex items-center gap-1.5">
              <Boxes className="w-4 h-4 text-[#52745F]" />
              Stock Valuation by Category
            </h3>
            <p className="text-[11px] text-[#7D887F]">Inventory distribution</p>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.category_distribution || []}>
                <XAxis dataKey="category_name" tick={{ fontSize: 11, fill: '#7D887F' }} axisLine={{ stroke: '#E5E9E3' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#7D887F' }} axisLine={{ stroke: '#E5E9E3' }} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E5E9E3',
                    fontSize: '12px',
                    color: '#28332C',
                  }}
                  formatter={(value: any) => [`₹${Number(value).toFixed(2)}`, 'Valuation']}
                />
                <Bar dataKey="stock_value" fill="#789B82" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Top Products & Restock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Products */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E9E3] space-y-3 shadow-xs">
          <h3 className="text-xs font-black text-[#28332C] uppercase tracking-wider">
            Top Performing Products
          </h3>
          <div className="space-y-2">
            {(data.top_selling_products || []).slice(0, 5).map((p, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8F5ED] text-xs">
                <div>
                  <div className="font-bold text-[#28332C]">{p.product_name}</div>
                  <div className="text-[10px] text-[#7D887F]">{p.quantity_sold} {p.unit} sold</div>
                </div>
                <div className="font-black text-[#52745F]">
                  ₹{p.revenue.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Restock Recommendations */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E9E3] space-y-3 shadow-xs">
          <h3 className="text-xs font-black text-[#28332C] uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-[#D97706]" />
            Restock Recommendations
          </h3>
          <div className="space-y-2">
            {(data.low_stock_items || []).slice(0, 5).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-[#FEF3C7]/40 border border-[#FCD34D]/50 text-xs">
                <div>
                  <div className="font-bold text-[#28332C]">{item.product_name}</div>
                  <div className="text-[10px] text-[#D97706]">
                    Current: {item.current_stock} (Min: {item.low_stock_threshold})
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-[#D97706] border border-[#FCD34D]">
                  Reorder: +{item.suggested_reorder_qty}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};

export default Analytics;
