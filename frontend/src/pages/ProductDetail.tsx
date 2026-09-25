import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Loading from '../components/Loading';
import QRCodePreview from '../components/QRCodePreview';
import ExportListing from '../components/ExportListing';
import { productsApi, enquiriesApi, usersApi, reviewsApi, Product, Review } from '../lib/api';
import { useAuthStore } from '../lib/store';
import { useCartStore } from '../lib/cart';
import { getImageUrl, formatCurrency, PLACEHOLDER_IMAGE } from '../lib/utils';
import { PRODUCT_STATUS } from '../lib/constants';
import { MapPin, User, Tag, Package, MessageSquare, ShoppingCart, Star, ShieldCheck, MessageCircle } from 'lucide-react';
import VerifiedBadge from '../components/VerifiedBadge';
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
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [artisanTrust, setArtisanTrust] = useState<{ verified: boolean; rating: number | null } | null>(null);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    loadProduct();
  }, [id]);

  useEffect(() => {
    loadReviews();
  }, [id, product?.artisan?.id]);

  const loadReviews = async () => {
    try {
      const response = await reviewsApi.forProduct(id!);
      setReviews(response.data.reviews);
      setAverageRating(response.data.averageRating);
    } catch {
      // Reviews are supplementary — never block the product page.
    }
  };

  const loadArtisanTrust = async (artisanId: string) => {
    try {
      const artisan = (await usersApi.getArtisan(artisanId)).data;
      setArtisanTrust({ verified: Boolean(artisan.verifiedAt), rating: artisan.rating ?? null });
    } catch {
      setArtisanTrust(null);
    }
  };

  const handleSubmitReview = async () => {
    if (!myRating || !product) return;

    setSubmittingReview(true);
    try {
      await reviewsApi.create({ productId: product.id, rating: myRating, comment: myComment || undefined });
      toast.success(t('reviews.submitted', 'Thanks for your review!'));
      setMyRating(0);
      setMyComment('');
      await loadReviews();
      if (product.artisan?.id) await loadArtisanTrust(product.artisan.id);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || t('reviews.failed', 'Failed to submit review'));
    } finally {
      setSubmittingReview(false);
    }
  };

  const loadProduct = async () => {
    try {
      const response = await productsApi.getById(id!);
      setProduct(response.data);
      if (response.data.artisan?.id) {
        loadArtisanTrust(response.data.artisan.id);
      }
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

  // Cost transparency: the buyer sees exactly what the artisan spends
  const totalCost =
    (product?.rawMaterialCost || 0) +
    (product?.labourCost || 0) +
    (product?.packagingCost || 0) +
    (product?.otherCost || 0);
  const artisanEarnings = Math.max((product?.suggestedPrice || 0) - totalCost, 0);
  const suggestedMargin =
    product?.suggestedPrice && product.suggestedPrice > 0
      ? Math.round(((product.suggestedPrice - totalCost) / product.suggestedPrice) * 100)
      : 0;
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

  // WhatsApp is how most artisans and buyers actually share links.
  const shareOnWhatsApp = () => {
    if (!product) return;
    const message = `${product.title} — ${formatCurrency(product.suggestedPrice || 0)}\n${window.location.origin}/product/${product.id}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
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

            {/* Fair price transparency — where the buyer's money goes */}
            {totalCost > 0 && (
              <div className="card bg-gray-50 mb-6">
                <h3 className="font-semibold mb-1 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary-600" />
                  {t('productDetail.fairPrice', 'Fair price breakdown')}
                </h3>
                <p className="text-xs text-gray-600 mb-3">
                  {t(
                    'productDetail.fairPriceHint',
                    'What the artisan spends to make this. We never price below cost.'
                  )}
                </p>

                <div className="space-y-1 text-sm">
                  {[
                    { label: t('cost.materials', 'Materials'), value: product.rawMaterialCost },
                    { label: t('cost.labour', 'Labour'), value: product.labourCost },
                    { label: t('cost.packaging', 'Packaging'), value: product.packagingCost },
                    { label: t('cost.other', 'Other'), value: product.otherCost },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between text-gray-700">
                      <span>{row.label}</span>
                      <span>{formatCurrency(row.value || 0)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-medium border-t pt-1 mt-1">
                    <span>{t('cost.total', 'Total cost')}</span>
                    <span>{formatCurrency(totalCost)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                  {[
                    { label: t('pricing.minimum', 'Minimum'), value: product.minimumPrice },
                    { label: t('pricing.suggested', 'Suggested'), value: product.suggestedPrice },
                    { label: t('pricing.premium', 'Premium'), value: product.premiumPrice },
                  ].map((tier) => (
                    <div key={tier.label} className="bg-white rounded-lg p-2 border border-gray-100">
                      <p className="text-xs text-gray-500">{tier.label}</p>
                      <p className="font-semibold text-primary-700">{formatCurrency(tier.value || 0)}</p>
                    </div>
                  ))}
                </div>

                {artisanEarnings > 0 && (
                  <p className="text-xs text-green-800 bg-green-50 rounded p-2 mt-3">
                    {t('productDetail.artisanEarns', 'The artisan earns {amount} per piece, after every cost.', {
                      amount: formatCurrency(artisanEarnings),
                    })}
                    {suggestedMargin > 0 && ` (${suggestedMargin}% margin)`}
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
                    <p className="font-medium flex items-center gap-2">
                      {product.artisan.name}
                      {artisanTrust && (
                        <VerifiedBadge verified={artisanTrust.verified} rating={artisanTrust.rating} />
                      )}
                    </p>
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

            <button
              onClick={shareOnWhatsApp}
              className="w-full mt-2 px-4 py-2 rounded-lg border border-green-200 bg-green-50 text-green-800 font-medium flex items-center justify-center gap-2 hover:bg-green-100"
            >
              <MessageCircle className="h-5 w-5" />
              {t('productDetail.shareWhatsapp', 'Share on WhatsApp')}
            </button>

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
        {/* Buyer reviews */}
        <div className="mt-12">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-2xl font-bold">{t('reviews.title', 'Buyer reviews')}</h2>
            {averageRating != null && (
              <span className="flex items-center gap-1 text-gray-600">
                <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                <span className="font-semibold">{averageRating.toFixed(1)}</span>
                <span className="text-sm">({reviews.length})</span>
              </span>
            )}
          </div>

          {user?.role === 'BUYER' && !isOwner && (
            <div className="card bg-gray-50 mb-6">
              <h3 className="font-semibold mb-2">{t('reviews.write', 'Rate this product')}</h3>
              <div className="flex gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setMyRating(star)}
                    aria-label={`${star} ${t('reviews.stars', 'stars')}`}
                  >
                    <Star
                      className={`h-7 w-7 ${
                        myRating >= star ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <textarea
                className="input mb-3"
                rows={3}
                value={myComment}
                onChange={(e) => setMyComment(e.target.value)}
                placeholder={t('reviews.commentPlaceholder', 'What did you like or dislike? (optional)')}
              />
              <button
                onClick={handleSubmitReview}
                disabled={submittingReview || myRating === 0}
                className="btn-primary"
              >
                {submittingReview
                  ? t('common.saving', 'Saving…')
                  : t('reviews.submit', 'Submit review')}
              </button>
            </div>
          )}

          {reviews.length === 0 ? (
            <p className="text-gray-600">
              {t('reviews.none', 'No reviews yet — be the first to share your experience.')}
            </p>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div key={review.id} className="card">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <p className="font-medium">{review.buyer?.name}</p>
                    <span className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            review.rating >= star ? 'fill-amber-400 text-amber-400' : 'text-gray-200'
                          }`}
                        />
                      ))}
                    </span>
                  </div>
                  {review.comment && <p className="text-sm text-gray-700">{review.comment}</p>}
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
