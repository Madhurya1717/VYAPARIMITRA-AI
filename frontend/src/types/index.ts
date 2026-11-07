export type SupportedLanguage = 'te-IN' | 'en-IN' | 'hi-IN' | 'te-en';

export interface User {
  id: string;
  business_id: string;
  full_name: string;
  phone_or_email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface Business {
  id: string;
  name: string;
  owner_name: string;
  phone: string;
  email?: string;
  address?: string;
  gstin?: string;
  preferred_language: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  business_id: string;
  name: string;
  telugu_name?: string;
  aliases: string[];
  category_id?: string;
  category_name?: string;
  sku?: string;
  current_stock: number;
  unit: string;
  cost_price: number;
  selling_price: number;
  low_stock_threshold: number;
  is_active: boolean;
  is_low_stock: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  business_id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface InventoryTransaction {
  id: string;
  business_id: string;
  product_id: string;
  product_name?: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'RETURN';
  quantity: number;
  balance_after: number;
  unit_price?: number;
  reference_type?: string;
  notes?: string;
  created_at: string;
}

export interface SaleItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  pdf_url?: string;
  qr_payload?: string;
  created_at: string;
}

export interface Sale {
  id: string;
  business_id: string;
  customer_id?: string;
  customer_name?: string;
  invoice_number: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_method: string;
  status: string;
  notes?: string;
  items: SaleItem[];
  invoice?: Invoice;
  created_at: string;
}

export interface Customer {
  id: string;
  business_id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  total_purchases: number;
  credit_balance: number;
  created_at: string;
}

export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Order {
  id: string;
  business_id: string;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  order_number: string;
  status: 'pending' | 'ready' | 'fulfilled' | 'cancelled';
  payment_status: 'unpaid' | 'paid' | 'partially_paid';
  total_amount: number;
  notes?: string;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface VoiceCommandIntent {
  intent: string;
  product_name?: string;
  matched_product_id?: string;
  quantity?: number;
  unit?: string;
  unit_price?: number;
  total_amount?: number;
  language: string;
  confidence: number;
  requires_confirmation: boolean;
  clarification_prompt?: string;
}

export interface VoiceProcessResponse {
  command_id: string;
  transcription: string;
  detected_language: string;
  intent: VoiceCommandIntent;
  action_status: 'PREVIEW_READY' | 'EXECUTED' | 'CONFIRMATION_REQUIRED' | 'AMBIGUOUS' | 'REJECTED' | 'ERROR';
  natural_response: string;
  spoken_audio_url?: string;
  spoken_audio_base64?: string;
  execution_result?: any;
  latency_ms: number;
  model_info: {
    stt_engine: string;
    tts_engine: string;
    voice: string;
    live_gnani_stt: string;
    live_gnani_tts: string;
  };
}

export interface VoiceCommandLog {
  id: string;
  transcription: string;
  detected_language: string;
  intent: string;
  confidence: number;
  requires_confirmation: boolean;
  is_confirmed: boolean;
  executed_action?: string;
  response_text?: string;
  latency_ms: number;
  created_at: string;
}

export interface DailySalesMetric {
  date: string;
  day_name: string;
  sales_count: number;
  revenue: number;
}

export interface TopProductItem {
  product_id: string;
  product_name: string;
  telugu_name?: string;
  quantity_sold: number;
  unit: string;
  revenue: number;
}

export interface RestockAlertItem {
  product_id: string;
  product_name: string;
  telugu_name?: string;
  current_stock: number;
  unit: string;
  low_stock_threshold: number;
  deficit: number;
  suggested_reorder_qty: number;
}

export interface CategoryBreakdownItem {
  category_name: string;
  product_count: number;
  stock_value: number;
}

export interface DashboardSummary {
  today_sales: number;
  today_orders: number;
  total_revenue: number;
  total_orders_count: number;
  inventory_total_value: number;
  active_products_count: number;
  low_stock_count: number;
  low_stock_items: RestockAlertItem[];
  top_selling_products: TopProductItem[];
  recent_sales_trend: DailySalesMetric[];
  category_distribution: CategoryBreakdownItem[];
  voice_assistant_status: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'alert' | 'success';
  is_read: boolean;
  created_at: string;
}
