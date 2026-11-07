import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Mic, Sparkles, ShieldCheck, ArrowRight, Zap, Globe,
  Cpu, Database, BarChart3, CheckCircle2, Store
} from 'lucide-react';

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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      
      {/* Top Header */}
      <header className="w-full border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/20">
              <Mic className="w-5 h-5 font-bold" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white">VYAPARIMITRA</span>
              <span className="text-[10px] font-extrabold uppercase ml-1 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                AI
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="text-xs font-semibold px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={handleLaunchDemo}
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" /> Launch Demo Store
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex-1 flex flex-col justify-center items-center text-center">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-emerald-500/10 blur-[120px] pointer-events-none rounded-full" />
        <div className="absolute top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[250px] bg-teal-500/10 blur-[100px] pointer-events-none rounded-full" />

        {/* Challenge Ribbon */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-700/80 text-xs font-medium text-emerald-400 mb-6 shadow-sm">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Great Indian AI Internship Challenge — Gnani.ai</span>
        </div>

        {/* Hero Headline */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-tight sm:leading-none">
          Your Business. Your Voice.{' '}
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            Your Language.
          </span>
        </h1>
        <p className="text-xl sm:text-2xl font-serif text-emerald-400/90 mt-2">
          భారతీయ వ్యాపార మిత్ర — మీ స్వరం, మీ వ్యాపారం.
        </p>

        <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed">
          The production-grade multilingual voice-powered business operating system built for India's 60+ million merchants. 
          Manage sales, inventory, and billing seamlessly in Telugu, English, and Tenglish powered by <strong className="text-slate-200">Gnani Prisma STT</strong> and <strong className="text-slate-200">Timbre TTS</strong>.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={handleLaunchDemo}
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-bold text-sm shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 group"
          >
            <span>Explore Demo Store (Sri Lakshmi Kirana)</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <button
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 font-semibold text-sm border border-slate-700/80 transition-all"
          >
            Sign In with Merchant Account
          </button>
        </div>

        {/* Interactive Voice Utterance Emulator Card */}
        <div className="mt-14 w-full max-w-3xl glass-panel p-6 rounded-3xl border border-slate-800/80 shadow-2xl text-left space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Live Voice Pipeline Preview
              </span>
            </div>
            <span className="text-xs text-slate-400 font-mono">Gnani Sovereign Engine</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-emerald-400">1. Pure Telugu</span>
              <p className="text-xs font-medium text-slate-200">"ఈరోజు 10 కిలోల బియ్యం అమ్మాను."</p>
              <p className="text-[11px] text-slate-400">Sold 10kg rice (Sona Masoori)</p>
            </div>
            <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-teal-400">2. Indian English</span>
              <p className="text-xs font-medium text-slate-200">"I sold 10 kilograms of rice today."</p>
              <p className="text-[11px] text-slate-400">Exact quantity normalization</p>
            </div>
            <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-cyan-400">3. Colloquial Tenglish</span>
              <p className="text-xs font-medium text-slate-200">"Today 10 kilos rice sell chesanu."</p>
              <p className="text-[11px] text-slate-400">Code-mixed intent extraction</p>
            </div>
          </div>

          <div className="p-3 bg-emerald-950/20 border border-emerald-800/40 rounded-xl flex items-center justify-between text-xs text-emerald-300">
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Full transaction safety: Idempotency keys, atomic ledger deductions, instant UPI QR invoices</span>
            </span>
            <span className="text-[11px] font-mono text-emerald-400 font-semibold">100% Tested</span>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-4 gap-4 w-full text-left">
          <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Mic className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-white">Gnani Prisma STT</h4>
            <p className="text-xs text-slate-400">
              Low-latency Indian language speech recognition tuned for Kirana store acoustic environments.
            </p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-white">Gnani Timbre TTS</h4>
            <p className="text-xs text-slate-400">
              Spoken confirmation audio synthesized in natural Indian voices (Nalini, Arjun) in Telugu and English.
            </p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-white">Atomic Ledger Safety</h4>
            <p className="text-xs text-slate-400">
              Ledger-based stock transactions, automatic low-stock alarms, and strict multitenant isolation.
            </p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-white">Real-Time Analytics</h4>
            <p className="text-xs text-slate-400">
              Daily revenue metrics, inventory valuation, top product trends, and restocking recommendations.
            </p>
          </div>
        </div>

      </section>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-400">
        <p>VYAPARIMITRA AI — Built with dedication for the Great Indian AI Internship Challenge by Gnani AI.</p>
      </footer>
    </div>
  );
};

