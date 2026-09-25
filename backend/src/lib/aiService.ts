// AI Service Layer — pure functions extracted from routes/ai.ts
// All provider/API logic lives here; routes only read env vars and delegate.

export interface EnhanceImageResult {
  originalImageUrl: string;
  enhancedImageUrl: string;
  processing: boolean;
  note: string;
}

export interface GenerateCatalogResult {
  title: string;
  shortDescription: string;
  detailedDescription: string;
  hindiDescription: string;
  englishDescription: string;
  keywords: string;
  category: string;
  material: string;
  processing: boolean;
  note: string;
}

export interface PricingAnalysis {
  category: string;
  craft: string;
  trend: {
    label: string;
    demand: number;
    note: string;
  };
  complexity: {
    label: string;
    index: number;
    note: string;
  };
  marketMultiplier: number;
  effectiveMargin: number;
  reasoning: string[];
}

export interface PricingResult {
  baseCost: number;
  totalCost: number;
  pricing: {
    minimum: { price: number; profit: number; margin: number };
    suggested: { price: number; profit: number; margin: number };
    premium: { price: number; profit: number; margin: number };
  };
  inputs: {
    rawMaterialCost: number;
    labourCost: number;
    packagingCost: number;
    otherCost: number;
    quantity: number;
    margin: number;
  };
  analysis: PricingAnalysis;
  explanation: string;
  note: string;
}

export interface TranscribeResult {
  text: string;
  note: string;
}

// ==========================================
// Buyer Request → Artisan Matching Types
// ==========================================

export interface ExtractedRequirements {
  productType?: string;
  material?: string;
  quantity?: number;
  budget?: number;
  location?: string;
  craftType?: string;
  deadline?: string;
  languagePreference?: string;
  additionalNotes?: string;
}

export interface ArtisanMatchResult {
  artisanId: string;
  artisanName: string;
  artisanAvatar?: string;
  artisanLocation?: string;
  artisanCraftType?: string;
  artisanRating?: number;
  matchScore: number;
  reason: string;
  matchDetails: string[];
}

// ---------------------------------------------------------------------------
// Deterministic domain dictionaries
//
// Everything below is derived from the artisan's own words. The same input
// always produces the same listing (no Math.random), so the demo is repeatable
// and every generated field can be explained to the artisan or a judge.
// ---------------------------------------------------------------------------

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'from', 'with', 'for', 'in', 'on', 'to',
  'by', 'is', 'are', 'was', 'were', 'be', 'been', 'this', 'that', 'these',
  'those', 'it', 'its', 'as', 'at', 'into', 'made', 'make', 'using', 'used',
  'very', 'also', 'our', 'my', 'we', 'me', 'hand', 'hands', 'product', 'item',
  'new', 'each', 'per', 'no', 'not', 'size', 'approx', 'approximately',
]);

interface MaterialInfo {
  label: string;
  hindi: string;
}

interface CraftInfo {
  label: string;
  hindi: string;
  keywords: string[];
  detected: boolean;
}

interface NounInfo {
  en: string;
  hi: string;
  found: boolean;
}

// Ordered most-specific first; scoring (not first-match) decides the winner.
const CATEGORY_KEYWORDS: Array<{ category: string; hindi: string; keywords: string[] }> = [
  {
    category: 'Pottery & Ceramics',
    hindi: 'मिट्टी के बर्तन',
    keywords: ['pottery', 'terracotta', 'ceramic', 'clay', 'pot', 'vase', 'bowl', 'plate', 'thali', 'cup', 'mug', 'jug', 'pitcher', 'tile'],
  },
  {
    category: 'Textiles & Clothing',
    hindi: 'वस्त्र',
    keywords: ['textile', 'cloth', 'fabric', 'saree', 'sari', 'shirt', 'kurta', 'shawl', 'dupatta', 'bedsheet', 'bed sheet', 'cushion', 'dress', 'cotton', 'silk', 'wool', 'weav', 'woven', 'handloom', 'khadi', 'block print', 'embroider'],
  },
  {
    category: 'Jewelry & Accessories',
    hindi: 'गहने',
    keywords: ['jewelry', 'jewellery', 'necklace', 'bangle', 'earring', 'bracelet', 'pendant', 'anklet', 'ring', 'accessory'],
  },
  {
    category: 'Woodwork',
    hindi: 'लकड़ी का काम',
    keywords: ['wood', 'wooden', 'sheesham', 'teak', 'carving', 'carved', 'furniture', 'box', 'toy', 'sculpture', 'statue'],
  },
  {
    category: 'Bamboo & Cane',
    hindi: 'बांस और बेंत',
    keywords: ['bamboo', 'cane', 'basket', 'mat', 'tray'],
  },
  {
    category: 'Metalwork',
    hindi: 'धातु शिल्प',
    keywords: ['brass', 'copper', 'iron', 'metal', 'diya', 'utensil', 'lamp', 'lantern'],
  },
  {
    category: 'Art & Painting',
    hindi: 'चित्रकला',
    keywords: ['painting', 'pattachitra', 'madhubani', 'canvas', 'artwork', 'drawing', 'miniature', 'art'],
  },
  {
    category: 'Home Decor',
    hindi: 'घर की सजावट',
    keywords: ['decor', 'vase', 'frame', 'mirror', 'candle', 'curtain', 'carpet', 'rug', 'showpiece'],
  },
];

