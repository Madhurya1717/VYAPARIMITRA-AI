import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
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
import { Mic } from 'lucide-react';

const ProtectedLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100">
      <Navbar onOpenVoiceModal={() => setIsVoiceModalOpen(true)} />
      
      <div className="flex-1 flex overflow-hidden">
        <Sidebar onOpenVoiceModal={() => setIsVoiceModalOpen(true)} />
        
        <main className="flex-1 overflow-y-auto flex flex-col">
          <Outlet context={{ openVoiceModal: () => setIsVoiceModalOpen(true) }} />
        </main>
      </div>

      {/* Persistent Global Floating Voice Action Button (FAB) */}
      <button
        onClick={() => setIsVoiceModalOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-2xl shadow-emerald-500/40 hover:scale-105 transition-all flex items-center justify-center border-2 border-emerald-300/40"
        title="Open Voice Assistant"
      >
        <Mic className="w-7 h-7 font-bold" />
        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
        </span>
      </button>

      {/* Global Voice Assistant Modal */}
      <GlobalVoiceModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onTransactionCompleted={() => {
          // Trigger page updates or notifications
        }}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
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
            <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
