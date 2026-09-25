import { describe, it, expect } from 'vitest';
import {
  analyzeMarket,
  calculatePricingService,
  detectCategory,
  detectCraft,
  detectMaterial,
  detectProductNoun,
  generateCatalogService,
  generateHindiFallback,
} from './aiService';

const SAREE_DESCRIPTION = 'handwoven silk saree from banaras with gold zari work';

describe('detectCategory', () => {
  it('classifies a silk saree as Textiles & Clothing', () => {
    expect(detectCategory(SAREE_DESCRIPTION)).toBe('Textiles & Clothing');
  });

  it('prefers Pottery over the generic Home Decor for a terracotta vase', () => {
    expect(detectCategory('terracotta decorative vase hand painted traditional designs')).toBe(
      'Pottery & Ceramics',
    );
  });

  it('classifies bamboo baskets', () => {
    expect(detectCategory('eco friendly bamboo basket set for storage')).toBe('Bamboo & Cane');
  });

  it('classifies brass diyas as Metalwork', () => {
    expect(detectCategory('set of traditional brass diya oil lamps')).toBe('Metalwork');
  });

  it('honours a category chosen by the artisan', () => {
    expect(detectCategory('silk saree', { category: 'Other' })).toBe('Other');
  });

  it('falls back to Handmade Crafts when nothing matches', () => {
    expect(detectCategory('a completely unknown object')).toBe('Handmade Crafts');
  });
});

describe('detectMaterial', () => {
  it('uses the material the artisan named instead of guessing', () => {
    expect(detectMaterial(SAREE_DESCRIPTION).label).toBe('Pure Silk');
  });

  it('matches terracotta before the generic clay keyword', () => {
    expect(detectMaterial('terracotta clay flower vase').label).toBe('Terracotta Clay');
  });

  it('detects wood from wooden artefacts', () => {
    expect(detectMaterial('hand carved sheesham wooden jewelry box').label).toBe('Wood');
  });

  it('returns a neutral label when no material is mentioned', () => {
    expect(detectMaterial('handmade gift item').label).toBe('Handmade Material');
  });

  it('falls back to the material selected in the form', () => {
    expect(detectMaterial('nice gift for diwali', { material: 'Brass' }).label).toBe('Brass');
  });
});

describe('detectCraft', () => {
  it('detects handwoven work', () => {
    expect(detectCraft('handwoven cotton shawl').label).toBe('Handwoven');
  });

  it('detects block printing', () => {
    expect(detectCraft('cotton block print bedsheet').label).toBe('Block Printed');
  });

  it('falls back to Handcrafted', () => {
    expect(detectCraft('brass diya').label).toBe('Handcrafted');
  });
});

describe('detectProductNoun', () => {
  it('finds the product noun in the artisan words', () => {
    const noun = detectProductNoun(['handwoven', 'silk', 'saree', 'banaras']);
    expect(noun.en).toBe('saree');
    expect(noun.hi).toBe('साड़ी');
    expect(noun.found).toBe(true);
  });

  it('falls back to the last word when nothing is recognised', () => {
    expect(detectProductNoun(['unknown', 'thingamajig']).en).toBe('thingamajig');
  });
});

describe('calculatePricingService', () => {
  it('produces the three transparent pricing tiers', () => {
    const result = calculatePricingService(800, 400, 50, 0, 1, 30);

    expect(result.baseCost).toBe(1250);
    expect(result.pricing.minimum.price).toBeCloseTo(1437.5, 5);
    expect(result.pricing.suggested.price).toBeCloseTo(1625, 5);
    expect(result.pricing.premium.price).toBeCloseTo(1875, 5);
  });

  it('never suggests a price below the artisan cost floor', () => {
    const result = calculatePricingService(500, 500, 100, 50, 1, 30);

    expect(result.pricing.minimum.price).toBeGreaterThan(result.baseCost);
    expect(result.pricing.minimum.margin).toBeGreaterThanOrEqual(15);
  });

  it('respects an explicit zero packaging cost', () => {
    const result = calculatePricingService(100, 100, 0, 0, 1, 30);

    expect(result.baseCost).toBe(200);
    expect(result.inputs.packagingCost).toBe(0);
  });

  it('keeps the tiers ordered even for an extreme margin', () => {
    const result = calculatePricingService(1000, 0, 0, 0, 1, 500);

    expect(result.pricing.minimum.price).toBeLessThan(result.pricing.suggested.price);
    expect(result.pricing.suggested.price).toBeLessThan(result.pricing.premium.price);
  });

  it('multiplies the base cost by quantity for the total', () => {
    expect(calculatePricingService(100, 100, 0, 0, 3, 30).totalCost).toBe(600);
  });

  it('parses the string values that FormData sends', () => {
    expect(calculatePricingService('800', '400', '50', '0', '1', '30').baseCost).toBe(1250);
  });
});

