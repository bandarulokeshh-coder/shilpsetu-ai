import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import { productsApi, enquiriesApi, usersApi, buyerRequestsApi, Product, Enquiry, User, DemandForecast } from '../lib/api';
import { formatCurrency, getImageUrl } from '../lib/utils';
import { Plus, Package, MessageSquare, DollarSign, Eye, Edit, Trash2, Share2, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ArtisanDashboard() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [forecast, setForecast] = useState<DemandForecast | null>(null);

  useEffect(() => {
    loadData();
    loadForecast();
  }, []);

  // The forecast is a nice-to-have: never let it block the dashboard.
  const loadForecast = async () => {
    try {
      const response = await buyerRequestsApi.getForecast(30);
      setForecast(response.data);
    } catch {
      setForecast(null);
    }
  };

  const loadData = async () => {
    try {
      const [profileRes, productsRes, enquiriesRes] = await Promise.all([
        usersApi.getMe(),
        productsApi.getMine(),
        enquiriesApi.getAll(),
      ]);
      setProfile(profileRes.data);
      const artisanId = profileRes.data.id;
      setProducts(productsRes.data);
      // Enquiries are already scoped server-side to the artisan's own products,
      // but double-check by filtering on product artisanId as well.
      setEnquiries(
        enquiriesRes.data.filter(
          (e) =>
            e.product?.artisan?.id === artisanId ||
            productsRes.data.some((p) => p.id === e.productId && p.artisanId === artisanId)
        )
      );
    } catch (error) {
      toast.error(t('dashboard.loadFailed', 'Failed to load dashboard data'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('products.deleteConfirm'))) return;

    try {
      await productsApi.delete(id);
      toast.success(t('products.productDeleted'));
      loadData();
    } catch (error) {
      toast.error(t('products.deleteFailed'));
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        return true;
      } catch {
        return false;
      }
    }
  };

  const handleShareProduct = async (productId: string) => {
    const url = `${window.location.origin}/product/${productId}`;
    const success = await copyToClipboard(url);
    if (success) {
      toast.success(t('common.copied'));
    } else {
      toast.error(t('catalogShare.copyFailed', 'Failed to copy link'));
    }
  };

  const handleShareCatalog = async () => {
    const url = `${window.location.origin}/dashboard`;
    const success = await copyToClipboard(url);
    if (success) {
      toast.success(t('common.copied'));
    } else {
      toast.error(t('catalogShare.copyFailed', 'Failed to copy link'));
    }
  };

  const publishedCount = products.filter((p) => p.status === 'APPROVED').length;
  const draftCount = products.length - publishedCount;

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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('dashboard.title', 'Artisan Dashboard')}</h1>
          <p className="text-gray-600">{t('dashboard.welcome', { name: profile?.name })}</p>
        </div>

        {/* Demand forecast — what buyers are asking for right now */}
        {forecast && (
          <div className="card border-2 border-primary-200 bg-gradient-to-br from-primary-50 to-white mb-8">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary-600" />
                  {t('dashboard.demandForecast', 'Demand near you')}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {t('dashboard.demandForecastSubtitle', 'What buyers are asking for in the next {{days}} days', {
                    days: forecast.windowDays,
                  })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-600">{t('dashboard.estimatedValue', 'Estimated value')}</p>
                <p className="text-2xl font-bold text-primary-600">{formatCurrency(forecast.estimatedValue)}</p>
              </div>
            </div>

            {forecast.byCategory.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {forecast.byCategory.slice(0, 4).map((entry) => (
                  <div
                    key={entry.category}
                    className="flex items-center justify-between gap-3 p-3 bg-white rounded-lg border border-gray-100"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{entry.category}</p>
                      <p className="text-xs text-gray-500">
                        {t('dashboard.demandRequests', '{count} request(s) · {qty} units', {
                          count: entry.requests,
                          qty: entry.quantity,
                        })}
                      </p>
                    </div>
                    <span className="font-semibold text-primary-700 shrink-0">
                      {formatCurrency(entry.estimatedValue)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600 mb-4">
                {t('dashboard.noDemand', 'No open buyer requests yet — check back soon.')}
              </p>
            )}

            {forecast.closingSoon.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold mb-2">{t('dashboard.closingSoon', 'Deadlines coming up')}</h3>
                <ul className="space-y-1 text-sm text-gray-700">
                  {forecast.closingSoon.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-2">
                      <span className="truncate">{item.title}</span>
                      <span className="text-xs text-gray-500 shrink-0">
                        {new Date(item.deadline).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Link to="/marketplace" className="btn-primary inline-flex items-center gap-2">
              {t('dashboard.browseRequests', 'Browse buyer requests')}
            </Link>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card bg-primary-50 border-2 border-primary-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 mb-1">{t('dashboard.totalProducts')}</p>
                <p className="text-3xl font-bold text-primary-600">{products.length}</p>
                <p className="text-xs text-gray-600 mt-1">
                  {t('dashboard.publishedCount', { published: publishedCount, draft: draftCount })}
                </p>
              </div>
              <Package className="h-12 w-12 text-primary-400" />
            </div>
          </div>

          <div className="card bg-blue-50 border-2 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 mb-1">{t('dashboard.totalEnquiries')}</p>
                <p className="text-3xl font-bold text-blue-600">{enquiries.length}</p>
              </div>
              <MessageSquare className="h-12 w-12 text-blue-400" />
            </div>
          </div>

          <div className="card bg-green-50 border-2 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 mb-1">{t('dashboard.totalEarnings')}</p>
                <p className="text-3xl font-bold text-green-600">
                  {formatCurrency(profile?.stats?.estimatedEarnings || 0)}
                </p>
              </div>
              <DollarSign className="h-12 w-12 text-green-400" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <Link to="/create-product" className="btn-primary flex items-center gap-2 w-full md:w-auto">
            <Plus className="h-5 w-5" />
            {t('dashboard.createNewProduct')}
          </Link>
        </div>

        {/* Products List */}
        <div className="card">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <h2 className="text-2xl font-bold">{t('dashboard.myProducts')}</h2>
            <button
              onClick={handleShareCatalog}
              className="btn-outline flex items-center gap-2 text-sm"
            >
              <Share2 className="h-4 w-4" />
              {t('dashboard.shareCatalog', 'Share My Catalog')}
            </button>
          </div>

          {products.length > 0 ? (
            <div className="space-y-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex flex-col md:flex-row gap-4 p-4 border rounded-lg hover:border-primary-300"
                >
                  <img
                    src={getImageUrl(product.imageUrl)}
                    alt={product.title}
                    className="w-full md:w-32 h-32 object-cover rounded"
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-lg">{product.title}</h3>
                        <p className="text-sm text-gray-600">{product.category}</p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-sm ${
                          product.status === 'APPROVED'
                            ? 'bg-green-100 text-green-800'
                            : product.status === 'PENDING'
                            ? 'bg-yellow-100 text-yellow-800'
                            : product.status === 'REJECTED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {product.status}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-3 line-clamp-2">{product.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold text-primary-600">
                        {formatCurrency(product.suggestedPrice || 0)}
                      </span>
                      <div className="flex gap-2">
                        <Link
                          to={`/product/${product.id}`}
                          className="btn-outline flex items-center gap-1 text-sm"
                        >
                          <Eye className="h-4 w-4" />
                          {t('products.viewDetails')}
                        </Link>
                        <Link
                          to={`/edit-product/${product.id}`}
                          className="btn-outline flex items-center gap-1 text-sm"
                        >
                          <Edit className="h-4 w-4" />
                          {t('products.editProduct')}
                        </Link>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="btn text-red-600 border-red-600 hover:bg-red-50 flex items-center gap-1 text-sm"
                        >
                          <Trash2 className="h-4 w-4" />
                          {t('common.delete')}
                        </button>
                        <button
                          onClick={() => handleShareProduct(product.id)}
                          className="btn-outline flex items-center gap-1 text-sm text-primary-600 border-primary-300 hover:bg-primary-50"
                        >
                          <Share2 className="h-4 w-4" />
                          {t('common.share')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title={t('empty.noProducts')}
              description={t('empty.emptyDescription')}
              action={
                <Link to="/create-product" className="btn-primary">
                  {t('nav.createProduct')}
                </Link>
              }
            />
          )}
        </div>

        {/* Recent Enquiries */}
        <div className="card mt-8">
          <h2 className="text-2xl font-bold mb-6">{t('dashboard.recentEnquiries', 'Recent Enquiries')}</h2>
          {enquiries.length > 0 ? (
            <div className="space-y-4">
              {enquiries.slice(0, 5).map((enquiry) => (
                <div key={enquiry.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{enquiry.product?.title}</h3>
                    <span className="text-sm text-gray-600">{enquiry.buyer?.name}</span>
                  </div>
                  <p className="text-gray-700 mb-2">{enquiry.message}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Quantity: {enquiry.quantity}</span>
                    <span
                      className={`px-2 py-1 rounded ${
                        enquiry.status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {enquiry.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title={t('empty.noEnquiries')} description={t('dashboard.enquiriesHint', 'Enquiries will appear here')} />
          )}
        </div>
      </div>
    </Layout>
  );
}
