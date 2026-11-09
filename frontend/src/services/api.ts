import {
  User, Business, Product, Category, InventoryTransaction,
  Sale, Order, Customer, DashboardSummary, VoiceProcessResponse,
  VoiceCommandLog, NotificationItem
} from '../types';

const BASE_URL = '/api/v1';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('vyapari_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('vyapari_token', token);
    } else {
      localStorage.removeItem('vyapari_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: options.signal || controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMsg = `HTTP Error ${response.status}`;
        try {
          const errorJson = await response.json();
          errorMsg = errorJson.detail || errorJson.message || errorMsg;
        } catch (e) {
          // use default error message
        }
        throw new Error(errorMsg);
      }

      return response.json();
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
        throw new Error('Request timed out after 12s. Please check connection and retry.');
      }
      throw e;
    }
  }

  // Auth Endpoints (Two-Step Login Verification)
  async loginStep1(phone_or_email: string, password: string) {
    return this.request<{
      otp_required: boolean;
      session_token: string;
      email_masked: string;
      expires_in_seconds: number;
      message: string;
    }>('/auth/login-json', {
      method: 'POST',
      body: JSON.stringify({ phone_or_email, password }),
    });
  }

  async verifyOtp(session_token: string, otp: string) {
    const data = await this.request<{
      access_token: string;
      token_type: string;
      user: User;
      business: Business;
    }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ session_token, otp }),
    });
    this.setToken(data.access_token);
    return data;
  }

  async resendOtp(session_token: string) {
    return this.request<{
      success: boolean;
      message: string;
      expires_in_seconds: number;
    }>('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ session_token }),
    });
  }

  async login(phone_or_email: string, password: string) {
    return this.loginStep1(phone_or_email, password);
  }

  async register(payload: {
    full_name: string;
    phone_or_email: string;
    password: string;
    business_name: string;
    preferred_language?: string;
  }) {
    const data = await this.request<{
      access_token: string;
      token_type: string;
      user: User;
      business: Business;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.setToken(data.access_token);
    return data;
  }

  async getMe() {
    return this.request<{ user: User; business: Business }>('/auth/me');
  }

  async updateBusiness(payload: Partial<Business>) {
    return this.request<Business>('/auth/business', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  // Products & Inventory Endpoints
  async listProducts(params?: { category_id?: string; search?: string; low_stock_only?: boolean }) {
    const query = new URLSearchParams();
    if (params?.category_id) query.append('category_id', params.category_id);
    if (params?.search) query.append('search', params.search);
    if (params?.low_stock_only) query.append('low_stock_only', 'true');
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<Product[]>(`/products${qs}`);
  }

  async createProduct(product: Partial<Product>) {
    return this.request<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
  }

  async getProduct(id: string) {
    return this.request<Product>(`/products/${id}`);
  }

  async updateProduct(id: string, product: Partial<Product>) {
    return this.request<Product>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(product),
    });
  }

  async deleteProduct(id: string) {
    return this.request<{ success: boolean; message: string }>(`/products/${id}`, {
      method: 'DELETE',
    });
  }

  async adjustStock(productId: string, quantity: number, type: 'IN' | 'OUT' | 'ADJUSTMENT', notes?: string) {
    return this.request<{ success: boolean; new_stock: number }>(`/products/${productId}/adjust-stock`, {
      method: 'POST',
      body: JSON.stringify({
        product_id: productId,
        type,
        quantity,
        notes,
      }),
    });
  }

  async getCategories() {
    return this.request<Category[]>('/products/categories');
  }

  async createCategory(name: string, description?: string) {
    return this.request<Category>('/products/categories', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }

  async getInventoryTransactions(limit: number = 50) {
    return this.request<InventoryTransaction[]>(`/products/transactions?limit=${limit}`);
  }

  // Sales & Billing Endpoints
  async listSales(limit: number = 50) {
    return this.request<Sale[]>(`/sales?limit=${limit}`);
  }

  async createSale(saleData: {
    customer_id?: string;
    items: Array<{ product_id: string; quantity: number; unit_price?: number }>;
    discount_amount?: number;
    tax_amount?: number;
    payment_method?: string;
    notes?: string;
    idempotency_key?: string;
  }) {
    return this.request<Sale>('/sales', {
      method: 'POST',
      body: JSON.stringify(saleData),
    });
  }

  // Orders Endpoints
  async listOrders(status?: string) {
    const qs = status ? `?status=${status}` : '';
    return this.request<Order[]>(`/orders${qs}`);
  }

  async createOrder(orderData: {
    customer_name?: string;
    customer_phone?: string;
    items: Array<{ product_id: string; quantity: number; unit_price?: number }>;
    notes?: string;
  }) {
    return this.request<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  async updateOrderStatus(orderId: string, update: { status?: string; payment_status?: string; notes?: string }) {
    return this.request<Order>(`/orders/${orderId}`, {
      method: 'PATCH',
      body: JSON.stringify(update),
    });
  }

  // Customers Endpoints
  async listCustomers(search?: string) {
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request<Customer[]>(`/customers${qs}`);
  }

  async createCustomer(customer: { name: string; phone: string; email?: string; address?: string }) {
    return this.request<Customer>('/customers', {
      method: 'POST',
      body: JSON.stringify(customer),
    });
  }

  // Analytics Endpoints
  async getDashboard(range?: string) {
    const qs = range ? `?range=${encodeURIComponent(range)}` : '';
    return this.request<DashboardSummary>(`/analytics/dashboard${qs}`);
  }

  // Notifications Endpoints
  async getNotifications() {
    return this.request<NotificationItem[]>('/notifications');
  }

  async markNotificationRead(id: string) {
    return this.request<{ success: boolean }>(`/notifications/${id}/read`, {
      method: 'PUT',
    });
  }

  // Voice AI Endpoints (Gnani Prisma & Timbre)
  async processVoiceCommand(options: {
    audioBlob?: Blob;
    transcriptionText?: string;
    languageCode?: string;
    executeTransaction?: boolean;
    idempotencyKey?: string;
  }): Promise<VoiceProcessResponse> {
    const formData = new FormData();
    if (options.audioBlob) {
      const isWav = options.audioBlob.type.includes('wav');
      formData.append('audio_file', options.audioBlob, isWav ? 'voice_command.wav' : 'voice_command.webm');
    }
    if (options.transcriptionText) {
      formData.append('transcription_text', options.transcriptionText);
    }
    if (options.languageCode) {
      formData.append('language_code', options.languageCode);
    }
    formData.append('execute_transaction', options.executeTransaction ? 'true' : 'false');
    if (options.idempotencyKey) {
      formData.append('idempotency_key', options.idempotencyKey);
    }

    return this.request<VoiceProcessResponse>('/voice/process-command', {
      method: 'POST',
      body: formData,
    });
  }

  async getVoiceHistory(): Promise<VoiceCommandLog[]> {
    return this.request<VoiceCommandLog[]>('/voice/history');
  }

  async checkHealth() {
    return this.request<any>('/health', {}, );
  }
  // Grocery Sales Simulation Endpoints
  async getSimulationStatus() {
    return this.request<{
      is_running: boolean;
      interval_seconds: number;
      total_simulated_sales: number;
      total_simulated_revenue: number;
      last_transaction: any;
      active_business_id: string;
    }>('/demo/simulation/status');
  }

  async startSimulation(interval_seconds: number = 3) {
    return this.request<{ success: boolean; message: string; is_running: boolean }>('/demo/simulation/start', {
      method: 'POST',
      body: JSON.stringify({ interval_seconds }),
    });
  }

  async stopSimulation() {
    return this.request<{ success: boolean; message: string; is_running: boolean }>('/demo/simulation/stop', {
      method: 'POST',
    });
  }

  async getSimulationTransactions(limit: number = 20) {
    return this.request<any[]>(`/demo/simulation/transactions?limit=${limit}`);
  }

  async resetSimulation() {
    return this.request<{ success: boolean; message: string; deleted_sales_count: number }>('/demo/simulation/reset', {
      method: 'POST',
    });
  }
}

export const api = new ApiClient();

