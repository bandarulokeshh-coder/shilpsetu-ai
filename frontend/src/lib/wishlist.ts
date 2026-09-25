import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from './api';

export interface WishlistState {
  items: Product[];
  productIds: string[];
  add: (product: Product) => void;
  remove: (productId: string) => void;
  toggle: (productId: string) => void;
  clear: () => void;
}

/** Pure list operations keep persistence simple and make the behavior testable. */
export function addToWishlist(items: Product[], product: Product): Product[] {
  return items.some((item) => item.id === product.id)
    ? items.map((item) => (item.id === product.id ? product : item))
    : [...items, product];
}

export function removeFromWishlist(items: Product[], productId: string): Product[] {
  return items.filter((item) => item.id !== productId);
}

export function toggleWishlist(items: Product[], product: Product): Product[] {
  return items.some((item) => item.id === product.id)
    ? removeFromWishlist(items, product.id)
    : addToWishlist(items, product);
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      productIds: [],
      add: (product) => {
        const newItems = addToWishlist(get().items, product);
        set({ items: newItems, productIds: newItems.map((p) => p.id) });
      },
      remove: (productId) => {
        const newItems = removeFromWishlist(get().items, productId);
        set({ items: newItems, productIds: newItems.map((p) => p.id) });
      },
      toggle: (productId) => {
        const product = get().items.find((p) => p.id === productId);
        if (!product) return;
        const newItems = toggleWishlist(get().items, product);
        set({ items: newItems, productIds: newItems.map((p) => p.id) });
      },
      clear: () => set({ items: [], productIds: [] }),
    }),
    { name: 'craft2market-wishlist' }
  )
);

export const wishlistCount = (items: Product[]): number => items.length;
