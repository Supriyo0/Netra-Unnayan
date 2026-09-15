import React from 'react';
import { Lock, LogIn, UserPlus, X, Sparkles, ShoppingBag, Heart } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export const AuthPromptModal = ({ isOpen, onClose, actionType = 'cart', productName = '' }) => {
  const navigate = useNavigate();
  const location = useLocation();

  if (!isOpen) return null;

  const handleGoToLogin = () => {
    onClose();
    navigate('/login', { state: { from: location } });
  };

  const handleGoToRegister = () => {
    onClose();
    navigate('/register', { state: { from: location } });
  };

  const isCart = actionType === 'cart';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-md w-full glass-card rounded-3xl overflow-hidden border border-white/20 shadow-2xl p-6 space-y-5 text-center">
        
        {/* Header Icon */}
        <div className="relative mx-auto w-16 h-16 rounded-3xl bg-brand-cyan/15 border border-brand-cyan/30 flex items-center justify-center text-brand-cyan shadow-cyan-glow">
          {isCart ? <ShoppingBag className="w-8 h-8" /> : <Heart className="w-8 h-8 text-rose-400" />}
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-900 border border-white/20 flex items-center justify-center text-white">
            <Lock className="w-3 h-3 text-brand-cyan" />
          </div>
        </div>

        {/* Title & Copy */}
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-brand-cyan">
            Member Authentication Required
          </span>
          <h3 className="text-xl font-extrabold text-white">
            {isCart ? 'Sign In to Add to Cart' : 'Sign In to Save to Wishlist'}
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
            {productName ? (
              <>To save <strong className="text-white">"{productName}"</strong> to your optical locker, please log in or create a free account.</>
            ) : (
              <>Sign in to synchronize your eyewear cart, prescription vault, and clinical appointments across all devices.</>
            )}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          <button
            type="button"
            onClick={handleGoToLogin}
            className="w-full btn-primary py-3 rounded-xl text-xs font-bold shadow-cyan-glow flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In to Your Account</span>
          </button>

          <button
            type="button"
            onClick={handleGoToRegister}
            className="w-full py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 transition-all flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create New Free Account</span>
          </button>
        </div>

        {/* Dismiss */}
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-slate-200 transition-colors pt-2 block mx-auto"
        >
          Continue Browsing as Guest
        </button>

      </div>
    </div>
  );
};
