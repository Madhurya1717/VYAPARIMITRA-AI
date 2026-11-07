import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Mic, Receipt, Boxes, ShoppingBag,
  Clock, Users, BarChart3, History, Settings
} from 'lucide-react';

interface SidebarProps {
  onOpenVoiceModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = () => {
  const navItems = [
    { to: '/app/dashboard', label: 'Dashboard', telugu: 'డాష్‌బోర్డ్', icon: LayoutDashboard },
    { to: '/app/voice', label: 'Voice Studio', telugu: 'వాయిస్ స్టూడియో', icon: Mic, highlight: true },
    { to: '/app/billing', label: 'Sales & Billing (POS)', telugu: 'బిల్లింగ్ & POS', icon: Receipt },
    { to: '/app/inventory', label: 'Inventory & Stock', telugu: 'ఇన్వెంటరీ & స్టాక్', icon: Boxes },
    { to: '/app/products', label: 'Product Catalog', telugu: 'వస్తువుల వివరాలు', icon: ShoppingBag },
    { to: '/app/orders', label: 'Orders Management', telugu: 'ఆర్డర్లు', icon: Clock },
    { to: '/app/customers', label: 'Customer Directory', telugu: 'కస్టమర్ ఖాతాలు', icon: Users },
    { to: '/app/analytics', label: 'Business Analytics', telugu: 'వ్యాపార విశ్లేషణ', icon: BarChart3 },
    { to: '/app/voice-history', label: 'Voice Command Logs', telugu: 'వాయిస్ హిస్టరీ', icon: History },
    { to: '/app/settings', label: 'Settings', telugu: 'సెట్టింగులు', icon: Settings },
  ];

  return (
    <aside className="w-64 shrink-0 glass-panel border-r border-slate-800/80 bg-slate-950/60 hidden md:flex flex-col justify-between py-4">
      <div className="space-y-1 px-3">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Main Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                    : item.highlight
                    ? 'bg-slate-900/80 text-teal-300 hover:bg-slate-900 border border-teal-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <div className="flex-1 truncate">
                <span className="block">{item.label}</span>
                <span className="text-[10px] opacity-70 block">{item.telugu}</span>
              </div>
              {item.highlight && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Powered by Gnani Footer */}
      <div className="p-3 mx-3 bg-slate-900/70 rounded-xl border border-slate-800/80 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5 text-slate-200 font-semibold mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
          <span>Gnani AI Sovereign Stack</span>
        </div>
        <p className="text-[10px] text-slate-400">
          Prisma v3.0 STT & Timbre v2.5 TTS voice engine active.
        </p>
      </div>
    </aside>
  );
};