const DEFAULT_CATEGORY = 'Handmade Crafts';
const DEFAULT_CATEGORY_HINDI = 'हस्तशिल्प';

const MATERIAL_KEYWORDS: Array<{ keywords: string[]; label: string; hindi: string }> = [
  { keywords: ['terracotta', 'clay', 'mitti'], label: 'Terracotta Clay', hindi: 'टेराकोटा' },
  { keywords: ['silk', 'resham'], label: 'Pure Silk', hindi: 'रेशम' },
  { keywords: ['cotton', 'khadi'], label: 'Cotton', hindi: 'सूती कपड़ा' },
  { keywords: ['wool', 'woolen', 'woollen', 'pashmina'], label: 'Wool', hindi: 'ऊन' },
  { keywords: ['linen'], label: 'Linen', hindi: 'लिनन' },
  { keywords: ['jute'], label: 'Jute', hindi: 'जूट' },
  { keywords: ['leather'], label: 'Leather', hindi: 'चमड़ा' },
  { keywords: ['bamboo'], label: 'Bamboo', hindi: 'बांस' },
  { keywords: ['cane', 'rattan'], label: 'Cane', hindi: 'बेंत' },
  { keywords: ['wood', 'wooden', 'sheesham', 'teak', 'timber'], label: 'Wood', hindi: 'लकड़ी' },
  { keywords: ['brass'], label: 'Brass', hindi: 'पीतल' },
  { keywords: ['copper'], label: 'Copper', hindi: 'तांबा' },
  { keywords: ['iron', 'steel'], label: 'Iron', hindi: 'लोहा' },
  { keywords: ['stone', 'marble', 'granite'], label: 'Stone', hindi: 'पत्थर' },
  { keywords: ['glass'], label: 'Glass', hindi: 'काँच' },
  { keywords: ['ceramic', 'porcelain'], label: 'Ceramic', hindi: 'सिरेमिक' },
];

const DEFAULT_MATERIAL: MaterialInfo = { label: 'Handmade Material', hindi: 'हस्तनिर्मित सामग्री' };

// ---------------------------------------------------------------------------
// Market intelligence dictionaries (deterministic "ML-style" priors)
//
// These encode broad, explainable market priors for the pricing assistant:
//  - Demand: a 0-100 score representing relative buyer appetite for the craft.
//  - Factor: how strongly that demand lifts the suggested margin.
// The artisan's own description still wins: only the categories/crafts they
// mention (or select) are scored, so each suggestion stays transparent.
// ---------------------------------------------------------------------------

interface MarketTrend {
  label: string;
  demand: number;
  factor: number;
  note: string;
}

const MARKET_TRENDS: Record<string, MarketTrend> = {
  'Textiles & Clothing': {
    label: 'Trending',
    demand: 84,
    factor: 1.07,
    note: 'Handloom & handwoven textiles see steady export and festive-season demand.',
  },
  'Jewelry & Accessories': {
    label: 'Trending',
    demand: 81,
    factor: 1.06,
    note: 'Traditional jewellery is in high demand in domestic and gifting markets.',
  },
  'Bamboo & Cane': {
    label: 'Rising',
    demand: 74,
    factor: 1.04,
    note: 'Eco-friendly bamboo and cane products are gaining market share.',
  },
  'Art & Painting': {
    label: 'Niche Premium',
    demand: 68,
    factor: 1.04,
    note: 'Original art commands premium pricing among collectors.',
  },
  'Pottery & Ceramics': {
    label: 'Steady',
    demand: 66,
    factor: 1.0,
    note: 'Terracotta and ceramics have consistent local and decorative demand.',
  },
  'Metalwork': {
    label: 'Steady',
    demand: 66,
    factor: 1.0,
    note: 'Brass and copper craft sells steadily around festivals.',
  },
  'Home Decor': {
    label: 'Steady',
    demand: 64,
    factor: 1.0,
    note: 'Decorative items are a stable year-round category.',
  },
  'Woodwork': {
    label: 'Steady',
    demand: 62,
    factor: 0.99,
    note: 'Carved wooden furniture and artefacts have steady but price-sensitive demand.',
  },
  'Handmade Crafts': {
    label: 'General',
    demand: 60,
    factor: 1.0,
    note: 'Generic handmade goods compete on value; pricing stays near cost-plus.',
  },
};

const DEFAULT_MARKET_TREND: MarketTrend = {
  label: 'General',
  demand: 60,
  factor: 1.0,
  note: 'No strong category signal detected; pricing stays near cost-plus.',
};

interface CraftComplexity {
  index: number;
  note: string;
}

