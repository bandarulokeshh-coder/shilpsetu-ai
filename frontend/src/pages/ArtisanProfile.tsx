import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import ProductCard from '../components/ProductCard';
import Loading from '../components/Loading';
import { usersApi, User, Product } from '../lib/api';
import { MapPin, User as UserIcon } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ArtisanProfile() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [artisan, setArtisan] = useState<User & { products: Product[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArtisan();
  }, [id]);

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
              <h1 className="text-3xl font-bold mb-2">{artisan.name}</h1>
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
      </div>
    </Layout>
  );
}
