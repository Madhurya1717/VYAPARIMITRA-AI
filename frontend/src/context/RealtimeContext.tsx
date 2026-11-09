import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';

export interface RealtimeEvent {
  type: 'SALE_CREATED' | 'INVENTORY_UPDATED' | 'ORDER_UPDATED' | 'NOTIFICATION_CREATED' | 'VOICE_TRANSACTION' | string;
  data: any;
  timestamp: number;
}

export interface LiveToast {
  id: string;
  title: string;
  message: string;
  type: 'sale' | 'order' | 'inventory' | 'voice' | 'info';
  timestamp: number;
}

interface RealtimeContextType {
  isConnected: boolean;
  status: 'connected' | 'connecting' | 'disconnected' | 'fallback';
  lastEvent: RealtimeEvent | null;
  toasts: LiveToast[];
  dismissToast: (id: string) => void;
  subscribe: (callback: (event: RealtimeEvent) => void) => () => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'fallback'>('connecting');
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const [toasts, setToasts] = useState<LiveToast[]>([]);

  const subscribersRef = useRef<Set<(event: RealtimeEvent) => void>>(new Set());
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const pingIntervalRef = useRef<any>(null);

  const addToast = (toast: Omit<LiveToast, 'id' | 'timestamp'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newToast: LiveToast = {
      ...toast,
      id,
      timestamp: Date.now()
    };
    setToasts(prev => [newToast, ...prev].slice(0, 5));

    // Auto-dismiss after 4.5 seconds
    setTimeout(() => {
      dismissToast(id);
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleIncomingMessage = useCallback((eventData: RealtimeEvent) => {
    setLastEvent(eventData);

    // Trigger subscribers
    subscribersRef.current.forEach(callback => {
      try {
        callback(eventData);
      } catch (err) {
        console.error('Subscriber error:', err);
      }
    });

    // Create contextual toast notifications
    if (eventData.type === 'SALE_CREATED') {
      const d = eventData.data;
      addToast({
        type: 'sale',
        title: d.is_simulation ? 'Live Grocery Sale Replayed' : 'Sale Completed! 🧾',
        message: `${d.invoice_number || 'INV'} • ₹${Number(d.total_amount || 0).toFixed(2)} via ${(d.payment_method || 'CASH').toUpperCase()}`
      });
    } else if (eventData.type === 'ORDER_UPDATED') {
      const d = eventData.data;
      addToast({
        type: 'order',
        title: `Order #${d.order_number || ''} Updated`,
        message: `Status: ${(d.status || '').toUpperCase()} • Total: ₹${Number(d.total_amount || 0).toFixed(2)}`
      });
    } else if (eventData.type === 'INVENTORY_UPDATED') {
      const d = eventData.data;
      addToast({
        type: 'inventory',
        title: 'Stock Updated 📦',
        message: `${d.product_name || 'Product'}: new balance ${d.new_stock} ${d.unit || ''}`
      });
    } else if (eventData.type === 'VOICE_TRANSACTION') {
      const d = eventData.data;
      addToast({
        type: 'voice',
        title: 'Voice Command Executed 🎙️',
        message: d.response_text || `Intent: ${d.intent}`
      });
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/realtime`;

      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;
      setStatus('connecting');

      ws.onopen = () => {
        setIsConnected(true);
        setStatus('connected');
        // Start ping keepalive
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 15000);
      };

      ws.onmessage = (event) => {
        if (event.data === 'pong') return;
        try {
          const parsed = JSON.parse(event.data);
          handleIncomingMessage(parsed);
        } catch (e) {
          // not JSON
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setStatus('disconnected');
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        // Attempt reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      setIsConnected(false);
      setStatus('disconnected');
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket();
      }, 5000);
    }
  }, [handleIncomingMessage]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connectWebSocket]);

  const subscribe = useCallback((callback: (event: RealtimeEvent) => void) => {
    subscribersRef.current.add(callback);
    return () => {
      subscribersRef.current.delete(callback);
    };
  }, []);

  return (
    <RealtimeContext.Provider
      value={{
        isConnected,
        status,
        lastEvent,
        toasts,
        dismissToast,
        subscribe
      }}
    >
      {children}

      {/* Floating Live Toast Notifications Stack */}
      <div className="fixed bottom-20 sm:bottom-6 left-4 sm:left-auto sm:right-6 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            onClick={() => dismissToast(toast.id)}
            className="pointer-events-auto p-3.5 rounded-2xl bg-white/95 border border-purple-200/90 shadow-xl backdrop-blur-md flex items-start gap-3 transition-all animate-in slide-in-from-bottom-2 duration-200 cursor-pointer hover:border-purple-300"
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-xs shadow-xs ${
              toast.type === 'sale' ? 'bg-[#10B981]' :
              toast.type === 'order' ? 'bg-[#FF9B25]' :
              toast.type === 'inventory' ? 'bg-[#1769FF]' :
              toast.type === 'voice' ? 'bg-[#741BFF]' : 'bg-slate-700'
            }`}>
              {toast.type === 'sale' ? '₹' :
               toast.type === 'order' ? '📦' :
               toast.type === 'inventory' ? '📊' :
               toast.type === 'voice' ? '🎙️' : 'ℹ️'}
            </div>
            <div className="flex-1 truncate">
              <h5 className="text-xs font-black text-[#1E1B4B]">{toast.title}</h5>
              <p className="text-[11px] text-slate-600 truncate">{toast.message}</p>
            </div>
          </div>
        ))}
      </div>
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};
