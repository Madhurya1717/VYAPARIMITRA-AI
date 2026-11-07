import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { audioRecorder } from '../services/audio';
import { VoiceProcessResponse, VoiceCommandLog, SupportedLanguage } from '../types';
import { WaveformVisualizer } from '../components/WaveformVisualizer';
import { ActionPreviewCard } from '../components/ActionPreviewCard';
import {
  Mic, MicOff, Volume2, Globe, Send, Sparkles, CheckCircle2,
  AlertCircle, History, Clock, ArrowRight, ShieldCheck, RefreshCw
} from 'lucide-react';

export const VoiceWorkspace: React.FC = () => {
  const { language, setLanguage } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0.2);
  const [textCommand, setTextCommand] = useState('');
  const [activeResponse, setActiveResponse] = useState<VoiceProcessResponse | null>(null);
  const [historyLogs, setHistoryLogs] = useState<VoiceCommandLog[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
      meaning: 'Sold 10 kg rice today'
    },
    {
      title: 'English Counter Sale',
      text: 'I sold 10 kilograms of rice today.',
      lang: 'en-IN' as SupportedLanguage,
      meaning: 'Standard 10 kg rice deduction'
    },
    {
      title: 'Tenglish Code-Mixed',
      text: 'Today 10 kilos rice sell chesanu.',
      lang: 'te-en' as SupportedLanguage,
      meaning: 'Colloquial shopkeeper phrase'
    },
    {
      title: 'Stock Add / Restock',
      text: 'స్టాక్ లో 50 కిలోల కందిపప్పు చేర్చండి',
      lang: 'te-IN' as SupportedLanguage,
      meaning: 'Restock 50 kg Toor Dal'
    },
    {
      title: 'Inventory Inquiry',
      text: 'బియ్యం స్టాక్ ఎంత ఉంది?',
      lang: 'te-IN' as SupportedLanguage,
      meaning: 'Check current rice stock level'
    },
    {
      title: 'Daily Business Summary',
      text: 'ఈరోజు అమ్మకాలు ఎంత?',
      lang: 'te-IN' as SupportedLanguage,
      meaning: 'Check today\'s sales and revenue'
    }
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
      if (!audioBlob) throw new Error('No audio detected');

      const res = await api.processVoiceCommand({
        audioBlob,
        languageCode: language,
        executeTransaction: false, // Preview first
      });

      setActiveResponse(res);
      playAudio(res.spoken_audio_base64);
      fetchHistory();
    } catch (err: any) {
      setErrorMsg(err.message || 'Voice transcription failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendText = async (customText?: string) => {
    const text = customText || textCommand;
    if (!text.trim()) return;

    setErrorMsg(null);
    setIsProcessing(true);
    try {
      const res = await api.processVoiceCommand({
        transcriptionText: text,
        languageCode: language,
        executeTransaction: false,
      });

      setActiveResponse(res);
      playAudio(res.spoken_audio_base64);
      setTextCommand('');
      fetchHistory();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to process command.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmTransaction = async () => {
    if (!activeResponse) return;
    setIsProcessing(true);
    try {
      const res = await api.processVoiceCommand({
        transcriptionText: activeResponse.transcription,
        languageCode: activeResponse.detected_language,
        executeTransaction: true, // Execute and commit!
      });

      setActiveResponse(res);
      playAudio(res.spoken_audio_base64);
      fetchHistory();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to execute transaction.');
    } finally {
      setIsProcessing(false);
    }
  };

  const playAudio = (b64?: string) => {
    if (!b64 || !audioRef.current) return;
    audioRef.current.src = b64;
    audioRef.current.play().catch(e => console.warn('Audio auto-play notice:', e));
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      <audio ref={audioRef} className="hidden" />

      {/* Header Studio Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Multilingual Voice AI Studio
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Prisma v3.0 & Timbre v2.5
            </span>
          </h1>
          <p className="text-xs text-slate-400">
            Natural voice processing with continuous speech recognition and neural speech synthesis for Bharat.
          </p>
        </div>

        {/* Language selector toggle pills */}
        <div className="flex items-center gap-2 bg-slate-900/80 p-1 rounded-2xl border border-slate-800 self-start md:self-auto">
          {[
            { code: 'te-IN' as SupportedLanguage, label: 'తెలుగు (Telugu)' },
            { code: 'en-IN' as SupportedLanguage, label: 'English' },
            { code: 'te-en' as SupportedLanguage, label: 'Tenglish (Mix)' },
          ].map(langOpt => (
            <button
              key={langOpt.code}
              onClick={() => setLanguage(langOpt.code)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                language === langOpt.code
                  ? 'bg-emerald-400 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {langOpt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Central Interactive Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Interactive Voice Panel */}
        <div className="lg:col-span-7 space-y-5">
          
          <div className="glass-panel p-8 rounded-3xl border border-slate-800 relative overflow-hidden shadow-2xl flex flex-col items-center justify-center text-center space-y-6">
            
            {/* Live Audio Visualizer */}
            <div className="w-full max-w-md">
              <WaveformVisualizer
                isRecording={isRecording}
                isProcessing={isProcessing}
                isSpeaking={false}
                audioLevel={audioLevel}
              />
            </div>

            {/* Central Animated Microphone Action */}
            <div className="relative">
              <button
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                disabled={isProcessing}
                className={`relative w-28 h-28 rounded-full flex items-center justify-center transition-all shadow-2xl ${
                  isRecording
                    ? 'bg-rose-500 text-white animate-pulse shadow-rose-500/50 scale-110'
                    : 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 hover:scale-105 shadow-emerald-500/30'
                } disabled:opacity-50`}
              >
                {isRecording ? (
                  <MicOff className="w-10 h-10 animate-bounce" />
                ) : (
                  <Mic className="w-10 h-10 font-bold" />
                )}
                {isRecording && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-5 w-5 bg-rose-500"></span>
                  </span>
                )}
              </button>
            </div>

            <div className="space-y-1">
              <div className="text-sm font-bold text-white">
                {isRecording
                  ? 'Listening to spoken command... Click to finish'
                  : isProcessing
                  ? 'Transcribing with Gnani Prisma & Synthesizing...'
                  : 'Click microphone and speak naturally'}
              </div>
              <p className="text-xs text-slate-400">
                Supports Telugu numerals (పది, యాభై), units (కేజీ, లీటర్), and transliterations.
              </p>
            </div>

            {/* Text Input Row */}
            <div className="w-full max-w-lg flex items-center gap-2 pt-2">
              <input
                type="text"
                value={textCommand}
                onChange={(e) => setTextCommand(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
                placeholder="Or type a test command (e.g. 'ఈరోజు 10 కిలోల బియ్యం అమ్మాను')..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={() => handleSendText()}
                disabled={!textCommand.trim() || isProcessing}
                className="p-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 disabled:opacity-40 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="w-full max-w-lg p-3 bg-rose-950/40 border border-rose-800/50 rounded-xl text-xs text-rose-300 flex items-center gap-2 text-left">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

          </div>

          {/* Structured Action Preview Card */}
          {activeResponse && (
            <ActionPreviewCard
              response={activeResponse}
              onConfirm={handleConfirmTransaction}
              onCancel={() => setActiveResponse(null)}
              onPlayAudio={() => playAudio(activeResponse.spoken_audio_base64)}
              isLoading={isProcessing}
            />
          )}

          {/* Quick Example Scenarios Grid */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Verified Challenge Test Utterances
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {sampleUtterances.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendText(item.text)}
                  disabled={isProcessing}
                  className="p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-left transition-all space-y-1 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">
                      {item.title}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-xs font-semibold text-slate-200">{item.text}</p>
                  <p className="text-[11px] text-slate-400">{item.meaning}</p>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Voice History & Sovereignty Metrics */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Gnani Architecture Specifications Box */}
          <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Gnani AI Sovereign Stack
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10">
                Active
              </span>
            </div>
            <div className="space-y-2 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Speech-to-Text:</span>
                <span className="font-semibold text-slate-200">Gnani Prisma v3.0 / v2.5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Text-to-Speech:</span>
                <span className="font-semibold text-slate-200">Gnani Timbre v2.5 (Nalini)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Format Handling:</span>
                <span className="font-semibold text-slate-200">16kHz 16-bit PCM WAV / WebM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Financial Safety:</span>
                <span className="font-semibold text-emerald-400">Idempotent UUID Commits</span>
              </div>
            </div>
          </div>

          {/* Voice Command Log Feed */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-bold text-white">Recent Utterance Logs</h3>
              </div>
              <button
                onClick={fetchHistory}
                className="text-xs text-slate-400 hover:text-emerald-400 transition-colors p-1"
                title="Refresh logs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-800/80 max-h-[500px] overflow-y-auto space-y-2">
              {historyLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No voice commands logged yet. Speak or type a command to see it recorded here!
                </div>
              ) : (
                historyLogs.map((log) => (
                  <div key={log.id} className="pt-3 pb-2 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-emerald-400 uppercase tracking-wide">
                        {log.intent}
                      </span>
                      <span className="text-slate-400 font-mono text-[10px]">
                        {log.latency_ms.toFixed(0)} ms
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 font-medium italic">"{log.transcription}"</p>
                    <p className="text-[11px] text-slate-400">{log.response_text}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span className="uppercase">Lang: {log.detected_language}</span>
                      <span className="font-mono text-emerald-400">
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
