import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import { buyerRequestsApi, BuyerRequest } from '../lib/api';
import { Plus, Calendar, MapPin, Tag, MessageCircle, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistance } from 'date-fns';

export default function BuyerRequestList() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [requests, setRequests] = useState<BuyerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'MATCHED' | 'QUOTED' | 'CLOSED'>('ALL');

  useEffect(() => {
    loadRequests();
  }, [filter]);

  const loadRequests = async () => {
    try {
      const response = await buyerRequestsApi.getAll();
      const filtered = filter === 'ALL'
        ? response.data
        : response.data.filter(r => r.status === filter);
      setRequests(filtered);
    } catch (error) {
      toast.error(t('buyerRequests.loadFailed', 'Failed to load requests'));
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'MATCHED':
        return 'bg-blue-100 text-blue-800';
      case 'QUOTED':
        return 'bg-purple-100 text-purple-800';
      case 'CLOSED':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return <Loading>{t('common.loading', 'Loading...')}</Loading>;
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">
              {t('buyerRequests.myRequests', 'My Requests')}
            </h1>
            <p className="text-gray-600 mt-1">
              {t('buyerRequests.manageYourRequests', 'Manage and track your buyer requests')}
            </p>
          </div>
          <button
            onClick={() => navigate('/buyer/request')}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            {t('buyerRequests.newRequest', 'New Request')}
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(['ALL', 'PENDING', 'MATCHED', 'QUOTED', 'CLOSED'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t(`buyerRequests.status.${status}`, status)}
            </button>
          ))}
        </div>

        {/* Requests List */}
        {requests.length === 0 ? (
          <EmptyState
            title={t('buyerRequests.noRequests', 'No requests found')}
            description={filter === 'ALL'
              ? t('buyerRequests.noRequestsDescription', 'Create your first buyer request to find artisans')
              : t('buyerRequests.noRequestsForFilter', 'No requests with this status')}
            action={
              <button
                onClick={() => navigate('/buyer/request')}
                className="btn-primary"
              >
                {t('buyerRequests.createRequest', 'Create Request')}
              </button>
            }
          />
        ) : (
          <div className="space-y-4">
            {requests.map(request => (
              <Link
                key={request.id}
                to={`/buyer/request/${request.id}`}
                className="card block hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
                    {t(`buyerRequests.status.${request.status}`, request.status)}
                  </span>
                  {request.matchedArtisan && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <MessageCircle className="h-4 w-4" />
                      <span>1 reply</span>
                    </div>
                  )}
                </div>

                <h3 className="text-lg font-semibold mb-2">{request.title}</h3>

                <p className="text-gray-600 mb-4 line-clamp-2">
                  {request.description}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  {request.category && (
                    <div className="flex items-center gap-1.5">
                      <Tag className="h-4 w-4 text-gray-400" />
                      <span className="truncate">{request.category}</span>
                    </div>
                  )}
                  {request.deadline && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>{new Date(request.deadline).toLocaleDateString()}</span>
                    </div>
                  )}
                  {request.maxBudget && (
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-gray-900">{formatCurrency(request.maxBudget)}</span>
                    </div>
                  )}
                  {request.matchedArtisan && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="truncate">{request.matchedArtisan.name}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {t('buyerRequests.createdAgo', 'Created {{time}} ago', { time: formatDistance(new Date(request.createdAt), new Date(), { addSuffix: true }) })}
                  </span>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
