import { useTranslation } from 'react-i18next';
import { Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import { Product } from '../lib/api';
import { useWishlistStore } from '../lib/wishlist';

interface WishlistButtonProps {
  product: Product;
  className?: string;
  showLabel?: boolean;
}

export default function WishlistButton({ product, className = '', showLabel = false }: WishlistButtonProps) {
  const { t } = useTranslation();
  const isSaved = useWishlistStore((state) => state.items.some((item) => item.id === product.id));
  const toggle = useWishlistStore((state) => state.toggle);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    toggle(product);
    toast.success(
      isSaved ? t('wishlist.removed', 'Removed from wishlist') : t('wishlist.added', 'Added to wishlist')
    );
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isSaved ? t('wishlist.remove', 'Remove from wishlist') : t('wishlist.add', 'Add to wishlist')}
      aria-pressed={isSaved}
      className={`inline-flex items-center justify-center gap-1 rounded-lg border bg-white transition-colors ${
        showLabel ? 'px-3 py-2 text-sm' : 'h-9 w-9'
      } ${isSaved ? 'border-rose-300 text-rose-600' : 'border-gray-200 text-gray-500 hover:border-rose-300 hover:text-rose-600'} ${className}`}
    >
      <Heart className={`h-5 w-5 ${isSaved ? 'fill-rose-600' : ''}`} />
      {showLabel && <span>{isSaved ? t('wishlist.saved', 'Saved') : t('wishlist.save', 'Save')}</span>}
    </button>
  );
}
