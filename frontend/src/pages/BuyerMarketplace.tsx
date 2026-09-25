import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import ProductCard from '../components/ProductCard';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import { productsApi, buyerRequestsApi, Product, BuyerRequest } from '../lib/api';
import { Search, Filter, Tag, Calendar, MapPin, User, Handshake } from 'lucide-react';
import { CATEGORIES } from '../lib/constants';
import toast from 'react-hot-toast';
import { formatDistance } from 'date-fns';

export default function BuyerMarketplace() {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [location, setLocation] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [view, setView] = useState<'products' | 'requests'>('products');
  const [requests, setRequests] = useState<BuyerRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  useEffect(() => {
    loadProducts();
    loadPublicRequests();
  }, [category]);

  const loadProducts = async () => {
    try {
      const response = await productsApi.getAll({
        category: category || undefined,
        status: 'APPROVED',
      });
      setProducts(response.data);
    } catch (error) {
      toast.error(t('marketplace.loadFailed', 'Failed to load products'));
    } finally {
      setLoading(false);
    }
  };

  // Open buyer requests from other buyers, visible to everyone
  const loadPublicRequests = async (searchTerm?: string, categoryTerm?: string) => {
    setRequestsLoading(true);
    try {
      const response = await buyerRequestsApi.getPublic({
        search: (searchTerm ?? search) || undefined,
        category: (categoryTerm ?? category) || undefined,
      });
      setRequests(response.data);
    } catch (error) {
      toast.error(t('marketplace.requestsLoadFailed', 'Failed to load buyer requests'));
    } finally {
      setRequestsLoading(false);
    }
  };

  const handleSearch = async () => {
    // In the requests view the search box filters buyer requests instead of products
    if (view === 'requests') {
      await loadPublicRequests();
      return;
    }
    setLoading(true);
    try {
      const response = await productsApi.getAll({
        search: search || undefined,
        category: category || undefined,
        location: location || undefined,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        status: 'APPROVED',
      });
      setProducts(response.data);
    } catch (error) {
      toast.error(t('marketplace.searchFailed', 'Failed to search products'));
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = async () => {
    setSearch('');
    setCategory('');
    await loadPublicRequests('', '');
    setMinPrice('');
    setMaxPrice('');
    setLocation('');
    setLoading(true);
    try {
      const response = await productsApi.getAll({ status: 'APPROVED' });
      setProducts(response.data);
    } catch (error) {
      toast.error(t('marketplace.loadFailed', 'Failed to load products'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">{t('marketplace.title')}</h1>
          <p className="text-gray-600">{t('marketplace.subtitle')}</p>
        </div>

        {/* View toggle: product catalogue vs public demand board */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setView('products')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'products' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t('marketplace.products', 'Products')}
          </button>
          <button
            onClick={() => setView('requests')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              view === 'requests' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Handshake className="h-4 w-4" />
            {t('marketplace.buyerRequests', 'Buyer Requests')}
            {requests.length > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-xs ${
                  view === 'requests' ? 'bg-white/25' : 'bg-blue-600 text-white'
                }`}
              >
                {requests.length}
              </span>
            )}
          </button>
        </div>

        {/* Search (shared by both views) */}
        <div className="mb-8 space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={t('marketplace.searchPlaceholder')}
                className="input pl-10 w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <button onClick={handleSearch} className="btn-primary">
              {t('common.search')}
            </button>
            {view === 'products' && (
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="btn-outline flex items-center gap-2"
              >
                <Filter className="h-5 w-5" />
                {t('common.filter')}
              </button>
            )}
          </div>

          {view === 'products' && showFilters && (
            <div className="card">
              <h3 className="font-semibold mb-4">{t('marketplace.categories')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">{t('common.category')}</label>
                  <select
                    className="input"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="">{t('marketplace.allCategories')}</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">{t('marketplace.priceRange', 'Price range (₹)')}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      placeholder={t('marketplace.minPrice', 'Min')}
                      className="input"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                    />
                    <span className="text-gray-500">–</span>
                    <input
                      type="number"
                      min="0"
                      placeholder={t('marketplace.maxPrice', 'Max')}
                      className="input"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">{t('marketplace.artisanLocation', 'Artisan location')}</label>
                  <input
                    type="text"
                    placeholder={t('marketplace.locationPlaceholder', 'e.g. Jaipur')}
                    className="input"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mt-4">
                <button onClick={handleSearch} className="btn-primary">
                  {t('marketplace.applyFilters', 'Apply Filters')}
                </button>
                <button onClick={resetFilters} className="btn-outline">
                  {t('marketplace.resetFilters', 'Reset')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Grid: public buyer requests (everyone) OR the product catalogue */}
        {view === 'requests' ? (
          requestsLoading ? (
            <Loading>{t('common.loading')}</Loading>
          ) : requests.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {requests.map((request) => (
                <div key={request.id} className="card p-4 flex flex-col">
                  {request.attachments && request.attachments.length > 0 && (
                    <img
                      src={request.attachments[0]}
                      alt={request.title}
                      className="w-full h-36 object-cover rounded-lg mb-3"
                    />
                  )}

                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{request.title}</h3>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 shrink-0">
                      {request.status.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 line-clamp-3 mb-3">{request.description}</p>

                  <div className="flex flex-wrap gap-3 text-xs text-gray-600 mb-3">
                    {request.category && (
                      <span className="flex items-center gap-1">
                        <Tag className="h-3.5 w-3.5 text-gray-400" />
                        {request.category}
                      </span>
                    )}
                    {request.quantity > 1 && (
                      <span className="font-medium">Qty: {request.quantity}</span>
                    )}
                    {request.maxBudget != null && (
                      <span className="font-semibold text-gray-900">
                        ₹{request.maxBudget.toLocaleString('en-IN')}
                      </span>
                    )}
                    {request.deadline && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                        {new Date(request.deadline).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <div className="mt-auto pt-3 border-t text-xs text-gray-500 flex items-center gap-1">
                    <User className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{request.buyer?.name}</span>
                    {request.buyer?.location && (
                      <>
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{request.buyer.location}</span>
                      </>
                    )}
                    <span className="ml-auto shrink-0">
                      {formatDistance(new Date(request.createdAt), new Date(), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title={t('marketplace.noRequestsFound', 'No open buyer requests')}
              description={t('marketplace.noRequestsDescription', 'No buyers have posted a requirement yet — check back soon.')}
            />
          )
        ) : loading ? (
          <Loading>{t('common.loading')}</Loading>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <EmptyState
            title={t('marketplace.noProductsFound')}
            description={t('marketplace.tryDifferentSearch')}
            action={
              <button onClick={resetFilters} className="btn-primary">
                {t('marketplace.clearFilters', 'Clear Filters')}
              </button>
            }
          />
        )}
      </div>
    </Layout>
  );
}
