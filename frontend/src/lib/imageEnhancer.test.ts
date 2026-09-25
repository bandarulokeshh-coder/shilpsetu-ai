import { describe, it, expect } from 'vitest';
import {
  colorDistance,
  correctLighting,
  DEFAULT_ENHANCE_OPTIONS,
  detectProductBounds,
  luminance,
  removeBackground,
  sampleBackgroundColor,
} from './imageEnhancer';

/** Builds an RGBA buffer of `width * height` filled with one colour. */
function fill(width: number, height: number, rgb: [number, number, number], alpha = 255): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = rgb[0];
    data[i + 1] = rgb[1];
    data[i + 2] = rgb[2];
    data[i + 3] = alpha;
  }
  return data;
}

/** Paints a solid rectangle (the "product") into an existing buffer. */
function paintRect(
  data: Uint8ClampedArray,
  width: number,
  rect: { x: number; y: number; w: number; h: number },
  rgb: [number, number, number],
): void {
  for (let y = rect.y; y < rect.y + rect.h; y++) {
    for (let x = rect.x; x < rect.x + rect.w; x++) {
      const i = (y * width + x) * 4;
      data[i] = rgb[0];
      data[i + 1] = rgb[1];
      data[i + 2] = rgb[2];
      data[i + 3] = 255;
    }
  }
}

describe('luminance', () => {
  it('weights green highest', () => {
    expect(luminance(0, 255, 0)).toBeGreaterThan(luminance(255, 0, 0));
    expect(luminance(255, 255, 255)).toBeCloseTo(255, 0);
    expect(luminance(0, 0, 0)).toBe(0);
  });
});

describe('colorDistance', () => {
  it('is zero for identical colours', () => {
    expect(colorDistance(10, 20, 30, 10, 20, 30)).toBe(0);
  });

  it('grows as colours diverge', () => {
    expect(colorDistance(255, 255, 255, 0, 0, 0)).toBeGreaterThan(
      colorDistance(255, 255, 255, 200, 200, 200),
    );
  });
});

describe('sampleBackgroundColor', () => {
  it('returns the uniform corner colour', () => {
    const data = fill(20, 20, [240, 240, 240]);
    expect(sampleBackgroundColor(data, 20, 20)).toEqual({ r: 240, g: 240, b: 240 });
  });

  it('falls back to white when every pixel is transparent', () => {
    const data = fill(10, 10, [0, 0, 0], 0);
    expect(sampleBackgroundColor(data, 10, 10)).toEqual({ r: 255, g: 255, b: 255 });
  });
});

describe('correctLighting', () => {
  it('stretches a dark, low-contrast image across the full range', () => {
    const data = fill(16, 16, [35, 35, 35]);
    // Second half slightly brighter so percentiles differ.
    for (let i = data.length / 2; i < data.length; i += 4) {
      data[i] = 70;
      data[i + 1] = 70;
      data[i + 2] = 70;
    }
    const range = correctLighting(data);
    expect(range.low).toBeLessThan(range.high);
    const darkest = Math.min(data[0], data[data.length - 4]);
    const brightest = Math.max(data[0], data[data.length - 4]);
    expect(darkest).toBeLessThan(20);
    expect(brightest).toBeGreaterThan(235);
  });

  it('applies a gentle lift to a completely flat dark image', () => {
    const data = fill(16, 16, [40, 40, 40]);
    const range = correctLighting(data);
    // Every pixel shares one luminance, so there is nothing to stretch.
    expect(range.low).toBe(range.high);
    expect(data[0]).toBeGreaterThan(40);
  });

  it('leaves a full-range image roughly intact at the extremes', () => {
    const data = new Uint8ClampedArray(256 * 4);
    for (let v = 0; v < 256; v++) {
      data[v * 4] = v;
      data[v * 4 + 1] = v;
      data[v * 4 + 2] = v;
      data[v * 4 + 3] = 255;
    }
    correctLighting(data);
    // Darkest pixel maps near 0, brightest near 255.
    expect(data[0]).toBeLessThan(30);
    expect(data[255 * 4]).toBeGreaterThan(225);
  });

  it('does nothing harmful to an empty (all transparent) buffer', () => {
    const data = fill(8, 8, [0, 0, 0], 0);
    const range = correctLighting(data);
    expect(range).toEqual({ low: 0, high: 255 });
  });
});

describe('removeBackground', () => {
  it('clears a light backdrop around a dark product', () => {
    const w = 40;
    const h = 40;
    const data = fill(w, h, [250, 250, 250]);
    paintRect(data, w, { x: 12, y: 12, w: 16, h: 16 }, [30, 30, 160]);

    const removed = removeBackground(data, w, h, 42);

    // Corner is background -> transparent.
    expect(data[3]).toBe(0);
    // Centre of the product survives.
    const centre = ((20 * w) + 20) * 4;
    expect(data[centre + 3]).toBe(255);
    expect(removed).toBeGreaterThan(0.3);
    expect(removed).toBeLessThan(0.95);
  });

  it('keeps product pixels that match the background colour but are not edge-connected', () => {
    const w = 40;
    const h = 40;
    // Whole image is one colour — flood fill from edges consumes everything.
    const uniform = fill(w, h, [200, 200, 200]);
    const removedAll = removeBackground(uniform, w, h, 42);
    expect(removedAll).toBeCloseTo(1, 1);

    // Now: light border colour, with an interior patch of the SAME colour
    // surrounded by a dark ring — interior must survive.
    const data = fill(w, h, [250, 250, 250]);
    paintRect(data, w, { x: 4, y: 4, w: 32, h: 32 }, [20, 20, 20]);
    paintRect(data, w, { x: 14, y: 14, w: 12, h: 12 }, [250, 250, 250]);
    removeBackground(data, w, h, 42);
    const interior = ((20 * w) + 20) * 4;
    expect(data[interior + 3]).toBe(255);
  });

  it('returns 0 for a zero-sized image', () => {
    expect(removeBackground(new Uint8ClampedArray(0), 0, 0)).toBe(0);
  });
});

describe('detectProductBounds', () => {
  it('finds the box around opaque pixels', () => {
    const w = 30;
    const h = 30;
    const data = fill(w, h, [255, 255, 255], 0); // transparent
    paintRect(data, w, { x: 5, y: 8, w: 10, h: 6 }, [10, 10, 10]);
    expect(detectProductBounds(data, w, h)).toEqual({ x: 5, y: 8, width: 10, height: 6 });
  });

  it('returns null when everything is transparent', () => {
    const data = fill(10, 10, [0, 0, 0], 0);
    expect(detectProductBounds(data, 10, 10)).toBeNull();
  });
});

describe('DEFAULT_ENHANCE_OPTIONS', () => {
  it('ships the professional e-commerce defaults', () => {
    expect(DEFAULT_ENHANCE_OPTIONS.format).toBe('square');
    expect(DEFAULT_ENHANCE_OPTIONS.background).toBe('white');
    expect(DEFAULT_ENHANCE_OPTIONS.removeBackground).toBe(true);
    expect(DEFAULT_ENHANCE_OPTIONS.correctLighting).toBe(true);
    expect(DEFAULT_ENHANCE_OPTIONS.targetSize).toBe(1024);
  });
});