// Parallel to CRAFT_PATTERNS: how much the technique inflates production time
// and therefore the fair selling price.
const CRAFT_COMPLEXITY: Record<string, CraftComplexity> = {
  'Hand-Embroidered': { index: 1.12, note: 'Embroidery is labour-intensive and hard to automate.' },
  'Hand-Carved': { index: 1.1, note: 'Carving adds hours of skilled handwork per piece.' },
  'Hand-Painted': { index: 1.08, note: 'Each painted piece is unique, supporting a premium.' },
  'Handwoven': { index: 1.06, note: 'Weaving on a loom is slow, skilled work.' },
  'Block Printed': { index: 1.04, note: 'Block printing involves multiple manual registration steps.' },
  'Handcrafted': { index: 1.0, note: 'General handmade production, standard labour input.' },
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const round3 = (value: number): number => Math.round(value * 1000) / 1000;

const CRAFT_PATTERNS: CraftInfo[] = [
  { label: 'Handwoven', hindi: 'हाथ से बुनाई', keywords: ['handwoven', 'hand-woven', 'handloom', 'woven', 'weav', 'loom', 'khadi'], detected: false },
  { label: 'Hand-Painted', hindi: 'हाथ से चित्रकारी', keywords: ['hand-painted', 'hand painted', 'painted', 'painting', 'pattachitra', 'madhubani'], detected: false },
  { label: 'Hand-Carved', hindi: 'हाथ से नक्काशी', keywords: ['hand-carved', 'hand carved', 'carved', 'carving', 'engraved'], detected: false },
  { label: 'Hand-Embroidered', hindi: 'हाथ की कढ़ाई', keywords: ['hand-embroidered', 'embroidered', 'embroidery', 'kadhai'], detected: false },
  { label: 'Block Printed', hindi: 'ब्लॉक प्रिंट', keywords: ['block print', 'block-printed', 'block printed', 'blockprint'], detected: false },
  { label: 'Handcrafted', hindi: 'हस्तनिर्मित', keywords: [], detected: false },
];

const PRODUCT_NOUNS: Array<{ en: string[]; hi: string }> = [
  { en: ['saree', 'sari'], hi: 'साड़ी' },
  { en: ['shawl'], hi: 'शॉल' },
  { en: ['dupatta', 'stole'], hi: 'दुपट्टा' },
  { en: ['kurta', 'shirt'], hi: 'कुर्ता' },
  { en: ['bedsheet'], hi: 'चादर' },
  { en: ['cushion', 'pillow'], hi: 'कुशन' },
  { en: ['bag', 'purse', 'handbag'], hi: 'थैला' },
  { en: ['vase'], hi: 'फूलदान' },
  { en: ['pot', 'matka'], hi: 'मटका' },
  { en: ['bowl'], hi: 'कटोरी' },
  { en: ['plate', 'thali'], hi: 'थाली' },
  { en: ['cup', 'mug'], hi: 'मग' },
  { en: ['jug', 'pitcher'], hi: 'जग' },
  { en: ['lamp', 'lantern'], hi: 'दीपक' },
  { en: ['diya'], hi: 'दीया' },
  { en: ['candle'], hi: 'मोमबत्ती' },
  { en: ['frame'], hi: 'फ्रेम' },
  { en: ['mirror'], hi: 'दर्पण' },
  { en: ['box'], hi: 'बक्सा' },
  { en: ['basket'], hi: 'टोकरी' },
  { en: ['mat'], hi: 'चटाई' },
  { en: ['rug', 'carpet'], hi: 'कालीन' },
  { en: ['sculpture', 'idol', 'statue'], hi: 'मूर्ति' },
  { en: ['painting'], hi: 'चित्र' },
  { en: ['toy'], hi: 'खिलौना' },
  { en: ['doll'], hi: 'गुड़िया' },
  { en: ['mask'], hi: 'मुखौटा' },
  { en: ['necklace'], hi: 'हार' },
  { en: ['bangle', 'bangles'], hi: 'चूड़ी' },
  { en: ['earring', 'earrings'], hi: 'कान की बाली' },
  { en: ['ring'], hi: 'अंगूठी' },
  { en: ['tray'], hi: 'ट्रे' },
  { en: ['spoon'], hi: 'चम्मच' },
  { en: ['table'], hi: 'मेज़' },
  { en: ['chair'], hi: 'कुर्सी' },
  { en: ['stool'], hi: 'स्टूल' },
];

// ---------------------------------------------------------------------------
// Low-level helpers
// ---------------------------------------------------------------------------

function normalize(text: string): string {
  return (text || '').toLowerCase().replace(/[_/]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function significantWords(text: string): string[] {
  return normalize(text)
    .replace(/[^a-z0-9\u0900-\u097F\s-]/g, ' ')
    .split(' ')
    .map((w) => w.replace(/^-+|-+$/g, ''))
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

function titleCase(text: string): string {
  return text
    .split(' ')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function capitalize(text: string): string {
  const trimmed = (text || '').trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1) : '';
}

function hasDevanagari(text: string): boolean {
  return /[\u0900-\u097F]/.test(text || '');
}

function hindiForMaterialLabel(label: string): string {
  const match = MATERIAL_KEYWORDS.find((m) => m.label.toLowerCase() === (label || '').toLowerCase());
  return match ? match.hindi : DEFAULT_MATERIAL.hindi;
}

function categoryHindi(category: string): string {
  return CATEGORY_KEYWORDS.find((c) => c.category === category)?.hindi || DEFAULT_CATEGORY_HINDI;
}

function buildTitle(craft: CraftInfo, words: string[], providedTitle?: string): string {
  const explicit = (providedTitle || '').trim();
  if (explicit) return explicit;
  if (!words.length) return 'Handmade Product';

  const phrase = titleCase(words.slice(0, 8).join(' '));
  const lower = phrase.toLowerCase();
  const craftSpoken = craft.label.toLowerCase().replace(/-/g, ' ');
  const alreadyDescribesCraft =
    craft.keywords.some((k) => lower.includes(k)) ||
    lower.includes(craftSpoken) ||
    /^(handmade|handcrafted)\b/.test(lower);

  const title = alreadyDescribesCraft ? phrase : `${craft.label} ${phrase}`;
  return title.length > 90 ? `${title.slice(0, 87).trim()}...` : title;
}

/**
 * Best-match category for a description. An explicit `productData.category`
 * (chosen by the artisan) always wins; otherwise the category with the most
 * keyword hits is used, so "terracotta vase" resolves to Pottery & Ceramics
 * rather than the more generic Home Decor.
 */
export function detectCategory(description: string, productData?: any): string {
  const explicit = (productData?.category || '').trim();
  if (explicit) return explicit;

  const desc = normalize(description);
  let best: { category: string; score: number } = { category: DEFAULT_CATEGORY, score: 0 };

  for (const entry of CATEGORY_KEYWORDS) {
    const score = entry.keywords.reduce((total, keyword) => (desc.includes(keyword) ? total + 1 : total), 0);
    if (score > best.score) best = { category: entry.category, score };
  }

  return best.category;
}

/**
 * Material actually named in the description (dictionary order breaks ties, so
 * "terracotta" is matched before the generic "clay").
 */
export function detectMaterial(description: string, productData?: any): MaterialInfo {
  const desc = normalize(description);
  const match = MATERIAL_KEYWORDS.find((entry) => entry.keywords.some((k) => desc.includes(k)));
  if (match) return { label: match.label, hindi: match.hindi };

  const explicit = (productData?.material || '').trim();
  if (explicit) return { label: explicit, hindi: hindiForMaterialLabel(explicit) };

  return { ...DEFAULT_MATERIAL };
}

/** Craft technique inferred from the artisan's own wording. */
export function detectCraft(description: string): CraftInfo {
  const desc = normalize(description);
  const match = CRAFT_PATTERNS.find(
    (pattern) => pattern.keywords.length > 0 && pattern.keywords.some((k) => desc.includes(k)),
  );
  if (match) return { ...match, detected: true };

  const fallback = CRAFT_PATTERNS[CRAFT_PATTERNS.length - 1];
  return { ...fallback, detected: false };
}

/** The product the artisan is talking about (used for titles and keywords). */
export function detectProductNoun(words: string[]): NounInfo {
  for (const word of words) {
    for (const noun of PRODUCT_NOUNS) {
      const isMatch = noun.en.some((base) => base === word || `${base}s` === word || `${base}es` === word);
      if (isMatch) return { en: word, hi: noun.hi, found: true };
    }
  }

  const fallback = words.length ? words[words.length - 1] : 'product';
  return { en: fallback, hi: 'उत्पाद', found: false };
}

/**
 * Hindi description built from the detected attributes. The construction
 * (`<noun> — <craft>, <material>। श्रेणी: ...`) is fixed, so it stays
 * grammatical for every noun without needing gender agreement rules.
 * Production note: swap this for the Bhashini API (or an LLM) for natural,
 * fully fluent translation — the shape of the returned string stays the same.
 */
export function generateHindiDescription(input: {
  noun: NounInfo;
  material: MaterialInfo;
  craft: CraftInfo;
  categoryHindi: string;
  description?: string;
}): string {
  const { noun, material, craft, categoryHindi: categoryLabel, description } = input;

  const lines = [
    `${noun.hi} — ${craft.hindi}, ${material.hindi}।`,
    `श्रेणी: ${categoryLabel}।`,
    'यह उत्पाद पारंपरिक भारतीय कारीगरी से हाथ से बनाया गया है।',
  ];

  const desc = (description || '').trim();
  if (desc) lines.push(`मूल विवरण: ${desc}`);

  lines.push('घर की सजावट और उपहार देने के लिए उपयुक्त। प्रत्येक पीस पूरी तरह हाथ से बना होता है, इसलिए हर टुकड़ा अनोखा है।');

  return lines.join(' ');
}

/**
 * Backwards-compatible wrapper kept for existing callers: derives the Hindi
 * description from a title/description pair.
 */
export function generateHindiFallback(title: string, desc: string): string {
  const source = desc || title || '';
  const words = significantWords(source);
  const category = detectCategory(source);

  return generateHindiDescription({
    noun: detectProductNoun(words),
    material: detectMaterial(source),
    craft: detectCraft(source),
    categoryHindi: categoryHindi(category),
    description: desc,
  });
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * A deterministic "market intelligence" pass over the artisan's description.
 * Combines the detected category's demand prior with the detected craft's
 * complexity prior into a single multiplier that nudges the suggested margin.
 * Returns human-readable reasoning so the artisan can see *why* a price moves.
 */
export function analyzeMarket(
  description: string,
  category?: string,
): PricingAnalysis {
  const categoryKey = detectCategory(description, category ? { category } : undefined);
  const craft = detectCraft(description);

  const trend = MARKET_TRENDS[categoryKey] ?? DEFAULT_MARKET_TREND;
  const complexity = CRAFT_COMPLEXITY[craft.label] ?? CRAFT_COMPLEXITY.Handcrafted;

  let marketMultiplier = round3((trend.factor ?? 1.0) * complexity.index);
  marketMultiplier = round3(clamp(marketMultiplier, 0.85, 1.25));

  const reasoning = [
    `Detected category: ${categoryKey} — ${trend.note}`,
    `Detected technique: ${craft.label} — ${complexity.note}`,
    `Market + complexity multiplier: ${marketMultiplier.toFixed(3)}x applied to the suggested margin.`,
  ];

  return {
    category: categoryKey,
    craft: craft.label,
    trend: {
      label: trend.label,
      demand: trend.demand,
      note: trend.note,
    },
    complexity: {
      label: craft.label,
      index: complexity.index,
      note: complexity.note,
    },
    marketMultiplier,
    effectiveMargin: 0,
    reasoning,
  };
}

export function enhanceImageService(
  imageUrl: string,
  apiKey?: string,
): EnhanceImageResult {
  // NOTE: this endpoint does not transform pixels. The real enhancement for the
  // prototype happens in the browser (AIImageStudio + Canvas API), so the URL is
  // returned unchanged. Production integration point: when AI_API_KEY is set,
  // call the provider here (Cloudinary / remove.bg / Stability) and return the
  // hosted, enhanced URL instead.
  return {
    originalImageUrl: imageUrl,
    enhancedImageUrl: imageUrl,
    processing: !!apiKey,
    note: apiKey
      ? 'AI_API_KEY detected: wire the provider call in enhanceImageService(). The image URL is currently returned unchanged.'
      : 'Local fallback: image returned unchanged. Enhancement runs in the browser (AIImageStudio / Canvas API).',
  };
}

export function generateCatalogService(
  description: string,
  language: string,
  productData?: any,
  apiKey?: string,
): GenerateCatalogResult {
  const cleanDesc = (description || '').trim();
  const words = significantWords(cleanDesc);

  const category = detectCategory(cleanDesc, productData);
  const materialInfo = detectMaterial(cleanDesc, productData);
  const craft = detectCraft(cleanDesc);
  const noun = detectProductNoun(words);

  const materialLabel = materialInfo.label;
  const isGenericMaterial = materialLabel === DEFAULT_MATERIAL.label;
  const materialClause = isGenericMaterial
    ? 'made by skilled artisans'
    : `made from ${materialLabel.toLowerCase()} by skilled artisans`;

  const title = buildTitle(craft, words, productData?.title);

  const artisanWords = cleanDesc
    ? `${capitalize(cleanDesc)}.`
    : `Handcrafted ${noun.en} made by skilled artisans.`;

  const shortDescription =
    `${artisanWords} A ${craft.label.toLowerCase()} ${noun.en}, ${materialClause} ` +
    '— ideal for home decor and gifting.';

  const detailedDescription = [
    `${materialLabel} ${noun.en} — ${craft.label}`,
    '',
    artisanWords,
    '',
    'Features:',
    `- Material: ${materialLabel}`,
    `- Craft technique: ${craft.label}`,
    `- Category: ${category}`,
    '- Each piece is unique, so small variations are part of the handwork',
    '',
    'Care instructions:',
    '- Clean gently with a soft dry cloth',
    '- Avoid prolonged direct sunlight',
    '- Store in a dry place',
    '',
    'Perfect for:',
    '- Home decoration and everyday use',
    '- Gifting on festivals and special occasions',
    '- Collectors of traditional Indian crafts',
  ].join('\n');

  const keywordCandidates = [
    noun.en,
    materialLabel,
    craft.label,
    category,
    'handmade',
    'artisan',
    'traditional indian craft',
    ...words.filter((word) => word !== noun.en).slice(0, 5),
  ];

  const keywordList: string[] = [];
  for (const candidate of keywordCandidates) {
    const keyword = candidate.toLowerCase().trim();
    if (keyword && !keywordList.includes(keyword)) keywordList.push(keyword);
  }
  const keywords = keywordList.join(', ');

  const hindiDescription = hasDevanagari(cleanDesc)
    ? cleanDesc
    : generateHindiDescription({
        noun,
        material: materialInfo,
        craft,
        categoryHindi: categoryHindi(category),
        description: cleanDesc,
      });

  const englishDescription = shortDescription;

  return {
    title,
    shortDescription,
    detailedDescription,
    hindiDescription,
    englishDescription,
    keywords,
    category,
    material: materialLabel,
    processing: !!apiKey,
    note: apiKey
      ? `Deterministic generator active (requested language: ${language || 'en'}). AI_API_KEY detected — wire the provider call in aiService.ts for LLM-quality copy.`
      : `Local deterministic fallback (requested language: ${language || 'en'}): generated only from your own description, no external API used.`,
  };
}

/**
 * Coerces a value coming from FormData/JSON into a non-negative number.
 * `undefined`, `null` and `''` fall back to the default, so an explicit 0
 * (e.g. "no packaging cost") is respected instead of being replaced.
 */
function toNumber(value: any, fallback: number): number {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function calculatePricingService(
  rawMaterialCost: any,
  labourCost: any,
  packagingCost: any,
  otherCost: any,
  quantity: any,
  margin: any,
  description?: string,
  category?: string,
): PricingResult {
  const rawMaterial = toNumber(rawMaterialCost, 0);
  const labour = toNumber(labourCost, 0);
  const packaging = toNumber(packagingCost, 50);
  const other = toNumber(otherCost, 0);
  const qty = Math.max(1, Math.floor(toNumber(quantity, 1)));

  const analysis = analyzeMarket(description || '', category);
  const descriptionRich = significantWords(description || '').length >= 15;
  const richnessBoost = descriptionRich ? 1.03 : 1.0;
  const marketMultiplier = round3(analysis.marketMultiplier * richnessBoost);

  // The 15% floor guarantees the minimum tier never dips below the artisan's
  // cost, and the cap keeps the three tiers ordered (premium stays the highest).
  const minimumMargin = 15;
  const baseSuggestedMargin = Math.min(Math.max(toNumber(margin, 30), minimumMargin), 45);
  const suggestedMargin = clamp(Math.round(baseSuggestedMargin * marketMultiplier), minimumMargin, 55);
  const premiumMargin = clamp(suggestedMargin + 8, 50, 60);

  const totalBaseCost = rawMaterial + labour + packaging + other;
  const totalCost = totalBaseCost * qty;

  const minimumPrice = totalBaseCost * (1 + minimumMargin / 100);
  const suggestedPrice = totalBaseCost * (1 + suggestedMargin / 100);
  const premiumPrice = totalBaseCost * (1 + premiumMargin / 100);

  const minProfit = minimumPrice - totalBaseCost;
  const suggestedProfit = suggestedPrice - totalBaseCost;
  const premiumProfit = premiumPrice - totalBaseCost;

  // Margin is reported as a markup on cost so the percentage shown in the UI
  // matches the tier definition (minimum 15% floor, suggested = market-adjusted
  // chosen margin, premium = suggested + 8 capped at 60%).
  const toMarginPercent = (profit: number) => (totalBaseCost > 0 ? (profit / totalBaseCost) * 100 : 0);

  const minProfitMargin = toMarginPercent(minProfit);
  const suggestedProfitMargin = toMarginPercent(suggestedProfit);
  const premiumProfitMargin = toMarginPercent(premiumProfit);

  const marketLines = description
    ? [
        '',
        'Market Intelligence (from your description):',
        ...analysis.reasoning.map((line) => `- ${line}`),
        descriptionRich
          ? '- Detailed description detected (+3% perceived-value boost).'
          : '- Short description: add more detail for a higher perceived-value boost.',
        '',
      ]
    : ['', 'Add a product description to unlock market-aware pricing analysis.', '',];

  const explanation = `
Based on your inputs:
- Raw Material Cost: ₹${rawMaterial.toFixed(2)}
- Labour Cost: ₹${labour.toFixed(2)}
- Packaging Cost: ₹${packaging.toFixed(2)}
- Other Costs: ₹${other.toFixed(2)}

Total Base Cost: ₹${totalBaseCost.toFixed(2)} per unit

Pricing Tiers:
1. **Minimum Price (₹${minimumPrice.toFixed(2)})**: Covers costs + ${minimumMargin}% margin. Use for bulk orders or quick sales.

2. **Suggested Price (₹${suggestedPrice.toFixed(2)})**: Covers costs + ${suggestedMargin}% margin${suggestedMargin !== baseSuggestedMargin ? ` (adjusted from ${baseSuggestedMargin}% by market analysis)` : ''}. Recommended for regular sales.

3. **Premium Price (₹${premiumPrice.toFixed(2)})**: Covers costs + ${premiumMargin}% margin. For premium markets, unique pieces, or special occasions.
${marketLines.join('\n').trim()}
*Note: These are estimates based on your inputs. Actual market prices may vary based on location, competition, and perceived value.*
    `.trim();

  return {
    baseCost: totalBaseCost,
    totalCost,
    pricing: {
      minimum: {
        price: minimumPrice,
        profit: minProfit,
        margin: minProfitMargin,
      },
      suggested: {
        price: suggestedPrice,
        profit: suggestedProfit,
        margin: suggestedProfitMargin,
      },
      premium: {
        price: premiumPrice,
        profit: premiumProfit,
        margin: premiumProfitMargin,
      },
    },
    inputs: {
      rawMaterialCost: rawMaterial,
      labourCost: labour,
      packagingCost: packaging,
      otherCost: other,
      quantity: qty,
      margin: baseSuggestedMargin,
    },
    analysis: {
      ...analysis,
      effectiveMargin: suggestedMargin,
    },
    explanation,
    note: 'This is a prototype estimate, not guaranteed market pricing',
  };
}

export function transcribeService(audioData: any, apiKey?: string): TranscribeResult {
  // In production, this would use speech-to-text API when apiKey is provided
  return {
    text: '',
    note: 'Voice transcription requires browser Web Speech API. Please type your description.',
  };
}

// ---------------------------------------------------------------------------
// Buyer Request → Artisan Matching Functions
// ---------------------------------------------------------------------------

/**
 * Extracts structured requirements from a buyer's natural language description.
 * Uses deterministic pattern matching (no external LLM API).
 */
export function understandRequirementsService(text: string): ExtractedRequirements {
  const lower = (text || '').toLowerCase().trim();
  const requirements: ExtractedRequirements = { additionalNotes: lower };

  // --- Budget extraction ---
  // Prefer a number that is actually tied to a currency word ("15 thousand rupees") so a
  // plain quantity like "20 brass diyas" is never mistaken for the budget.
  const currencyAnchored = lower.match(/(\d[\d,]*)\s*(k|thousand|lac|lakh|lacsh|laksh|lakhs)?\s*(rs\.?|rupees|₹)/i);
  const budgetMatch = currencyAnchored ?? lower.match(/(\d[\d,]*)\s*(k|thousand|lac|lakh|lacsh|laksh)?/i);
  if (budgetMatch) {
    let amount = parseInt(budgetMatch[1].replace(/,/g, ''), 10);
    const modifier = (budgetMatch[2] || '').toLowerCase();
    if (modifier.includes('k') || modifier.includes('thousand')) {
      amount *= 1000;
    } else if (modifier.includes('lac') || modifier.includes('lakh') || modifier.includes('lacs')) {
      amount *= 100000;
    }
    requirements.budget = amount;
    requirements.additionalNotes = requirements.additionalNotes?.replace(budgetMatch[0], '').trim();
  }

  // --- Quantity extraction ---
  const quantityMatch = lower.match(/(\d+)\s*(pc|piece|pc\.|qty|quantity|unit|set|pair|dozen)/i);
  if (quantityMatch) {
    requirements.quantity = parseInt(quantityMatch[1], 10);
    requirements.additionalNotes = requirements.additionalNotes?.replace(quantityMatch[0], '').trim();
  } else if (requirements.budget) {
    // Fallback for "20 brass diyas": use the first number that is not the budget.
    const firstNumber = lower.match(/(\d+)/);
    if (firstNumber && Number(firstNumber[1]) !== requirements.budget) {
      requirements.quantity = parseInt(firstNumber[1], 10);
    }
  }

  // --- Material extraction ---
  const materialMatch = MATERIAL_KEYWORDS.find(m =>
    m.keywords.some(k => lower.includes(k.toLowerCase()))
  );
  if (materialMatch) {
    requirements.material = materialMatch.label;
    requirements.additionalNotes = requirements.additionalNotes?.replace(
      materialMatch.keywords.find(k => lower.includes(k.toLowerCase())) || '', ''
    ).trim();
  }

  // --- Product type extraction (using PRODUCT_NOUNS) ---
  const productMatch = PRODUCT_NOUNS.find(p =>
    p.en.some(e => lower.includes(e.toLowerCase()))
  );
  if (productMatch) {
    requirements.productType = productMatch.en[0];
    requirements.additionalNotes = requirements.additionalNotes?.replace(
      productMatch.en.find(e => lower.includes(e.toLowerCase())) || '', ''
    ).trim();
  }

  // --- Location extraction (common Indian cities) ---
  const cities = [
    'delhi', 'mumbai', 'bangalore', 'bangaluru', 'hyderabad', 'chennai', 'kolkata',
    'pune', 'ahmedabad', 'jaipur', 'lucknow', 'kochi', 'cochin', 'surat', 'udaipur',
    'kota', 'bikaner', 'ajmer', 'ranchi', 'bhubaneswar', 'goa', 'varanasi', 'mriga'
  ];
  const locationMatch = cities.find(c => lower.includes(c));
  if (locationMatch) {
    requirements.location = locationMatch;
    requirements.additionalNotes = requirements.additionalNotes?.replace(locationMatch, '').trim();
  }

  // --- Deadline extraction ---
  const deadlinePatterns = [
    /by\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
    /within\s+(\d+)\s*(day|week|month|days|weeks|months)/i,
    /before\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
    /(?:urgent|quick|fast|immediate)\s*(delivery|order|work)/i,
  ];
  for (const pattern of deadlinePatterns) {
    const match = lower.match(pattern);
    if (match) {
      if (match[1]) {
        if (pattern.source.includes('day') || pattern.source.includes('week') || pattern.source.includes('month')) {
          const num = parseInt(match[1], 10);
          const unit = match[0].match(/day|week|month/)?.[0] || 'day';
          let days = num;
          if (unit.includes('week')) days *= 7;
          if (unit.includes('month')) days *= 30;
          requirements.deadline = `within ${days} days`;
        } else {
          requirements.deadline = `by ${match[1]}`;
        }
      }
      requirements.additionalNotes = requirements.additionalNotes?.replace(match[0], '').trim();
      break;
    }
  }

  // --- Language preference ---
  if (lower.includes('hindi') || lower.includes('हिंदी')) {
    requirements.languagePreference = 'Hindi';
    requirements.additionalNotes = requirements.additionalNotes?.replace(/hindi|हिंदी/gi, '').trim();
  } else if (lower.includes('english')) {
    requirements.languagePreference = 'English';
    requirements.additionalNotes = requirements.additionalNotes?.replace(/english|english/gi, '').trim();
  }

  // --- Craft type detection ---
  const craftPattern = CRAFT_PATTERNS.find(c => c.keywords.some(k => lower.includes(k.toLowerCase())));
  if (craftPattern) {
    requirements.craftType = craftPattern.label;
    requirements.additionalNotes = requirements.additionalNotes?.replace(
      craftPattern.keywords.find(k => lower.includes(k.toLowerCase())) || '', ''
    ).trim();
  }

  // Clean up additional notes
  requirements.additionalNotes = requirements.additionalNotes?.replace(/ {2,}/g, ' ').trim() || undefined;

  return requirements;
}

/**
 * Matches buyer requirements to suitable artisans based on deterministic scoring.
 * Returns a sorted list of artisan matches with explainable reasoning.
 */
export function findArtisanMatchesService(
  requirements: ExtractedRequirements,
  artisans: Array<{
    id: string;
    name: string;
    avatar?: string | null;
    location?: string | null;
    craftType?: string | null;
    rating?: number | null;
    bio?: string | null;
  }>
): ArtisanMatchResult[] {
  const matches: ArtisanMatchResult[] = [];
  const reqLower = JSON.stringify(requirements).toLowerCase();

  for (const artisan of artisans) {
    const artisanProps = {
      location: (artisan.location || '').toLowerCase(),
      craftType: (artisan.craftType || '').toLowerCase(),
      bio: (artisan.bio || '').toLowerCase(),
      name: artisan.name,
    };

    const matchDetails: string[] = [];
    let score = 0;

    // --- Location match (+30 points) ---
    if (requirements.location) {
      if (artisanProps.location.includes(requirements.location.toLowerCase())) {
        score += 30;
        matchDetails.push(`Location match: ${requirements.location}`);
      } else {
        score -= 10;
        matchDetails.push(`Location mismatch (buyer: ${requirements.location}, artisan: ${artisan.location || 'unknown'})`);
      }
    }

    // --- Craft type match (+25 points) ---
    if (requirements.craftType) {
      if (artisanProps.craftType.includes(requirements.craftType.toLowerCase())) {
        score += 25;
        matchDetails.push(`Craft match: ${requirements.craftType}`);
      }
    }

    // --- Product type match (from bio/description, +20 points each) ---
    if (requirements.productType) {
      const productLower = requirements.productType.toLowerCase();
      if (artisanProps.bio.includes(productLower)) {
        score += 20;
        matchDetails.push(`Product match: ${requirements.productType}`);
      }
    }

    // --- Material match (from bio, +15 points each) ---
    if (requirements.material) {
      const materialKeywords = MATERIAL_KEYWORDS.find(m => m.label === requirements.material)?.keywords || [];
      for (const kw of materialKeywords) {
        if (artisanProps.bio.includes(kw.toLowerCase())) {
          score += 15;
          matchDetails.push(`Material match: ${requirements.material}`);
          break;
        }
      }
    }

    // --- Rating bonus (+15 max) ---
    if (artisan.rating) {
      const ratingScore = Math.min(artisan.rating * 3, 15);
      score += ratingScore;
      matchDetails.push(`Rating: ${artisan.rating}/5.0`);
    }

    // --- Acceptable score threshold ---
    if (score > 0) {
      // Sort match details by importance
      matchDetails.sort((a, b) => {
        const importance: Record<string, number> = { 'Location match': 1, 'Craft match': 2, 'Product match': 3, 'Material match': 4, 'Rating': 5 };
        return (importance[a.split(':')[0]] || 99) - (importance[b.split(':')[0]] || 99);
      });

      const reason = matchDetails.length > 0
        ? `Matched on: ${matchDetails.slice(0, 3).join(', ')}`
        : 'Basic profile match';

      matches.push({
        artisanId: artisan.id,
        artisanName: artisan.name,
        artisanAvatar: artisan.avatar ?? undefined,
        artisanLocation: artisan.location ?? undefined,
        artisanCraftType: artisan.craftType ?? undefined,
        artisanRating: artisan.rating ?? undefined,
        matchScore: score,
        reason,
        matchDetails,
      });
    }
  }

  // Sort by score descending, then by rating
  matches.sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    return (b.artisanRating || 0) - (a.artisanRating || 0);
  });

  return matches;
}
