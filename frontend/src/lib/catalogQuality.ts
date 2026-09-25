export interface CatalogQualityInput {
  title?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  enhancedImageUrl?: string | null;
  suggestedPrice?: number | null;
  minimumPrice?: number | null;
  premiumPrice?: number | null;
  dimensions?: string | null;
  keywords?: string | null;
}

export type CatalogQualityCheckId =
  | 'title'
  | 'description'
  | 'image'
  | 'pricing'
  | 'dimensions'
  | 'keywords';

export interface CatalogQualityCheck {
  id: CatalogQualityCheckId;
  label: string;
  hint: string;
  completed: boolean;
}

export interface CatalogQualityResult {
  score: number;
  completedCount: number;
  totalCount: number;
  checks: CatalogQualityCheck[];
  nextStep?: string;
}

const hasText = (value: string | null | undefined, minimumLength: number): boolean =>
  (value ?? '').trim().length >= minimumLength;

/** Scores the information a buyer needs to confidently purchase a listing. */
export function evaluateCatalogQuality(input: CatalogQualityInput): CatalogQualityResult {
  const keywordCount = (input.keywords ?? '')
    .split(',')
    .map((keyword) => keyword.trim())
    .filter(Boolean).length;
  const hasImage = Boolean(input.imageUrl?.trim() || input.enhancedImageUrl?.trim());
  const hasPrice = [input.suggestedPrice, input.minimumPrice, input.premiumPrice].some(
    (price) => typeof price === 'number' && price > 0
  );

  const checks: CatalogQualityCheck[] = [
    {
      id: 'title',
      label: 'Clear product title',
      hint: 'Use a specific title with the craft or product type.',
      completed: hasText(input.title, 8),
    },
    {
      id: 'description',
      label: 'Detailed description',
      hint: 'Describe materials, making process, and what makes it special.',
      completed: hasText(input.description, 40),
    },
    {
      id: 'image',
      label: 'Product photo',
      hint: 'Add a clear photo, ideally enhanced through AI Studio.',
      completed: hasImage,
    },
    {
      id: 'pricing',
      label: 'Price guidance',
      hint: 'Set a selling price so buyers can understand the offer.',
      completed: hasPrice,
    },
    {
      id: 'dimensions',
      label: 'Dimensions',
      hint: 'Tell buyers the size or dimensions of the product.',
      completed: hasText(input.dimensions, 2),
    },
    {
      id: 'keywords',
      label: 'Search keywords',
      hint: 'Add at least two keywords buyers may use to find this product.',
      completed: keywordCount >= 2,
    },
  ];

  const completedCount = checks.filter((check) => check.completed).length;
  const nextStep = checks.find((check) => !check.completed)?.hint;

  return {
    score: Math.round((completedCount / checks.length) * 100),
    completedCount,
    totalCount: checks.length,
    checks,
    nextStep,
  };
}
