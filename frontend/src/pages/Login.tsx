import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Mic,
  Lock,
  Phone,
  ArrowRight,
  Zap,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  ArrowLeft,
  Clock,
  Sparkles,
  KeyRound
} from 'lucide-react';
import { ShopkeeperMascot, AIRobotAssistant } from '../components/Illustrations';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { loginStep1, verifyOtp, resendOtp, isLoading } = useAuth();

  // Step state: 'credentials' | 'otp'
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');

  // Step 1: Credentials
  const [identifier, setIdentifier] = useState('demo@vyaparimitra.ai');
  const [password, setPassword] = useState('Vyapari@123');

  // Step 2: OTP State
  const [sessionToken, setSessionToken] = useState<string>('');
  const [emailMasked, setEmailMasked] = useState<string>('');
  const [otpValues, setOtpValues] = useState<string[]>(['', '', '', '', '', '']);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  // Timers
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(60);
  const [expiresSeconds, setExpiresSeconds] = useState<number>(300);
  const [isResending, setIsResending] = useState<boolean>(false);

  // Feedback
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Input refs for 6 OTP boxes
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer countdowns
  useEffect(() => {
    let interval: any;
    if (step === 'otp') {
      interval = setInterval(() => {
        setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
        setExpiresSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step]);

  // Handle Step 1 Submit
  const handleCredentialsSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await loginStep1(identifier.trim(), password);
      if (res.otp_required) {
        setSessionToken(res.session_token);
        setEmailMasked(res.email_masked || identifier);
        setDevOtp(res.dev_otp || null);
        setExpiresSeconds(res.expires_in_seconds || 300);
        setCooldownSeconds(60);
        setOtpValues(['', '', '', '', '', '']);
        setStep('otp');
        setTimeout(() => inputRefs.current[0]?.focus(), 150);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please check your credentials.');
    }
  };

  // 1-Click Quick Demo Flow
  const handleQuickDemo = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await loginStep1('demo@vyaparimitra.ai', 'Vyapari@123');
      if (res.otp_required) {
        setSessionToken(res.session_token);
        setEmailMasked(res.email_masked || 'demo@vyaparimitra.ai');
        setExpiresSeconds(res.expires_in_seconds || 300);
        setCooldownSeconds(60);
        setDevOtp(res.dev_otp || null);
        setStep('otp');

        if (res.dev_otp && res.dev_otp.length === 6) {
          const digits = res.dev_otp.split('');
          setOtpValues(digits);
          setTimeout(async () => {
            try {
              await verifyOtp(res.session_token, res.dev_otp);
              navigate('/app/dashboard');
            } catch (err: any) {
              setErrorMsg(err.message || 'Auto-verification failed.');
            }
          }, 600);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Quick demo login failed.');
    }
  };

  // OTP Change
  const handleOtpChange = (index: number, val: string) => {
    const char = val.replace(/\D/g, '').slice(-1);
    const newOtp = [...otpValues];
    newOtp[index] = char;
    setOtpValues(newOtp);

    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleAutoFillDevOtp = () => {
    if (devOtp && devOtp.length === 6) {
      setOtpValues(devOtp.split(''));
    }
  };

  // Step 2 Submit
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otpValues.join('');
    if (code.length !== 6) {
      setErrorMsg('Please enter all 6 digits of your verification code.');
      return;
    }
    setErrorMsg(null);
    try {
      await verifyOtp(sessionToken, code);
      navigate('/app/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid or expired OTP code.');
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (cooldownSeconds > 0 || isResending) return;
    setIsResending(true);
    setErrorMsg(null);
    try {
      const res = await resendOtp(sessionToken);
      setSuccessMsg(res.message || 'New verification code sent!');
      setCooldownSeconds(60);
      setExpiresSeconds(res.expires_in_seconds || 300);
      setOtpValues(['', '', '', '', '', '']);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to resend code.');
    } finally {
      setIsResending(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="min-h-screen bg-[#F8F5ED] flex items-center justify-center p-4 relative overflow-hidden">
      
      <div className="w-full max-w-md rounded-3xl border border-[#E5E9E3] bg-white p-6 sm:p-8 shadow-xl relative z-10 space-y-5">
        
        {/* Brand Header with Mascots */}
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

          <h2 className="text-xl sm:text-2xl font-black text-[#28332C] tracking-tight">
            {step === 'credentials' ? 'Welcome Back' : 'Two-Step Verification'}
          </h2>
          <p className="text-xs text-[#7D887F] max-w-xs mx-auto">
            {step === 'credentials'
              ? 'Sign in to your VyapariMitra AI Operational Workspace'
              : `Security verification code sent to ${emailMasked || 'your registered email'}`}
          </p>
        </div>

        {/* 1-Click Demo Login Banner (Step 1) */}
        {step === 'credentials' && (
          <div className="p-3.5 bg-[#EDF5EF] rounded-2xl border border-[#E5E9E3] space-y-2 text-center shadow-xs">
            <div className="flex items-center justify-center gap-1.5 text-xs text-[#52745F] font-bold">
              <Sparkles className="w-3.5 h-3.5 text-[#C77B52]" />
              <span>Great Indian AI Challenge Evaluation</span>
            </div>
            <button
              type="button"
              onClick={handleQuickDemo}
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-black bg-[#52745F] hover:bg-[#3D5747] text-white shadow-xs transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-white" /> 1-Click Quick Demo Login (Kishore Kumar)
            </button>
            <p className="text-[10px] text-[#7D887F]">
              Prepopulates credentials & executes verified two-step login.
            </p>
          </div>
        )}

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="p-3 bg-[#FEE2E2] border border-[#FCA5A5] rounded-xl text-xs text-[#DC2626] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626]" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-[#E4EFE6] border border-[#789B82]/30 rounded-xl text-xs text-[#3C9970] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 text-[#3C9970]" />
            <span className="font-medium">{successMsg}</span>
          </div>
        )}

        {/* STEP 1: CREDENTIALS FORM */}
        {step === 'credentials' ? (
          <form onSubmit={handleCredentialsSubmit} className="space-y-3.5">
            <div className="space-y-1 text-left">
              <label className="text-xs font-bold text-[#28332C]">Phone or Email</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#7D887F] absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="demo@vyaparimitra.ai or 9876543210"
                  className="w-full bg-[#F8F5ED] border border-[#E5E9E3] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#28332C] placeholder-[#7D887F] focus:outline-none focus:border-[#789B82] focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-1 text-left">
              <label className="text-xs font-bold text-[#28332C]">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#7D887F] absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#F8F5ED] border border-[#E5E9E3] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#28332C] placeholder-[#7D887F] focus:outline-none focus:border-[#789B82] focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl text-xs font-bold bg-[#52745F] hover:bg-[#3D5747] text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98 shadow-xs mt-2 cursor-pointer"
            >
              <span>{isLoading ? 'Authenticating...' : 'Continue to Verification'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          /* STEP 2: TWO-STEP OTP VERIFICATION */
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            {devOtp && (
              <div className="p-3 bg-[#EDF5EF] border border-[#E5E9E3] rounded-xl space-y-1.5 text-left">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#28332C] font-bold flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[#52745F]" /> Dev Mode OTP:
                  </span>
                  <span className="font-mono font-black tracking-widest text-[#52745F] bg-white px-2 py-0.5 rounded-lg border border-[#E5E9E3]">
                    {devOtp}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAutoFillDevOtp}
                  className="w-full py-1.5 px-3 rounded-lg text-xs font-bold bg-white hover:bg-[#E4EFE6] text-[#52745F] border border-[#E5E9E3] transition-colors flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#C77B52]" /> Auto-Fill Verification Code
                </button>
              </div>
            )}

            {/* 6-Digit Code Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#28332C] block text-center">
                Enter 6-Digit Security Code
              </label>
              <div className="flex justify-center gap-2">
                {otpValues.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => { inputRefs.current[idx] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="w-11 h-12 text-center text-xl font-black font-mono bg-[#F8F5ED] border border-[#E5E9E3] rounded-xl text-[#28332C] focus:outline-none focus:border-[#52745F] focus:bg-white transition-all shadow-xs"
                  />
                ))}
              </div>
            </div>

            {/* Expiry Timer & Resend */}
            <div className="flex items-center justify-between text-xs text-[#7D887F] pt-1">
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#52745F]" />
                <span>
                  Expires in:{' '}
                  <strong className={expiresSeconds < 60 ? 'text-[#DC2626] font-mono' : 'text-[#28332C] font-mono'}>
                    {formatTime(expiresSeconds)}
                  </strong>
                </span>
              </div>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={cooldownSeconds > 0 || isResending}
                className="text-xs text-[#52745F] hover:text-[#28332C] disabled:text-[#7D887F] disabled:cursor-not-allowed font-bold flex items-center gap-1 transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${isResending ? 'animate-spin' : ''}`} />
                {cooldownSeconds > 0 ? `Resend in ${cooldownSeconds}s` : 'Resend Code'}
              </button>
            </div>

            {/* Submit Verification Button */}
            <button
              type="submit"
              disabled={isLoading || otpValues.join('').length !== 6}
              className="w-full py-3 rounded-xl text-xs font-bold bg-[#52745F] hover:bg-[#3D5747] text-white shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isLoading ? 'Verifying Code...' : 'Verify & Enter Dashboard'}</span>
            </button>

            {/* Back button */}
            <button
              type="button"
              onClick={() => {
                setStep('credentials');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="w-full py-2 text-xs font-bold text-[#7D887F] hover:text-[#28332C] transition-colors flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In credentials</span>
            </button>
          </form>
        )}

        {/* Footer Link */}
        {step === 'credentials' && (
          <div className="text-center text-xs text-[#7D887F] pt-2 border-t border-[#E5E9E3]">
            New Merchant?{' '}
            <Link to="/register" className="text-[#52745F] font-bold hover:underline">
              Register your store
            </Link>
          </div>
        )}

      </div>
    </div>
  );
};

export default Login;
