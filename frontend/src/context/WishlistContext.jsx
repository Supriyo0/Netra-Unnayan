import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { AuthPromptModal } from '../components/common/AuthPromptModal';

const WishlistContext = createContext(null);

export const WishlistProvider = ({ children }) => {
  const { user } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [targetProductName, setTargetProductName] = useState('');

  const [wishlistItems, setWishlistItems] = useState(() => {
    try {
      const saved = localStorage.getItem('nu_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('nu_wishlist', JSON.stringify(wishlistItems));
    } catch (e) {
      console.error('Failed to persist wishlist:', e);
    }
  }, [wishlistItems]);

  const addToWishlist = (product) => {
    if (!user) {
      setTargetProductName(product?.name || '');
      setAuthModalOpen(true);
      return false;
    }
    setWishlistItems((prev) => {
      if (prev.some((item) => item.id === product.id)) return prev;
      return [...prev, product];
    });
    return true;
  };

  const removeFromWishlist = (productId) => {
    setWishlistItems((prev) => prev.filter((item) => item.id !== productId));
  };

  const isInWishlist = (productId) => {
    return wishlistItems.some((item) => item.id === productId);
  };

  const toggleWishlist = (product) => {
    if (!user) {
      setTargetProductName(product?.name || '');
      setAuthModalOpen(true);
      return false;
    }
    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  };

  const clearWishlist = () => {
    setWishlistItems([]);
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlistItems,
        wishlistCount: wishlistItems.length,
        addToWishlist,
        removeFromWishlist,
        isInWishlist,
        toggleWishlist,
        clearWishlist
      }}
    >
      {children}
      <AuthPromptModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        actionType="wishlist"
        productName={targetProductName}
      />
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    return {
      wishlistItems: [],
      wishlistCount: 0,
      addToWishlist: () => {},
      removeFromWishlist: () => {},
      isInWishlist: () => false,
      toggleWishlist: () => {},
      clearWishlist: () => {}
    };
  }
  return context;
};
