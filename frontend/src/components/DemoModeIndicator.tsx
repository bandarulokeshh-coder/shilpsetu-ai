import { Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function DemoModeIndicator() {
  const { t } = useTranslation();
  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="flex items-center gap-2 px-3 py-2 bg-orange-100 border-2 border-orange-400 rounded-full text-orange-800 text-xs font-semibold shadow-lg">
        <Eye className="h-4 w-4" />
        <span>{t('demo.mode', 'DEMO MODE')}</span>
      </div>
    </div>
  );
}
