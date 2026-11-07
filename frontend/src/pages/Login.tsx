import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mic, Lock, Phone, ArrowRight, Zap, AlertCircle } from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, quickDemoLogin, isLoading } = useAuth();
  const [identifier, setIdentifier] = useState('demo@vyaparimitra.ai');
  const [password, setPassword] = useState('Vyapari@123');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await login(identifier, password);
      navigate('/app/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please check credentials.');
    }
  };

  const handleQuickDemo = async () => {
    setErrorMsg(null);
    try {
      await quickDemoLogin();
      navigate('/app/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Demo login failed.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl relative z-10 space-y-6">
        
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/20 mb-2">
            <Mic className="w-6 h-6 font-bold" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Welcome Back</h2>
          <p className="text-xs text-slate-400">Sign in to your VyapariMitra AI Merchant Operating System</p>
        </div>

        {/* 1-Click Demo Login Button */}
        <div className="p-4 bg-emerald-950/20 rounded-2xl border border-emerald-800/40 space-y-2 text-center">
          <p className="text-xs text-emerald-300 font-medium">Evaluating for Gnani AI Internship?</p>
          <button
            type="button"
            onClick={handleQuickDemo}
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4" /> 1-Click Quick Demo Login (Kishore Kumar)
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-950/40 border border-rose-800/50 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Standard Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Phone or Email</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. 9876543210 or user@store.com"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center text-xs text-slate-400">
          New Merchant?{' '}
          <Link to="/register" className="text-emerald-400 font-semibold hover:underline">
            Register your store
          </Link>
        </div>

      </div>
    </div>
  );
};

