import React from 'react';
import { VoiceProcessResponse } from '../types';
import { CheckCircle2, AlertTriangle, HelpCircle, Volume2, ArrowRight, XCircle } from 'lucide-react';

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
  const { intent, action_status, natural_response, execution_result, model_info } = response;
  const isExecuted = action_status === 'EXECUTED';
  const isConfirmationRequired = action_status === 'CONFIRMATION_REQUIRED';
  const isAmbiguous = action_status === 'AMBIGUOUS';
  const isRejected = action_status === 'REJECTED';

  const getIntentBadge = () => {
    switch (intent.intent) {
      case 'inventory_sale':
        return { label: 'Sale Transaction / అమ్మకం', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
      case 'inventory_add':
        return { label: 'Stock Restock / చేర్చడం', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
      case 'check_stock':
        return { label: 'Stock Inquiry / నిల్వ సమాచారం', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
      case 'price_inquiry':
        return { label: 'Price Inquiry / ధర సమాచారం', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' };
      case 'daily_summary':
        return { label: 'Daily Summary / రోజువారీ సారాంశం', color: 'bg-teal-500/20 text-teal-300 border-teal-500/30' };
      default:
        return { label: 'General Voice Input', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' };
    }
  };

  const badge = getIntentBadge();

  return (
    <div className="glass-panel p-5 rounded-2xl border border-slate-700/60 shadow-xl space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${badge.color}`}>
          {badge.label}
        </span>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Confidence:</span>
          <span className="font-mono text-emerald-400 font-bold">{(intent.confidence * 100).toFixed(0)}%</span>
        </div>
      </div>

      {/* Transcription Quote */}
      <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
        <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">Recognized Utterance (Gnani Prisma)</p>
        <p className="text-sm font-medium text-slate-200 italic">"{response.transcription}"</p>
      </div>

      {/* Structured Details Box */}
      {intent.product_name && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-800/40 rounded-xl border border-slate-800/80 text-xs">
          <div>
            <span className="text-slate-400 block">Product</span>
            <span className="font-semibold text-slate-100">{intent.product_name}</span>
          </div>
          <div>
            <span className="text-slate-400 block">Quantity</span>
            <span className="font-semibold text-emerald-400">{intent.quantity} {intent.unit}</span>
          </div>
          {execution_result?.total_amount !== undefined && (
            <div>
              <span className="text-slate-400 block">Total Value</span>
              <span className="font-bold text-teal-300 font-mono">₹{execution_result.total_amount.toFixed(2)}</span>
            </div>
          )}
          {execution_result?.new_stock !== undefined && (
            <div className="col-span-2 sm:col-span-3 pt-2 border-t border-slate-700/50 flex items-center justify-between">
              <span className="text-slate-400">Inventory Balance After Action:</span>
              <span className="font-mono font-bold text-emerald-400">
                {execution_result.new_stock} {intent.unit}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Natural Response & Voice Feedback */}
      <div className="p-3 bg-emerald-950/20 border border-emerald-800/40 rounded-xl flex items-start gap-3">
        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 shrink-0">
          <Volume2 className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wider text-emerald-400 font-semibold mb-1">
            Voice Response (Gnani Timbre TTS)
          </p>
          <p className="text-sm text-slate-200">{natural_response}</p>
        </div>
        {onPlayAudio && response.spoken_audio_base64 && (
          <button
            onClick={onPlayAudio}
            className="px-2.5 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg border border-emerald-500/30 flex items-center gap-1.5 transition-colors"
          >
            <Volume2 className="w-3.5 h-3.5" /> Replay
          </button>
        )}
      </div>

      {/* Warnings & Alerts */}
      {isRejected && (
        <div className="p-3 bg-red-950/30 border border-red-800/40 rounded-xl flex items-center gap-2.5 text-red-300 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Transaction was blocked due to insufficient inventory. No stock was deducted.</span>
        </div>
      )}

      {isAmbiguous && (
        <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl flex items-center gap-2.5 text-amber-300 text-xs">
          <HelpCircle className="w-4 h-4 shrink-0" />
          <span>Could not match product or quantity clearly. Please re-speak with item name and quantity.</span>
        </div>
      )}

      {/* Action Decision Buttons */}
      {!isExecuted && !isRejected && (
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-2 px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-all flex items-center justify-center gap-2"
          >
            <XCircle className="w-4 h-4" /> Cancel / రద్దు
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 py-2 px-4 rounded-xl text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" /> {isLoading ? 'Processing...' : 'Confirm & Execute / నిర్ధారించండి'}
          </button>
        </div>
      )}

      {isExecuted && (
        <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
          <span className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Transaction successfully committed to ledger
          </span>
          <span className="text-[10px] text-slate-400 font-mono">{response.command_id.slice(0, 8)}</span>
        </div>
      )}
    </div>
  );
};

