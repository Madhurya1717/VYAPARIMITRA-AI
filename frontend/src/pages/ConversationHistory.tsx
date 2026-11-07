import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { VoiceCommandLog } from '../types';
import {
  History, Mic, CheckCircle2, Clock, Globe, Filter,
  Search, ShieldCheck, RefreshCw, Volume2
} from 'lucide-react';

export const ConversationHistory: React.FC = () => {
  const [logs, setLogs] = useState<VoiceCommandLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await api.getVoiceHistory();
      setLogs(data);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const filtered = logs.filter(l =>
    l.transcription.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.intent.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.response_text && l.response_text.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Voice Command Logs & Audit Trail
          </h1>
          <p className="text-xs text-slate-400">
            Every audio interaction, transcription hypothesis, extracted intent, and latency breakdown.
          </p>
        </div>

        <button
          onClick={fetchHistory}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Logs
        </button>
      </div>

      {/* Search Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center gap-3 w-full sm:w-96">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter logs by speech words, intent, or response..."
          className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
        />
      </div>

      {/* Log Feed Table */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/40 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Time & ID</th>
                <th className="py-3.5 px-4">Speech Utterance (Prisma STT)</th>
                <th className="py-3.5 px-4">Intent</th>
                <th className="py-3.5 px-4">Spoken Response (Timbre TTS)</th>
                <th className="py-3.5 px-4 text-center">Confidence</th>
                <th className="py-3.5 px-4 text-right">Latency</th>
                <th className="py-3.5 px-4 text-center">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No voice command logs match your filter.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      <div>{new Date(log.created_at).toLocaleTimeString()}</div>
                      <div className="text-[9px] text-slate-400">{log.id.slice(0, 8)}</div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-100 max-w-xs">
                      <div className="italic">"{log.transcription}"</div>
                      <div className="text-[10px] text-slate-400 font-mono uppercase mt-0.5">
                        Lang: {log.detected_language}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        {log.intent}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 max-w-sm truncate text-[11px]">
                      {log.response_text || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-400">
                      {(log.confidence * 100).toFixed(0)}%
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-200">
                      {log.latency_ms.toFixed(0)} ms
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        log.is_confirmed
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {log.is_confirmed ? 'Executed' : 'Previewed'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

