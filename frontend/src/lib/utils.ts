import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return formatDate(date);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export const API_ORIGIN = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/** Bundled fallback used whenever a listing has no photo of its own. */
export const PLACEHOLDER_IMAGE = '/placeholder.svg';

/**
 * Turns a stored image path (`/uploads/xyz.jpg`) into a full URL. Values that
 * are already absolute (http, data:, blob:) are returned untouched.
 */
export function toAbsoluteUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (/^(https?:|data:|blob:)/.test(path)) return path;
  return `${API_ORIGIN}${path}`;
}

export function getImageUrl(path: string | null | undefined): string {
  return toAbsoluteUrl(path) || PLACEHOLDER_IMAGE;
}
