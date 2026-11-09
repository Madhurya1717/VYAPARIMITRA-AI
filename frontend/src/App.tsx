import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, NavLink } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { GlobalVoiceModal } from './components/GlobalVoiceModal';
import { LandingPage } from './pages/LandingPage';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { VoiceWorkspace } from './pages/VoiceWorkspace';
import { Billing } from './pages/Billing';
import { Inventory } from './pages/Inventory';
import { Products } from './pages/Products';
import { Orders } from './pages/Orders';
import { Customers } from './pages/Customers';
import { Analytics } from './pages/Analytics';
import { ConversationHistory } from './pages/ConversationHistory';
import { Settings } from './pages/Settings';
import { Help } from './pages/Help';
import { RealtimeProvider } from './context/RealtimeContext';
import {
  Mic, LayoutDashboard, Receipt, Boxes, Settings as SettingsIcon, Sparkles
} from 'lucide-react';

const ProtectedLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F5ED] flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-[#52745F] border-t-transparent rounded-full animate-spin shadow-xs" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[#F8F5ED] flex flex-col text-[#28332C] pb-16 md:pb-0">
      <Navbar onOpenVoiceModal={() => setIsVoiceModalOpen(true)} />
      
      <div className="flex-1 flex overflow-hidden">
        <Sidebar onOpenVoiceModal={() => setIsVoiceModalOpen(true)} />
        
        <main className="flex-1 overflow-y-auto flex flex-col sage-scrollbar">
          <Outlet context={{ openVoiceModal: () => setIsVoiceModalOpen(true) }} />
        </main>
      </div>

      {/* Desktop Persistent Floating Voice Action Button (FAB) in Terracotta Accent */}
      <button
        onClick={() => setIsVoiceModalOpen(true)}
        className="hidden md:flex fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[#C77B52] hover:bg-[#B66A42] text-white shadow-lg hover:scale-105 active:scale-95 transition-all items-center justify-center ring-4 ring-[#EDF5EF] cursor-pointer"
        title="Open Voice Assistant"
      >
        <Mic className="w-6 h-6 font-bold" />
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3C9970] opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-[#3C9970]" />
        </span>
      </button>

      {/* Mobile-First Bottom Navigation Bar in Concept 04 Style */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-[#F8F5ED]/95 backdrop-blur-md border-t border-[#E5E9E3] px-4 flex items-center justify-around shadow-sm">
        {/* Home */}
        <NavLink
          to="/app/dashboard"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${
              isActive ? 'text-[#28332C]' : 'text-[#7D887F] hover:text-[#28332C]'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-[#52745F] text-white shadow-xs'
                    : 'bg-[#EDF5EF] border border-[#E5E9E3] text-[#52745F]'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
              </div>
              <span className={isActive ? 'font-black' : 'font-semibold'}>Home</span>
            </>
          )}
        </NavLink>

        {/* Sales & Billing */}
        <NavLink
          to="/app/billing"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${
              isActive ? 'text-[#28332C]' : 'text-[#7D887F] hover:text-[#28332C]'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-[#52745F] text-white shadow-xs'
                    : 'bg-[#EDF5EF] border border-[#E5E9E3] text-[#52745F]'
                }`}
              >
                <Receipt className="w-4 h-4" />
              </div>
              <span className={isActive ? 'font-black' : 'font-semibold'}>Billing</span>
            </>
          )}
        </NavLink>

        {/* Center Prominent Voice AI Button */}
        <div className="relative -top-3">
          <button
            onClick={() => setIsVoiceModalOpen(true)}
            className="w-13 h-13 rounded-full bg-[#C77B52] hover:bg-[#B66A42] text-white shadow-md flex items-center justify-center ring-4 ring-[#EDF5EF] active:scale-95 transition-transform cursor-pointer"
            title="Voice AI Assistant"
          >
            <Mic className="w-6 h-6 font-bold" />
          </button>
        </div>

        {/* Inventory */}
        <NavLink
          to="/app/inventory"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${
              isActive ? 'text-[#28332C]' : 'text-[#7D887F] hover:text-[#28332C]'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-[#52745F] text-white shadow-xs'
                    : 'bg-[#EDF5EF] border border-[#E5E9E3] text-[#52745F]'
                }`}
              >
                <Boxes className="w-4 h-4" />
              </div>
              <span className={isActive ? 'font-black' : 'font-semibold'}>Stock</span>
            </>
          )}
        </NavLink>

        {/* Settings */}
        <NavLink
          to="/app/settings"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${
              isActive ? 'text-[#28332C]' : 'text-[#7D887F] hover:text-[#28332C]'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-[#52745F] text-white shadow-xs'
                    : 'bg-[#EDF5EF] border border-[#E5E9E3] text-[#52745F]'
                }`}
              >
                <SettingsIcon className="w-4 h-4" />
              </div>
              <span className={isActive ? 'font-black' : 'font-semibold'}>Settings</span>
            </>
          )}
        </NavLink>
      </nav>

      {/* Global Voice Assistant Modal */}
      <GlobalVoiceModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onTransactionCompleted={() => {}}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <RealtimeProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Landing & Auth */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Authenticated Application */}
            <Route path="/app" element={<ProtectedLayout />}>
              <Route index element={<Navigate to="/app/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard onOpenVoiceModal={() => {}} />} />
              <Route path="voice" element={<VoiceWorkspace />} />
              <Route path="billing" element={<Billing />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="products" element={<Products />} />
              <Route path="orders" element={<Orders />} />
              <Route path="customers" element={<Customers />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="voice-history" element={<ConversationHistory />} />
              <Route path="settings" element={<Settings />} />
              <Route path="help" element={<Help />} />
              <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </RealtimeProvider>
    </AuthProvider>
  );
};

export default App;
