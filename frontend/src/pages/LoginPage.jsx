import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Lock, Mail, AlertCircle, ArrowRight, User, KeyRound, CheckCircle2, X, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Forgot Password Modal State
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState(1); // 1 = request OTP, 2 = verify & reset
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const trimmedId = identifier.trim();

    try {
      const loggedInUser = await login(trimmedId, password);
      const searchParams = new URLSearchParams(location.search);
      const redirectUrl = searchParams.get('redirect');

      if (loggedInUser.type === 'admin') {
        navigate(redirectUrl || '/admin');
      } else {
        const from = redirectUrl || location.state?.from?.pathname || '/account';
        navigate(from);
      }
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');
    setForgotLoading(true);

    try {
      const res = await api.post('/auth/forgot_password.php', { email: forgotEmail.trim() });
      if (res.success) {
        setForgotSuccess(res.message || 'Security OTP has been dispatched to your email.');
        setForgotStep(2);
      } else {
        setForgotError(res.message || 'Failed to dispatch OTP.');
      }
    } catch (err) {
      setForgotError(err.message || 'Error requesting reset OTP.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');
    setForgotLoading(true);

    try {
      const res = await api.post('/auth/reset_password.php', {
        email: forgotEmail.trim(),
        otp: otpCode.trim(),
        new_password: newPassword
      });
      if (res.success) {
        setForgotSuccess('Password updated successfully! You can now sign in.');
        setTimeout(() => {
          setForgotModalOpen(false);
          setForgotStep(1);
          setForgotEmail('');
          setOtpCode('');
          setNewPassword('');
          setForgotSuccess('');
        }, 2000);
      } else {
        setForgotError(res.message || 'Failed to reset password.');
      }
    } catch (err) {
      setForgotError(err.message || 'Error updating password.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md glass-card rounded-3xl p-6 sm:p-8 space-y-6 border border-slate-200 dark:border-white/10 shadow-2xl">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-block">
            <img 
              src="/logo_symbol.png" 
              alt="Netra Unnayan" 
              className="w-16 h-12 mx-auto object-contain filter drop-shadow-[0_0_12px_rgba(0,180,216,0.5)]"
            />
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Sign In to Netra Unnayan
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Access your account, order tracking, eye clinic bookings, and management portal
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Unified Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-700 dark:text-slate-300 mb-1.5 font-bold">
              Email Address or Phone Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input 
                type="text" 
                required
                placeholder="name@example.com or mobile phone"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full glass-input rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm font-medium"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs text-slate-700 dark:text-slate-300 font-bold">
                Password
              </label>
              <button 
                type="button" 
                onClick={() => { setForgotModalOpen(true); setForgotStep(1); setForgotError(''); setForgotSuccess(''); }}
                className="text-[11px] font-bold text-brand-cyan hover:underline"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input 
                type={showPassword ? 'text' : 'password'} 
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full glass-input rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-brand-cyan transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full btn-primary py-3 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl shadow-cyan-glow flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:scale-101"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" /> Authenticating...
              </span>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-white/10 pt-4">
          Don't have an optical account yet?{' '}
          <Link to="/register" className="text-brand-cyan font-bold hover:underline">
            Create Free Account &rarr;
          </Link>
        </div>

      </div>

      {/* Forgot Password OTP Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-md glass-card rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-white/10 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-brand-cyan" />
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  {forgotStep === 1 ? 'Reset Password via OTP' : 'Enter 6-Digit OTP'}
                </h3>
              </div>
              <button 
                onClick={() => setForgotModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {forgotError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{forgotSuccess}</span>
              </div>
            )}

            {forgotStep === 1 ? (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Enter your registered email address. We will send a secure 6-digit one-time password (OTP) to reset your account.
                </p>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Registered Email Address
                  </label>
                  <input 
                    type="email"
                    required
                    placeholder="e.g. name@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium"
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full btn-primary py-2.5 text-xs font-bold rounded-xl shadow-cyan-glow flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {forgotLoading ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" /> Dispatching OTP...
                    </span>
                  ) : (
                    <span>Send Verification Code</span>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Check your inbox ({forgotEmail}) for the 6-digit OTP code sent from Netra Unnayan.
                </p>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    6-Digit Security OTP
                  </label>
                  <input 
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full glass-input rounded-xl px-3.5 py-2.5 text-center text-lg font-mono tracking-widest font-extrabold text-brand-cyan"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Set New Password (min 6 characters)
                  </label>
                  <div className="relative">
                    <input 
                      type={showNewPassword ? 'text' : 'password'} 
                      required
                      minLength={6}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full glass-input rounded-xl px-3.5 pr-10 py-2.5 text-xs sm:text-sm font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-brand-cyan transition-colors"
                      title={showNewPassword ? 'Hide password' : 'Show password'}
                      aria-label="Toggle new password visibility"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="w-1/3 py-2.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-2/3 btn-primary py-2.5 text-xs font-bold rounded-xl shadow-cyan-glow flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {forgotLoading ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" /> Verifying...
                      </span>
                    ) : (
                      <span>Save New Password</span>
                    )}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
