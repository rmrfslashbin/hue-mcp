import { describe, it, expect } from 'vitest';
import { parseColorDescription, parseColorTemp, hsvToRgb, rgbToXy } from '../src/utils/colors.js';

describe('Color utilities', () => {
  describe('parseColorDescription', () => {
    it('should parse basic colors', () => {
      const red = parseColorDescription('red');
      expect(red).toEqual({ h: 0, s: 100, v: 100 });
      
      const blue = parseColorDescription('blue');
      expect(blue).toEqual({ h: 240, s: 100, v: 100 });
    });

    it('should parse atmospheric colors', () => {
      const stormy = parseColorDescription('stormy dusk');
      expect(stormy).toEqual({ h: 250, s: 35, v: 25 });
      
      const sunset = parseColorDescription('sunset');
      expect(sunset).toEqual({ h: 15, s: 80, v: 85 });
    });

    it('should handle case insensitive input', () => {
      const red1 = parseColorDescription('RED');
      const red2 = parseColorDescription('red');
      expect(red1).toEqual(red2);
    });

    it('should return null for unknown colors', () => {
      const unknown = parseColorDescription('unknown-color-xyz');
      expect(unknown).toBeNull();
    });
  });

  describe('parseColorTemp', () => {
    it('should parse color temperature names', () => {
      expect(parseColorTemp('warm white')).toBe(370);
      expect(parseColorTemp('cool white')).toBe(182);
      expect(parseColorTemp('daylight')).toBe(153);
    });

    it('should handle partial matches', () => {
      expect(parseColorTemp('warm')).toBe(370);
      expect(parseColorTemp('cool')).toBe(182);
    });

    it('should return null for unknown temperatures', () => {
      expect(parseColorTemp('unknown-temp')).toBeNull();
    });
  });

  describe('hsvToRgb', () => {
    it('should convert HSV to RGB correctly', () => {
      const rgb = hsvToRgb({ h: 0, s: 100, v: 100 });
      expect(rgb).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('should handle white color', () => {
      const rgb = hsvToRgb({ h: 0, s: 0, v: 100 });
      expect(rgb).toEqual({ r: 255, g: 255, b: 255 });
    });
  });

  describe('rgbToXy', () => {
    it('should convert RGB to XY color space', () => {
      const xy = rgbToXy({ r: 255, g: 0, b: 0 });
      expect(xy.x).toBeGreaterThan(0.6);
      expect(xy.y).toBeGreaterThan(0.2);
    });

    it('should handle black color', () => {
      const xy = rgbToXy({ r: 0, g: 0, b: 0 });
      expect(xy).toEqual({ x: 0, y: 0 });
    });
  });
});