import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { api } from '../services/api';
import { audioRecorder } from '../services/audio';
import { audioPlayer } from '../services/audioPlayer';
import { DashboardSummary, Product, Sale, VoiceProcessResponse } from '../types';
import {
  TrendingUp, IndianRupee, ShoppingCart, Boxes, AlertTriangle,
  Mic, Clock, CheckCircle2, ChevronRight, Zap, Play, Square,
  RotateCcw, Activity, ShoppingBag, Sparkles, Users, Receipt,
  ArrowRight, ShieldCheck, Flame, Bell, Volume2, RefreshCw,
  Plus, Check, MessageSquare, AlertCircle, ArrowUpRight
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import { ShopkeeperMascot, AIRobotAssistant } from '../components/Illustrations';

interface DashboardProps {
  onOpenVoiceModal?: () => void;
}

interface ActivityItem {
  id: string;
  type: 'sale' | 'inventory' | 'order' | 'voice';
  title: string;
  detail: string;
  amount?: number;
  time: string;
  status: 'Completed' | 'Verified' | 'Auto-logged';
}

export const Dashboard: React.FC<DashboardProps> = ({ onOpenVoiceModal }) => {
  const navigate = useNavigate();
  const { business, user, language } = useAuth();
  const outletCtx = useOutletContext<{ openVoiceModal?: () => void }>();
  const triggerVoiceModal = onOpenVoiceModal || outletCtx?.openVoiceModal;
  const { subscribe, isConnected } = useRealtime();

  // Core Data
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [topProducts, setTopProducts] = useState<Product[]>([]);
  const [customerCount, setCustomerCount] = useState<number>(28);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState<string>('7d');
  const [chartLoading, setChartLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Voice Assistant Center Panel State (7 States)
  // 'READY' | 'LISTENING' | 'TRANSCRIBING' | 'EXECUTING' | 'SUCCESS' | 'ERROR' | 'SPEAKING'
  type VoiceState = 'READY' | 'LISTENING' | 'TRANSCRIBING' | 'EXECUTING' | 'SUCCESS' | 'ERROR' | 'SPEAKING';
  const [voiceState, setVoiceState] = useState<VoiceState>('READY');
  const [audioLevel, setAudioLevel] = useState<number>(0.2);
  const [lastVoiceResponse, setLastVoiceResponse] = useState<VoiceProcessResponse | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [spokenTranscript, setSpokenTranscript] = useState<string>('');
  const [voiceHistory, setVoiceHistory] = useState<Array<{
    text: string;
    intent: string;
    lang: string;
    time: string;
    status: string;
  }>>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Live Sales Simulation State
  const [simRunning, setSimRunning] = useState(false);
  const [simInterval, setSimInterval] = useState(3);
  const [simStats, setSimStats] = useState<{ total_sales: number; total_revenue: number }>({
    total_sales: 0,
    total_revenue: 0,
  });
  const [simTransactions, setSimTransactions] = useState<any[]>([]);
  const [simLoading, setSimLoading] = useState(false);
  const [simMessage, setSimMessage] = useState<string | null>(null);

  // Live Chronological Activity Stream
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([
    {
      id: 'act-1',
      type: 'sale',
      title: 'POS Counter Sale #INV-1092',
      detail: 'Ashirvaad Atta 5kg, Sugar 2kg',
      amount: 345,
      time: 'Just now',
      status: 'Completed',
    },
    {
      id: 'act-2',
      type: 'voice',
      title: 'Voice Command: "బియ్యం స్టాక్ ఎంత?"',
      detail: 'Telugu NLU stock query resolved by Prisma',
      time: '2m ago',
      status: 'Auto-logged',
    },
    {
      id: 'act-3',
      type: 'inventory',
      title: 'Stock Inbound: Tata Salt 1kg',
      detail: '+50 packets restocked by Kishore',
      time: '12m ago',
      status: 'Verified',
    },
    {
      id: 'act-4',
      type: 'order',
      title: 'Customer Advance Order #ORD-84',
      detail: 'Ramesh Reddy (Phone booking)',
      amount: 820,
      time: '28m ago',
      status: 'Completed',
    },
  ]);

  // Live Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString('en-IN', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }) + ' • ' + now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Dashboard Data & Auxiliary Records
  const fetchDashboardData = useCallback(async (showSpinner = true, range = selectedRange) => {
    try {
      if (showSpinner) setLoading(true);
      else setChartLoading(true);

      const [summary, salesList, productsList, customersList] = await Promise.all([
        api.getDashboard(range),
        api.listSales(8).catch(() => []),
        api.listProducts().catch(() => []),
        api.listCustomers().catch(() => []),
      ]);

      setData(summary);
      if (salesList.length > 0) setRecentSales(salesList);
      if (productsList.length > 0) setTopProducts(productsList.slice(0, 6));
      if (customersList.length > 0) setCustomerCount(customersList.length);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      if (showSpinner) setLoading(false);
      setChartLoading(false);
    }
  }, [selectedRange]);

  const fetchSimulationStatus = async () => {
    try {
      const status = await api.getSimulationStatus();
      setSimRunning(status.is_running);
      setSimStats({
        total_sales: status.total_simulated_sales,
        total_revenue: status.total_simulated_revenue,
      });

      if (status.is_running || status.total_simulated_sales > 0) {
        const txs = await api.getSimulationTransactions(8);
        setSimTransactions(txs);
      }
    } catch (err) {
      // silent
    }
  };

  useEffect(() => {
    fetchDashboardData(true, selectedRange);
    fetchSimulationStatus();
  }, [selectedRange, fetchDashboardData]);

  // Realtime WebSocket & SSE Listener
  useEffect(() => {
    const unsubscribe = subscribe((event) => {
      if (['SALE_CREATED', 'INVENTORY_UPDATED', 'ORDER_UPDATED', 'VOICE_TRANSACTION'].includes(event.type)) {
        fetchDashboardData(false, selectedRange);
        fetchSimulationStatus();

        // Push new item into live activity feed
        const newItem: ActivityItem = {
          id: `act-live-${Date.now()}`,
          type: event.type === 'SALE_CREATED' ? 'sale' : event.type === 'INVENTORY_UPDATED' ? 'inventory' : event.type === 'ORDER_UPDATED' ? 'order' : 'voice',
          title: event.data?.message || `${event.type.replace('_', ' ')} recorded`,
          detail: event.data?.customer_name ? `Customer: ${event.data.customer_name}` : 'Real-time telemetry event',
          amount: event.data?.total_amount,
          time: 'Just now',
          status: 'Completed',
        };
        setActivityFeed((prev) => [newItem, ...prev.slice(0, 14)]);
      }
    });
    return unsubscribe;
  }, [subscribe, fetchDashboardData, selectedRange]);

  // Background Simulation Poll
  useEffect(() => {
    let interval: any;
    if (simRunning) {
      interval = setInterval(async () => {
        await fetchSimulationStatus();
        await fetchDashboardData(false, selectedRange);
      }, simInterval * 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [simRunning, simInterval, fetchDashboardData, selectedRange]);

  // Audio Playback
  const playSpokenAudio = (base64Audio?: string, naturalText?: string, detectedLang?: string) => {
    setVoiceState('SPEAKING');
    audioPlayer.playSpokenAudio({
      audioBase64: base64Audio,
      text: naturalText || lastVoiceResponse?.natural_response,
      language: detectedLang || lastVoiceResponse?.detected_language || language,
      onStart: () => setVoiceState('SPEAKING'),
      onEnd: () => setVoiceState('READY'),
      onError: () => setVoiceState('READY'),
    });
  };

  // Direct Voice Recording from Panel 2
  const handleStartRecording = async () => {
    setVoiceError(null);
    setVoiceState('LISTENING');
    const success = await audioRecorder.startRecording((level) => {
      setAudioLevel(level);
    });
    if (!success) {
      setVoiceState('ERROR');
      setVoiceError('Could not access microphone. Please check permissions.');
    }
  };

  const handleStopRecording = async () => {
    setVoiceState('TRANSCRIBING');
    try {
      const audioBlob = await audioRecorder.stopRecording();
      if (!audioBlob) {
        throw new Error('No audio was recorded.');
      }

      setVoiceState('EXECUTING');
      const res = await api.processVoiceCommand({
        audioBlob,
        languageCode: language,
        executeTransaction: true, // Direct execution in operational workspace
      });

      setLastVoiceResponse(res);
      setSpokenTranscript(res.transcription || '');
      setVoiceState('SUCCESS');

      // Add to voice history
      setVoiceHistory((prev) => [
        {
          text: res.transcription || 'Spoken Utterance',
          intent: res.intent?.intent || 'general_query',
          lang: res.detected_language || language,
          time: 'Just now',
          status: res.action_status,
        },
        ...prev.slice(0, 5),
      ]);

      // Play synthesized audio
      if (res.spoken_audio_base64 || res.natural_response) {
        playSpokenAudio(res.spoken_audio_base64, res.natural_response, res.detected_language);
      } else {
        setTimeout(() => setVoiceState('READY'), 2000);
      }

      // Refresh Dashboard KPI Data
      fetchDashboardData(false, selectedRange);
    } catch (err: any) {
      setVoiceState('ERROR');
      setVoiceError(err.message || 'Failed to process voice command.');
    }
  };

  // Execute quick voice utterance text directly
  const handleExecuteQuickVoice = async (text: string) => {
    setVoiceError(null);
    setSpokenTranscript(text);
    setVoiceState('EXECUTING');
    try {
      const res = await api.processVoiceCommand({
        transcriptionText: text,
        languageCode: language,
        executeTransaction: true,
      });

      setLastVoiceResponse(res);
      setVoiceState('SUCCESS');

      setVoiceHistory((prev) => [
        {
          text: text,
          intent: res.intent?.intent || 'quick_action',
          lang: res.detected_language || language,
          time: 'Just now',
          status: res.action_status,
        },
        ...prev.slice(0, 5),
      ]);

      if (res.spoken_audio_base64 || res.natural_response) {
        playSpokenAudio(res.spoken_audio_base64, res.natural_response, res.detected_language);
      } else {
        setTimeout(() => setVoiceState('READY'), 2000);
      }

      fetchDashboardData(false, selectedRange);
    } catch (err: any) {
      setVoiceState('ERROR');
      setVoiceError(err.message || 'Failed to execute voice command.');
    }
  };

  // Simulation Controls
  const handleStartSimulation = async () => {
    try {
      setSimLoading(true);
      setSimMessage(null);
      const res = await api.startSimulation(simInterval);
      setSimRunning(true);
      setSimMessage(res.message);
      await fetchSimulationStatus();
      await fetchDashboardData(false, selectedRange);
    } catch (err: any) {
      setSimMessage(err.message || 'Failed to start simulation');
    } finally {
      setSimLoading(false);
    }
  };

  const handleStopSimulation = async () => {
    try {
      setSimLoading(true);
      const res = await api.stopSimulation();
      setSimRunning(false);
      setSimMessage(res.message);
      await fetchSimulationStatus();
    } catch (err: any) {
      setSimMessage(err.message || 'Failed to stop simulation');
    } finally {
      setSimLoading(false);
    }
  };

  const handleResetSimulation = async () => {
    if (!window.confirm('Reset all simulated sales and restore original inventory stock?')) return;
    try {
      setSimLoading(true);
      const res = await api.resetSimulation();
      setSimRunning(false);
      setSimStats({ total_sales: 0, total_revenue: 0 });
      setSimTransactions([]);
      setSimMessage(res.message);
      await fetchDashboardData(false, selectedRange);
    } catch (err: any) {
      setSimMessage(err.message || 'Failed to reset simulation');
    } finally {
      setSimLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex-1 p-8 flex flex-col items-center justify-center space-y-4 min-h-[70vh]">
        <div className="w-10 h-10 rounded-full border-3 border-[#52745F] border-t-transparent animate-spin" />
        <p className="text-sm font-bold text-[#28332C]">Loading VyapariMitra AI Operational Workspace...</p>
        <span className="text-xs text-[#7D887F]">Connecting to Sri Lakshmi Kirana real-time telemetry</span>
      </div>
    );
  }

  // 6 Concept 04 Quick Action Cards
  const quickActionCards = [
    {
      title: 'Inventory Update',
      telugu: 'స్టాక్ అప్‌డేట్',
      desc: 'Real-time stock balance & replenishment',
      icon: Boxes,
      path: '/app/inventory',
      badge: `${data.active_products_count} Items`,
    },
    {
      title: 'POS Rapid Billing',
      telugu: 'వేగవంతమైన బిల్లింగ్',
      desc: 'Fast barcode counter & UPI QR print',
      icon: Receipt,
      path: '/app/billing',
      badge: '1-Click POS',
    },
    {
      title: 'Order Management',
      telugu: 'ఆర్డర్ నిర్వహణ',
      desc: 'Customer phone & advance bookings',
      icon: Clock,
      path: '/app/orders',
      badge: `${data.pending_orders_count ?? 0} Pending`,
    },
    {
      title: 'Customer Khata',
      telugu: 'కస్టమర్ ఖాతా',
      desc: 'Digital credit ledger & payment log',
      icon: Users,
      path: '/app/customers',
      badge: `${customerCount || 28} Accounts`,
    },
    {
      title: 'Low Stock Alerts',
      telugu: 'తక్కువ స్టాక్ అలర్ట్',
      desc: 'Automatic restock triggers & vendors',
      icon: AlertTriangle,
      path: '/app/inventory',
      badge: `${data.low_stock_count} Items Low`,
      isAlert: data.low_stock_count > 0,
    },
    {
      title: 'Business Analytics',
      telugu: 'వ్యాపార విశ్లేషణ',
      desc: 'Revenue trends, profit & SQL reports',
      icon: TrendingUp,
      path: '/app/analytics',
      badge: 'Visual BI',
    },
  ];

  const dateFilterOptions = [
    { label: 'Today', value: 'today' },
    { label: '7 Days', value: '7d' },
    { label: '30 Days', value: '30d' },
    { label: '3 Months', value: '3m' },
    { label: '1 Year', value: '1y' },
  ];

  // Chart Data fallback
  const chartData = data.recent_sales_trend && data.recent_sales_trend.length > 0
    ? data.recent_sales_trend
    : [
        { day_name: 'Mon', revenue: 14200, sales_count: 18 },
        { day_name: 'Tue', revenue: 18500, sales_count: 24 },
        { day_name: 'Wed', revenue: 16100, sales_count: 21 },
        { day_name: 'Thu', revenue: 22400, sales_count: 31 },
        { day_name: 'Fri', revenue: 26800, sales_count: 38 },
        { day_name: 'Sat', revenue: 34500, sales_count: 49 },
        { day_name: 'Sun', revenue: 31200, sales_count: 42 },
      ];

  return (
    <div className="flex-1 w-full p-3 sm:p-5 lg:p-6 bg-[#F8F5ED] min-h-screen">
      
      {/* ============================================================== */}
      {/* CONCEPT 04 SIGNATURE TWO-PANEL SPLIT-PANE DESKTOP ARCHITECTURE */}
      {/* Panel 2 (Center: Voice & Activity Feed) + Panel 3 (Right: Operational Workspace) */}
      {/* ============================================================== */}
      <div className="flex flex-col lg:flex-row gap-5 items-start w-full max-w-[1700px] mx-auto">
        
        {/* ========================================================== */}
        {/* PANEL 2: DEDICATED CENTER VOICE & ACTIVITY FEED (~33% lg) */}
        {/* ========================================================== */}
        <section className="w-full lg:w-[35%] xl:w-[32%] shrink-0 space-y-4">
          
          {/* Panel Header */}
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-sm font-black text-[#28332C] uppercase tracking-wider flex items-center gap-1.5">
                <Mic className="w-4 h-4 text-[#52745F]" />
                Voice & Activity Feed
              </h2>
              <p className="text-[11px] text-[#7D887F]">Live Speech & Store Event Stream</p>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#EDF5EF] border border-[#E5E9E3] text-[10px] font-bold text-[#52745F]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3C9970] animate-pulse" />
              <span>Prisma STT</span>
            </div>
          </div>

          {/* CARD DECK 1: VOICE ASSISTANT CARD (7 STATES) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#EDF5EF] border border-[#E5E9E3] shadow-xs relative overflow-hidden space-y-4">
            
            {/* Top State Badge & Mascot Avatar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-white border border-[#E5E9E3] flex items-center justify-center shadow-xs">
                  <ShopkeeperMascot size={32} />
                </div>
                <div>
                  <div className="text-xs font-black text-[#28332C]">VyapariMitra Voice AI</div>
                  <div className="text-[10px] text-[#52745F] font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#C77B52]" />
                    <span>Gnani Sovereign Multilingual</span>
                  </div>
                </div>
              </div>

              {/* Status Pill based on voiceState */}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                voiceState === 'LISTENING'
                  ? 'bg-[#FEE2E2] text-[#DC2626] border-[#FCA5A5] animate-pulse'
                  : voiceState === 'TRANSCRIBING' || voiceState === 'EXECUTING'
                  ? 'bg-[#FEF3C7] text-[#D97706] border-[#FCD34D]'
                  : voiceState === 'SPEAKING'
                  ? 'bg-[#E4EFE6] text-[#3C9970] border-[#A7F3D0]'
                  : 'bg-white text-[#52745F] border-[#E5E9E3]'
              }`}>
                {voiceState === 'READY' && '● Ready'}
                {voiceState === 'LISTENING' && '🎙️ Listening...'}
                {voiceState === 'TRANSCRIBING' && '⚙️ Transcribing...'}
                {voiceState === 'EXECUTING' && '⚡ Executing SQL...'}
                {voiceState === 'SPEAKING' && '🔊 Speaking...'}
                {voiceState === 'SUCCESS' && '✓ Success'}
                {voiceState === 'ERROR' && '✕ Error'}
              </span>
            </div>

            {/* Central Terracotta Concentric Microphone Button */}
            <div className="flex flex-col items-center justify-center py-2 space-y-2">
              <div className="relative flex items-center justify-center">
                {/* Concentric Pulse Rings when recording */}
                {voiceState === 'LISTENING' && (
                  <>
                    <div className="absolute w-24 h-24 rounded-full bg-[#C77B52]/20 animate-ping pointer-events-none" />
                    <div className="absolute w-20 h-20 rounded-full bg-[#C77B52]/30 animate-pulse pointer-events-none" />
                  </>
                )}

                <button
                  onClick={voiceState === 'LISTENING' ? handleStopRecording : handleStartRecording}
                  disabled={voiceState === 'TRANSCRIBING' || voiceState === 'EXECUTING'}
                  className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-md transition-all active:scale-95 cursor-pointer z-10 ${
                    voiceState === 'LISTENING'
                      ? 'bg-[#D96C70] ring-4 ring-[#D96C70]/30 animate-bounce'
                      : 'bg-[#C77B52] hover:bg-[#B66A42] ring-4 ring-[#C77B52]/20 hover:scale-105'
                  }`}
                  title={voiceState === 'LISTENING' ? 'Click to Stop & Execute' : 'Click to Speak'}
                >
                  <Mic className="w-8 h-8 font-black" />
                </button>
              </div>

              <div className="text-center">
                <span className="text-xs font-bold text-[#28332C]">
                  {voiceState === 'LISTENING' ? 'Tap to Stop & Run' : 'Hold or Tap to Speak'}
                </span>
                <span className="block text-[10px] text-[#7D887F]">
                  Supports Telugu (తెలుగు) & Indian English
                </span>
              </div>

              {/* Reactive Waveform Bars */}
              <div className="flex items-center gap-1 h-5 pt-1">
                {[0.4, 0.8, 1.0, 0.6, 0.9, 0.5, 0.7].map((bar, i) => (
                  <span
                    key={i}
                    className={`w-1 rounded-full transition-all duration-150 ${
                      voiceState === 'LISTENING' || voiceState === 'SPEAKING'
                        ? 'bg-[#C77B52]'
                        : 'bg-[#789B82]/40'
                    }`}
                    style={{
                      height:
                        voiceState === 'LISTENING'
                          ? `${Math.max(4, bar * audioLevel * 24)}px`
                          : voiceState === 'SPEAKING'
                          ? `${Math.max(4, bar * 18)}px`
                          : '5px',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Spoken Transcript & Execution Result Display */}
            {spokenTranscript && (
              <div className="p-2.5 rounded-xl bg-white border border-[#E5E9E3] space-y-1 text-xs">
                <div className="text-[10px] font-bold text-[#7D887F] uppercase tracking-wider flex items-center justify-between">
                  <span>Recognized Spoken Utterance</span>
                  <span className="text-[#52745F] font-semibold">{lastVoiceResponse?.detected_language || language}</span>
                </div>
                <div className="text-[#28332C] font-semibold">"{spokenTranscript}"</div>

                {lastVoiceResponse?.natural_response && (
                  <div className="pt-2 border-t border-[#E5E9E3]/70 flex items-start gap-2">
                    <Volume2 className="w-4 h-4 text-[#C77B52] shrink-0 mt-0.5" />
                    <div className="flex-1 text-[11px] text-[#52745F] font-medium">
                      {lastVoiceResponse.natural_response}
                    </div>
                    {lastVoiceResponse.spoken_audio_base64 && (
                      <button
                        onClick={() =>
                          playSpokenAudio(
                            lastVoiceResponse.spoken_audio_base64,
                            lastVoiceResponse.natural_response,
                            lastVoiceResponse.detected_language
                          )
                        }
                        className="px-2 py-1 text-[10px] font-bold rounded-lg bg-[#EDF5EF] text-[#52745F] hover:bg-[#E4EFE6] cursor-pointer"
                        title="Replay Voice Response"
                      >
                        Replay 🔊
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Error Message */}
            {voiceError && (
              <div className="p-2 rounded-lg bg-[#FEE2E2] border border-[#FCA5A5] text-[11px] text-[#DC2626] flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{voiceError}</span>
              </div>
            )}

            {/* Modal Trigger Link */}
            <div className="pt-1 text-center">
              <button
                onClick={() => triggerVoiceModal && triggerVoiceModal()}
                className="text-[11px] font-bold text-[#52745F] hover:text-[#28332C] underline decoration-[#789B82]"
              >
                Open Full Voice Studio & Dialog Preview &rarr;
              </button>
            </div>
          </div>

          {/* CARD DECK 2: SUGGESTED SPOKEN COMMAND CHIPS */}
          <div className="p-4 rounded-2xl bg-white border border-[#E5E9E3] shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase text-[#7D887F] tracking-wider">
                Instant Voice Commands
              </span>
              <span className="text-[10px] text-[#52745F] font-bold">1-Click Trigger</span>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {[
                {
                  te: 'ఈరోజు అమ్మకాలు ఎంత?',
                  en: "Show today's sales summary",
                },
                {
                  te: '10 ప్యాకెట్లు బిస్కెట్లు స్టాక్ లో చేర్చు',
                  en: 'Add 10 packets Parle-G biscuits',
                },
                {
                  te: 'తక్కువగా ఉన్న వస్తువులు చూపించు',
                  en: 'Check low-stock products',
                },
                {
                  te: 'రమేష్ నుండి 500 నగదు నమోదు చేయి',
                  en: 'Record ₹500 cash from Ramesh',
                },
              ].map((cmd, idx) => (
                <button
                  key={idx}
                  onClick={() => handleExecuteQuickVoice(cmd.te)}
                  className="w-full text-left p-2 rounded-xl bg-[#F8F5ED] hover:bg-[#EDF5EF] border border-[#E5E9E3] transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <div className="truncate pr-2">
                    <div className="text-xs font-bold text-[#28332C] group-hover:text-[#52745F]">
                      {cmd.te}
                    </div>
                    <div className="text-[10px] text-[#7D887F]">{cmd.en}</div>
                  </div>
                  <Mic className="w-3.5 h-3.5 text-[#789B82] group-hover:text-[#C77B52] shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* CARD DECK 3: CHRONOLOGICAL LIVE ACTIVITY STREAM */}
          <div className="p-4 rounded-2xl bg-white border border-[#E5E9E3] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase text-[#7D887F] tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#52745F]" />
                Live Store Activity
              </span>
              <span className="text-[10px] font-bold text-[#3C9970] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3C9970] animate-pulse" />
                Live Stream
              </span>
            </div>

            <div className="space-y-2 max-h-[340px] overflow-y-auto sage-scrollbar pr-1">
              {activityFeed.map((act) => (
                <div
                  key={act.id}
                  className="p-2.5 rounded-xl bg-[#F8F5ED] border border-[#E5E9E3]/80 flex items-start justify-between gap-2"
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      act.type === 'sale'
                        ? 'bg-[#E4EFE6] text-[#3C9970]'
                        : act.type === 'inventory'
                        ? 'bg-[#FEF3C7] text-[#D97706]'
                        : act.type === 'voice'
                        ? 'bg-[#EDF5EF] text-[#52745F]'
                        : 'bg-[#E0F2FE] text-[#0284C7]'
                    }`}>
                      {act.type === 'sale' && <ShoppingCart className="w-3.5 h-3.5" />}
                      {act.type === 'inventory' && <Boxes className="w-3.5 h-3.5" />}
                      {act.type === 'voice' && <Mic className="w-3.5 h-3.5" />}
                      {act.type === 'order' && <Clock className="w-3.5 h-3.5" />}
                    </div>

                    <div className="min-w-0 truncate">
                      <div className="text-xs font-bold text-[#28332C] truncate">{act.title}</div>
                      <div className="text-[10px] text-[#7D887F] truncate">{act.detail}</div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {act.amount !== undefined && (
                      <div className="text-xs font-black text-[#3C9970]">
                        ₹{act.amount.toFixed(0)}
                      </div>
                    )}
                    <div className="text-[9px] text-[#7D887F]">{act.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CARD DECK 4: VOICE COMMAND HISTORY MINI-LOG */}
          {voiceHistory.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-white border border-[#E5E9E3] shadow-xs space-y-2">
              <span className="text-[10px] font-black uppercase text-[#7D887F] tracking-wider">
                Recent Voice Log
              </span>
              <div className="space-y-1.5">
                {voiceHistory.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-[#EDF5EF] text-xs flex items-center justify-between">
                    <div className="truncate pr-2">
                      <div className="font-semibold text-[#28332C] truncate">"{item.text}"</div>
                      <div className="text-[9px] text-[#7D887F]">{item.intent} &bull; {item.lang}</div>
                    </div>
                    <span className="text-[9px] font-bold text-[#52745F] bg-white px-1.5 py-0.5 rounded border border-[#E5E9E3]">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </section>

        {/* ========================================================== */}
        {/* PANEL 3: OPERATIONAL WORKSPACE (~67% lg)                   */}
        {/* ========================================================== */}
        <section className="flex-1 min-w-0 w-full space-y-5">
          
          {/* 1. OPERATIONAL WORKSPACE HEADER */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E9E3] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black text-[#28332C] tracking-tight">
                  Operational Workspace
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E4EFE6] text-[#3C9970] border border-[#789B82]/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3C9970]" />
                  <span>Store Active</span>
                </span>
                <span className="text-[10px] font-medium text-[#7D887F]">
                  {currentTime || 'Real-Time'}
                </span>
              </div>
              <p className="text-xs text-[#52745F] font-semibold mt-0.5">
                {business?.name || 'Sri Lakshmi Kirana & General Stores'} &bull; Counter 01
              </p>
            </div>

            {/* Live Simulation Controls & Refresh Bar */}
            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
              {/* Simulation Quick Toggle */}
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#EDF5EF] border border-[#E5E9E3] text-xs">
                <span className="text-[11px] font-bold text-[#52745F]">Simulation:</span>
                {simRunning ? (
                  <button
                    onClick={handleStopSimulation}
                    disabled={simLoading}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#D96C70] text-white text-[10px] font-bold hover:brightness-110 cursor-pointer"
                  >
                    <Square className="w-2.5 h-2.5" /> Stop
                  </button>
                ) : (
                  <button
                    onClick={handleStartSimulation}
                    disabled={simLoading}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#52745F] text-white text-[10px] font-bold hover:bg-[#3D5747] cursor-pointer"
                  >
                    <Play className="w-2.5 h-2.5" /> Start Live
                  </button>
                )}
                {simStats.total_sales > 0 && (
                  <button
                    onClick={handleResetSimulation}
                    className="p-1 text-[#7D887F] hover:text-[#28332C]"
                    title="Reset simulation data"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Refresh Button */}
              <button
                onClick={() => fetchDashboardData(true, selectedRange)}
                className="p-2 rounded-xl bg-white hover:bg-[#EDF5EF] border border-[#E5E9E3] text-[#52745F] transition-colors"
                title="Refresh Database Telemetry"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 2. SECTION A: 4 EXECUTIVE KPI CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            
            {/* KPI 1: Daily Revenue */}
            <div className="p-4 rounded-2xl bg-white border border-[#E5E9E3] shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#7D887F] uppercase tracking-wider">
                  Daily Revenue
                </span>
                <div className="w-7 h-7 rounded-lg bg-[#E4EFE6] text-[#3C9970] flex items-center justify-center">
                  <IndianRupee className="w-3.5 h-3.5 font-bold" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-[#28332C]">
                ₹{(data.today_sales || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
              <div className="text-[10px] text-[#3C9970] font-bold flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>+12.4% vs yesterday</span>
              </div>
            </div>

            {/* KPI 2: Order Overview */}
            <div className="p-4 rounded-2xl bg-white border border-[#E5E9E3] shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#7D887F] uppercase tracking-wider">
                  Order Overview
                </span>
                <div className="w-7 h-7 rounded-lg bg-[#EDF5EF] text-[#52745F] flex items-center justify-center">
                  <ShoppingCart className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-[#28332C]">
                {data.today_orders || 0}
                <span className="text-xs font-normal text-[#7D887F] ml-1">orders</span>
              </div>
              <div className="text-[10px] text-[#52745F] font-semibold">
                {data.pending_orders_count ?? 0} Pending Fulfillment
              </div>
            </div>

            {/* KPI 3: Inventory Overview */}
            <div className="p-4 rounded-2xl bg-white border border-[#E5E9E3] shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#7D887F] uppercase tracking-wider">
                  Active Stock
                </span>
                <div className="w-7 h-7 rounded-lg bg-[#EDF5EF] text-[#52745F] flex items-center justify-center">
                  <Boxes className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-[#28332C]">
                {data.active_products_count || 48}
                <span className="text-xs font-normal text-[#7D887F] ml-1">SKUs</span>
              </div>
              <div className="text-[10px] font-bold">
                {data.low_stock_count > 0 ? (
                  <span className="text-[#D97706] flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {data.low_stock_count} Low Stock alerts
                  </span>
                ) : (
                  <span className="text-[#3C9970]">✓ All Stock Healthy</span>
                )}
              </div>
            </div>

            {/* KPI 4: Customer Khata */}
            <div className="p-4 rounded-2xl bg-white border border-[#E5E9E3] shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#7D887F] uppercase tracking-wider">
                  Customer Khata
                </span>
                <div className="w-7 h-7 rounded-lg bg-[#EDF5EF] text-[#52745F] flex items-center justify-center">
                  <Users className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-[#28332C]">
                {customerCount || 28}
                <span className="text-xs font-normal text-[#7D887F] ml-1">Khata</span>
              </div>
              <div className="text-[10px] text-[#7D887F] font-semibold">
                Avg Ticket: ₹{data.average_order_value || 245}
              </div>
            </div>

          </div>

          {/* 3. SECTION B: SALES ANALYTICS & REVENUE TRENDS WITH 5 FILTERS */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E9E3] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-black text-[#28332C] uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-[#52745F]" />
                  Sales Analytics & Revenue Trends
                </h3>
                <p className="text-[11px] text-[#7D887F]">Continuous real-time database transactions</p>
              </div>

              {/* 5 Date Filter Tabs */}
              <div className="flex items-center gap-1 p-1 bg-[#EDF5EF] rounded-xl border border-[#E5E9E3]">
                {dateFilterOptions.map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setSelectedRange(filter.value)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      selectedRange === filter.value
                        ? 'bg-white text-[#28332C] shadow-xs'
                        : 'text-[#7D887F] hover:text-[#28332C]'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Recharts Area Chart */}
            <div className="h-56 sm:h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="sageGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#789B82" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#EDF5EF" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="day_name"
                    tick={{ fontSize: 11, fill: '#7D887F' }}
                    axisLine={{ stroke: '#E5E9E3' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#7D887F' }}
                    axisLine={{ stroke: '#E5E9E3' }}
                    tickLine={false}
                    tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E5E9E3',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                      fontSize: '12px',
                      color: '#28332C',
                    }}
                    formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Revenue']}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#52745F"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#sageGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 4. SECTION C: 6 QUICK BUSINESS ACTION CARDS */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-[#28332C] uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-[#C77B52]" />
                Operational Actions
              </h3>
              <span className="text-[11px] text-[#7D887F] font-semibold">Touch & Voice Ready</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {quickActionCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.title}
                    onClick={() => navigate(card.path)}
                    className="p-3.5 rounded-2xl bg-white hover:bg-[#EDF5EF]/60 border border-[#E5E9E3] hover:border-[#789B82] transition-all cursor-pointer shadow-xs hover:shadow-sm group flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-9 h-9 rounded-xl bg-[#EDF5EF] text-[#52745F] group-hover:bg-[#52745F] group-hover:text-white flex items-center justify-center transition-colors">
                        <Icon className="w-4 h-4 font-bold" />
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        card.isAlert
                          ? 'bg-[#FEF3C7] text-[#D97706] border-[#FCD34D]'
                          : 'bg-[#EDF5EF] text-[#52745F] border-[#E5E9E3]'
                      }`}>
                        {card.badge}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-[#28332C] group-hover:text-[#52745F] transition-colors">
                        {card.title}
                      </div>
                      <div className="text-[10px] text-[#7D887F]">
                        {card.telugu} &bull; {card.desc}
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-[#E5E9E3]/60 flex items-center justify-between text-[10px] font-bold text-[#52745F]">
                      <span>Open Module</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. SECTION D: REAL-TIME INVENTORY MONITOR */}
          <div className="p-4 rounded-2xl bg-white border border-[#E5E9E3] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black text-[#28332C] uppercase tracking-wider flex items-center gap-1.5">
                  <Boxes className="w-4 h-4 text-[#52745F]" />
                  Real-Time Inventory Monitor
                </h3>
                <p className="text-[11px] text-[#7D887F]">Critical product stock balances</p>
              </div>
              <button
                onClick={() => navigate('/app/inventory')}
                className="text-xs font-bold text-[#52745F] hover:text-[#28332C] flex items-center gap-1"
              >
                View Full Stock &rarr;
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E5E9E3] text-[#7D887F] text-[10px] uppercase font-bold">
                    <th className="pb-2">Product</th>
                    <th className="pb-2">Category</th>
                    <th className="pb-2">Current Stock</th>
                    <th className="pb-2">Price</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E9E3]/60">
                  {(topProducts.length > 0 ? topProducts : [
                    { id: '1', name: 'Sona Masoori Rice 25kg', category_name: 'Grains', current_stock: 45, unit: 'bags', selling_price: 1350, low_stock_threshold: 10 },
                    { id: '2', name: 'Ashirvaad Whole Wheat Atta 5kg', category_name: 'Atta & Flours', current_stock: 6, unit: 'packets', selling_price: 245, low_stock_threshold: 10 },
                    { id: '3', name: 'Freedom Sunflower Oil 1L', category_name: 'Edible Oils', current_stock: 28, unit: 'pouches', selling_price: 135, low_stock_threshold: 15 },
                    { id: '4', name: 'Tata Salt Crystal 1kg', category_name: 'Spices & Essentials', current_stock: 4, unit: 'packets', selling_price: 28, low_stock_threshold: 15 },
                    { id: '5', name: 'Toor Dal Premium 1kg', category_name: 'Pulses', current_stock: 35, unit: 'kg', selling_price: 165, low_stock_threshold: 10 },
                  ]).map((item: any) => {
                    const isLow = item.current_stock <= (item.low_stock_threshold || 10);
                    const isOut = item.current_stock <= 0;
                    return (
                      <tr key={item.id} className="hover:bg-[#F8F5ED]/60 transition-colors">
                        <td className="py-2.5 font-bold text-[#28332C]">
                          {item.name}
                          {item.telugu_name && (
                            <span className="block text-[10px] text-[#7D887F] font-normal">{item.telugu_name}</span>
                          )}
                        </td>
                        <td className="py-2.5 text-[#7D887F]">{item.category_name || 'Grocery'}</td>
                        <td className="py-2.5 font-semibold text-[#28332C]">
                          {item.current_stock} {item.unit}
                        </td>
                        <td className="py-2.5 font-bold text-[#28332C]">₹{item.selling_price}</td>
                        <td className="py-2.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isOut
                              ? 'bg-[#FEE2E2] text-[#DC2626]'
                              : isLow
                              ? 'bg-[#FEF3C7] text-[#D97706]'
                              : 'bg-[#E4EFE6] text-[#3C9970]'
                          }`}>
                            {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => navigate('/app/inventory')}
                            className="px-2 py-1 rounded bg-[#EDF5EF] hover:bg-[#E4EFE6] text-[#52745F] text-[10px] font-bold"
                          >
                            + Restock
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 6. SECTION E: RECENT TRANSACTIONS (LIVE SALES TABLE) */}
          <div className="p-4 rounded-2xl bg-white border border-[#E5E9E3] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black text-[#28332C] uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-[#52745F]" />
                  Recent Sales Transactions
                </h3>
                <p className="text-[11px] text-[#7D887F]">Database recorded invoices</p>
              </div>
              <button
                onClick={() => navigate('/app/billing')}
                className="text-xs font-bold text-[#52745F] hover:text-[#28332C] flex items-center gap-1"
              >
                Go to POS Billing &rarr;
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E5E9E3] text-[#7D887F] text-[10px] uppercase font-bold">
                    <th className="pb-2">Invoice</th>
                    <th className="pb-2">Customer</th>
                    <th className="pb-2">Items</th>
                    <th className="pb-2">Payment</th>
                    <th className="pb-2">Amount</th>
                    <th className="pb-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E9E3]/60">
                  {(recentSales.length > 0 ? recentSales : [
                    { id: 's1', invoice_number: 'INV-1092', customer_name: 'Walk-in Customer', payment_method: 'UPI', total_amount: 345, status: 'completed', items: [{}, {}] },
                    { id: 's2', invoice_number: 'INV-1091', customer_name: 'Suresh Kumar', payment_method: 'Cash', total_amount: 780, status: 'completed', items: [{}, {}, {}] },
                    { id: 's3', invoice_number: 'INV-1090', customer_name: 'Ramesh Reddy', payment_method: 'Khata', total_amount: 1250, status: 'completed', items: [{}] },
                    { id: 's4', invoice_number: 'INV-1089', customer_name: 'Anitha Devi', payment_method: 'UPI', total_amount: 490, status: 'completed', items: [{}, {}] },
                  ]).map((sale: any) => (
                    <tr key={sale.id} className="hover:bg-[#F8F5ED]/60 transition-colors">
                      <td className="py-2.5 font-mono font-bold text-[#52745F]">
                        #{sale.invoice_number || 'INV-000'}
                      </td>
                      <td className="py-2.5 font-semibold text-[#28332C]">
                        {sale.customer_name || 'Walk-in Customer'}
                      </td>
                      <td className="py-2.5 text-[#7D887F]">
                        {sale.items?.length || 2} items
                      </td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EDF5EF] text-[#52745F]">
                          {sale.payment_method || 'Cash'}
                        </span>
                      </td>
                      <td className="py-2.5 font-black text-[#28332C]">
                        ₹{Number(sale.total_amount).toFixed(0)}
                      </td>
                      <td className="py-2.5 text-right">
                        <span className="text-[10px] font-bold text-[#3C9970] bg-[#E4EFE6] px-2 py-0.5 rounded-full">
                          ✓ Completed
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </section>

      </div>
    </div>
  );
};

export default Dashboard;
