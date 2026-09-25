import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Loading from '../components/Loading';
import { productsApi } from '../lib/api';
import { getImageUrl, formatCurrency } from '../lib/utils';
import { Package, Tag, MapPin, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CatalogShare() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      const response = await productsApi.getById(id!);
      setProduct(response.data);
    } catch (error) {
      toast.error(t('catalogShare.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <Loading>{t('catalogShare.loading')}</Loading>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">{t('catalogShare.productNotFound')}</h1>
          <Link to="/marketplace" className="btn-primary">
            {t('common.back')}
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Link to="/marketplace" className="text-gray-600 hover:text-primary-600 flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            {t('catalogShare.backLabel')}
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Image */}
          <div>
            <div className="aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
              <img
                src={getImageUrl(product.enhancedImageUrl || product.imageUrl)}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Product Details */}
          <div>
            <h1 className="text-3xl font-bold mb-4">{product.title}</h1>

            <div className="flex items-center gap-4 mb-6">
              <span className="text-3xl font-bold text-primary-600">
                {formatCurrency(product.suggestedPrice || 0)}
              </span>
              {product.minimumPrice && (
                <span className="text-lg text-gray-500 line-through">
                  {formatCurrency(product.minimumPrice)}
                </span>
              )}
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-2 text-gray-700">
                <Tag className="h-5 w-5" />
                <span>{product.category}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Package className="h-5 w-5" />
                <span>Material: {product.material}</span>
              </div>
              {product.dimensions && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Package className="h-5 w-5" />
                  <span>Dimensions: {product.dimensions}</span>
                </div>
              )}
            </div>

            <div className="mb-6">
              <h3 className="font-semibold mb-2">{t('common.description')}</h3>
              <p className="text-gray-700 whitespace-pre-line">{product.description}</p>
            </div>

            {/* Artisan Info */}
            {product.artisan && (
              <div className="card bg-gray-50 mb-6">
                <h3 className="font-semibold mb-3">{t("catalogShare.aboutArtisanHeader")}</h3>
                <Link
                  to={`/artisan/${product.artisan.id}`}
                  className="flex items-center gap-3 hover:text-primary-600"
                >
                  <MapPin className="h-10 w-10 text-gray-400" />
                  <div>
                    <p className="font-medium">{product.artisan.name}</p>
                    {product.artisan.location && (
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {product.artisan.location}
                      </p>
                    )}
                  </div>
                </Link>
              </div>
            )}

            <p className="text-sm text-gray-500">{t("catalogShare.shareHint")}</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
