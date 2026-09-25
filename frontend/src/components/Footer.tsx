import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="bg-gray-900 text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">{t('nav.brand')}</h3>
            <p className="text-gray-400">
              {t('footer.tagline')}
            </p>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4">{t('footer.quickLinks', 'Quick Links')}</h4>
            <ul className="space-y-2 text-gray-400">
              <li>
                <a href="/marketplace" className="hover:text-white">
                  {t('nav.marketplace')}
                </a>
              </li>
              <li>
                <a href="/about" className="hover:text-white">
                  {t('footer.aboutUs', 'About Us')}
                </a>
              </li>
              <li>
                <a href="/contact" className="hover:text-white">
                  {t('footer.contact', 'Contact')}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4">{t('footer.support', 'Support')}</h4>
            <ul className="space-y-2 text-gray-400">
              <li>
                <a href="/help" className="hover:text-white">
                  {t('footer.helpCenter', 'Help Center')}
                </a>
              </li>
              <li>
                <a href="/privacy" className="hover:text-white">
                  {t('footer.privacyPolicy')}
                </a>
              </li>
              <li>
                <a href="/terms" className="hover:text-white">
                  {t('footer.termsOfService')}
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>{t('footer.copyright', { year: '2026' })}</p>
        </div>
      </div>
    </footer>
  );
}
