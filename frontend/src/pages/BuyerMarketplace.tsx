import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import ProductCard from '../components/ProductCard';
import Loading from '../components/Loading';
import EmptyState from '../components/EmptyState';
import { productsApi, Product } from '../lib/api';
import { Search, Filter } from 'lucide-react';
import { CATEGORIES } from '../lib/constants';
import toast from 'react-hot-toast';

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

  useEffect(() => {
    loadProducts();
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

  const handleSearch = async () => {
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

        {/* Search and Filters */}
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
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn-outline flex items-center gap-2"
            >
              <Filter className="h-5 w-5" />
              {t('common.filter')}
            </button>
          </div>

          {showFilters && (
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

        {/* Products Grid */}
        {loading ? (
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
