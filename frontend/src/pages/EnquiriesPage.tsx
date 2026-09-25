import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import { enquiriesApi, Enquiry } from '../lib/api';
import { useAuthStore } from '../lib/store';
import { getImageUrl, formatCurrency, formatDate } from '../lib/utils';
import { Package } from 'lucide-react';
import toast from 'react-hot-toast';

export default function EnquiriesPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEnquiries();
  }, []);

  const loadEnquiries = async () => {
    try {
      const response = await enquiriesApi.getAll();
      setEnquiries(response.data);
    } catch (error) {
      toast.error(t('enquiries.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await enquiriesApi.updateStatus(id, status);
      toast.success(t('enquiries.statusUpdated'));
      loadEnquiries();
    } catch (error) {
      toast.error(t('enquiries.updateFailed'));
    }
  };

  if (loading) {
    return (
      <Layout>
        <Loading>{t('common.loading')}</Loading>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('enquiries.title')}</h1>
          <p className="text-gray-600">{t('enquiries.subtitle')}</p>
        </div>

        {enquiries.length > 0 ? (
          <div className="space-y-4">
            {enquiries.map((enquiry) => (
              <div key={enquiry.id} className="card hover:shadow-lg transition-shadow">
                <div className="flex flex-col md:flex-row gap-4">
                  {enquiry.product?.imageUrl && (
                    <img
                      src={getImageUrl(enquiry.product.imageUrl)}
                      alt={enquiry.product.title}
                      className="w-full md:w-32 h-32 object-cover rounded"
                    />
                  )}

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg mb-1">
                          {enquiry.product?.title}
                        </h3>
                        {user?.role === 'ARTISAN' ? (
                          <p className="text-sm text-gray-600">
                            {t('enquiries.from')} {enquiry.buyer?.name} ({enquiry.buyer?.email})
                          </p>
                        ) : (
                          <p className="text-sm text-gray-600">
                            {t('artisanProfile.artisan')}: {enquiry.product?.artisan?.name}
                          </p>
                        )}
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-sm ${
                          enquiry.status === 'PENDING'
                            ? 'bg-yellow-100 text-yellow-800'
                            : enquiry.status === 'CONTACTED'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {t('enquiries.status', enquiry.status)}
                      </span>
                    </div>

                    <div className="mb-3">
                      <p className="text-sm text-gray-600 mb-1">{t("enquiries.message")}:</p>
                      <p className="text-gray-700">{enquiry.message}</p>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Package className="h-4 w-4" />
                          {t('enquiries.qtyPrefix')} {enquiry.quantity}
                        </span>
                        {enquiry.product?.suggestedPrice && (
                          <span>
                            {t('enquiries.pricePrefix')} {formatCurrency(enquiry.product.suggestedPrice)}
                          </span>
                        )}
                      </div>
                      <span>{formatDate(enquiry.createdAt)}</span>
                    </div>

                    {user?.role === 'ARTISAN' && enquiry.status === 'PENDING' && (
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => updateStatus(enquiry.id, 'CONTACTED')}
                          className="btn-primary text-sm"
                        >
                          {t('enquiries.markContacted')}
                        </button>
                        <button
                          onClick={() => updateStatus(enquiry.id, 'CLOSED')}
                          className="btn-outline text-sm"
                        >
                          {t('enquiries.closeEnquiry')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title={t("enquiries.noEnquiries", "No enquiries yet")}
            description={
              user?.role === 'ARTISAN'
                ? t('enquiries.noEnquiriesHint')
                : t('enquiries.noEnquiriesHint')
            }
          />
        )}
      </div>
    </Layout>
  );
}
