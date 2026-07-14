import { describe, expect, it } from 'vitest';
import { qualityVerdict, scoreImageQuality } from './imageQuality';

/** Builds a flat RGBA buffer of the given colour, optionally alternating
 * columns to simulate high-contrast text edges. */
function makePixels(width: number, height: number, colour: [number, number, number], alternate = false) {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const on = alternate && x % 2 === 1;
      const [r, g, b] = on ? [255 - colour[0], 255 - colour[1], 255 - colour[2]] : colour;
      pixels[idx] = r;
      pixels[idx + 1] = g;
      pixels[idx + 2] = b;
      pixels[idx + 3] = 255;
    }
  }
  return pixels;
}

describe('scoreImageQuality / qualityVerdict', () => {
  it('flags a flat, edgeless image as blurry', () => {
    const pixels = makePixels(20, 20, [128, 128, 128]);
    const scores = scoreImageQuality(pixels, 20, 20);
    expect(qualityVerdict(scores)).toBe('blurry');
  });

  it('accepts a high-contrast alternating image as ok', () => {
    const pixels = makePixels(20, 20, [20, 20, 20], true);
    const scores = scoreImageQuality(pixels, 20, 20);
    expect(qualityVerdict(scores)).toBe('ok');
  });

  it('flags a mostly-white image as glare, ahead of the blur check', () => {
    const pixels = makePixels(20, 20, [255, 255, 255]);
    const scores = scoreImageQuality(pixels, 20, 20);
    expect(qualityVerdict(scores)).toBe('glare');
  });

  it('flags a mostly-black image as dark', () => {
    const pixels = makePixels(20, 20, [0, 0, 0]);
    const scores = scoreImageQuality(pixels, 20, 20);
    expect(qualityVerdict(scores)).toBe('dark');
  });

  it('does not call a large mostly-blank photo blurry when one region has sharp text', () => {
    // 200x200 flat mid-grey "page" with one small high-contrast "text" patch —
    // a whole-image average would dilute the patch away to near zero.
    const width = 200;
    const height = 200;
    const pixels = makePixels(width, height, [128, 128, 128]);
    for (let y = 90; y < 110; y++) {
      for (let x = 90; x < 130; x += 2) {
        const idx = (y * width + x) * 4;
        pixels[idx] = pixels[idx + 1] = pixels[idx + 2] = 0;
      }
    }
    const scores = scoreImageQuality(pixels, width, height);
    expect(qualityVerdict(scores)).toBe('ok');
  });

  it('does not flag a white document background with sharp text as glare', () => {
    // Mostly-white background (>35% near-white) but with real edges from text,
    // simulated as an alternating band across part of the image.
    const width = 20;
    const height = 20;
    const pixels = new Uint8ClampedArray(width * height * 4);
    pixels.fill(255);
    for (let x = 2; x < 18; x += 2) {
      for (let y = 8; y < 12; y++) {
        const idx = (y * width + x) * 4;
        pixels[idx] = pixels[idx + 1] = pixels[idx + 2] = 0;
        pixels[idx + 3] = 255;
      }
    }
    const scores = scoreImageQuality(pixels, width, height);
    expect(scores.glareRatio).toBeGreaterThan(0.35);
    expect(qualityVerdict(scores)).toBe('ok');
  });
});
