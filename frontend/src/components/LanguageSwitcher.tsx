import { useTranslation } from 'react-i18next';
import { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { languages } from '../i18n';

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const current = languages.find((l) => l.code === i18n.language) || languages[0];

  const pick = (code: string) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center space-x-1.5 rounded-md border border-gray-300 px-2.5 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        aria-label="Change language"
      >
        <Globe className="h-4 w-4" />
        <span>{current.flag}</span>
        {!compact && <span className="hidden sm:inline">{current.nativeName}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          {languages.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => pick(l.code)}
              className={`flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-gray-100 ${
                l.code === i18n.language ? 'font-semibold text-primary-600' : 'text-gray-700'
              }`}
            >
              <span>
                {l.flag} {l.nativeName}
              </span>
              {l.code === i18n.language && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
