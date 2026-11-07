import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { audioRecorder } from '../services/audio';
import { VoiceProcessResponse } from '../types';
import { WaveformVisualizer } from './WaveformVisualizer';
import { ActionPreviewCard } from './ActionPreviewCard';
import {
  Mic, MicOff, X, Send, Sparkles, Volume2, Globe, Check, AlertCircle, RefreshCw
} from 'lucide-react';

interface GlobalVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransactionCompleted?: () => void;
}

export const GlobalVoiceModal: React.FC<GlobalVoiceModalProps> = ({
  isOpen,
  onClose,
  onTransactionCompleted,
}) => {
  const { language } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0.2);
  const [inputText, setInputText] = useState('');
  const [lastResponse, setLastResponse] = useState<VoiceProcessResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  if (!isOpen) return null;

  const quickPhrases = [
    { text: 'ఈరోజు 10 కిలోల బియ్యం అమ్మాను', label: 'Telugu: 10kg Rice Sale', lang: 'te-IN' },
    { text: 'I sold 10 kilograms of rice today', label: 'English: 10kg Rice Sale', lang: 'en-IN' },
    { text: 'Today 10 kilos rice sell chesanu', label: 'Tenglish: 10kg Rice Sale', lang: 'te-IN' },
    { text: 'బియ్యం స్టాక్ ఎంత ఉంది?', label: 'Check Rice Stock', lang: 'te-IN' },
    { text: 'ఈరోజు అమ్మకాలు ఎంత?', label: 'Today\'s Sales Summary', lang: 'te-IN' },
  ];

  const handleStartRecording = async () => {
    setErrorMsg(null);
    setLastResponse(null);
    const success = await audioRecorder.startRecording((level) => {
      setAudioLevel(level);
    });
    if (success) {
      setIsRecording(true);
    } else {
      setErrorMsg('Could not access microphone. Please check browser permissions.');
    }
  };

  const handleStopRecording = async () => {
    setIsRecording(false);
    setIsProcessing(true);
    try {
      const audioBlob = await audioRecorder.stopRecording();
      if (!audioBlob) {
        throw new Error('No audio was recorded.');
      }

      const res = await api.processVoiceCommand({
        audioBlob,
        languageCode: language,
        executeTransaction: false, // First preview for confirmation
      });

      setLastResponse(res);
      playSpokenAudio(res.spoken_audio_base64);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to process voice command.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendText = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    setErrorMsg(null);
    setIsProcessing(true);
    try {
      const res = await api.processVoiceCommand({
        transcriptionText: text,
        languageCode: language,
        executeTransaction: false,
      });

      setLastResponse(res);
      playSpokenAudio(res.spoken_audio_base64);
      setInputText('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to process voice command.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmTransaction = async () => {
    if (!lastResponse) return;
    setIsProcessing(true);
    try {
      const res = await api.processVoiceCommand({
        transcriptionText: lastResponse.transcription,
        languageCode: lastResponse.detected_language,
        executeTransaction: true, // Now commit to database!
      });

      setLastResponse(res);
      playSpokenAudio(res.spoken_audio_base64);
      if (onTransactionCompleted) {
        onTransactionCompleted();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to execute transaction.');
    } finally {
      setIsProcessing(false);
    }
  };

  const playSpokenAudio = (base64Audio?: string) => {
    if (!base64Audio) return;
    try {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = base64Audio;
        audioPlayerRef.current.play().catch(e => console.warn('Audio auto-play prevented:', e));
      }
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <audio ref={audioPlayerRef} className="hidden" />

      <div className="relative w-full max-w-xl glass-panel bg-slate-900/95 border border-slate-700/80 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20">
              <Mic className="w-5 h-5 font-bold" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Voice Assistant Workspace
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Prisma v3.0 & Timbre
                </span>
              </h3>
              <p className="text-xs text-slate-400">Speak in Telugu, English or Tenglish</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Audio Visualizer */}
        <div className="space-y-3">
          <WaveformVisualizer
            isRecording={isRecording}
            isProcessing={isProcessing}
            isSpeaking={false}
            audioLevel={audioLevel}
          />

          {/* Central Animated Microphone Button */}
          <div className="flex flex-col items-center justify-center py-4 space-y-3">
            <button
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              disabled={isProcessing}
              className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-2xl ${
                isRecording
                  ? 'bg-rose-500 text-white animate-pulse shadow-rose-500/50 scale-105'
                  : 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 hover:scale-105 shadow-emerald-500/30'
              } disabled:opacity-50`}
            >
              {isRecording ? (
                <MicOff className="w-8 h-8 animate-bounce" />
              ) : (
                <Mic className="w-8 h-8 font-bold" />
              )}
              {isRecording && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500"></span>
                </span>
              )}
            </button>
            <span className="text-xs font-semibold text-slate-300">
              {isRecording
                ? 'Listening... Click again to stop & process'
                : isProcessing
                ? 'Transcribing & Analyzing with Gnani AI...'
                : 'Click microphone to speak'}
            </span>
          </div>
        </div>

        {/* Quick Example Utterance Chips */}
        <div>
          <p className="text-[11px] font-semibold text-slate-400 mb-2 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" /> Quick Voice Test Commands
          </p>
          <div className="flex flex-wrap gap-2">
            {quickPhrases.map((phrase, i) => (
              <button
                key={i}
                onClick={() => handleSendText(phrase.text)}
                disabled={isRecording || isProcessing}
                className="text-xs px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-emerald-300 border border-slate-700/60 transition-all flex items-center gap-1.5"
              >
                <span>{phrase.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Text Input Fallback */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
            placeholder="Or type command (e.g. 'ఈరోజు 10 కిలోల బియ్యం అమ్మాను')..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={() => handleSendText()}
            disabled={!inputText.trim() || isProcessing}
            className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 disabled:opacity-40 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 bg-rose-950/40 border border-rose-800/50 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Structured Action Preview Card */}
        {lastResponse && (
          <ActionPreviewCard
            response={lastResponse}
            onConfirm={handleConfirmTransaction}
            onCancel={() => setLastResponse(null)}
            onPlayAudio={() => playSpokenAudio(lastResponse.spoken_audio_base64)}
            isLoading={isProcessing}
          />
        )}
      </div>
    </div>
  );
};

