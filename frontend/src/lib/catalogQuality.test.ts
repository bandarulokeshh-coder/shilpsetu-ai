import { describe, expect, it } from 'vitest';
import { evaluateCatalogQuality } from './catalogQuality';

describe('evaluateCatalogQuality', () => {
  it('gives a complete listing the full score', () => {
    const result = evaluateCatalogQuality({
      title: 'Hand-painted Madhubani wall plate',
      description:
        'A hand-painted ceramic wall plate inspired by traditional Madhubani art, carefully finished by an artisan in Bihar.',
      imageUrl: '/uploads/madhubani.jpg',
      category: 'Home Decor',
      material: 'Ceramic',
      dimensions: '10 x 10 inches',
      suggestedPrice: 850,
      keywords: 'handmade, madhubani, ceramic',
    });

    expect(result.score).toBe(100);
    expect(result.completed).toBe(8);
    expect(result.nextActions).toEqual([]);
  });

  it('reports missing fields and scores only completed criteria', () => {
    const result = evaluateCatalogQuality({ title: 'Bowl', description: 'A useful bowl.' });

    expect(result.score).toBe(0);
    expect(result.completed).toBe(0);
    expect(result.nextActions).toEqual([
      'title',
      'description',
      'image',
      'category',
      'material',
      'dimensions',
      'price',
      'keywords',
    ]);
  });

  it('accepts a minimum or premium price and at least three keywords', () => {
    const result = evaluateCatalogQuality({
      title: 'Terracotta storage jar',
      description:
        'A durable hand-finished storage jar made with locally sourced terracotta and traditional decorative motifs.',
      imageUrl: '/uploads/jar.png',
      category: 'Home Decor',
      material: 'Terracotta',
      dimensions: '8 x 6 inches',
      minimumPrice: 500,
      keywords: 'pottery, storage, terracotta',
    });

    expect(result.checks.find((check) => check.field === 'price')?.passed).toBe(true);
    expect(result.checks.find((check) => check.field === 'keywords')?.passed).toBe(true);
    expect(result.score).toBe(100);
  });
});
