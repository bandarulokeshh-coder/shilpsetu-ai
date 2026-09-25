import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import ProductCard from '../components/ProductCard';
import Loading from '../components/Loading';
import { usersApi, reviewsApi, Review, User, Product } from '../lib/api';
import { useAuthStore } from '../lib/store';
import { MapPin, User as UserIcon, Star, ShieldCheck } from 'lucide-react';
import VerifiedBadge from '../components/VerifiedBadge';
import toast from 'react-hot-toast';

const ID_TYPES = ['Aadhaar', 'PAN', 'Voter ID', 'Driving Licence'];

export default function ArtisanProfile() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuthStore();
  const [artisan, setArtisan] = useState<User & { products: Product[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [idType, setIdType] = useState('Aadhaar');
  const [idNumber, setIdNumber] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    loadArtisan();
  }, [id]);

  useEffect(() => {
    loadReviews();
  }, [id]);

  const loadReviews = async () => {
    try {
      const response = await reviewsApi.forArtisan(id!);
      setReviews(response.data.reviews);
      setAverageRating(response.data.averageRating);
    } catch {
      // Reviews are supplementary — never block the profile.
    }
  };

  const handleVerify = async () => {
    if (idNumber.trim().length < 4) {
      toast.error(t('artisanProfile.verifyNeedsId', 'Please enter a valid ID number'));
      return;
    }

    setVerifying(true);
    try {
      const response = await usersApi.submitVerification({ idType, idNumber: idNumber.trim() });
      setArtisan((current) => (current ? { ...current, ...response.data.user } : current));
      setIdNumber('');
      toast.success(t('artisanProfile.verified', 'You are now a verified artisan'));
      loadArtisan();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || t('artisanProfile.verifyFailed', 'Verification failed'));
    } finally {
      setVerifying(false);
    }
  };

  const loadArtisan = async () => {
    try {
      const response = await usersApi.getArtisan(id!);
      setArtisan(response.data);
    } catch (error) {
      toast.error(t('artisanProfile.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <Loading>{t("artisanProfile.loading")}</Loading>
      </Layout>
    );
  }

  if (!artisan) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold">{t("artisanProfile.artisanNotFound")}</h1>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Artisan Header */}
        <div className="card mb-8">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
              <UserIcon className="h-12 w-12 text-gray-400" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-3 flex-wrap">
                {artisan.name}
                <VerifiedBadge
                  verified={Boolean(artisan.verifiedAt)}
                  rating={artisan.rating}
                  reviewsCount={reviews.length}
                />
              </h1>
              {artisan.location && (
                <p className="text-gray-600 flex items-center gap-2 mb-2">
                  <MapPin className="h-5 w-5" />
                  {artisan.location}
                </p>
              )}
              {artisan.craftType && (
                <p className="text-gray-700">
                  <span className="font-medium">{t("artisanProfile.craft")}</span> {artisan.craftType}
                </p>
              )}
              {artisan.bio && (
                <p className="text-gray-700 mt-3">{artisan.bio}</p>
              )}
            </div>
          </div>
        </div>

        {/* Products */}
        <div>
          <h2 className="text-2xl font-bold mb-6">{t("artisanProfile.header", { name: artisan.name })}</h2>
          {artisan.products && artisan.products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {artisan.products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-center py-12">{t("artisanProfile.noProducts")}</p>
          )}
        </div>

        {/* Identity verification (visible to the artisan themselves) */}
        {currentUser?.id === artisan.id && !artisan.verifiedAt && (
          <div className="card mt-8 border-2 border-primary-200 bg-primary-50">
            <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary-600" />
              {t('artisanProfile.verifyTitle', 'Verify your identity')}
            </h2>
            <p className="text-sm text-gray-600 mb-3">
              {t(
                'artisanProfile.verifyHint',
                'Verified artisans get a trust badge and are preferred in AI matching. We only store the last 4 digits.'
              )}
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <select className="input sm:w-48" value={idType} onChange={(e) => setIdType(e.target.value)}>
                {ID_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <input
                className="input flex-1"
                placeholder={t('artisanProfile.idPlaceholder', 'ID number')}
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
              />
              <button onClick={handleVerify} disabled={verifying} className="btn-primary shrink-0">
                {verifying ? t('common.saving', 'Saving…') : t('artisanProfile.verifySubmit', 'Verify me')}
              </button>
            </div>
          </div>
        )}

        {/* Artisan reviews */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
            {t('reviews.title', 'Buyer reviews')}
            {averageRating != null && (
              <span className="flex items-center gap-1 text-base font-normal text-gray-600">
                <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                {averageRating.toFixed(1)} ({reviews.length})
              </span>
            )}
          </h2>

          {reviews.length === 0 ? (
            <p className="text-gray-600">{t('reviews.none', 'No reviews yet.')}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  {review.product && (
                    <p className="text-xs text-gray-500 mb-1">on {review.product.title}</p>
                  )}
                  {review.comment && <p className="text-sm text-gray-700">{review.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
