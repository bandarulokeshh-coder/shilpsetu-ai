import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PLACEHOLDER_IMAGE,
  cn,
  formatCurrency,
  formatDate,
  formatRelativeTime,
  getImageUrl,
  toAbsoluteUrl,
  truncate,
} from './utils';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

describe('toAbsoluteUrl', () => {
  it('prefixes stored upload paths with the API origin', () => {
    expect(toAbsoluteUrl('/uploads/a.jpg')).toBe('http://localhost:3001/uploads/a.jpg');
  });

  it('leaves already-absolute values untouched', () => {
    expect(toAbsoluteUrl('https://cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg');
    expect(toAbsoluteUrl('data:image/png;base64,AAA')).toBe('data:image/png;base64,AAA');
    expect(toAbsoluteUrl('blob:http://localhost:5173/123')).toBe('blob:http://localhost:5173/123');
  });

  it('returns an empty string when there is no path', () => {
    expect(toAbsoluteUrl(null)).toBe('');
    expect(toAbsoluteUrl(undefined)).toBe('');
    expect(toAbsoluteUrl('')).toBe('');
  });
});

describe('getImageUrl', () => {
  it('falls back to the bundled placeholder for listings without a photo', () => {
    expect(getImageUrl(null)).toBe(PLACEHOLDER_IMAGE);
    expect(getImageUrl(undefined)).toBe(PLACEHOLDER_IMAGE);
    expect(getImageUrl('')).toBe(PLACEHOLDER_IMAGE);
  });

  it('resolves uploaded photos to the API origin', () => {
    expect(getImageUrl('/uploads/photo.png')).toBe('http://localhost:3001/uploads/photo.png');
  });

  it('ships the placeholder asset it points at (regression: /placeholder.jpg was missing)', () => {
    const placeholderPath = path.join(projectRoot, 'public', PLACEHOLDER_IMAGE.replace(/^\//, ''));
    expect(existsSync(placeholderPath)).toBe(true);
  });
});

describe('formatCurrency', () => {
  it('formats rupees with Indian digit grouping and no decimals', () => {
    const formatted = formatCurrency(7150);
    expect(formatted).toContain('7,150');
    expect(formatted).not.toContain('.');
  });
});

describe('formatDate', () => {
  it('renders a readable date', () => {
    const formatted = formatDate('2026-01-15T12:00:00.000Z');
    expect(formatted).toContain('2026');
    expect(formatted).toContain('Jan');
  });
});

describe('formatRelativeTime', () => {
  const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

  it('describes recent activity', () => {
    expect(formatRelativeTime(ago(30 * 1000))).toBe('just now');
    expect(formatRelativeTime(ago(5 * 60 * 1000))).toBe('5m ago');
    expect(formatRelativeTime(ago(2 * 60 * 60 * 1000))).toBe('2h ago');
    expect(formatRelativeTime(ago(3 * 24 * 60 * 60 * 1000))).toBe('3d ago');
  });

  it('falls back to a date beyond a week', () => {
    expect(formatRelativeTime(ago(30 * 24 * 60 * 60 * 1000))).toContain('2026');
  });
});

describe('truncate', () => {
  it('shortens long strings and keeps short ones intact', () => {
    expect(truncate('abcdefgh', 4)).toBe('abcd...');
    expect(truncate('abc', 4)).toBe('abc');
  });
});

describe('cn', () => {
  it('joins truthy class names', () => {
    expect(cn('a', false && 'b', undefined, 'c')).toBe('a c');
  });
});
