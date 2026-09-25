import { useTranslation } from 'react-i18next';
import { CheckCircle2, Circle } from 'lucide-react';
import { CatalogQualityResult } from '../lib/catalogQuality';

interface CatalogQualityChecklistProps {
  result: CatalogQualityResult;
  className?: string;
  compact?: boolean;
}

export default function CatalogQualityChecklist({
  result,
  className = '',
  compact = false,
}: CatalogQualityChecklistProps) {
  const { t } = useTranslation();
  const scoreColor = result.score >= 80 ? 'text-green-600' : result.score >= 50 ? 'text-amber-600' : 'text-rose-600';

  if (compact) {
    return (
      <div className={`rounded-lg border border-gray-200 bg-gray-50 p-3 ${className}`}>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-gray-700">{t('catalogQuality.title', 'Catalog quality')}</span>
          <span className={`text-sm font-bold ${scoreColor}`}>{result.score}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
          <div className={`h-full rounded-full ${result.score >= 80 ? 'bg-green-500' : result.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${result.score}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border border-primary-100 bg-primary-50 p-4 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-primary-900">{t('catalogQuality.title', 'Catalog quality checklist')}</h3>
          <p className="text-sm text-primary-700">
            {t('catalogQuality.completed', { completed: result.completedCount, total: result.totalCount })}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-3xl font-bold ${scoreColor}`}>{result.score}%</p>
          <p className="text-xs text-primary-700">{t('catalogQuality.ready', 'Ready to attract buyers')}</p>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-primary-100">
        <div className={`h-full rounded-full ${result.score >= 80 ? 'bg-green-500' : result.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${result.score}%` }} />
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {result.checks.map((check) => (
          <div key={check.id} className="flex items-start gap-2 text-sm">
            {check.completed ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-primary-300" />
            )}
            <div>
              <p className={check.completed ? 'text-gray-700' : 'font-medium text-primary-900'}>
                {t(`catalogQuality.${check.id}`, check.label)}
              </p>
              {!check.completed && <p className="text-xs text-primary-700">{check.hint}</p>}
            </div>
          </div>
        ))}
      </div>

      {result.nextStep && (
        <p className="mt-4 rounded-md bg-white/70 p-3 text-sm text-primary-800">
          <strong>{t('catalogQuality.nextStep', 'Next step:')}</strong> {result.nextStep}
        </p>
      )}
    </div>
  );
}
