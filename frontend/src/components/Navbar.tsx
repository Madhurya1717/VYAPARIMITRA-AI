import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { SupportedLanguage, NotificationItem } from '../types';
import { api } from '../services/api';
import {
  Store, Globe, Mic, Bell, ChevronDown, Check,
  Radio, Sparkles, AlertCircle, User as UserIcon
} from 'lucide-react';

interface NavbarProps {
  onOpenVoiceModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenVoiceModal }) => {
  const { business, user, language, setLanguage, logout } = useAuth();
  const { isConnected } = useRealtime();
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
    { code: 'indic-auto', label: 'Tenglish', sub: 'Code-Mixed (తెలుగు + Eng)' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E5E9E3] bg-[#F8F5ED]/95 backdrop-blur-md">
      <div className="w-full px-4 sm:px-6 h-14 flex items-center justify-between">
        
        {/* Brand & Store Name */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 md:hidden">
            <div className="w-8 h-8 rounded-lg bg-[#52745F] flex items-center justify-center text-white shadow-xs">
              <Mic className="w-4 h-4" />
            </div>
            <span className="text-sm font-black text-[#28332C]">VYAPARIMITRA AI</span>
          </div>

          {business && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg bg-[#EDF5EF] border border-[#E5E9E3]">
              <Store className="w-3.5 h-3.5 text-[#52745F]" />
              <span className="text-xs font-bold text-[#28332C] max-w-[220px] truncate">
                {business.name}
              </span>
              <span className="text-[10px] text-[#7D887F] hidden lg:inline">| Kirana Store</span>
            </div>
          )}
        </div>

        {/* Action Controls & Badges */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Real-time WebSocket Status Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-[#E5E9E3] text-[11px] font-semibold text-[#28332C] shadow-xs">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#3C9970] animate-pulse' : 'bg-[#E3A04C]'}`} />
            <span className="hidden sm:inline">{isConnected ? 'Live Sync Active' : 'Connecting...'}</span>
            <span className="sm:hidden">{isConnected ? 'Live' : '...'}</span>
          </div>

          {/* Gnani Engine Live Badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-[#EDF5EF] rounded-full border border-[#E5E9E3] text-[11px] text-[#52745F] font-semibold">
            <Sparkles className="w-3 h-3 text-[#C77B52]" />
            <span>Gnani AI: Prisma & Timbre</span>
          </div>

          {/* Quick Voice Launcher (Terracotta accent) */}
          {onOpenVoiceModal && (
            <button
              onClick={onOpenVoiceModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#C77B52] hover:bg-[#B66A42] text-white shadow-xs transition-all active:scale-95"
              title="Launch Voice Assistant"
            >
              <Mic className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Voice Assistant</span>
            </button>
          )}

          {/* Language Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-[#EDF5EF] text-[#28332C] border border-[#E5E9E3] transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-[#52745F]" />
              <span className="uppercase text-[11px] font-bold">{language === 'indic-auto' || (language as string) === 'te-en' ? 'TE/EN' : language.split('-')[0]}</span>
              <ChevronDown className="w-3 h-3 text-[#7D887F]" />
            </button>

            {langMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-[#E5E9E3] shadow-lg py-2 z-50">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#7D887F]">
                  Store Language
                </div>
                {languageOptions.map((opt) => (
                  <button
                    key={opt.code}
                    onClick={() => {
                      setLanguage(opt.code);
                      setLangMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-[#EDF5EF] transition-colors ${
                      language === opt.code ? 'text-[#52745F] font-bold bg-[#E4EFE6]' : 'text-[#28332C]'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{opt.label}</div>
                      <div className="text-[10px] text-[#7D887F]">{opt.sub}</div>
                    </div>
                    {language === opt.code && <Check className="w-3.5 h-3.5 text-[#52745F]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setNotifMenuOpen(!notifMenuOpen)}
              className="relative p-2 rounded-xl bg-white hover:bg-[#EDF5EF] border border-[#E5E9E3] text-[#28332C] transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4 text-[#52745F]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#C77B52] text-white text-[9px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {notifMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white border border-[#E5E9E3] shadow-lg py-2 z-50">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#7D887F] flex items-center justify-between">
                  <span>Notifications</span>
                  <span className="text-[10px] text-[#52745F]">{notifications.length} alerts</span>
                </div>
                <div className="max-h-64 overflow-y-auto sage-scrollbar divide-y divide-[#E5E9E3]/50">
                  {notifications.length === 0 ? (
                    <div className="px-3 py-4 text-center text-xs text-[#7D887F]">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="p-2.5 hover:bg-[#EDF5EF] text-xs">
                        <div className="font-semibold text-[#28332C]">{n.title}</div>
                        <div className="text-[11px] text-[#7D887F] mt-0.5">{n.message}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};

export default Navbar;
