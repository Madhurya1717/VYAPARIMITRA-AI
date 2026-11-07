import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { SupportedLanguage, NotificationItem } from '../types';
import { api } from '../services/api';
import {
  Store, Globe, Mic, Bell, LogOut, ChevronDown, Check,
  Radio, ShieldCheck, Sparkles, AlertCircle
} from 'lucide-react';

interface NavbarProps {
  onOpenVoiceModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenVoiceModal }) => {
  const { business, user, language, setLanguage, logout } = useAuth();
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const notifs = await api.getNotifications();
        setNotifications(notifs);
        setUnreadCount(notifs.filter(n => !n.is_read).length);
      } catch (err) {
        // quiet catch
      }
    };
    fetchNotifs();
  }, []);

  const languageOptions: { code: SupportedLanguage; label: string; sub: string }[] = [
    { code: 'te-IN', label: 'తెలుగు', sub: 'Telugu (Prisma + Timbre)' },
    { code: 'en-IN', label: 'English', sub: 'Indian English' },
    { code: 'te-en', label: 'Tenglish', sub: 'Code-Mixed (తెలుగు + Eng)' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand & Store Name */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/20">
              <Mic className="w-5 h-5 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold tracking-tight text-white">VYAPARIMITRA</span>
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  AI
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                Your Business. Your Voice. Your Language.
              </p>
            </div>
          </div>

          {business && (
            <div className="hidden md:flex items-center gap-2 pl-4 border-l border-slate-800">
              <Store className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-slate-300 max-w-[200px] truncate">
                {business.name}
              </span>
            </div>
          )}
        </div>

        {/* Action Controls & Badges */}
        <div className="flex items-center gap-3">
          
          {/* Gnani Engine Live Badge */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-slate-900 rounded-full border border-slate-800 text-[11px] text-slate-300">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Gnani AI: Prisma & Timbre</span>
          </div>

          {/* Quick Voice Launcher */}
          {onOpenVoiceModal && (
            <button
              onClick={onOpenVoiceModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all shadow-sm"
              title="Launch Voice Assistant"
            >
              <Mic className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Voice Assistant</span>
            </button>
          )}

          {/* Language Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>{languageOptions.find(l => l.code === language)?.label || 'తెలుగు'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {langMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl py-1 z-50">
                <div className="px-3 py-2 border-b border-slate-800 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Voice & Display Language
                </div>
                {languageOptions.map((opt) => (
                  <button
                    key={opt.code}
                    onClick={() => {
                      setLanguage(opt.code);
                      setLangMenuOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs hover:bg-slate-800 transition-colors ${
                      language === opt.code ? 'text-emerald-400 font-semibold bg-emerald-500/10' : 'text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-medium">{opt.label}</div>
                      <div className="text-[10px] text-slate-400">{opt.sub}</div>
                    </div>
                    {language === opt.code && <Check className="w-4 h-4 text-emerald-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setNotifMenuOpen(!notifMenuOpen)}
              className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-950 animate-pulse" />
              )}
            </button>

            {notifMenuOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl py-2 z-50">
                <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">Alerts & Notifications</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                    {unreadCount} new
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/60">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">No active alerts</div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className="p-3 hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                          <span>{n.title}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User & Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-200">
              {user?.full_name ? user.full_name[0] : 'V'}
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};

