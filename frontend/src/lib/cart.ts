import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from './api';

export interface CartItem {
  productId: string;
  title: string;
  imageUrl?: string;
  unitPrice: number;
  quantity: number;
  artisanName?: string;
}

interface CartState {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
}

/** Mirrors the server's price resolution so the UI shows the same number the API will charge. */
export function resolvePrice(product: Pick<Product, 'suggestedPrice' | 'premiumPrice' | 'minimumPrice'>): number {
  return product.suggestedPrice ?? product.premiumPrice ?? product.minimumPrice ?? 0;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],

      addItem: (product, quantity = 1) =>
        set((state) => {
          const existing = state.items.find((i) => i.productId === product.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === product.id
                  ? { ...i, quantity: Math.min(99, i.quantity + quantity) }
                  : i
              ),
            };
          }
          return {
            items: [
              ...state.items,
              {
                productId: product.id,
                title: product.title,
                imageUrl: product.enhancedImageUrl || product.imageUrl,
                unitPrice: resolvePrice(product),
                quantity: Math.max(1, quantity),
                artisanName: product.artisan?.name,
              },
            ],
          };
        }),

      removeItem: (productId) =>
        set((state) => ({ items: state.items.filter((i) => i.productId !== productId) })),

      updateQuantity: (productId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.productId !== productId)
              : state.items.map((i) =>
                  i.productId === productId ? { ...i, quantity: Math.min(99, quantity) } : i
                ),
        })),

      clear: () => set({ items: [] }),
    }),
    { name: 'craft2market-cart' }
  )
);

export const cartCount = (items: CartItem[]): number =>
  items.reduce((n, i) => n + i.quantity, 0);

export const cartTotal = (items: CartItem[]): number =>
  items.reduce((n, i) => n + i.unitPrice * i.quantity, 0);
