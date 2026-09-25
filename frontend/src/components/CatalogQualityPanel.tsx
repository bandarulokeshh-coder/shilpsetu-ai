import { CheckCircle2, Circle, ClipboardCheck, Image, Package, Tag } from 'lucide-react';
import type { CatalogQualityCheckId, CatalogQualityInput } from '../lib/catalogQuality';
import { evaluateCatalogQuality } from '../lib/catalogQuality';
import { useTranslation } from 'react-i18next';

const CHECK_ICONS: Record<CatalogQualityCheckId, typeof CheckCircle2> = {
  title: ClipboardCheck,
  description: ClipboardCheck,
  image: Image,
  category: Tag,
  material: Package,
  dimensions: Package,
  keywords: Tag,
  price: CheckCircle2,
};

const LABELS: Record<CatalogQualityCheckId, string> = {
  title: 'Clear title (8+ characters)',
  description: 'Detailed description (80+ characters)',
  image: 'Product photo added',
  category: 'Category selected',
  material: 'Material specified',
  dimensions: 'Dimensions provided',
  keywords: 'At least 3 search keywords',
  price: 'Price calculated',
};

interface CatalogQualityPanelProps {
  product: CatalogQualityInput;
  compact?: boolean;
}

export default function CatalogQualityPanel({ product, compact = false }: CatalogQualityPanelProps) {
  const { t } = useTranslation();
  const result = evaluateCatalogQuality(product);
  const scoreColor = result.score >= 80 ? 'text-green-600' : result.score >= 50 ? 'text-amber-600' : 'text-red-600';

  if (compact) {
    return (
      <div className="flex items-center gap-2" title={t('catalogQuality.summary', 'Catalog quality')}>
        <span className={`text-lg font-bold ${scoreColor}`}>{result.score}%</span>
        <div className="w-20 h-2 rounded-full bg-gray-200 overflow-hidden" aria-hidden="true">
          <div className={`h-full rounded-full ${result.score >= 80 ? 'bg-green-500' : result.score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${result.score}%` }} />
        </div>
        <span className="text-xs text-gray-500">
          {result.completed}/{result.totalCount} {t('catalogQuality.checks', 'checks')}
        </span>
      </div>
    );
  }

  return (
    <section className="p-4 border border-primary-200 bg-primary-50 rounded-lg" aria-label={t('catalogQuality.title')}>
      <div className="flex items-center justify-between gap-4 mb-3">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary-600" />
            {t('catalogQuality.title')}
          </h3>
          <p className="text-xs text-gray-600 mt-1">{t('catalogQuality.description')}</p>
        </div>
        <div className="text-right">
          <span className={`text-2xl font-bold ${scoreColor}`}>{result.score}</span>
          <span className="text-sm text-gray-600">/100</span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-white overflow-hidden mb-4" aria-hidden="true">
        <div className={`h-full rounded-full ${result.score >= 80 ? 'bg-green-500' : result.score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${result.score}%` }} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {result.checks.map((item) => {
          const Icon = CHECK_ICONS[item.id];
          const label = t(`catalogQuality.checksList.${item.id}`, LABELS[item.id]);
          return (
            <div key={item.id} className={`flex items-center gap-2 text-sm ${item.passed ? 'text-green-700' : 'text-gray-600'}`}>
              {item.passed ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <Circle className="h-4 w-4 shrink-0" />}
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
