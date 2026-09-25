import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import { Sparkles, TrendingUp, Users, Globe, CheckCircle } from 'lucide-react';

export default function LandingPage() {
  const { t } = useTranslation();
  const demoSteps = [
    { id: 1, label: t('demo.step1', 'Login as Artisan'), path: '/login' },
    { id: 2, label: t('demo.step2', 'Upload product image'), path: '/create-product' },
    { id: 3, label: t('demo.step3', 'Enter description'), path: '/create-product' },
    { id: 4, label: t('demo.step4', 'Generate catalog'), path: '/create-product' },
    { id: 5, label: t('demo.step5', 'Review listing'), path: '/create-product' },
    { id: 6, label: t('demo.step6', 'View pricing'), path: '/create-product' },
    { id: 7, label: t('demo.step7', 'Publish product'), path: '/create-product' },
    { id: 8, label: t('demo.step8', 'Browse marketplace & enquiry'), path: '/marketplace' },
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              {t('landing.heroTitle')}
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
              {t('landing.heroSubtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="btn bg-white text-primary-600 hover:bg-gray-100">
                {t('landing.getStarted')}
              </Link>
              <Link to="/marketplace" className="btn bg-primary-800 text-white hover:bg-primary-900">
                {t('landing.browseMarketplace')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            {t('landing.howItHelps')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={<Sparkles className="h-12 w-12 text-primary-600" />}
              title={t('landing.features.aiImageStudio')}
              description={t('landing.features.aiImageStudioDesc')}
            />
            <FeatureCard
              icon={<Globe className="h-12 w-12 text-primary-600" />}
              title={t('landing.features.multilingualCataloging')}
              description={t('landing.features.multilingualCatalogingDesc')}
            />
            <FeatureCard
              icon={<TrendingUp className="h-12 w-12 text-primary-600" />}
              title={t('landing.features.smartPricing')}
              description={t('landing.features.smartPricingDesc')}
            />
            <FeatureCard
              icon={<Users className="h-12 w-12 text-primary-600" />}
              title={t('landing.features.directMarketAccess')}
              description={t('landing.features.directMarketAccessDesc')}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gray-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">{t('landing.readyToStart')}</h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            {t('landing.joinThousands')}
          </p>
          <Link to="/register" className="btn-primary text-lg px-8 py-3">
            {t('landing.createFreeAccount')}
          </Link>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatCard number="1000+" label={t('landing.stats.artisans')} />
            <StatCard number="5000+" label={t('landing.stats.products')} />
            <StatCard number="10000+" label={t('landing.stats.buyers')} />
            <StatCard number="₹50L+" label={t('landing.stats.salesGenerated')} />
          </div>
        </div>
      </section>

      {/* Guided Demo Flow */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            {t('landing.guidedDemoFlow')}
          </h2>
          <p className="text-center text-gray-600 mb-10 max-w-2xl mx-auto">
            {t('landing.clickAnyStep')}
          </p>
          <div className="flex overflow-x-auto gap-4 pb-4 md:grid md:grid-cols-2 lg:grid-cols-4 lg:overflow-visible">
            {demoSteps.map((step) => (
              <Link
                key={step.id}
                to={step.path}
                className="flex items-start gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all min-w-[220px] flex-shrink-0 md:flex-shrink"
              >
                <div className="flex-shrink-0 mt-0.5">
                  <CheckCircle className="h-6 w-6 text-primary-500" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-2 py-0.5 rounded">
                    {t('landing.step', { step: step.id })}
                  </span>
                  <p className="font-medium text-gray-800 mt-1">{step.label}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="flex justify-center mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function StatCard({ number, label }: { number: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-4xl font-bold text-primary-600 mb-2">{number}</div>
      <div className="text-gray-600">{label}</div>
    </div>
  );
}
