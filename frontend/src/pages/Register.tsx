import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mic, Store, User, Phone, Lock, Globe, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { SupportedLanguage } from '../types';
import { ShopkeeperMascot, AIRobotAssistant } from '../components/Illustrations';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    full_name: '',
    phone_or_email: '',
    password: '',
    business_name: '',
    preferred_language: 'te-IN' as SupportedLanguage,
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await register(formData);
      navigate('/app/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F5ED] flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      
      <div className="w-full max-w-md rounded-3xl border border-[#E5E9E3] bg-white p-6 sm:p-8 shadow-xl relative z-10 space-y-5">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3 mb-1">
            <ShopkeeperMascot size={46} />
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-[#52745F] text-white shadow-xs">
              <Mic className="w-5 h-5 font-bold" />
            </div>
            <AIRobotAssistant size={46} />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#EDF5EF] border border-[#E5E9E3] text-[11px] font-bold text-[#52745F]">
            <Sparkles className="w-3 h-3 text-[#C77B52]" />
            <span>VYAPARIMITRA AI</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-[#28332C] tracking-tight">Register Store</h2>
          <p className="text-xs text-[#7D887F]">Join VyapariMitra AI with your retail Kirana merchant profile</p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-[#FEE2E2] border border-[#FCA5A5] rounded-xl text-xs text-[#DC2626] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626]" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-left">
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#28332C]">Store / Business Name</label>
            <div className="relative">
              <Store className="w-4 h-4 text-[#7D887F] absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                placeholder="e.g. Balaji Traders & General Store"
                className="w-full bg-[#F8F5ED] border border-[#E5E9E3] rounded-xl pl-10 pr-4 py-2 text-xs text-[#28332C] placeholder-[#7D887F] focus:outline-none focus:border-[#789B82] focus:bg-white transition-all font-medium"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-[#28332C]">Owner Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-[#7D887F] absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="e.g. Ramesh Kumar"
                className="w-full bg-[#F8F5ED] border border-[#E5E9E3] rounded-xl pl-10 pr-4 py-2 text-xs text-[#28332C] placeholder-[#7D887F] focus:outline-none focus:border-[#789B82] focus:bg-white transition-all font-medium"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-[#28332C]">Phone or Email</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-[#7D887F] absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={formData.phone_or_email}
                onChange={(e) => setFormData({ ...formData, phone_or_email: e.target.value })}
                placeholder="e.g. 9876543210 or merchant@example.com"
                className="w-full bg-[#F8F5ED] border border-[#E5E9E3] rounded-xl pl-10 pr-4 py-2 text-xs text-[#28332C] placeholder-[#7D887F] focus:outline-none focus:border-[#789B82] focus:bg-white transition-all font-medium"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-[#28332C]">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#7D887F] absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                className="w-full bg-[#F8F5ED] border border-[#E5E9E3] rounded-xl pl-10 pr-4 py-2 text-xs text-[#28332C] placeholder-[#7D887F] focus:outline-none focus:border-[#789B82] focus:bg-white transition-all font-medium"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-[#28332C]">Preferred Store Language</label>
            <div className="relative">
              <Globe className="w-4 h-4 text-[#7D887F] absolute left-3.5 top-3" />
              <select
                value={formData.preferred_language}
                onChange={(e) => setFormData({ ...formData, preferred_language: e.target.value as SupportedLanguage })}
                className="w-full bg-[#F8F5ED] border border-[#E5E9E3] rounded-xl pl-10 pr-4 py-2 text-xs text-[#28332C] font-semibold focus:outline-none focus:border-[#789B82] focus:bg-white transition-all"
              >
                <option value="te-IN">తెలుగు (Telugu - Prisma & Timbre)</option>
                <option value="en-IN">Indian English</option>
                <option value="indic-auto">Tenglish (Code-Mixed / తెలుగు + Eng)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl text-xs font-bold bg-[#52745F] hover:bg-[#3D5747] text-white shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98 mt-2 cursor-pointer"
          >
            <span>{isLoading ? 'Creating Store Account...' : 'Register & Launch Store'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center text-xs text-[#7D887F] pt-2 border-t border-[#E5E9E3]">
          Already have an account?{' '}
          <Link to="/login" className="text-[#52745F] font-bold hover:underline">
            Sign In here
          </Link>
        </div>

      </div>
    </div>
  );
};

export default Register;
