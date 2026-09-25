import { BadgeCheck, Star } from 'lucide-react';

interface VerifiedBadgeProps {
  verified?: boolean;
  rating?: number | null;
  reviewsCount?: number;
  className?: string;
}

/** Trust signals for an artisan: identity verification + average buyer rating. */
export default function VerifiedBadge({
  verified,
  rating,
  reviewsCount,
  className = '',
}: VerifiedBadgeProps) {
  const hasRating = typeof rating === 'number' && rating > 0;

  if (!verified && !hasRating) return null;

  return (
    <span className={`inline-flex items-center gap-2 flex-wrap ${className}`}>
      {verified && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-medium">
          <BadgeCheck className="h-3.5 w-3.5" />
          Verified
        </span>
      )}
      {hasRating && (
        <span className="inline-flex items-center gap-1 text-xs text-gray-600">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          {rating?.toFixed(1)}
          {typeof reviewsCount === 'number' && reviewsCount > 0 ? ` (${reviewsCount})` : ''}
        </span>
      )}
    </span>
  );
}