import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { User, Mail, Phone, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { register } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(fullName.trim(), email.trim(), phone.trim(), password);
      const searchParams = new URLSearchParams(location.search);
      const redirectUrl = searchParams.get('redirect') || '/account';
      navigate(redirectUrl);
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md glass-card rounded-3xl p-8 space-y-6 border border-white/10 shadow-2xl">
        
        <div className="text-center space-y-2">
          <Link to="/" className="inline-block">
            <img 
              src="/logo_symbol.png" 
              alt="Netra Unnayan" 
              className="w-16 h-12 mx-auto object-contain filter drop-shadow-[0_0_12px_rgba(0,180,216,0.5)]"
            />
          </Link>
          <h1 className="text-2xl font-extrabold text-white">
            Create Customer Account
          </h1>
          <p className="text-xs text-slate-400">
            Save prescriptions, track optical manufacturing, and reorder lenses effortlessly
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-300 mb-1">Full Legal Name *</label>
            <input 
              type="text" 
              required
              placeholder="e.g. Priya Das"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1">Mobile Phone (for delivery &amp; appointments) *</label>
            <input 
              type="tel" 
              required
              placeholder="e.g. 9831987654"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1">Email Address *</label>
            <input 
              type="email" 
              required
              placeholder="e.g. priya.das@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1">Password (min. 6 characters) *</label>
            <input 
              type="password" 
              required
              minLength="6"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full btn-primary py-3 text-xs font-bold rounded-xl shadow-cyan-glow flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <span>Creating Account...</span> : <span>Create Account &rarr;</span>}
          </button>
        </form>

        <div className="text-center text-xs text-slate-400 border-t border-white/10 pt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-cyan font-bold hover:underline">
            Log In &rarr;
          </Link>
        </div>

      </div>
    </div>
  );
};
