import React, { useState, useEffect, useMemo } from 'react';
import { VoiceProcessResponse } from '../types';
import {
  CheckCircle2, AlertTriangle, HelpCircle, Volume2, VolumeX, ArrowRight,
  Sparkles, TrendingUp, TrendingDown, Users, Package, DollarSign,
  BarChart3, Award, Layers, AlertCircle, Search, ChevronLeft, ChevronRight, Tag
} from 'lucide-react';
import { audioPlayer } from '../services/audioPlayer';

interface ActionPreviewCardProps {
  response: VoiceProcessResponse;
  onConfirm: () => void;
  onCancel: () => void;
  onPlayAudio?: () => void;
  isLoading?: boolean;
}

export const ActionPreviewCard: React.FC<ActionPreviewCardProps> = ({
  response,
  onConfirm,
  onCancel,
  onPlayAudio,
  isLoading = false,
}) => {
  const { intent, action_status, natural_response, execution_result } = response;
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productStatusFilter, setProductStatusFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    return audioPlayer.subscribe((playing) => {
      setIsPlayingAudio(playing);
    });
  }, []);

  // Reset filter & page on response change
  useEffect(() => {
    setProductSearch('');
    setProductStatusFilter('all');
    setCurrentPage(1);
  }, [response]);

  const isExecuted = action_status === 'EXECUTED';
  const isBIIntent =
    intent.intent.startsWith('get_') ||
    intent.intent === 'compare_periods' ||
    intent.intent === 'check_stock' ||
    intent.intent === 'list_products' ||
    intent.intent === 'list_categories' ||
    intent.intent === 'inventory_valuation' ||
    intent.intent === 'compare_stock' ||
    intent.intent === 'price_inquiry' ||
    intent.intent === 'daily_summary' ||
    intent.intent === 'unknown';

  const isConfirmationRequired =
    (action_status === 'CONFIRMATION_REQUIRED' || action_status === 'PREVIEW_READY') && !isBIIntent;

  const handlePlayToggle = () => {
    if (isPlayingAudio) {
      audioPlayer.stopAudio();
    } else {
      if (onPlayAudio) {
        onPlayAudio();
      } else {
        audioPlayer.playSpokenAudio({
          audioBase64: response.spoken_audio_base64,
          text: natural_response,
          language: response.detected_language || 'te-IN',
        });
      }
    }
  };

  const getIntentBadge = () => {
    switch (intent.intent) {
      case 'list_products':
        return { label: 'Product Catalogue / కేటలాగ్', color: 'bg-[#EDF5EF] text-[#52745F] border-[#789B82]/30' };
      case 'list_categories':
        return { label: 'Product Categories / కేటగిరీలు', color: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]' };
      case 'inventory_valuation':
        return { label: 'Inventory Valuation / నిల్వల విలువ', color: 'bg-[#FEF3C7] text-[#D97706] border-[#FCD34D]' };
      case 'compare_stock':
        return { label: 'Stock Comparison / నిల్వల పోలిక', color: 'bg-[#F3E8FF] text-[#7E22CE] border-[#E9D5FF]' };
      case 'get_profit_loss':
        return { label: 'Financial Analytics / లాభనష్టాలు', color: 'bg-[#E0F2FE] text-[#0284C7] border-[#BAE6FD]' };
      case 'get_revenue':
        return { label: 'Revenue & Investment / రాబడి & పెట్టుబడి', color: 'bg-[#FEF3C7] text-[#D97706] border-[#FCD34D]' };
      case 'get_sales_analytics':
        return { label: 'Sales Analytics / అమ్మకాల వివరాలు', color: 'bg-[#E4EFE6] text-[#3C9970] border-[#789B82]/30' };
      case 'get_customer_analytics':
        return { label: 'Customer Intelligence / కస్టమర్ల విశ్లేషణ', color: 'bg-[#F3E8FF] text-[#7E22CE] border-[#E9D5FF]' };
      case 'get_inventory_health':
        return { label: 'Inventory Health / నిల్వ స్థితి', color: 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]' };
      case 'compare_periods':
        return { label: 'Period Comparison / కాలాల పోలిక', color: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]' };
      case 'get_business_insights':
        return { label: 'AI Business Insights / వ్యాపార విశ్లేషణ', color: 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]' };
      case 'inventory_sale':
        return { label: 'Sale Transaction / అమ్మకం', color: 'bg-[#E4EFE6] text-[#3C9970] border-[#789B82]/30' };
      case 'inventory_add':
        return { label: 'Stock Restock / చేర్చడం', color: 'bg-[#EDF5EF] text-[#52745F] border-[#E5E9E3]' };
      case 'check_stock':
        return { label: 'Stock Inquiry / నిల్వ సమాచారం', color: 'bg-[#E0F2FE] text-[#0284C7] border-[#BAE6FD]' };
      case 'price_inquiry':
        return { label: 'Price Inquiry / ధర సమాచారం', color: 'bg-[#FEF3C7] text-[#D97706] border-[#FCD34D]' };
      case 'daily_summary':
        return { label: 'Daily Summary / రోజువారీ సారాంశం', color: 'bg-[#E4EFE6] text-[#3C9970] border-[#789B82]/30' };
      default:
        return { label: 'Voice Command / వాయిస్ ఆదేశం', color: 'bg-[#F8F5ED] text-[#7D887F] border-[#E5E9E3]' };
    }
  };

  const badge = getIntentBadge();

  // Products list extraction
  const rawProducts: any[] = useMemo(() => {
    if (execution_result?.products && Array.isArray(execution_result.products)) {
      return execution_result.products;
    }
    if (execution_result?.matches && Array.isArray(execution_result.matches)) {
      return execution_result.matches;
    }
    if (execution_result?.similar_products && Array.isArray(execution_result.similar_products)) {
      return execution_result.similar_products;
    }
    return [];
  }, [execution_result]);

  const hasProductList = rawProducts.length > 0;

  // Filter products by search and status
  const filteredProductsList = useMemo(() => {
    return rawProducts.filter(p => {
      const curStock = p.current_stock ?? p.stock ?? 0;
      const thresh = p.low_stock_threshold ?? 10;
      const isOut = curStock <= 0;
      const isLow = !isOut && curStock <= thresh;

      if (productStatusFilter === 'in_stock' && isOut) return false;
      if (productStatusFilter === 'low_stock' && !isLow) return false;
      if (productStatusFilter === 'out_of_stock' && !isOut) return false;

      if (productSearch.trim()) {
        const q = productSearch.toLowerCase();
        const nameMatch = (p.name || '').toLowerCase().includes(q);
        const teluguMatch = (p.telugu_name || '').toLowerCase().includes(q);
        const catMatch = (p.category_name || '').toLowerCase().includes(q);
        return nameMatch || teluguMatch || catMatch;
      }
      return true;
    });
  }, [rawProducts, productStatusFilter, productSearch]);

  const totalPages = Math.ceil(filteredProductsList.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedProducts = filteredProductsList.slice(startIndex, startIndex + pageSize);

  const availableCount = rawProducts.filter(p => (p.current_stock ?? p.stock ?? 0) > 0).length;
  const lowStockCount = rawProducts.filter(p => {
    const s = p.current_stock ?? p.stock ?? 0;
    return s > 0 && s <= (p.low_stock_threshold ?? 10);
  }).length;
  const outOfStockCount = rawProducts.filter(p => (p.current_stock ?? p.stock ?? 0) <= 0).length;

  return (
    <div className="p-5 rounded-2xl bg-white border border-[#E5E9E3] shadow-md space-y-4 text-left transition-all">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badge.color}`}>
          {badge.label}
        </span>
        <div className="flex items-center gap-1.5 text-xs text-[#7D887F] font-semibold">
          <span>Confidence:</span>
          <span className="font-mono text-[#52745F] font-bold">{((intent.confidence || 0.95) * 100).toFixed(0)}%</span>
        </div>
      </div>

      {/* Transcription Quote */}
      <div className="p-3.5 bg-[#F8F5ED] rounded-xl border border-[#E5E9E3]">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[#7D887F] font-bold mb-1">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#C77B52]" />
            Recognized Utterance (Gnani Prisma)
          </span>
          <span className="font-mono text-[9px] text-[#52745F] font-bold">{response.detected_language}</span>
        </div>
        <p className="text-xs font-bold text-[#28332C] italic">"{response.transcription}"</p>
      </div>

      {/* 1. FINANCIAL ANALYTICS (Profit & Loss / Revenue) */}
      {(intent.intent === 'get_profit_loss' || intent.intent === 'get_revenue') && execution_result && (
        <div className="p-3.5 bg-[#F8F5ED] rounded-xl border border-[#E5E9E3] space-y-2.5">
          <div className="flex items-center justify-between border-b border-[#E5E9E3] pb-1.5 text-xs">
            <span className="font-bold text-[#28332C] flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-[#52745F]" />
              {execution_result.period || intent.period_label || 'Period'} Financial Statement
            </span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
              execution_result.is_loss ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {execution_result.is_loss ? 'Loss Recorded' : 'Profitable'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2 bg-white rounded-lg border border-[#E5E9E3]">
              <span className="text-[#7D887F] block text-[10px] font-medium">Total Revenue</span>
              <span className="font-extrabold text-[#28332C] font-mono text-sm">
                ₹{Number(execution_result.total_revenue || 0).toFixed(2)}
              </span>
              <span className="text-[9px] text-[#7D887F] block">{execution_result.sales_count || 0} sales</span>
            </div>

            <div className="p-2 bg-white rounded-lg border border-[#E5E9E3]">
              <span className="text-[#7D887F] block text-[10px] font-medium">Product Cost (COGS)</span>
              <span className="font-bold text-[#7D887F] font-mono text-xs">
                ₹{Number(execution_result.total_cogs || 0).toFixed(2)}
              </span>
            </div>

            <div className="p-2 bg-white rounded-lg border border-[#E5E9E3]">
              <span className="text-[#7D887F] block text-[10px] font-medium">Expenses</span>
              <span className="font-bold text-[#7D887F] font-mono text-xs">
                ₹{Number(execution_result.total_expenses || 0).toFixed(2)}
              </span>
            </div>

            <div className={`p-2 rounded-lg border ${
              execution_result.is_loss ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'
            }`}>
              <span className={`block text-[10px] font-bold ${
                execution_result.is_loss ? 'text-red-700' : 'text-emerald-700'
              }`}>
                {execution_result.is_loss ? 'Net Loss' : 'Net Profit'}
              </span>
              <span className={`font-black font-mono text-sm ${
                execution_result.is_loss ? 'text-red-700' : 'text-emerald-700'
              }`}>
                ₹{Number(execution_result.is_loss ? execution_result.loss_amount : execution_result.net_profit || 0).toFixed(2)}
              </span>
              <span className="text-[9px] font-bold block text-[#52745F]">
                Margin: {execution_result.profit_margin_pct || 0}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. SALES ANALYTICS */}
      {intent.intent === 'get_sales_analytics' && execution_result && (
        <div className="p-3.5 bg-[#EDF5EF] rounded-xl border border-[#E5E9E3] space-y-2 text-xs">
          <div className="flex items-center justify-between border-b border-[#E5E9E3] pb-1 font-bold text-[#28332C]">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[#3C9970]" />
              {execution_result.period || intent.period_label || 'Sales'} Performance
            </span>
            <span className="text-[#52745F] font-mono">
              ₹{Number(execution_result.total_revenue || execution_result.revenue || 0).toFixed(2)}
            </span>
          </div>

          {execution_result.is_product_specific ? (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-[#7D887F] block text-[10px]">Product</span>
                <span className="font-bold text-[#28332C]">{execution_result.product_name}</span>
              </div>
              <div>
                <span className="text-[#7D887F] block text-[10px]">Quantity Sold</span>
                <span className="font-bold text-[#3C9970]">{execution_result.quantity_sold} {execution_result.unit}</span>
              </div>
              <div>
                <span className="text-[#7D887F] block text-[10px]">Revenue Generated</span>
                <span className="font-bold font-mono text-[#28332C]">₹{Number(execution_result.revenue || 0).toFixed(2)}</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div>
                <span className="text-[#7D887F] block text-[10px]">Total Sales</span>
                <span className="font-bold text-[#28332C]">{execution_result.total_sales_count || 0} completed</span>
              </div>
              <div>
                <span className="text-[#7D887F] block text-[10px]">Total Revenue</span>
                <span className="font-bold font-mono text-[#3C9970]">₹{Number(execution_result.total_revenue || 0).toFixed(2)}</span>
              </div>
              {execution_result.best_seller && (
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-[#7D887F] block text-[10px]">Best Selling</span>
                  <span className="font-bold text-[#C77B52] truncate block">
                    {execution_result.best_seller.product_name} ({execution_result.best_seller.quantity} {execution_result.best_seller.unit})
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. CUSTOMER ANALYTICS */}
      {intent.intent === 'get_customer_analytics' && execution_result && (
        <div className="p-3.5 bg-[#F8F5ED] rounded-xl border border-[#E5E9E3] space-y-2 text-xs">
          <div className="flex items-center justify-between border-b border-[#E5E9E3] pb-1 font-bold text-[#28332C]">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[#7E22CE]" />
              Customer Footfall & Loyalty ({execution_result.period || 'Period'})
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2 bg-white rounded-lg border border-[#E5E9E3]">
              <span className="text-[#7D887F] block text-[10px]">Total Visits</span>
              <span className="font-bold text-sm text-[#28332C]">{execution_result.total_visits || 0}</span>
            </div>
            <div className="p-2 bg-white rounded-lg border border-[#E5E9E3]">
              <span className="text-[#7D887F] block text-[10px]">Unique Customers</span>
              <span className="font-bold text-sm text-[#28332C]">{execution_result.unique_customers || 0}</span>
            </div>
            <div className="p-2 bg-white rounded-lg border border-[#E5E9E3]">
              <span className="text-[#7D887F] block text-[10px]">Average Order Value</span>
              <span className="font-bold font-mono text-sm text-[#3C9970]">₹{Number(execution_result.average_order_value || 0).toFixed(2)}</span>
            </div>
            <div className="p-2 bg-white rounded-lg border border-[#E5E9E3]">
              <span className="text-[#7D887F] block text-[10px]">Regular Customers</span>
              <span className="font-bold text-sm text-[#7E22CE]">{execution_result.regular_customer_count || 0}</span>
            </div>
          </div>
          {execution_result.top_customer && (
            <div className="pt-1.5 flex items-center justify-between text-[11px] font-medium text-[#52745F]">
              <span className="flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-[#C77B52]" />
                Top Customer: <strong className="text-[#28332C]">{execution_result.top_customer.name}</strong>
              </span>
              <span className="font-mono font-bold text-[#3C9970]">Total Spend: ₹{execution_result.top_customer.total_spend.toFixed(2)}</span>
            </div>
          )}
        </div>
      )}

      {/* 4. INVENTORY HEALTH */}
      {intent.intent === 'get_inventory_health' && execution_result && (
        <div className="p-3.5 bg-[#EDF5EF] rounded-xl border border-[#E5E9E3] space-y-2 text-xs">
          <div className="flex items-center justify-between border-b border-[#E5E9E3] pb-1 font-bold text-[#28332C]">
            <span className="flex items-center gap-1.5">
              <Package className="w-4 h-4 text-[#52745F]" />
              Inventory Valuation & Reorder Alerts
            </span>
            <span className="font-mono text-[#3C9970]">
              Valuation: ₹{Number(execution_result.inventory_valuation || 0).toFixed(2)}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 bg-white rounded-lg border border-[#E5E9E3]">
              <span className="text-[#7D887F] block text-[10px]">Total Products</span>
              <span className="font-bold text-sm text-[#28332C]">{execution_result.total_products || 0}</span>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg border border-amber-200">
              <span className="text-amber-800 block text-[10px] font-bold">Low Stock Items</span>
              <span className="font-black text-sm text-amber-900">{execution_result.low_stock_count || 0}</span>
            </div>
            <div className="p-2 bg-red-50 rounded-lg border border-red-200">
              <span className="text-red-800 block text-[10px] font-bold">Out of Stock</span>
              <span className="font-black text-sm text-red-900">{execution_result.out_of_stock_count || 0}</span>
            </div>
          </div>
          {execution_result.reorder_suggestions && execution_result.reorder_suggestions.length > 0 && (
            <div className="pt-1.5 border-t border-[#E5E9E3]">
              <span className="text-[10px] font-bold text-[#C77B52] block mb-1">Recommended Reorders:</span>
              <div className="flex flex-wrap gap-1.5">
                {execution_result.reorder_suggestions.slice(0, 4).map((r: any, idx: number) => (
                  <span key={idx} className="px-2 py-0.5 bg-white border border-[#E5E9E3] rounded-md text-[10px] text-[#28332C] font-semibold">
                    {r.name} (+{r.suggested_qty} {r.unit})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. PERIOD COMPARISONS */}
      {intent.intent === 'compare_periods' && execution_result && (
        <div className="p-3.5 bg-[#EFF6FF] rounded-xl border border-[#BFDBFE] space-y-2 text-xs">
          <div className="flex items-center justify-between border-b border-[#BFDBFE] pb-1 font-bold text-[#1E3A8A]">
            <span className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#1D4ED8]" />
              Comparative Period Growth
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              execution_result.revenue_growth_pct >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
            }`}>
              {execution_result.revenue_growth_pct >= 0 ? '▲ +' : '▼ '}{execution_result.revenue_growth_pct}% Rev Growth
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-white rounded-lg border border-[#BFDBFE]">
              <span className="text-[10px] font-bold text-[#1D4ED8] block mb-1">{execution_result.period1_label}</span>
              <div className="space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-[#7D887F]">Revenue:</span>
                  <span className="font-mono font-bold text-[#28332C]">₹{Number(execution_result.period1_revenue || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7D887F]">Net Profit:</span>
                  <span className="font-mono font-bold text-[#3C9970]">₹{Number(execution_result.period1_profit || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="p-2.5 bg-white rounded-lg border border-[#BFDBFE]">
              <span className="text-[10px] font-bold text-[#7D887F] block mb-1">{execution_result.period2_label}</span>
              <div className="space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-[#7D887F]">Revenue:</span>
                  <span className="font-mono font-bold text-[#28332C]">₹{Number(execution_result.period2_revenue || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7D887F]">Net Profit:</span>
                  <span className="font-mono font-bold text-[#3C9970]">₹{Number(execution_result.period2_profit || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. BUSINESS INSIGHTS */}
      {intent.intent === 'get_business_insights' && execution_result && (
        <div className="p-3.5 bg-[#ECFDF5] rounded-xl border border-[#A7F3D0] space-y-2 text-xs">
          <div className="flex items-center justify-between border-b border-[#A7F3D0] pb-1 font-bold text-[#065F46]">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#047857]" />
              Executive Business Health & Recommendations
            </span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              {execution_result.is_profitable ? 'Profitable Store' : 'Attention Needed'}
            </span>
          </div>
          {execution_result.recommendations && execution_result.recommendations.length > 0 && (
            <ul className="space-y-1 text-[#28332C] pt-1 list-disc list-inside">
              {execution_result.recommendations.map((rec: string, idx: number) => (
                <li key={idx} className="font-semibold text-[11px] leading-snug">{rec}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 7. COMPLETE PRODUCT CATALOGUE & FILTERED INVENTORY LIST DECK */}
      {hasProductList && (rawProducts.length > 1 || intent.intent === 'list_products') && (
        <div className="p-4 bg-[#EDF5EF] rounded-2xl border border-[#E5E9E3] space-y-3">
          {/* Header Strip with Metrics */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E9E3] pb-2">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-[#52745F]" />
              <span className="font-extrabold text-[#28332C] text-xs">
                {execution_result?.total_matching !== undefined
                  ? `Found ${execution_result.total_matching.toLocaleString()} Products`
                  : `${rawProducts.length} Matching Products`}
              </span>
              {execution_result?.valuation !== undefined && execution_result.valuation > 0 && (
                <span className="text-[10px] text-[#52745F] font-mono font-bold bg-white px-2 py-0.5 rounded-full border border-[#E5E9E3]">
                  ₹{Number(execution_result.valuation).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
              )}
            </div>

            {/* Quick Filter Tabs */}
            <div className="flex items-center gap-1 text-[10px] font-bold">
              <button
                onClick={() => { setProductStatusFilter('all'); setCurrentPage(1); }}
                className={`px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${
                  productStatusFilter === 'all'
                    ? 'bg-[#52745F] text-white border-[#52745F]'
                    : 'bg-white text-[#7D887F] border-[#E5E9E3] hover:bg-[#E4EFE6]'
                }`}
              >
                All ({rawProducts.length})
              </button>
              <button
                onClick={() => { setProductStatusFilter('in_stock'); setCurrentPage(1); }}
                className={`px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${
                  productStatusFilter === 'in_stock'
                    ? 'bg-[#3C9970] text-white border-[#3C9970]'
                    : 'bg-white text-[#3C9970] border-[#E5E9E3] hover:bg-[#E4EFE6]'
                }`}
              >
                In Stock ({availableCount})
              </button>
              {lowStockCount > 0 && (
                <button
                  onClick={() => { setProductStatusFilter('low_stock'); setCurrentPage(1); }}
                  className={`px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${
                    productStatusFilter === 'low_stock'
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white text-amber-700 border-[#E5E9E3] hover:bg-amber-50'
                  }`}
                >
                  Low ({lowStockCount})
                </button>
              )}
              {outOfStockCount > 0 && (
                <button
                  onClick={() => { setProductStatusFilter('out_of_stock'); setCurrentPage(1); }}
                  className={`px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${
                    productStatusFilter === 'out_of_stock'
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-white text-red-600 border-[#E5E9E3] hover:bg-red-50'
                  }`}
                >
                  Out ({outOfStockCount})
                </button>
              )}
            </div>
          </div>

          {/* Search bar inside deck if list is large */}
          {rawProducts.length > 4 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7D887F]" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => { setProductSearch(e.target.value); setCurrentPage(1); }}
                placeholder="Search products by name or category..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#E5E9E3] rounded-xl focus:outline-none focus:border-[#789B82] text-[#28332C]"
              />
            </div>
          )}

          {/* Product Items List */}
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {paginatedProducts.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#7D887F] bg-white rounded-xl border border-[#E5E9E3]">
                No products match the selected filter.
              </div>
            ) : (
              paginatedProducts.map((p: any) => {
                const curStk = p.current_stock ?? p.stock ?? 0;
                const thresh = p.low_stock_threshold ?? 10;
                const isOut = curStk <= 0;
                const isLow = !isOut && curStk <= thresh;
                return (
                  <div
                    key={p.id || p.name}
                    className="p-2.5 bg-white rounded-xl border border-[#E5E9E3] flex items-center justify-between gap-2 hover:border-[#789B82]/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-[#28332C] truncate">{p.name}</span>
                        {p.telugu_name && (
                          <span className="text-[10px] text-[#7D887F] truncate">({p.telugu_name})</span>
                        )}
                      </div>
                      {p.category_name && (
                        <span className="text-[9px] font-semibold text-[#52745F] bg-[#EDF5EF] px-1.5 py-0.2 rounded-md">
                          {p.category_name}
                        </span>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          isOut
                            ? 'bg-red-100 text-red-700'
                            : isLow
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {curStk} {p.unit || 'unit'}
                        </span>
                      </div>
                      {p.selling_price !== undefined && (
                        <span className="text-[10px] font-mono font-bold text-[#52745F] block mt-0.5">
                          ₹{Number(p.selling_price).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-[#7D887F] pt-2 border-t border-[#E5E9E3]">
              <span className="text-[10px]">
                Showing {startIndex + 1}–{Math.min(startIndex + pageSize, filteredProductsList.length)} of {filteredProductsList.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded-lg border border-[#E5E9E3] bg-white disabled:opacity-40 hover:bg-[#EDF5EF] cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5 text-[#52745F]" />
                </button>
                <span className="text-[10px] font-bold text-[#28332C] px-1">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded-lg border border-[#E5E9E3] bg-white disabled:opacity-40 hover:bg-[#EDF5EF] cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-[#52745F]" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 8. CATEGORIES DECK */}
      {intent.intent === 'list_categories' && execution_result?.categories && (
        <div className="p-4 bg-[#EDF5EF] rounded-2xl border border-[#E5E9E3] space-y-2">
          <div className="flex items-center justify-between border-b border-[#E5E9E3] pb-1.5">
            <span className="font-extrabold text-xs text-[#28332C] flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-[#52745F]" />
              Store Product Categories ({execution_result.categories_count || execution_result.categories.length})
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-56 overflow-y-auto pr-1">
            {execution_result.categories.map((c: any) => (
              <div key={c.id || c.name} className="p-2 bg-white rounded-xl border border-[#E5E9E3] flex items-center justify-between text-xs">
                <span className="font-semibold text-[#28332C] truncate text-[11px]">{c.name}</span>
                <span className="font-bold text-[10px] text-[#52745F] bg-[#EDF5EF] px-1.5 py-0.5 rounded-full ml-1 shrink-0 font-mono">
                  {c.product_count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 9. TRANSACTIONAL DETAIL BOX (Single Product Sale, Restock, Stock Check, Price Inquiry) */}
      {!intent.intent.startsWith('get_') &&
        intent.intent !== 'compare_periods' &&
        intent.intent !== 'list_products' &&
        intent.intent !== 'list_categories' &&
        (!hasProductList || rawProducts.length === 1) &&
        intent.product_name && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3.5 bg-[#EDF5EF] rounded-xl border border-[#E5E9E3] text-xs">
          <div>
            <span className="text-[#7D887F] block text-[10px] font-medium">Product</span>
            <span className="font-bold text-[#28332C] text-xs">{intent.product_name}</span>
          </div>

          {intent.intent === 'check_stock' ? (
            <>
              <div>
                <span className="text-[#7D887F] block text-[10px] font-medium">Available Stock</span>
                <span className="font-bold text-[#3C9970] font-mono text-xs">
                  {execution_result?.current_stock !== undefined
                    ? `${execution_result.current_stock} ${intent.unit || execution_result.unit || ''}`
                    : `${execution_result?.remaining_stock || 0} ${intent.unit || ''}`}
                </span>
              </div>
              {execution_result?.selling_price !== undefined && (
                <div>
                  <span className="text-[#7D887F] block text-[10px] font-medium">Selling Price</span>
                  <span className="font-extrabold text-[#52745F] font-mono text-xs">
                    ₹{Number(execution_result.selling_price).toFixed(2)}
                  </span>
                </div>
              )}
            </>
          ) : intent.intent === 'price_inquiry' ? (
            <div>
              <span className="text-[#7D887F] block text-[10px] font-medium">Selling Price</span>
              <span className="font-extrabold text-[#3C9970] font-mono text-xs">
                ₹{execution_result?.selling_price !== undefined
                  ? Number(execution_result.selling_price).toFixed(2)
                  : (intent.unit_price || 0).toFixed(2)}
              </span>
            </div>
          ) : (
            <>
              <div>
                <span className="text-[#7D887F] block text-[10px] font-medium">Quantity</span>
                <span className="font-bold text-[#52745F] text-xs">
                  {intent.quantity !== null && intent.quantity !== undefined
                    ? `${intent.quantity} ${intent.unit}`
                    : `1 ${intent.unit}`}
                </span>
              </div>
              {execution_result?.total_amount !== undefined && (
                <div>
                  <span className="text-[#7D887F] block text-[10px] font-medium">Total Value</span>
                  <span className="font-extrabold text-[#3C9970] font-mono text-xs">₹{execution_result.total_amount.toFixed(2)}</span>
                </div>
              )}
              {execution_result?.new_stock !== undefined && (
                <div className="col-span-2 sm:col-span-3 pt-2 border-t border-[#E5E9E3] flex items-center justify-between">
                  <span className="text-[#7D887F] font-medium">Updated Stock Balance:</span>
                  <span className="font-mono font-bold text-[#3C9970]">
                    {execution_result.new_stock} {intent.unit}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Natural Response & Voice Feedback */}
      <div className={`p-4 rounded-xl border transition-all ${isPlayingAudio ? 'bg-[#E4EFE6] border-[#3C9970]' : 'bg-[#EDF5EF] border-[#E5E9E3]'}`}>
        <div className="flex items-start gap-3">
          <button
            onClick={handlePlayToggle}
            className={`p-2.5 rounded-xl text-white shrink-0 shadow-xs cursor-pointer transition-all ${
              isPlayingAudio ? 'bg-[#3C9970] scale-105 animate-pulse' : 'bg-[#52745F] hover:bg-[#3D5747]'
            }`}
            title={isPlayingAudio ? 'Stop Playing' : 'Play Spoken Telugu Voice'}
          >
            {isPlayingAudio ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[10px] font-black uppercase text-[#52745F] flex items-center gap-1.5">
                Gnani Spoken Response
                {isPlayingAudio && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#3C9970] bg-white px-2 py-0.5 rounded-full border border-[#3C9970]/30 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3C9970] animate-ping" />
                    Speaking Aloud...
                  </span>
                )}
              </span>
              
              <button
                onClick={handlePlayToggle}
                className="text-[11px] font-bold text-[#52745F] hover:text-[#28332C] hover:underline flex items-center gap-1 cursor-pointer"
              >
                {isPlayingAudio ? 'Stop Audio' : 'Play Voice 🔊'}
              </button>
            </div>
            
            <p className="text-xs font-semibold text-[#28332C] leading-relaxed">
              {natural_response}
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation & Status Actions */}
      <div className="pt-2 flex items-center gap-2">
        {isExecuted ? (
          <div className="w-full py-3 rounded-xl bg-[#E4EFE6] text-[#3C9970] font-black text-xs flex items-center justify-center gap-2 border border-[#789B82]/30 shadow-xs">
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {intent.intent === 'check_stock'
                ? 'Stock Verified & In Inventory'
                : intent.intent === 'price_inquiry'
                ? 'Price Verified'
                : intent.intent === 'daily_summary'
                ? 'Daily Report Generated'
                : intent.intent.startsWith('get_') || intent.intent === 'compare_periods'
                ? 'BI Intelligence Report Generated'
                : 'Transaction Executed & Database Updated Successfully'}
            </span>
          </div>
        ) : isConfirmationRequired ? (
          <>
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 py-3 rounded-xl border border-[#E5E9E3] text-xs font-bold text-[#7D887F] hover:bg-[#EDF5EF] cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 py-3 rounded-xl bg-[#C77B52] hover:bg-[#B66A42] text-white text-xs font-black shadow-md flex items-center justify-center gap-2 cursor-pointer transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isLoading ? 'Committing to Database...' : 'Confirm & Commit'}</span>
            </button>
          </>
        ) : (
          <button
            onClick={onCancel}
            className="w-full py-3 rounded-xl bg-[#EDF5EF] text-[#52745F] text-xs font-bold hover:bg-[#E4EFE6] cursor-pointer transition-colors"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
};

export default ActionPreviewCard;
