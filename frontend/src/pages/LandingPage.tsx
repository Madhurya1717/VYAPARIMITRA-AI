import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Mic, Sparkles, ShieldCheck, ArrowRight, Zap, Globe,
  Cpu, Database, BarChart3, CheckCircle2, Store,
  Activity, Volume2, ShoppingBag, ShoppingCart
} from 'lucide-react';
import {
  ShopkeeperMascot,
  AIRobotAssistant
} from '../components/Illustrations';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, quickDemoLogin } = useAuth();

  const handleLaunchDemo = async () => {
    if (isAuthenticated) {
      navigate('/app/dashboard');
    } else {
      await quickDemoLogin();
      navigate('/app/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F5ED] text-[#28332C] flex flex-col">
      
      {/* Top Header */}
      <header className="w-full border-b border-[#E5E9E3] bg-[#F8F5ED]/95 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#52745F] flex items-center justify-center text-white shadow-xs">
              <Mic className="w-5 h-5 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-black tracking-tight text-[#28332C]">VYAPARIMITRA</span>
                <span className="text-[10px] font-black uppercase px-1.5 py-0.2 rounded-md bg-[#789B82] text-white">
                  AI
                </span>
              </div>
              <p className="text-[10px] font-medium text-[#7D887F] hidden sm:block">
                Your Business. Your Voice. Your Language.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="text-xs sm:text-sm font-bold px-3.5 py-1.5 rounded-xl text-[#52745F] hover:bg-[#EDF5EF] transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={handleLaunchDemo}
              className="text-xs sm:text-sm font-black px-4 sm:px-5 py-2 rounded-xl bg-[#52745F] hover:bg-[#3D5747] text-white shadow-xs transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>Launch Demo Store</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
        
        {/* Challenge Ribbon */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E5E9E3] text-xs font-bold text-[#52745F] mb-6 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-[#C77B52]" />
          <span>Great Indian AI Challenge &bull; Built with Gnani.ai</span>
        </div>

        {/* Hero Headline */}
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-[#28332C] max-w-4xl leading-tight">
          Your Business. Your Voice.{' '}
          <span className="text-[#52745F] block mt-1">
            Your Language.
          </span>
        </h1>
        
        <p className="text-xl sm:text-2xl font-bold text-[#3D4740] mt-3 tracking-wide">
          భారతీయ వ్యాపార మిత్ర — మీ స్వరం, మీ వ్యాపారం.
        </p>

        <p className="mt-4 text-sm sm:text-base text-[#7D887F] max-w-2xl leading-relaxed">
          The production-grade multilingual voice-powered business operating system built for India's 60+ million retail shopkeepers. 
          Manage sales, inventory, and billing effortlessly in Telugu, English, and Tenglish powered by <strong className="text-[#52745F] font-bold">Gnani Prisma STT</strong> and <strong className="text-[#52745F] font-bold">Timbre TTS</strong>.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto">
          <button
            onClick={handleLaunchDemo}
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-[#C77B52] hover:bg-[#B66A42] text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 group active:scale-95 cursor-pointer"
          >
            <span>Explore Demo Store (Sri Lakshmi Kirana)</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <button
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-white hover:bg-[#EDF5EF] text-[#28332C] font-bold text-sm border border-[#E5E9E3] transition-all shadow-xs active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-[#52745F]" />
            <span>Sign In with 2-Step OTP</span>
          </button>
        </div>

        {/* Mascot & Voice Visual Hero Banner */}
        <div className="mt-12 w-full max-w-4xl bg-[#EDF5EF] border border-[#E5E9E3] rounded-3xl p-6 sm:p-8 text-[#28332C] shadow-xs relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            
            {/* Left Mascots Pair */}
            <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-[#E5E9E3] shadow-xs">
              <ShopkeeperMascot size={64} />
              <div className="text-left">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#E4EFE6] text-[#3C9970]">
                  Kirana Assistant
                </span>
                <h4 className="text-sm font-black text-[#28332C] mt-1">Sri Lakshmi Kirana</h4>
                <p className="text-xs text-[#7D887F]">Kishore Kumar &bull; Owner</p>
              </div>
            </div>

            {/* Center Animated Voice Wave */}
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-[#C77B52] text-white flex items-center justify-center shadow-md">
                <Mic className="w-7 h-7 font-bold" />
              </div>
              <span className="text-xs font-bold text-[#28332C] mt-2 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-[#52745F]" /> "రెండు కేజీల పంచదార బిల్ చెయ్యి"
              </span>
              <span className="text-[11px] text-[#7D887F] mt-0.5">
                (Add 2kg Sugar to invoice &bull; Sovereign Gnani STT)
              </span>
            </div>

            {/* Right AI Robot Mascot */}
            <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-[#E5E9E3] shadow-xs">
              <AIRobotAssistant size={64} />
              <div className="text-left">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#EDF5EF] text-[#52745F]">
                  Gnani Sovereign AI
                </span>
                <h4 className="text-sm font-black text-[#28332C] mt-1">Timbre & Prisma</h4>
                <p className="text-xs text-[#7D887F]">Telugu &bull; English &bull; Tenglish</p>
              </div>
            </div>

          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full max-w-6xl text-left">
          
          {/* Card 1: Multilingual Voice AI */}
          <div className="rounded-2xl p-5 bg-white border border-[#E5E9E3] shadow-xs space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#EDF5EF] text-[#52745F] flex items-center justify-center">
              <Mic className="w-5 h-5 font-bold" />
            </div>
            <h3 className="text-sm font-bold text-[#28332C]">Multilingual Voice AI</h3>
            <p className="text-xs text-[#7D887F] leading-relaxed">
              Speaks and understands Telugu, Indian English, and conversational Tenglish powered by <strong className="text-[#52745F]">Gnani Prisma</strong> and <strong className="text-[#52745F]">Timbre</strong>.
            </p>
          </div>

          {/* Card 2: 1,000+ Grocery Items */}
          <div className="rounded-2xl p-5 bg-white border border-[#E5E9E3] shadow-xs space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#EDF5EF] text-[#52745F] flex items-center justify-center">
              <Store className="w-5 h-5 font-bold" />
            </div>
            <h3 className="text-sm font-bold text-[#28332C]">1,007 Kirana Products</h3>
            <p className="text-xs text-[#7D887F] leading-relaxed">
              Real grocery catalogue across 88 categories with Indian INR retail pricing, regional Telugu aliases, and stock alert levels.
            </p>
          </div>

          {/* Card 3: Live Sales Replay */}
          <div className="rounded-2xl p-5 bg-white border border-[#E5E9E3] shadow-xs space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#EDF5EF] text-[#52745F] flex items-center justify-center">
              <Activity className="w-5 h-5 font-bold" />
            </div>
            <h3 className="text-sm font-bold text-[#28332C]">Live Sales Telemetry</h3>
            <p className="text-xs text-[#7D887F] leading-relaxed">
              Real-time WebSocket and Server-Sent Events architecture broadcasting POS sales and stock changes continuously.
            </p>
          </div>

          {/* Card 4: Secure 2-Step Login */}
          <div className="rounded-2xl p-5 bg-white border border-[#E5E9E3] shadow-xs space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#EDF5EF] text-[#52745F] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 font-bold" />
            </div>
            <h3 className="text-sm font-bold text-[#28332C]">Secure 2-Step Verification</h3>
            <p className="text-xs text-[#7D887F] leading-relaxed">
              Enterprise security with cryptographically generated 6-digit OTP verification plus 1-Click Evaluation Mode for testing.
            </p>
          </div>

        </div>

      </section>

      {/* Footer */}
      <footer className="w-full border-t border-[#E5E9E3] bg-white py-6 px-4 text-center text-xs text-[#7D887F] mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#28332C]">VYAPARIMITRA AI</span>
            <span>&bull;</span>
            <span>Your Business. Your Voice. Your Language.</span>
          </div>
          <p>
            &copy; 2026 VYAPARIMITRA AI &bull; Built with Gnani.ai Sovereign Speech & Voice Stack
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
