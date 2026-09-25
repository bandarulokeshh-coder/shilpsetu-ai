import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  const { t } = useTranslation();
  return (
    <div className="text-center py-12">
      <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title || t('empty.title')}</h3>
      {description && <p className="text-gray-600 mb-4">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}
