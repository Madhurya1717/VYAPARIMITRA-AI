import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { VoiceCommandLog } from '../types';
import {
  History, Mic, CheckCircle2, Clock, Globe, Filter,
  Search, ShieldCheck, RefreshCw, Volume2, Sparkles
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
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full bg-[#F8F5ED]">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#28332C] tracking-tight flex items-center gap-2">
            Voice Command Logs & Audit Trail
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#E4EFE6] text-[#3C9970] border border-[#789B82]/30">
              {logs.length} Utterances
            </span>
          </h1>
          <p className="text-xs text-[#7D887F] font-medium mt-0.5">
            Every audio interaction, transcription hypothesis, extracted intent, and latency breakdown.
          </p>
        </div>

        <button
          onClick={fetchHistory}
          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-[#EDF5EF] text-[#28332C] border border-[#E5E9E3] flex items-center gap-2 self-start sm:self-auto shadow-xs transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#52745F]" /> Refresh Logs
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-[#E5E9E3] flex items-center gap-3 w-full sm:w-96 shadow-xs">
        <Search className="w-4 h-4 text-[#52745F]" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter logs by speech words, intent, or response..."
          className="w-full bg-transparent text-xs text-[#28332C] placeholder-[#7D887F] focus:outline-none font-medium"
        />
      </div>

      {/* Log Feed Table */}
      <div className="bg-white rounded-2xl border border-[#E5E9E3] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E5E9E3] bg-[#EDF5EF] text-[#52745F] font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Time & ID</th>
                <th className="py-3 px-4">Speech Utterance (Prisma STT)</th>
                <th className="py-3 px-4">Intent</th>
                <th className="py-3 px-4">Spoken Response (Timbre TTS)</th>
                <th className="py-3 px-4 text-center">Confidence</th>
                <th className="py-3 px-4 text-right">Latency</th>
                <th className="py-3 px-4 text-center">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E9E3]/60 text-[#28332C]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#7D887F] font-medium">
                    No voice command logs match your filter.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F8F5ED]/50 transition-colors">
                    <td className="py-3 px-4 text-[#7D887F] font-mono text-[11px]">
                      <div className="font-bold text-[#28332C]">{new Date(log.created_at).toLocaleTimeString()}</div>
                      <div className="text-[9px] text-[#7D887F] font-mono">{log.id.slice(0, 8)}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#28332C]">
                      "{log.transcription}"
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EDF5EF] text-[#52745F] uppercase">
                        {log.intent}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#7D887F] text-[11px]">
                      {log.response_text || '—'}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-xs">
                      {((log.confidence || 0.95) * 100).toFixed(0)}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[11px] text-[#7D887F]">
                      {log.latency_ms.toFixed(0)} ms
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                        log.is_confirmed
                          ? 'bg-[#E4EFE6] text-[#3C9970]'
                          : 'bg-[#FEF3C7] text-[#D97706]'
                      }`}>
                        {log.is_confirmed ? '✓ Confirmed' : 'Query Only'}
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

export default ConversationHistory;
