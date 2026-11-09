import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { audioRecorder } from '../services/audio';
import { audioPlayer } from '../services/audioPlayer';
import { VoiceProcessResponse, VoiceCommandLog, SupportedLanguage } from '../types';
import { WaveformVisualizer } from '../components/WaveformVisualizer';
import { ActionPreviewCard } from '../components/ActionPreviewCard';
import {
  Mic, MicOff, Volume2, Globe, Send, Sparkles, CheckCircle2,
  AlertCircle, History, Clock, ArrowRight, ShieldCheck, RefreshCw, Zap
} from 'lucide-react';
import { ShopkeeperMascot } from '../components/Illustrations';

export const VoiceWorkspace: React.FC = () => {
  const { language, setLanguage } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0.2);
  const [textCommand, setTextCommand] = useState('');
  const [activeResponse, setActiveResponse] = useState<VoiceProcessResponse | null>(null);
  const [historyLogs, setHistoryLogs] = useState<VoiceCommandLog[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return audioPlayer.subscribe((playing) => {
      setIsSpeaking(playing);
    });
  }, []);

  const fetchHistory = async () => {
    try {
      const logs = await api.getVoiceHistory();
      setHistoryLogs(logs);
    } catch (err) {
      console.error('Failed to fetch voice history:', err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const sampleUtterances = [
    {
      title: 'Telugu Kirana Sale',
      text: 'ఈరోజు 10 కిలోల బియ్యం అమ్మాను.',
      lang: 'te-IN' as SupportedLanguage,
      meaning: 'Sold 10 kg rice today',
    },
    {
      title: 'English Counter Sale',
      text: 'I sold 10 kilograms of rice today.',
      lang: 'en-IN' as SupportedLanguage,
      meaning: 'Standard 10 kg rice deduction',
    },
    {
      title: 'Tenglish Code-Mixed',
      text: 'Today 10 kilos rice sell chesanu.',
      lang: 'indic-auto' as SupportedLanguage,
      meaning: 'Colloquial shopkeeper phrase',
    },
    {
      title: 'Financial Profit (Telugu)',
      text: 'ఈరోజు లాభం ఎంత వచ్చింది?',
      lang: 'te-IN' as SupportedLanguage,
      meaning: "Calculate today's profit in Telugu",
    },
    {
      title: 'Monthly Profit & Loss',
      text: 'What is my total profit this month?',
      lang: 'en-IN' as SupportedLanguage,
      meaning: 'Financial report for current month',
    },
    {
      title: 'Customer Footfall Inquiry',
      text: 'How many customers visited today?',
      lang: 'en-IN' as SupportedLanguage,
      meaning: 'Unique customer count and AOV',
    },
    {
      title: 'Inventory Stock Check',
      text: 'బియ్యం స్టాక్ ఎంత ఉంది?',
      lang: 'te-IN' as SupportedLanguage,
      meaning: 'Check current rice stock level',
    },
    {
      title: 'Period Comparison',
      text: 'Compare this month vs last month',
      lang: 'en-IN' as SupportedLanguage,
      meaning: 'Compare sales and profit between two months',
    },
  ];

  const handleStartRecording = async () => {
    setErrorMsg(null);
    setActiveResponse(null);
    const success = await audioRecorder.startRecording((lvl) => {
      setAudioLevel(lvl);
    });
    if (success) {
      setIsRecording(true);
    } else {
      setErrorMsg('Microphone access blocked. Please enable browser permissions.');
    }
  };

  const handleStopRecording = async () => {
    setIsRecording(false);
    setIsProcessing(true);
    try {
      const audioBlob = await audioRecorder.stopRecording();
      if (!audioBlob) throw new Error('No audio recorded.');

      const res = await api.processVoiceCommand({
        audioBlob,
        languageCode: language,
        executeTransaction: false, // Preview first for verification
      });

      setActiveResponse(res);
      playAudio(res.spoken_audio_base64, res.natural_response, res.detected_language);
      await fetchHistory();
    } catch (err: any) {
      setErrorMsg(err.message || 'Speech processing failed. Please retry.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendText = async (customText?: string) => {
    const textToSend = customText || textCommand;
    if (!textToSend.trim()) return;

    setErrorMsg(null);
    setIsProcessing(true);
    setActiveResponse(null);

    try {
      const res = await api.processVoiceCommand({
        transcriptionText: textToSend,
        languageCode: language,
        executeTransaction: false,
      });

      setActiveResponse(res);
      playAudio(res.spoken_audio_base64, res.natural_response, res.detected_language);
      setTextCommand('');
      await fetchHistory();
    } catch (err: any) {
      setErrorMsg(err.message || 'Command processing failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmTransaction = async () => {
    if (!activeResponse) return;
    setIsProcessing(true);
    try {
      const confirmed = await api.processVoiceCommand({
        transcriptionText: activeResponse.transcription,
        languageCode: activeResponse.detected_language,
        executeTransaction: true,
      });
      setActiveResponse(confirmed);
      playAudio(confirmed.spoken_audio_base64, confirmed.natural_response, confirmed.detected_language);
      await fetchHistory();
    } catch (err: any) {
      alert(err.message || 'Failed to execute confirmed transaction.');
    } finally {
      setIsProcessing(false);
    }
  };

  const playAudio = (base64Str?: string, naturalText?: string, detectedLang?: string) => {
    audioPlayer.playSpokenAudio({
      audioBase64: base64Str,
      text: naturalText || activeResponse?.natural_response,
      language: detectedLang || activeResponse?.detected_language || language,
    });
  };

  const pipelineStates = [
    { id: '1', label: '1. Audio Capture', active: isRecording },
    { id: '2', label: '2. Prisma STT', active: isProcessing },
    { id: '3', label: '3. Intent NLU', active: Boolean(activeResponse?.intent) },
    { id: '4', label: '4. SQL Execution', active: activeResponse?.action_status === 'EXECUTED' },
    { id: '5', label: '5. Timbre TTS', active: Boolean(activeResponse?.spoken_audio_base64) },
    { id: '6', label: '6. Live Synced', active: Boolean(activeResponse?.action_status === 'EXECUTED') },
  ];

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full bg-[#F8F5ED]">
      
      {/* Title Header with Mascot & Language Pills */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#EDF5EF] border border-[#E5E9E3] flex items-center justify-center shrink-0">
            <ShopkeeperMascot size={36} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-[#28332C] tracking-tight">
                Voice Studio & Dialect Assistant
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#E4EFE6] text-[#3C9970] border border-[#789B82]/30">
                Gnani AI Sovereign
              </span>
            </div>
            <p className="text-xs text-[#7D887F] font-medium mt-0.5">
              Natural Indian voice processing with continuous speech recognition and neural speech synthesis for Bharat.
            </p>
          </div>
        </div>

        {/* Language selector toggle pills */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-[#E5E9E3] self-start md:self-auto shadow-xs">
          {[
            { code: 'te-IN' as SupportedLanguage, label: 'తెలుగు (Telugu)' },
            { code: 'en-IN' as SupportedLanguage, label: 'English' },
            { code: 'indic-auto' as SupportedLanguage, label: 'Tenglish (Code-Mixed)' },
          ].map((langOpt) => (
            <button
              key={langOpt.code}
              onClick={() => setLanguage(langOpt.code)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                language === langOpt.code
                  ? 'bg-[#52745F] text-white shadow-xs'
                  : 'text-[#7D887F] hover:text-[#28332C]'
              }`}
            >
              {langOpt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pipeline Status Indicator Strip */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 bg-white p-2.5 rounded-2xl border border-[#E5E9E3] shadow-xs">
        {pipelineStates.map((st) => (
          <div
            key={st.id}
            className={`py-1.5 px-2 rounded-xl text-[10px] font-bold text-center transition-all ${
              st.active
                ? 'bg-[#52745F] text-white shadow-xs'
                : 'bg-[#F8F5ED] text-[#7D887F] border border-[#E5E9E3]'
            }`}
          >
            {st.label}
          </div>
        ))}
      </div>

      {/* Central Interactive Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Interactive Voice Panel */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Mint Surface Voice Card */}
          <div className="bg-[#EDF5EF] p-8 rounded-3xl border border-[#E5E9E3] shadow-xs text-center space-y-6 relative overflow-hidden">
            
            {/* Live Audio Visualizer */}
            <div className="w-full max-w-md mx-auto">
              <WaveformVisualizer
                isRecording={isRecording}
                isProcessing={isProcessing}
                isSpeaking={isSpeaking}
                audioLevel={audioLevel}
              />
            </div>

            {/* Central Animated Microphone Action with Terracotta Accent */}
            <div className="relative flex items-center justify-center py-2">
              {isRecording ? (
                <>
                  <div className="absolute w-40 h-40 rounded-full border-2 border-[#C77B52]/40 animate-ping opacity-75" />
                  <div className="absolute w-32 h-32 rounded-full border border-[#C77B52]/60 animate-pulse" />
                </>
              ) : (
                <div className="absolute w-32 h-32 rounded-full border border-[#789B82]/20 animate-pulse" />
              )}

              <button
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                disabled={isProcessing}
                className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all z-10 shadow-md ${
                  isRecording
                    ? 'bg-[#DC2626] text-white animate-pulse'
                    : 'bg-[#C77B52] hover:bg-[#B66A42] text-white hover:scale-105'
                } disabled:opacity-50 cursor-pointer`}
              >
                {isRecording ? (
                  <MicOff className="w-9 h-9" />
                ) : (
                  <Mic className="w-9 h-9 font-bold" />
                )}
              </button>
            </div>

            <div className="space-y-1">
              <div className="text-base font-extrabold text-[#28332C]">
                {isRecording
                  ? 'Listening to spoken command... Click to finish'
                  : isProcessing
                  ? 'Transcribing with Gnani Prisma & Synthesizing...'
                  : 'Click microphone and speak naturally'}
              </div>
              <p className="text-xs text-[#7D887F]">
                Supports Telugu numerals (పది, యాభై), units (కేజీ, లీటర్), and transliterations.
              </p>
            </div>

            {/* Text Input Row */}
            <div className="w-full max-w-lg mx-auto flex items-center gap-2 pt-2">
              <input
                type="text"
                value={textCommand}
                onChange={(e) => setTextCommand(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
                placeholder="Or type a test command (e.g. 'ఈరోజు 10 కిలోల బియ్యం అమ్మాను')..."
                className="flex-1 bg-white border border-[#E5E9E3] rounded-2xl px-4 py-2.5 text-xs text-[#28332C] placeholder-[#7D887F] focus:outline-none focus:border-[#789B82]"
              />
              <button
                onClick={() => handleSendText()}
                disabled={!textCommand.trim() || isProcessing}
                className="p-2.5 rounded-2xl bg-[#52745F] hover:bg-[#3D5747] text-white disabled:opacity-40 transition-all shadow-xs cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="w-full max-w-lg mx-auto p-3 bg-[#FEE2E2] border border-[#FCA5A5] rounded-2xl text-xs text-[#DC2626] flex items-center justify-between gap-2 text-left">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
                <button
                  onClick={handleStartRecording}
                  className="px-2.5 py-1 bg-white hover:bg-red-50 text-[#DC2626] border border-red-300 rounded-lg text-[11px] font-bold shrink-0 transition-colors cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}

          </div>

          {/* Structured Action Preview Card */}
          {activeResponse && (
            <ActionPreviewCard
              response={activeResponse}
              onConfirm={handleConfirmTransaction}
              onCancel={() => setActiveResponse(null)}
              onPlayAudio={() =>
                playAudio(
                  activeResponse.spoken_audio_base64,
                  activeResponse.natural_response,
                  activeResponse.detected_language
                )
              }
              isLoading={isProcessing}
            />
          )}

          {/* Quick Example Scenarios Grid */}
          <div className="bg-white p-5 rounded-2xl border border-[#E5E9E3] space-y-3 shadow-xs">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#28332C] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C77B52]" />
              Verified Challenge Test Utterances
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {sampleUtterances.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendText(item.text)}
                  disabled={isProcessing}
                  className="p-3 rounded-xl border border-[#E5E9E3] hover:border-[#789B82] bg-[#F8F5ED] hover:bg-[#EDF5EF] text-left transition-all space-y-1 group shadow-xs cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-[#52745F] border border-[#E5E9E3]">
                      {item.title}
                    </span>
                    <ArrowRight className="w-3 h-3 text-[#7D887F] group-hover:text-[#52745F] group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-xs font-bold text-[#28332C]">{item.text}</p>
                  <p className="text-[10px] text-[#7D887F]">{item.meaning}</p>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Voice History & Sovereignty Metrics */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Gnani Architecture Specifications Box */}
          <div className="bg-white p-5 rounded-2xl border border-[#E5E9E3] space-y-3 text-xs shadow-xs">
            <div className="flex items-center justify-between border-b border-[#E5E9E3] pb-2.5">
              <span className="font-black text-[#28332C] flex items-center gap-2 text-sm">
                <ShieldCheck className="w-4 h-4 text-[#3C9970]" />
                Gnani AI Sovereign Stack
              </span>
              <span className="text-[10px] font-mono text-[#3C9970] font-bold px-2.5 py-0.5 rounded-full bg-[#E4EFE6] border border-[#789B82]/30">
                ● Live & Operational
              </span>
            </div>
            <div className="space-y-2 text-[#28332C]">
              <div className="flex justify-between items-center py-1 border-b border-[#E5E9E3]/60">
                <span className="text-[#7D887F] font-medium">Speech-to-Text:</span>
                <span className="font-bold text-[#28332C]">Gnani Prisma v3.0 / v2.5</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[#E5E9E3]/60">
                <span className="text-[#7D887F] font-medium">Text-to-Speech:</span>
                <span className="font-bold text-[#28332C]">Gnani Timbre v2.5 (Nalini)</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-[#E5E9E3]/60">
                <span className="text-[#7D887F] font-medium">Audio Format:</span>
                <span className="font-bold text-[#52745F]">16kHz 16-bit PCM WAV</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-[#7D887F] font-medium">Financial Safety:</span>
                <span className="font-bold text-[#3C9970]">Idempotent UUID Commits</span>
              </div>
            </div>
          </div>

          {/* Voice Command Log Feed */}
          <div className="bg-white p-5 rounded-2xl border border-[#E5E9E3] space-y-3 shadow-xs">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#E5E9E3]">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#52745F]" />
                <h3 className="text-sm font-black text-[#28332C]">Recent Utterance Logs</h3>
              </div>
              <button
                onClick={fetchHistory}
                className="text-xs text-[#7D887F] hover:text-[#28332C] transition-colors p-1"
                title="Refresh logs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-[#E5E9E3]/60 max-h-[460px] overflow-y-auto sage-scrollbar space-y-2 pr-1">
              {historyLogs.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#7D887F]">
                  No voice commands logged yet. Speak or type a command to see it recorded here!
                </div>
              ) : (
                historyLogs.map((log) => (
                  <div key={log.id} className="pt-2.5 pb-2 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-[#52745F] uppercase tracking-wide">
                        {log.intent}
                      </span>
                      <span className="text-[#7D887F] font-mono text-[10px]">
                        {log.latency_ms.toFixed(0)} ms
                      </span>
                    </div>
                    <div className="p-2 bg-[#F8F5ED] rounded-xl border border-[#E5E9E3] text-xs text-[#28332C] font-semibold italic">
                      "{log.transcription}"
                    </div>
                    <p className="text-[11px] text-[#7D887F]">{log.response_text}</p>
                    <div className="flex items-center justify-between text-[10px] text-[#7D887F] pt-0.5">
                      <span className="uppercase font-mono">Lang: {log.detected_language}</span>
                      <span className="font-mono text-[#3C9970] font-bold">
                        {log.is_confirmed ? '✓ Confirmed' : 'Pending'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default VoiceWorkspace;
