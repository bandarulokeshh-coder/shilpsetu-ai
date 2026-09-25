import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Loading from '../components/Loading';
import QRCodePreview from '../components/QRCodePreview';
import ExportListing from '../components/ExportListing';
import { productsApi, enquiriesApi, Product } from '../lib/api';
import { useAuthStore } from '../lib/store';
import { useCartStore } from '../lib/cart';
import { getImageUrl, formatCurrency, PLACEHOLDER_IMAGE } from '../lib/utils';
import { PRODUCT_STATUS } from '../lib/constants';
import { MapPin, User, Tag, Package, MessageSquare, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProductDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuthStore();
  const addItem = useCartStore((s) => s.addItem);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEnquiryForm, setShowEnquiryForm] = useState(false);
  const [enquiryData, setEnquiryData] = useState({
    quantity: 1,
    message: '',
  });

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      const response = await productsApi.getById(id!);
      setProduct(response.data);
    } catch (error) {
      toast.error(t('productDetail.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleEnquiry = async () => {
    if (!isAuthenticated) {
      toast.error(t('productDetail.loginRequired'));
      return;
    }

    if (user?.role !== 'BUYER') {
      toast.error(t('productDetail.onlyBuyers'));
      return;
    }

    try {
      await enquiriesApi.create({
        productId: product!.id,
        quantity: enquiryData.quantity,
        message: enquiryData.message,
      });
      toast.success(t('productDetail.enquirySent'));
      setShowEnquiryForm(false);
      setEnquiryData({ quantity: 1, message: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('productDetail.enquiryFailed'));
    }
  };

  const isOwner = user?.id === product?.artisanId;
  const statusBadgeClass =
    product?.status === 'APPROVED'
      ? 'bg-green-100 text-green-800'
      : product?.status === 'PENDING'
      ? 'bg-yellow-100 text-yellow-800'
      : product?.status === 'REJECTED'
      ? 'bg-red-100 text-red-800'
      : 'bg-gray-100 text-gray-800';

  const handleAddToCart = () => {
    if (!product) return;
    addItem(product, 1);
    toast.success(t('productDetail.addedToCart'));
  };

  if (loading) {
    return (
      <Layout>
        <Loading>{t('productDetail.loadingProduct')}</Loading>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">{t('productDetail.notFound')}</h1>
          <Link to="/marketplace" className="btn-primary">
            {t('productDetail.backToMarketplace')}
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Image */}
          <div>
            <div className="aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
              <img
                src={getImageUrl(product.enhancedImageUrl || product.imageUrl)}
                alt={product.title}
                onError={(event) => {
                  const img = event.currentTarget;
                  if (!img.src.endsWith(PLACEHOLDER_IMAGE)) img.src = PLACEHOLDER_IMAGE;
                }}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Product Details */}
          <div>
            <h1 className="text-3xl font-bold mb-4">{product.title}</h1>

            <div className="flex flex-wrap items-baseline gap-3 mb-2">
              <span className="text-3xl font-bold text-primary-600">
                {formatCurrency(product.suggestedPrice || 0)}
              </span>
              <span className="text-sm text-gray-600">{t('productDetail.suggestedPrice')}</span>
              {isOwner && (
                <span className={`px-3 py-1 rounded-full text-xs ${statusBadgeClass}`}>
                  {PRODUCT_STATUS[product.status]}
                </span>
              )}
            </div>

            {(product.minimumPrice || product.premiumPrice) && (
              <p className="text-sm text-gray-600 mb-6">
                {t('productDetail.priceRange', {
                  min: formatCurrency(product.minimumPrice || 0),
                  max: formatCurrency(product.premiumPrice || 0),
                })}
              </p>
            )}

            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-2 text-gray-700">
                <Tag className="h-5 w-5" />
                <span>{product.category}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Package className="h-5 w-5" />
                <span>{t('common.material')}: {product.material}</span>
              </div>
              {product.dimensions && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Package className="h-5 w-5" />
                  <span>{t('common.dimensions')}: {product.dimensions}</span>
                </div>
              )}
            </div>

            <div className="mb-6">
              <h3 className="font-semibold mb-2">{t('productDetail.description')}</h3>
              <p className="text-gray-700 whitespace-pre-line">{product.description}</p>
            </div>

            {(product.hindiDescription || product.englishDescription) && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2">{t('productDetail.bilingualListing')}</h3>
                {product.hindiDescription && (
                  <p className="text-gray-700 whitespace-pre-line mb-3">{product.hindiDescription}</p>
                )}
                {product.englishDescription && (
                  <p className="text-sm text-gray-600 whitespace-pre-line">
                    {product.englishDescription}
                  </p>
                )}
              </div>
            )}

            {/* Artisan Info */}
            {product.artisan && (
              <div className="card bg-gray-50 mb-6">
                <h3 className="font-semibold mb-3">{t('productDetail.aboutArtisan')}</h3>
                <Link
                  to={`/artisan/${product.artisan.id}`}
                  className="flex items-center gap-3 hover:text-primary-600"
                >
                  <User className="h-10 w-10 text-gray-400" />
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

            {/* CTA Buttons */}
            {user?.role !== 'ARTISAN' && user?.role !== 'ADMIN' && (
              <button
                onClick={handleAddToCart}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <ShoppingCart className="h-5 w-5" />
                {t('productDetail.addToCart')}
              </button>
            )}

            {user?.role === 'BUYER' && (
              <div className="space-y-3">
                <button
                  onClick={() => setShowEnquiryForm(!showEnquiryForm)}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  <MessageSquare className="h-5 w-5" />
                  {t('productDetail.sendEnquiry')}
                </button>

                {showEnquiryForm && (
                  <div className="card bg-gray-50 mt-4">
                    <h3 className="font-semibold mb-4">{t('productDetail.sendEnquiry')}</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">{t('common.quantity')}</label>
                        <input
                          type="number"
                          className="input"
                          min="1"
                          value={enquiryData.quantity}
                          onChange={(e) =>
                            setEnquiryData({ ...enquiryData, quantity: parseInt(e.target.value) })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">{t('productDetail.message')}</label>
                        <textarea
                          className="input"
                          rows={4}
                          placeholder={t('productDetail.messagePlaceholder')}
                          value={enquiryData.message}
                          onChange={(e) =>
                            setEnquiryData({ ...enquiryData, message: e.target.value })
                          }
                        />
                      </div>
                      <button onClick={handleEnquiry} className="btn-primary w-full">
                        {t('productDetail.sendEnquiry')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!isAuthenticated && (
              <div className="card bg-primary-50 border border-primary-200">
                <p className="text-center mb-4">{t('productDetail.loginPrompt')}</p>
                <Link to="/login" className="btn-primary w-full block text-center">
                  {t('auth.login')}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Additional Info Section */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Export Listing - visible to the owning artisan only */}
          {isOwner && (
            <div>
              <h2 className="text-2xl font-bold mb-4">{t('productDetail.exportListing')}</h2>
              <ExportListing product={product} />
            </div>
          )}

          {/* QR Code Preview */}
          <div>
            <h2 className="text-2xl font-bold mb-4">{t('productDetail.shareProduct')}</h2>
            <QRCodePreview productId={product.id} title={product.title} />
          </div>
        </div>
      </div>
    </Layout>
  );
}
