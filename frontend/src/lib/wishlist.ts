import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from './api';

export interface WishlistState {
  items: Product[];
  productIds: string[];
  add: (product: Product) => void;
  remove: (productId: string) => void;
  toggle: (product: Product) => void;
  clear: () => void;
}

/** Trims, drops blanks and de-duplicates a raw list of product IDs. */
export function normalizeWishlistIds(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const raw of ids) {
    const id = (raw ?? '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    normalized.push(id);
  }

  return normalized;
}

/** Adds a product ID once, keeping the existing order. */
export function addWishlistId(ids: readonly string[], productId: string): string[] {
  const normalized = normalizeWishlistIds(ids);
  const id = (productId ?? '').trim();

  if (!id || normalized.includes(id)) return normalized;
  return [...normalized, id];
}

/** Removes a product ID, ignoring blanks and duplicates. */
export function removeWishlistId(ids: readonly string[], productId: string): string[] {
  const id = (productId ?? '').trim();
  return normalizeWishlistIds(ids).filter((item) => item !== id);
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
        set({ items: newItems, productIds: normalizeWishlistIds(newItems.map((p) => p.id)) });
      },
      remove: (productId) => {
        const newItems = removeFromWishlist(get().items, productId);
        set({ items: newItems, productIds: normalizeWishlistIds(newItems.map((p) => p.id)) });
      },
      toggle: (product) => {
        const newItems = toggleWishlist(get().items, product);
        set({ items: newItems, productIds: normalizeWishlistIds(newItems.map((p) => p.id)) });
      },
      clear: () => set({ items: [], productIds: [] }),
    }),
    { name: 'craft2market-wishlist' }
  )
);

export const wishlistCount = (items: Product[]): number => items.length;
