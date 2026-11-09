import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Mic, Receipt, Boxes, ShoppingBag,
  Clock, Users, BarChart3, History, Settings, HelpCircle,
  Sparkles, LogOut, Store
} from 'lucide-react';
import { ShopkeeperMascot } from './Illustrations';

export interface NavItemConfig {
  to: string;
  label: string;
  telugu: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
  category: 'main' | 'intelligence' | 'preferences';
}

export const NAVIGATION_ITEMS: NavItemConfig[] = [
  // MAIN MENU
  {
    to: '/app/dashboard',
    label: 'Dashboard',
    telugu: 'డాష్‌బోర్డ్',
    icon: LayoutDashboard,
    category: 'main',
  },
  {
    to: '/app/voice',
    label: 'Voice Studio',
    telugu: 'వాయిస్ స్టూడియో',
    icon: Mic,
    highlight: true,
    category: 'main',
  },
  {
    to: '/app/billing',
    label: 'Sales & Billing',
    telugu: 'బిల్లింగ్ & POS',
    icon: Receipt,
    category: 'main',
  },
  {
    to: '/app/inventory',
    label: 'Inventory & Stock',
    telugu: 'ఇన్వెంటరీ & నిల్వలు',
    icon: Boxes,
    category: 'main',
  },
  {
    to: '/app/products',
    label: 'Product Catalog',
    telugu: 'వస్తువుల జాబితా',
    icon: ShoppingBag,
    category: 'main',
  },
  {
    to: '/app/orders',
    label: 'Orders Management',
    telugu: 'ఆర్డర్ల నిర్వహణ',
    icon: Clock,
    category: 'main',
  },
  {
    to: '/app/customers',
    label: 'Customer Directory',
    telugu: 'కస్టమర్ ఖాతాలు',
    icon: Users,
    category: 'main',
  },

  // BUSINESS INTELLIGENCE
  {
    to: '/app/analytics',
    label: 'Business Analytics',
    telugu: 'వ్యాపార విశ్లేషణ',
    icon: BarChart3,
    category: 'intelligence',
  },
  {
    to: '/app/voice-history',
    label: 'Voice Command Logs',
    telugu: 'వాయిస్ లాగ్స్',
    icon: History,
    category: 'intelligence',
  },

  // PREFERENCES
  {
    to: '/app/settings',
    label: 'Settings',
    telugu: 'సెట్టింగులు',
    icon: Settings,
    category: 'preferences',
  },
  {
    to: '/app/help',
    label: 'Help & Support',
    telugu: 'సహాయం & మార్గదర్శి',
    icon: HelpCircle,
    category: 'preferences',
  },
];

interface SidebarProps {
  onOpenVoiceModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = () => {
  const { business, user, logout } = useAuth();

  const renderNavSection = (title: string, category: 'main' | 'intelligence' | 'preferences') => {
    const items = NAVIGATION_ITEMS.filter((item) => item.category === category);
    return (
      <div className="mb-4">
        <div className="px-3 mb-1.5 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-[#7D887F]">
          <span>{title}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#789B82]" />
        </div>
        <div className="space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `group flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all duration-150 ${
                    isActive
                      ? 'bg-[#E4EFE6] text-[#28332C] font-extrabold border-l-4 border-[#52745F] shadow-xs'
                      : 'text-[#5B675E] hover:text-[#28332C] hover:bg-[#EDF5EF] border-l-4 border-transparent'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 ${
                        isActive
                          ? 'bg-[#52745F] text-white shadow-xs'
                          : 'bg-white border border-[#E5E9E3] text-[#52745F] group-hover:scale-105 group-hover:border-[#789B82]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                    </div>

                    <div className="flex-1 truncate">
                      <span className={`block leading-tight text-xs ${isActive ? 'font-black text-[#28332C]' : 'font-semibold text-[#3D4740] group-hover:text-[#28332C]'}`}>
                        {item.label}
                      </span>
                      <span className={`text-[10px] block leading-none mt-0.5 ${isActive ? 'text-[#52745F] font-bold' : 'text-[#879489]'}`}>
                        {item.telugu}
                      </span>
                    </div>

                    {item.highlight && (
                      <span className="flex h-2 w-2 relative shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C77B52] opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C77B52]" />
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <aside className="w-64 shrink-0 border-r border-[#E5E9E3] bg-[#F8F5ED] hidden md:flex flex-col justify-between py-4 select-none h-screen sticky top-0 overflow-y-auto sage-scrollbar">
      {/* Brand & Store Header */}
      <div className="px-4 pb-3 border-b border-[#E5E9E3] mb-3">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-9 h-9 rounded-xl bg-[#52745F] flex items-center justify-center text-white shadow-xs">
            <Mic className="w-4 h-4 font-black" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-black tracking-tight text-[#28332C]">VYAPARIMITRA</span>
              <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md bg-[#789B82] text-white">
                AI
              </span>
            </div>
            <p className="text-[10px] text-[#7D887F] font-medium leading-none">
              Your Business. Your Voice.
            </p>
          </div>
        </div>

        {/* Business Store Pill */}
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#EDF5EF] border border-[#E5E9E3] text-xs">
          <div className="flex items-center gap-1.5 truncate">
            <Store className="w-3.5 h-3.5 text-[#52745F] shrink-0" />
            <span className="font-bold text-[#28332C] truncate">
              {business?.name || 'Sri Lakshmi Kirana'}
            </span>
          </div>
          <span className="w-2 h-2 rounded-full bg-[#3C9970] shrink-0" title="Store Online & Active" />
        </div>
      </div>

      {/* Categorized Navigation Sections */}
      <div className="flex-1 px-2 overflow-y-auto sage-scrollbar">
        {renderNavSection('Main Menu', 'main')}
        {renderNavSection('Business Intelligence', 'intelligence')}
        {renderNavSection('Preferences', 'preferences')}
      </div>

      {/* User Profile & Gnani Attribution Footer */}
      <div className="px-3 pt-3 border-t border-[#E5E9E3] space-y-2 mt-2">
        {/* User Card */}
        <div className="p-2.5 rounded-xl bg-white border border-[#E5E9E3] flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#E4EFE6] text-[#52745F] font-bold text-xs flex items-center justify-center border border-[#789B82]/30 shrink-0">
              {user?.full_name ? user.full_name.charAt(0) : 'K'}
            </div>
            <div className="min-w-0 truncate">
              <div className="text-xs font-bold text-[#28332C] truncate">
                {user?.full_name || 'Kishore Kumar'}
              </div>
              <div className="text-[10px] text-[#7D887F] truncate">
                {user?.role === 'owner' ? 'Store Owner' : 'Merchant'}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 text-[#7D887F] hover:text-[#D96C70] hover:bg-[#F8F5ED] rounded-lg transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Gnani.ai Attribution */}
        <div className="px-2 py-1.5 rounded-lg bg-[#EDF5EF] border border-[#E5E9E3]/70 flex items-center justify-between text-[10px] text-[#52745F]">
          <span className="font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#C77B52]" />
            Gnani Prisma & Timbre
          </span>
          <span className="text-[9px] text-[#7D887F]">te-IN / en-IN</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
