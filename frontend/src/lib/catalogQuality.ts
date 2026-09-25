export interface CatalogQualityInput {
  title?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  enhancedImageUrl?: string | null;
  category?: string | null;
  material?: string | null;
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
  | 'category'
  | 'material'
  | 'dimensions'
  | 'price'
  | 'keywords';

export interface CatalogQualityCheck {
  id: CatalogQualityCheckId;
  /** Form field this check maps to — used to build the "next actions" list. */
  field: string;
  label: string;
  hint: string;
  passed: boolean;
}

export interface CatalogQualityResult {
  score: number;
  completed: number;
  totalCount: number;
  checks: CatalogQualityCheck[];
  /** Fields still missing, in the order the artisan should fill them. */
  nextActions: string[];
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
      field: 'title',
      label: 'Clear product title',
      hint: 'Use a specific title with the craft or product type (8+ characters).',
      passed: hasText(input.title, 8),
    },
    {
      id: 'description',
      field: 'description',
      label: 'Detailed description',
      hint: 'Describe materials, making process and what makes it special (80+ characters).',
      passed: hasText(input.description, 80),
    },
    {
      id: 'image',
      field: 'image',
      label: 'Product photo',
      hint: 'Add a clear photo, ideally enhanced through AI Studio.',
      passed: hasImage,
    },
    {
      id: 'category',
      field: 'category',
      label: 'Category selected',
      hint: 'Pick the closest category so buyers can find your craft.',
      passed: hasText(input.category, 2),
    },
    {
      id: 'material',
      field: 'material',
      label: 'Material specified',
      hint: 'Tell buyers what it is made from — it builds trust and improves filters.',
      passed: hasText(input.material, 2),
    },
    {
      id: 'dimensions',
      field: 'dimensions',
      label: 'Dimensions',
      hint: 'Tell buyers the size or dimensions of the product.',
      passed: hasText(input.dimensions, 2),
    },
    {
      id: 'price',
      field: 'price',
      label: 'Price calculated',
      hint: 'Use the AI pricing assistant to set a fair selling price.',
      passed: hasPrice,
    },
    {
      id: 'keywords',
      field: 'keywords',
      label: 'Search keywords',
      hint: 'Add at least three keywords buyers may use to find this product.',
      passed: keywordCount >= 3,
    },
  ];

  const completed = checks.filter((check) => check.passed).length;
  const nextActions = checks.filter((check) => !check.passed).map((check) => check.field);

  return {
    score: Math.round((completed / checks.length) * 100),
    completed,
    totalCount: checks.length,
    checks,
    nextActions,
  };
}
