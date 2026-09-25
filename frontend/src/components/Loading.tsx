import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';

interface LoadingProps {
  children?: ReactNode;
}

export default function Loading({ children }: LoadingProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="h-12 w-12 text-primary-600 animate-spin mb-4" />
      {children && <p className="text-gray-600">{children}</p>}
      {!children && <p className="text-gray-600">{t('common.loading')}</p>}
    </div>
  );
}
