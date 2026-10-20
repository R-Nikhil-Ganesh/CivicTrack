import { describe, it, expect } from 'vitest';
import { convertDMSToDD, parseXmpCoord, isValidCoordinate } from './exifUtils';

describe('EXIF & Spatial Coordinate Extraction Utilities', () => {
  describe('convertDMSToDD()', () => {
    it('should correctly convert Northern latitude DMS to positive decimal degrees', () => {
      // 12° 58' 17.76" N -> ~12.9716
      const dd = convertDMSToDD([12, 58, 17.76], 'N');
      expect(dd).toBeCloseTo(12.9716, 4);
    });

    it('should correctly convert Eastern longitude DMS to positive decimal degrees', () => {
      // 77° 35' 40.56" E -> ~77.5946
      const dd = convertDMSToDD([77, 35, 40.56], 'E');
      expect(dd).toBeCloseTo(77.5946, 4);
    });

    it('should convert Southern latitude (S) to negative decimal degrees', () => {
      // 33° 51' 36" S (Sydney, Australia)
      const dd = convertDMSToDD([33, 51, 36], 'S');
      expect(dd).toBeLessThan(0);
      expect(dd).toBeCloseTo(-33.86, 2);
    });

    it('should convert Western longitude (W) to negative decimal degrees', () => {
      // 118° 14' 34.8" W (Los Angeles, USA)
      const dd = convertDMSToDD([118, 14, 34.8], 'W');
      expect(dd).toBeLessThan(0);
      expect(dd).toBeCloseTo(-118.243, 2);
    });

    it('should handle already-decimal numbers with directional ref flag', () => {
      expect(convertDMSToDD(12.9716, 'N')).toBe(12.9716);
      expect(convertDMSToDD(12.9716, 'S')).toBe(-12.9716);
      expect(convertDMSToDD(77.5946, 'W')).toBe(-77.5946);
    });

    it('should return null for malformed or incomplete DMS arrays', () => {
      expect(convertDMSToDD([], 'N')).toBeNull();
      expect(convertDMSToDD([12], 'N')).toBeNull();
      expect(convertDMSToDD(null, 'N')).toBeNull();
      expect(convertDMSToDD(undefined, 'N')).toBeNull();
    });
  });

  describe('parseXmpCoord()', () => {
    it('should parse XMP comma-separated coordinate strings', () => {
      const parsed = parseXmpCoord('12, 58.296N');
      expect(parsed).toBeCloseTo(12.9716, 3);
    });

    it('should parse negative coordinates for Southern / Western designations', () => {
      const parsed = parseXmpCoord('33, 51.6S');
      expect(parsed).toBeLessThan(0);
    });

    it('should return number as-is if already numeric', () => {
      expect(parseXmpCoord(12.9716)).toBe(12.9716);
    });

    it('should return null for non-string, non-numeric values', () => {
      expect(parseXmpCoord(null)).toBeNull();
      expect(parseXmpCoord('')).toBeNull();
    });
  });

  describe('isValidCoordinate()', () => {
    it('should validate valid GPS coordinates', () => {
      expect(isValidCoordinate(12.9716, 77.5946)).toBe(true);
      expect(isValidCoordinate(0, 0)).toBe(true);
      expect(isValidCoordinate(-33.86, 151.20)).toBe(true);
    });

    it('should reject out-of-range coordinates or NaN', () => {
      expect(isValidCoordinate(95, 77)).toBe(false);
      expect(isValidCoordinate(-91, 77)).toBe(false);
      expect(isValidCoordinate(12, 185)).toBe(false);
      expect(isValidCoordinate(NaN, 77)).toBe(false);
      expect(isValidCoordinate('12', '77')).toBe(false);
    });
  });
});
