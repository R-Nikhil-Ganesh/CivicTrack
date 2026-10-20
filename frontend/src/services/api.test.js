import { describe, it, expect } from 'vitest';
import api, { getImageUrl } from './api';

describe('API Client & Image URL Utilities', () => {
  describe('getImageUrl()', () => {
    it('should return fallback demo placeholder if url is null or empty', () => {
      expect(getImageUrl(null)).toBe('/demo/road_crater.webp');
      expect(getImageUrl('')).toBe('/demo/road_crater.webp');
      expect(getImageUrl(undefined)).toBe('/demo/road_crater.webp');
    });

    it('should preserve absolute HTTP and HTTPS URLs as-is', () => {
      expect(getImageUrl('https://images.unsplash.com/photo-123')).toBe(
        'https://images.unsplash.com/photo-123'
      );
      expect(getImageUrl('http://example.com/crater.jpg')).toBe(
        'http://example.com/crater.jpg'
      );
    });

    it('should preserve frontend local /demo/ asset paths as-is', () => {
      expect(getImageUrl('/demo/water_leak.webp')).toBe('/demo/water_leak.webp');
      expect(getImageUrl('/demo/garbage_overflow.webp')).toBe('/demo/garbage_overflow.webp');
    });

    it('should prepend backend base URL for relative /uploads/ paths', () => {
      const url = getImageUrl('/uploads/issue-123.jpg');
      expect(url).toMatch(/^http:\/\/localhost:5000\/uploads\/issue-123\.jpg/);
    });
  });

  describe('Axios Client Configuration', () => {
    it('should have standard baseURL configured', () => {
      expect(api.defaults.baseURL).toBeTruthy();
      expect(api.defaults.baseURL).toMatch(/api/);
    });
  });
});
