import { qualityVerdict, scoreImageQuality, type QualityScores, type QualityVerdict } from './imageQuality';

const MAX_DIMENSION = 2000;

export interface NormalizedImage {
  blob: Blob;
  scores: QualityScores;
  verdict: QualityVerdict;
}

/**
 * Corrects EXIF rotation and downscales a captured photo before OCR, using
 * only native browser APIs (no new dependency). Returns null when the browser
 * can't do this (old Safari, `createImageBitmap` unsupported, etc.) — callers
 * fall back to running OCR on the original file.
 *
 * This is UI glue over canvas/ImageBitmap and isn't unit-tested here; the
 * quality scoring math it calls into (imageQuality.ts) is. Verify by hand in
 * a real browser per the project's verify skill.
 */
export async function normalizeAndAssess(file: File): Promise<NormalizedImage | null> {
  if (typeof createImageBitmap !== 'function') return null;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return null;
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return null;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const { data } = ctx.getImageData(0, 0, width, height);
  const scores = scoreImageQuality(data, width, height);
  const verdict = qualityVerdict(scores);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
  if (!blob) return null;

  return { blob, scores, verdict };
}

export const QUALITY_MESSAGES: Record<Exclude<QualityVerdict, 'ok'>, string> = {
  blurry: 'This photo is too blurry. Hold your phone steady and make sure the text is sharp.',
  glare: 'There is too much glare. Move away from direct light or tilt the document slightly.',
  dark: 'This photo is too dark. Retake it somewhere brighter.'
};
