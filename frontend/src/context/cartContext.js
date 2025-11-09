import React, { createContext, useState, useEffect, useContext } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState([]);

  // Get cart key based on user
  const getCartKey = () => {
    return user ? `cart_${user._id}` : 'cart_guest';
  };

  // Load cart from localStorage for specific user
  useEffect(() => {
    if (user) {
      const cartKey = getCartKey();
      const savedCart = localStorage.getItem(cartKey);
      if (savedCart) {
        setCartItems(JSON.parse(savedCart));
      } else {
        // Clear cart if switching users
        setCartItems([]);
      }
    } else {
      // Guest cart
      const guestCart = localStorage.getItem('cart_guest');
      if (guestCart) {
        setCartItems(JSON.parse(guestCart));
      }
    }
  }, [user]);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    const cartKey = getCartKey();
    localStorage.setItem(cartKey, JSON.stringify(cartItems));
  }, [cartItems, user]);

  // Add item to cart
  const addToCart = (product, quantity = 1, variant = null) => {
    setCartItems((prevItems) => {
      const existingItemIndex = prevItems.findIndex(
        (item) =>
          item.product._id === product._id &&
          JSON.stringify(item.variant) === JSON.stringify(variant)
      );

      if (existingItemIndex > -1) {
        const newItems = [...prevItems];
        newItems[existingItemIndex].quantity += quantity;
        setTimeout(() => toast.success('Cart updated'), 0);
        return newItems;
      } else {
        setTimeout(() => toast.success('Added to cart'), 0);
        return [
          ...prevItems,
          {
            product,
            quantity,
            variant,
            price: variant?.price || product.price,
          },
        ];
      }
    });
  };

  // Remove item from cart
  const removeFromCart = (productId, variant = null) => {
    setCartItems((prevItems) =>
      prevItems.filter(
        (item) =>
          !(
            item.product._id === productId &&
            JSON.stringify(item.variant) === JSON.stringify(variant)
          )
      )
    );
    toast.info('Removed from cart');
  };

  // Update quantity
  const updateQuantity = (productId, quantity, variant = null) => {
    if (quantity < 1) {
      removeFromCart(productId, variant);
      return;
    }

    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.product._id === productId &&
        JSON.stringify(item.variant) === JSON.stringify(variant)
          ? { ...item, quantity }
          : item
      )
    );
  };

  // Clear cart
  const clearCart = () => {
    setCartItems([]);
    const cartKey = getCartKey();
    localStorage.removeItem(cartKey);
    toast.info('Cart cleared');
  };

  // Calculate totals
  const subtotal = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
  const tax = subtotal * 0.1;
  const shipping = subtotal > 50 ? 0 : 10;
  const total = subtotal + tax + shipping;

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    itemCount: cartItems.reduce((count, item) => count + item.quantity, 0),
    subtotal,
    tax,
    shipping,
    total,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};