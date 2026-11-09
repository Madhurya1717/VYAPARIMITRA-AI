import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { audioRecorder } from '../services/audio';
import { audioPlayer } from '../services/audioPlayer';
import { VoiceProcessResponse } from '../types';
import { WaveformVisualizer } from './WaveformVisualizer';
import { ActionPreviewCard } from './ActionPreviewCard';
import {
  Mic, MicOff, X, Send, Sparkles, Volume2, Globe, Check, AlertCircle, RefreshCw, Zap
} from 'lucide-react';
import { ShopkeeperMascot } from './Illustrations';

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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0.2);
  const [inputText, setInputText] = useState('');
  const [lastResponse, setLastResponse] = useState<VoiceProcessResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsubscribe = audioPlayer.subscribe((playing) => {
      setIsSpeaking(playing);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Auto-scroll when response is received so user sees confirmation card immediately
  useEffect(() => {
    if (lastResponse && previewRef.current) {
      setTimeout(() => {
        previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }, [lastResponse]);

  if (!isOpen) return null;

  const quickPhrases = [
    { text: 'ఈరోజు 10 కిలోల బియ్యం అమ్మాను', label: 'Telugu: 10kg Rice Sale', lang: 'te-IN' },
    { text: 'I sold 10 kilograms of rice today', label: 'English: 10kg Rice Sale', lang: 'en-IN' },
    { text: 'Today 10 kilos rice sell chesanu', label: 'Tenglish: 10kg Rice Sale', lang: 'te-IN' },
    { text: 'ఈరోజు లాభం ఎంత?', label: "Today's Profit / లాభం", lang: 'te-IN' },
    { text: 'What is my total profit this month?', label: 'Monthly Profit', lang: 'en-IN' },
    { text: 'How many customers visited today?', label: "Today's Customers", lang: 'en-IN' },
    { text: 'బియ్యం స్టాక్ ఎంత ఉంది?', label: 'Check Rice Stock', lang: 'te-IN' },
    { text: 'Compare this month vs last month', label: 'Compare Months', lang: 'en-IN' },
  ];

  const handleModalClose = () => {
    audioPlayer.stopAudio();
    onClose();
  };

  const playSpokenAudio = (base64Audio?: string, naturalText?: string, detectedLang?: string) => {
    audioPlayer.playSpokenAudio({
      audioBase64: base64Audio,
      text: naturalText,
      language: detectedLang || language,
    });
  };

  const handleStartRecording = async () => {
    setErrorMsg(null);
    setLastResponse(null);
    audioPlayer.stopAudio();
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
        throw new Error('No audio was captured. Please speak into your microphone and try again.');
      }

      const res = await api.processVoiceCommand({
        audioBlob,
        languageCode: language,
        executeTransaction: false, // First preview for confirmation
      });

      setLastResponse(res);
      playSpokenAudio(res.spoken_audio_base64, res.natural_response, res.detected_language);
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
    audioPlayer.stopAudio();
    try {
      const res = await api.processVoiceCommand({
        transcriptionText: text,
        languageCode: language,
        executeTransaction: false,
      });

      setLastResponse(res);
      playSpokenAudio(res.spoken_audio_base64, res.natural_response, res.detected_language);
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
    audioPlayer.stopAudio();
    try {
      const res = await api.processVoiceCommand({
        transcriptionText: lastResponse.transcription,
        languageCode: lastResponse.detected_language,
        executeTransaction: true,
      });

      setLastResponse(res);
      playSpokenAudio(res.spoken_audio_base64, res.natural_response, res.detected_language);
      if (onTransactionCompleted) {
        onTransactionCompleted();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to execute transaction.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity">
      <div className="relative w-full max-w-lg bg-white border border-[#E5E9E3] rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5E9E3] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EDF5EF] border border-[#E5E9E3] flex items-center justify-center">
              <ShopkeeperMascot size={32} />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#28332C] flex items-center gap-2">
                Voice Assistant Workspace
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E4EFE6] text-[#3C9970] border border-[#789B82]/30">
                  Prisma & Timbre
                </span>
              </h3>
              <p className="text-xs text-[#7D887F]">Speak in Telugu, English or Tenglish naturally</p>
            </div>
          </div>
          <button
            onClick={handleModalClose}
            className="p-1.5 rounded-xl text-[#7D887F] hover:text-[#28332C] hover:bg-[#EDF5EF] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Audio Mint Surface Card */}
        <div className="rounded-2xl p-5 bg-[#EDF5EF] border border-[#E5E9E3] space-y-3 text-center">
          <WaveformVisualizer
            isRecording={isRecording}
            isProcessing={isProcessing}
            isSpeaking={isSpeaking}
            audioLevel={audioLevel}
          />

          <div className="flex flex-col items-center justify-center py-1 space-y-2">
            <div className="relative flex items-center justify-center">
              {isRecording && (
                <div className="absolute w-28 h-28 rounded-full border-2 border-[#C77B52]/40 animate-ping opacity-75" />
              )}

              <button
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                disabled={isProcessing}
                className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all z-10 shadow-md ${
                  isRecording
                    ? 'bg-[#DC2626] text-white animate-pulse'
                    : 'bg-[#C77B52] hover:bg-[#B66A42] text-white hover:scale-105'
                } disabled:opacity-50 cursor-pointer`}
              >
                {isRecording ? (
                  <MicOff className="w-8 h-8" />
                ) : (
                  <Mic className="w-8 h-8 font-bold" />
                )}
              </button>
            </div>

            <span className="text-xs font-bold text-[#28332C]">
              {isRecording
                ? 'Listening... Click to finish'
                : isProcessing
                ? 'Processing with Gnani Prisma & Timbre...'
                : isSpeaking
                ? 'Speaking response in Telugu...'
                : 'Click microphone to start speaking'}
            </span>
          </div>
        </div>

        {/* Quick Example Utterance Chips */}
        <div>
          <p className="text-[10px] font-bold text-[#7D887F] mb-1.5 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#C77B52]" /> Quick Voice Test Commands
          </p>
          <div className="flex flex-wrap gap-1.5">
            {quickPhrases.map((phrase, i) => (
              <button
                key={i}
                onClick={() => handleSendText(phrase.text)}
                disabled={isRecording || isProcessing}
                className="text-[11px] px-3 py-1 rounded-xl bg-[#F8F5ED] hover:bg-[#EDF5EF] text-[#28332C] hover:text-[#52745F] border border-[#E5E9E3] transition-all font-semibold cursor-pointer"
              >
                {phrase.label}
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
            className="flex-1 bg-[#F8F5ED] border border-[#E5E9E3] rounded-xl px-3.5 py-2.5 text-xs text-[#28332C] placeholder-[#7D887F] focus:outline-none focus:border-[#789B82]"
          />
          <button
            onClick={() => handleSendText()}
            disabled={!inputText.trim() || isProcessing}
            className="p-2.5 rounded-xl bg-[#52745F] hover:bg-[#3D5747] text-white disabled:opacity-40 transition-all shadow-xs cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-[#FEE2E2] border border-[#FCA5A5] rounded-xl text-xs text-[#DC2626] font-medium flex items-center justify-between gap-2">
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

        {lastResponse && (
          <div ref={previewRef} className="pt-2">
            <ActionPreviewCard
              response={lastResponse}
              onConfirm={handleConfirmTransaction}
              onCancel={() => {
                audioPlayer.stopAudio();
                setLastResponse(null);
              }}
              onPlayAudio={() =>
                playSpokenAudio(
                  lastResponse.spoken_audio_base64,
                  lastResponse.natural_response,
                  lastResponse.detected_language
                )
              }
              isLoading={isProcessing}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalVoiceModal;
