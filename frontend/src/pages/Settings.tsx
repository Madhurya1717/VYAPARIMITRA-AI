import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { SupportedLanguage } from '../types';
import {
  Settings as SettingsIcon, Store, Globe, Key, ShieldCheck,
  CheckCircle2, AlertCircle, Save, ExternalLink, Sparkles
} from 'lucide-react';
import { ShopkeeperMascot } from '../components/Illustrations';

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
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto w-full bg-[#F8F5ED]">
      
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#28332C] tracking-tight flex items-center gap-2">
            Store & Voice AI Settings
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#E4EFE6] text-[#3C9970] border border-[#789B82]/30">
              Preferences
            </span>
          </h1>
          <p className="text-xs text-[#7D887F] font-medium mt-0.5">
            Manage merchant information, language presets, and inspect sovereign Gnani AI service connectivity.
          </p>
        </div>
        <ShopkeeperMascot size={48} className="hidden sm:inline-block shrink-0" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Store Profile Form */}
        <div className="md:col-span-2 bg-white p-5 sm:p-6 rounded-2xl border border-[#E5E9E3] space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5 border-b border-[#E5E9E3] pb-3">
            <div className="w-8 h-8 rounded-xl bg-[#EDF5EF] text-[#52745F] flex items-center justify-center font-bold">
              <Store className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-[#28332C]">Merchant Store Profile</h2>
          </div>

          {savedSuccess && (
            <div className="p-3 bg-[#E4EFE6] border border-[#789B82]/40 rounded-xl text-xs text-[#3C9970] font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#3C9970]" />
              <span>Store profile and language preferences updated successfully!</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-[#7D887F] block mb-1">Store / Business Name</label>
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full bg-[#F8F5ED] border border-[#E5E9E3] rounded-xl px-3 py-2 text-xs text-[#28332C] font-bold focus:outline-none focus:border-[#789B82]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#7D887F] block mb-1">Owner Full Name</label>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full bg-[#F8F5ED] border border-[#E5E9E3] rounded-xl px-3 py-2 text-xs text-[#28332C] font-bold focus:outline-none focus:border-[#789B82]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-[#7D887F] block mb-1">Mobile Contact Phone</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#F8F5ED] border border-[#E5E9E3] rounded-xl px-3 py-2 text-xs text-[#28332C] font-bold focus:outline-none focus:border-[#789B82]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#7D887F] block mb-1">GSTIN (Optional)</label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  className="w-full bg-[#F8F5ED] border border-[#E5E9E3] rounded-xl px-3 py-2 text-xs text-[#28332C] font-bold focus:outline-none focus:border-[#789B82]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#7D887F] block mb-1">Store Address</label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-[#F8F5ED] border border-[#E5E9E3] rounded-xl px-3 py-2 text-xs text-[#28332C] font-medium focus:outline-none focus:border-[#789B82]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#7D887F] block mb-1">Default Voice Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
                className="w-full bg-[#F8F5ED] border border-[#E5E9E3] rounded-xl px-3 py-2 text-xs text-[#28332C] font-bold focus:outline-none focus:border-[#789B82]"
              >
                <option value="te-IN">తెలుగు (Telugu - Gnani Prisma & Timbre)</option>
                <option value="en-IN">Indian English</option>
                <option value="indic-auto">Tenglish (Telugu-English Code-Mixed)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-[#52745F] hover:bg-[#3D5747] text-white font-black text-xs shadow-xs transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </form>
        </div>

        {/* Right Col: Gnani AI Connection Inspector */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E5E9E3] space-y-4 text-xs flex flex-col justify-between shadow-xs">
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 border-b border-[#E5E9E3] pb-3">
              <ShieldCheck className="w-4 h-4 text-[#3C9970]" />
              <h3 className="font-bold text-[#28332C] text-sm">Gnani AI Status</h3>
            </div>

            <div className="space-y-2.5">
              <div className="p-3 bg-[#EDF5EF] rounded-xl border border-[#E5E9E3] space-y-1">
                <span className="text-[10px] text-[#7D887F] font-bold uppercase tracking-wider block">
                  Prisma STT Endpoint
                </span>
                <span className="text-xs font-mono text-[#52745F] break-all font-bold">
                  {healthInfo?.gnani_stt_endpoint || 'https://api.vachana.ai/stt/v3'}
                </span>
              </div>

              <div className="p-3 bg-[#EDF5EF] rounded-xl border border-[#E5E9E3] space-y-1">
                <span className="text-[10px] text-[#7D887F] font-bold uppercase tracking-wider block">
                  Timbre TTS Endpoint
                </span>
                <span className="text-xs font-mono text-[#52745F] break-all font-bold">
                  {healthInfo?.gnani_tts_endpoint || 'https://api.vachana.ai/api/v1/tts/inference'}
                </span>
              </div>

              <div className="p-3 bg-[#EDF5EF] rounded-xl border border-[#E5E9E3] flex items-center justify-between">
                <span className="text-[#28332C] font-semibold">Live API Key:</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  healthInfo?.gnani_api_key_configured
                    ? 'bg-[#E4EFE6] text-[#3C9970]'
                    : 'bg-[#FEF3C7] text-[#D97706]'
                }`}>
                  {healthInfo?.gnani_api_key_configured ? 'Active Key' : 'Simulation Mode'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-[#7D887F] leading-relaxed">
              To connect your live Gnani credentials, set <code className="text-[#52745F] font-mono font-bold">GNANI_API_KEY</code> in <code className="text-[#28332C] font-mono font-bold">backend/.env</code>.
            </p>
          </div>

          <a
            href="https://app.gnani.ai/voice"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 rounded-xl bg-[#EDF5EF] hover:bg-[#E4EFE6] text-[#52745F] border border-[#E5E9E3] flex items-center justify-center gap-2 transition-all text-xs font-bold cursor-pointer"
          >
            <span>Open Gnani Voice Console</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#52745F]" />
          </a>
        </div>

      </div>

    </div>
  );
};

export default Settings;
