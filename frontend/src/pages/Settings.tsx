import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { SupportedLanguage } from '../types';
import {
  Settings as SettingsIcon, Store, Globe, Key, ShieldCheck,
  CheckCircle2, AlertCircle, Save, ExternalLink
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { business, language, setLanguage, refreshProfile } = useAuth();
  const [storeName, setStoreName] = useState(business?.name || '');
  const [ownerName, setOwnerName] = useState(business?.owner_name || '');
  const [phone, setPhone] = useState(business?.phone || '');
  const [address, setAddress] = useState(business?.address || '');
  const [gstin, setGstin] = useState(business?.gstin || '');
  
  const [healthInfo, setHealthInfo] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const data = await api.checkHealth();
        setHealthInfo(data);
      } catch (err) {
        // silent
      }
    };
    fetchHealth();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.updateBusiness({
        name: storeName,
        owner_name: ownerName,
        phone,
        address,
        gstin,
        preferred_language: language,
      });
      await refreshProfile();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update store settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto w-full">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          Store & Voice AI Settings
        </h1>
        <p className="text-xs text-slate-400">
          Manage merchant information, language presets, and inspect sovereign Gnani AI service connectivity.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Store Profile Form */}
        <div className="md:col-span-2 glass-panel p-6 rounded-3xl border border-slate-800 space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Store className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Merchant Store Profile</h2>
          </div>

          {savedSuccess && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Store profile and language preferences updated successfully!</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Store / Business Name</label>
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Owner Full Name</label>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Mobile Contact Phone</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">GSTIN (Optional)</label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Store Address</label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Default Voice Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="te-IN">తెలుగు (Telugu - Gnani Prisma & Timbre)</option>
                <option value="en-IN">Indian English</option>
                <option value="te-en">Tenglish (Telugu-English Code-Mixed)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </form>
        </div>

        {/* Right Col: Gnani AI Connection Inspector */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4 text-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-white text-sm">Gnani AI Status</h3>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                  Prisma STT Endpoint
                </span>
                <span className="text-xs font-mono text-emerald-400 break-all">
                  {healthInfo?.gnani_stt_endpoint || 'https://api.vachana.ai/stt/v3'}
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                  Timbre TTS Endpoint
                </span>
                <span className="text-xs font-mono text-teal-400 break-all">
                  {healthInfo?.gnani_tts_endpoint || 'https://api.vachana.ai/api/v1/tts/inference'}
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
                <span className="text-slate-300 font-medium">Live API Key in .env:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  healthInfo?.gnani_api_key_configured
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {healthInfo?.gnani_api_key_configured ? 'Active Key' : 'Simulation Mode'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              To connect your live Gnani challenge credentials, set <code className="text-emerald-300 font-mono">GNANI_API_KEY</code> in <code className="text-slate-300 font-mono">backend/.env</code> and restart the backend.
            </p>
          </div>

          <a
            href="https://app.gnani.ai/voice"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-1.5 transition-colors text-xs font-semibold"
          >
            <span>Open Gnani Voice Console</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

      </div>

    </div>
  );
};
