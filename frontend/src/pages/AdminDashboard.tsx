import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import Loading from '../components/Loading';
import { adminApi, AdminStats } from '../lib/api';
import { Users, Package, MessageSquare, DollarSign } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await adminApi.getStats();
      setStats(response.data);
    } catch (error) {
      toast.error(t('admin.loadFailed', 'Failed to load stats'));
    } finally {
      setLoading(false);
    }
  };

  const approveProduct = async (id: string, status: string) => {
    try {
      await adminApi.updateProductStatus(id, status);
      toast.success(t('admin.productStatusUpdated', 'Product status updated'));
      loadStats();
    } catch (error) {
      toast.error(t('admin.updateProductStatusFailed', 'Failed to update product status'));
    }
  };

  if (loading) {
    return (
      <Layout>
        <Loading>{t('admin.loading', 'Loading admin dashboard...')}</Loading>
      </Layout>
    );
  }

  if (!stats) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">{t('admin.title')}</h1>
          <p className="text-gray-600">{t('admin.noStats')}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8">{t('admin.title')}</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<Users className="h-8 w-8 text-blue-500" />}
            label={t('admin.totalArtisans', 'Total Artisans')}
            value={stats?.stats.totalArtisans || 0}
          />
          <StatCard
            icon={<Package className="h-8 w-8 text-green-500" />}
            label={t('admin.totalProducts', 'Total Products')}
            value={stats?.stats.totalProducts || 0}
          />
          <StatCard
            icon={<MessageSquare className="h-8 w-8 text-purple-500" />}
            label={t('admin.totalEnquiries', 'Total Enquiries')}
            value={stats?.stats.totalEnquiries || 0}
          />
          <StatCard
            icon={<DollarSign className="h-8 w-8 text-primary-500" />}
            label={t('admin.estimatedSales', 'Est. Sales')}
            value={formatCurrency(stats?.stats.estimatedSales || 0)}
          />
        </div>

        {/* Pending Products */}
        <div className="card mb-8">
          <h2 className="text-2xl font-bold mb-6">{t('admin.pendingApprovals', 'Pending Approvals')}</h2>
          {stats?.recentProducts && stats.recentProducts.filter(p => p.status === 'PENDING').length > 0 ? (
            <div className="space-y-4">
              {stats.recentProducts
                .filter(p => p.status === 'PENDING')
                .map((product) => (
                  <div key={product.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold">{product.title}</h3>
                        <p className="text-sm text-gray-600">
                          {t('admin.byArtisanCategory', 'by {name} • {category}', { name: product.artisan?.name || 'Unknown', category: product.category || '' })}
                        </p>
                      </div>
                      <span className="text-lg font-bold text-primary-600">
                        {formatCurrency(product.suggestedPrice || 0)}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => approveProduct(product.id, 'APPROVED')}
                        className="btn-primary text-sm"
                      >
                        {t('admin.approve')}
                      </button>
                      <button
                        onClick={() => approveProduct(product.id, 'REJECTED')}
                        className="btn text-sm border-red-600 text-red-600 hover:bg-red-50"
                      >
                        {t('admin.reject')}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-gray-600 text-center py-6">{t('admin.noPendingProducts')}</p>
          )}
        </div>

        {/* Recent Enquiries */}
        <div className="card">
          <h2 className="text-2xl font-bold mb-6">{t('admin.recentEnquiries')}</h2>
          {stats?.recentEnquiries && stats.recentEnquiries.length > 0 ? (
            <div className="space-y-3">
              {stats.recentEnquiries.map((enquiry) => (
                <div key={enquiry.id} className="p-3 border rounded">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{enquiry.product?.title}</p>
                      <p className="text-sm text-gray-600">
                        from {enquiry.buyer?.name} • Qty: {enquiry.quantity}
                      </p>
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatDate(enquiry.createdAt)}
                    </span>
           <h2 className="text-2xl font-bold mb-6">{t('admin.recentEnquiries')}</h2>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-center py-6">{t('admin.noRecentEnquiries')}</p>
          )}
        </div>
      </div>
    </Layout>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1">
          <p className="text-gray-600 text-sm mb-1">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <div>{icon}</div>
      </div>
    </div>
  );
}