describe('market-aware pricing (description analysis)', () => {
  it('leaves prices unchanged when no description is provided', () => {
    const plain = calculatePricingService(800, 400, 50, 0, 1, 30);
    const withEmpty = calculatePricingService(800, 400, 50, 0, 1, 30, '');

    expect(withEmpty.pricing.suggested.price).toBe(plain.pricing.suggested.price);
    expect(withEmpty.analysis.marketMultiplier).toBe(1);
    expect(withEmpty.analysis.effectiveMargin).toBe(plain.inputs.margin);
  });

  it('reports the market analysis block for a saree description', () => {
    const result = calculatePricingService(800, 400, 50, 0, 1, 30, SAREE_DESCRIPTION);

    expect(result.analysis.category).toBe('Textiles & Clothing');
    expect(result.analysis.craft).toBe('Handwoven');
    expect(result.analysis.trend.demand).toBeGreaterThanOrEqual(0);
    expect(result.analysis.trend.demand).toBeLessThanOrEqual(100);
    expect(result.analysis.reasoning.length).toBeGreaterThanOrEqual(3);
  });

  it('nudges the suggested margin up for trending, labour-intensive crafts', () => {
    const trending = calculatePricingService(800, 400, 50, 0, 1, 30, SAREE_DESCRIPTION);
    const plain = calculatePricingService(800, 400, 50, 0, 1, 30, '');

    expect(trending.analysis.marketMultiplier).toBeGreaterThan(1);
    expect(trending.pricing.suggested.margin).toBeGreaterThan(plain.pricing.suggested.margin);
    expect(trending.pricing.suggested.price).toBeGreaterThan(plain.pricing.suggested.price);
  });

  it('honours an explicitly chosen category in the analysis', () => {
    const result = calculatePricingService(100, 50, 0, 0, 1, 30, 'gift item', 'Jewelry & Accessories');

    expect(result.analysis.category).toBe('Jewelry & Accessories');
  });

  it('keeps the tiers ordered when market analysis pushes margins up', () => {
    const result = calculatePricingService(1000, 0, 0, 0, 1, 45, SAREE_DESCRIPTION);

    expect(result.pricing.minimum.price).toBeLessThan(result.pricing.suggested.price);
    expect(result.pricing.suggested.price).toBeLessThan(result.pricing.premium.price);
    expect(result.pricing.suggested.margin).toBeLessThanOrEqual(55);
    expect(result.pricing.premium.margin).toBeLessThanOrEqual(60);
  });

  it('is deterministic for the same description', () => {
    const first = calculatePricingService(100, 50, 0, 0, 1, 30, SAREE_DESCRIPTION);
    const second = calculatePricingService(100, 50, 0, 0, 1, 30, SAREE_DESCRIPTION);

    expect(second.pricing.suggested.price).toBe(first.pricing.suggested.price);
    expect(second.analysis.marketMultiplier).toBe(first.analysis.marketMultiplier);
  });
});

describe('analyzeMarket', () => {
  it('detects embroidery complexity for embroidered goods', () => {
    const analysis = analyzeMarket('hand embroidered silk cushion with kadhai work');

    expect(analysis.craft).toBe('Hand-Embroidered');
    expect(analysis.complexity.index).toBeGreaterThan(1);
  });
});

describe('generateCatalogService', () => {
  it('is deterministic for the same description', () => {
    const first = generateCatalogService(SAREE_DESCRIPTION, 'hi');
    const second = generateCatalogService(SAREE_DESCRIPTION, 'hi');

    expect(second.title).toBe(first.title);
    expect(second.shortDescription).toBe(first.shortDescription);
    expect(second.hindiDescription).toBe(first.hindiDescription);
    expect(second.keywords).toBe(first.keywords);
  });

  it('uses the material and category the artisan actually described', () => {
    const result = generateCatalogService(SAREE_DESCRIPTION, 'hi');

    expect(result.material).toBe('Pure Silk');
    expect(result.category).toBe('Textiles & Clothing');
    expect(result.keywords).toContain('pure silk');
  });

  it('keeps the artisan wording inside the generated copy', () => {
    const result = generateCatalogService(SAREE_DESCRIPTION, 'hi');

    expect(result.englishDescription.toLowerCase()).toContain('handwoven silk saree');
    expect(result.title.toLowerCase()).toContain('saree');
  });

  it('returns a real Hindi description instead of an English copy', () => {
    const result = generateCatalogService(SAREE_DESCRIPTION, 'hi');

    expect(result.hindiDescription).toMatch(/[\u0900-\u097F]/);
    expect(result.hindiDescription).not.toContain('[Hindi]');
    expect(result.hindiDescription).toContain('साड़ी');
    expect(result.hindiDescription).toContain('रेशम');
  });

  it('passes an artisan-written Hindi description straight through', () => {
    const result = generateCatalogService('हाथ से बुनी रेशम की साड़ी', 'hi');

    expect(result.hindiDescription).toBe('हाथ से बुनी रेशम की साड़ी');
  });

  it('still produces a usable listing when the description is empty', () => {
    const result = generateCatalogService('', 'en');

    expect(result.title).toBe('Handmade Product');
    expect(result.category).toBe('Handmade Crafts');
    expect(result.material).toBe('Handmade Material');
    expect(result.hindiDescription).toMatch(/[\u0900-\u097F]/);
  });

  it('lists the detected material for a terracotta vase', () => {
    const result = generateCatalogService('terracotta vase hand painted traditional designs', 'hi');

    expect(result.category).toBe('Pottery & Ceramics');
    expect(result.material).toBe('Terracotta Clay');
    expect(result.keywords).toContain('terracotta clay');
  });
});

describe('generateHindiFallback', () => {
  it('still returns Hindi text for the compatibility helper', () => {
    const hindi = generateHindiFallback('Silk Saree', SAREE_DESCRIPTION);

    expect(hindi).toMatch(/[\u0900-\u097F]/);
    expect(hindi).not.toContain('[Hindi]');
  });
});
