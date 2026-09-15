import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Trash2, ShoppingBag, ArrowRight, Eye, Sparkles } from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export const WishlistPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?redirect=/wishlist');
    }
  }, [user, authLoading, navigate]);

  const { wishlistItems, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();

  const handleAddToCart = (product) => {
    addToCart({
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: product.price,
      image_url: product.image_url || product.front_image_url || '/public_assets/logo_symbol.png',
      has_prescription: false
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
            <Heart className="w-5 h-5 fill-rose-500" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              My Wishlist
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {wishlistItems.length} {wishlistItems.length === 1 ? 'frame saved' : 'frames saved'} for later
            </p>
          </div>
        </div>

        {wishlistItems.length > 0 && (
          <Link
            to="/catalog"
            className="text-xs font-bold text-brand-cyan hover:underline flex items-center gap-1"
          >
            <span>Continue Browsing</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Wishlist Items List / Cards (Matching Screen 9) */}
      {wishlistItems.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center space-y-4 max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
            <Heart className="w-8 h-8 stroke-1" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Your Wishlist is Empty</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Save your favorite optical frames, sunglasses, and blue-cut glasses while you shop to easily find them later.
          </p>
          <Link
            to="/catalog"
            className="btn-primary py-2.5 px-6 text-xs font-bold uppercase tracking-wider rounded-full inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Discover Frames</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {wishlistItems.map((product) => {
            const displayImage = product.image_url || product.front_image_url || 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=600&q=80';
            const priceVal = parseFloat(product.price || 0);

            return (
              <div
                key={product.id}
                className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-200/80 dark:border-white/10 hover:shadow-md transition-all"
              >
                {/* Product Thumbnail & Details */}
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="w-20 h-16 sm:w-24 sm:h-20 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 flex items-center justify-center p-2 shrink-0 overflow-hidden">
                    <img
                      src={displayImage}
                      alt={product.name}
                      className="w-full h-full object-contain filter drop-shadow-sm hover:scale-105 transition-transform"
                    />
                  </div>

                  <div>
                    <Link
                      to={`/product/${product.id}`}
                      className="text-sm sm:text-base font-bold text-slate-900 dark:text-white hover:text-brand-cyan transition-colors"
                    >
                      {product.name}
                    </Link>
                    <div className="text-xs font-mono text-slate-400 mt-0.5">
                      SKU: {product.sku || `NU-FRM-${product.id}`}
                    </div>
                    {product.lens_width && (
                      <div className="text-[11px] font-mono text-brand-cyan mt-0.5">
                        {product.lens_width} □ {product.bridge_width || 18} — {product.temple_length || 140}
                      </div>
                    )}
                  </div>
                </div>

                {/* Price & Action Buttons */}
                <div className="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-white/5">
                  <div className="text-left sm:text-right">
                    <div className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                      ₹{priceVal.toLocaleString('en-IN')}
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-500 uppercase">
                      In Stock
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="btn-primary py-2 px-4 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Add to Cart</span>
                    </button>

                    <button
                      onClick={() => removeFromWishlist(product.id)}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/30 transition-all"
                      title="Remove from Wishlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
