import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { type CartItem, generateBatchJsxScript, downloadJsxFile } from '../lib/jsx-generator';
import { useToast } from './ToastContext';

const CART_STORAGE_KEY = 'tboi_sketchbook_cart';

interface CartContextValue {
  cart: CartItem[];
  addItem: (item: CartItem) => void;
  addMultipleItems: (items: CartItem[]) => void;
  removeItem: (index: number) => void;
  clearCart: () => void;
  generateCartScript: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CART_STORAGE_KEY);
      if (raw) {
        setCart(JSON.parse(raw));
      }
    } catch (e) {
      console.error('Error cargando carrito desde sessionStorage', e);
    }
    setIsLoaded(true);
  }, []);

  const saveCartToStorage = (updatedCart: CartItem[]) => {
    setCart(updatedCart);
    try {
      sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updatedCart));
    } catch (e) {
      console.error('Error guardando carrito en sessionStorage', e);
    }
  };

  const addItem = useCallback(
    (item: CartItem) => {
      setCart((prev) => {
        const next = [...prev, item];
        try {
          sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
        } catch (e) {
          console.error(e);
        }
        return next;
      });
      showToast(`Añadido al carrito: "${item.name}"`, 'success');
    },
    [showToast]
  );

  const addMultipleItems = useCallback(
    (items: CartItem[]) => {
      setCart((prev) => {
        const next = [...prev, ...items];
        try {
          sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
        } catch (e) {
          console.error(e);
        }
        return next;
      });
      showToast(`Se añadieron ${items.length} elementos al carrito.`, 'success');
    },
    [showToast]
  );

  const removeItem = useCallback((index: number) => {
    setCart((prev) => {
      const next = prev.filter((_, i) => i !== index);
      try {
        sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    saveCartToStorage([]);
    showToast('El carrito ha sido vaciado.', 'info');
  }, [showToast]);

  const generateCartScript = useCallback(() => {
    if (cart.length === 0) {
      showToast('El carrito está vacío.', 'error');
      return;
    }
    const jsx = generateBatchJsxScript(cart);
    downloadJsxFile('tboi_batch_injection.jsx', jsx);
    showToast('Script JSX descargado exitosamente.', 'success');
  }, [cart, showToast]);

  return (
    <CartContext.Provider
      value={{
        cart,
        addItem,
        addMultipleItems,
        removeItem,
        clearCart,
        generateCartScript,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
