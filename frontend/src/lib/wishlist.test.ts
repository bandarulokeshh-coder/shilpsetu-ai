import { describe, expect, it } from 'vitest';
import { addWishlistId, normalizeWishlistIds, removeWishlistId } from './wishlist';

describe('wishlist helpers', () => {
  it('normalizes, trims and removes duplicate product IDs', () => {
    expect(normalizeWishlistIds([' product-1 ', 'product-1', '', 'product-2'])).toEqual([
      'product-1',
      'product-2',
    ]);
  });

  it('adds an ID once without changing order', () => {
    expect(addWishlistId(['first'], 'second')).toEqual(['first', 'second']);
    expect(addWishlistId(['first', 'second'], 'first')).toEqual(['first', 'second']);
  });

  it('ignores blank IDs and removes an existing ID', () => {
    expect(addWishlistId(['first'], '   ')).toEqual(['first']);
    expect(removeWishlistId(['first', 'second'], 'first')).toEqual(['second']);
  });
});
