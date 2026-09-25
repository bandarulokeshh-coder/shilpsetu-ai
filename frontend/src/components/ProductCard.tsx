import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Product } from '../lib/api';
import { getImageUrl, formatCurrency, PLACEHOLDER_IMAGE } from '../lib/utils';
import { MapPin, Tag, Heart } from 'lucide-react';
import { useWishlistStore } from '../lib/wishlist';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { t } = useTranslation();
  const isWishlisted = useWishlistStore((state) => state.productIds.includes(product.id));
  const toggleWishlist = useWishlistStore((state) => state.toggle);

  const handleWishlist = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    toggleWishlist(product.id);
  };

  return (
    <div className="card hover:shadow-lg transition-shadow">
      <div className="relative">
        <Link to={`/product/${product.id}`} className="block aspect-square w-full overflow-hidden rounded-t-lg bg-gray-100 mb-4">
          <img
            src={getImageUrl(product.enhancedImageUrl || product.imageUrl)}
            alt={product.title}
            loading="lazy"
            onError={(event) => {
              const img = event.currentTarget;
              // Fall back to the bundled placeholder if an upload goes missing.
              if (!img.src.endsWith(PLACEHOLDER_IMAGE)) img.src = PLACEHOLDER_IMAGE;
            }}
            className="w-full h-full object-cover"
          />
        </Link>
        <button
          type="button"
          onClick={handleWishlist}
          aria-label={isWishlisted ? t('wishlist.removeFromWishlist') : t('wishlist.addToWishlist')}
          className="absolute top-3 right-3 p-2 rounded-full bg-white shadow-md text-gray-600 hover:text-red-500"
        >
          <Heart className={`h-5 w-5 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`} />
        </button>
      </div>
      <Link to={`/product/${product.id}`} className="block">
        <h3 className="font-semibold text-lg mb-2 line-clamp-2 hover:text-primary-600">{product.title}</h3>
      </Link>
      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
      <div className="flex items-center gap-2 mb-2">
        <Tag className="h-4 w-4 text-gray-500" />
        <span className="text-sm text-gray-600">{product.category}</span>
      </div>
      {product.artisan && (
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600">{product.artisan.location}</span>
        </div>
      )}
      <div className="flex items-center justify-between pt-3 border-t">
        <span className="text-xl font-bold text-primary-600">
          {formatCurrency(product.suggestedPrice || 0)}
        </span>
        {product.artisan && (
          <span className="text-sm text-gray-600">{t('products.byArtisan', 'by {{name}}', { name: product.artisan.name })}</span>
        )}
      </div>
    </div>
  );
}

