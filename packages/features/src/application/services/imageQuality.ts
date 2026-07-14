/** Cheap, dependency-free quality signals for a captured ID photo, computed
 * from raw RGBA pixel data so the scoring logic is unit-testable without a
 * browser canvas. Thresholds are heuristic starting points, not measured. */

export interface QualityScores {
  /** Luminance-gradient magnitude of the single sharpest block in the image —
   * a document is "sharp" if *some* region has crisp edges (the text), even
   * when most of the frame is blank margin. A whole-image average, or even an
   * average across several blocks, gets diluted away by that margin on a real
   * photo where only a few blocks actually contain text. */
  sharpness: number;
  /** Fraction of near-white pixels (0..1) — high values mean glare/overexposure. */
  glareRatio: number;
  /** Fraction of near-black pixels (0..1) — high values mean underexposure. */
  darkRatio: number;
}

export type QualityVerdict = 'ok' | 'blurry' | 'glare' | 'dark';

const GLARE_LUMINANCE = 245;
const DARK_LUMINANCE = 40;
const SHARPNESS_THRESHOLD = 20;
const GLARE_RATIO_THRESHOLD = 0.35;
const DARK_RATIO_THRESHOLD = 0.6;
const BLOCK_SIZE = 24;

function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export function scoreImageQuality(pixels: Uint8ClampedArray, width: number, height: number): QualityScores {
  const cols = Math.max(1, Math.ceil(width / BLOCK_SIZE));
  const rows = Math.max(1, Math.ceil(height / BLOCK_SIZE));
  const blockGradSum = new Float64Array(cols * rows);
  const blockGradCount = new Int32Array(cols * rows);
  let glareCount = 0;
  let darkCount = 0;
  const total = width * height;

  for (let y = 0; y < height; y++) {
    const blockRow = Math.min(rows - 1, Math.floor(y / BLOCK_SIZE));
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const lum = luminance(pixels[idx], pixels[idx + 1], pixels[idx + 2]);
      if (lum >= GLARE_LUMINANCE) glareCount++;
      if (lum <= DARK_LUMINANCE) darkCount++;
      if (x + 1 < width) {
        const rightIdx = idx + 4;
        const rightLum = luminance(pixels[rightIdx], pixels[rightIdx + 1], pixels[rightIdx + 2]);
        const blockCol = Math.min(cols - 1, Math.floor(x / BLOCK_SIZE));
        const blockIdx = blockRow * cols + blockCol;
        blockGradSum[blockIdx] += Math.abs(lum - rightLum);
        blockGradCount[blockIdx] += 1;
      }
    }
  }

  let sharpness = 0;
  for (let i = 0; i < blockGradSum.length; i++) {
    if (blockGradCount[i] === 0) continue;
    sharpness = Math.max(sharpness, blockGradSum[i] / blockGradCount[i]);
  }

  return {
    sharpness,
    glareRatio: total ? glareCount / total : 0,
    darkRatio: total ? darkCount / total : 0
  };
}

// A legitimate white ID-card or scanned-document background is often >35%
// near-white pixels — that alone isn't glare. Glare is a blown-out area with
// no readable detail in it, so it's only flagged when the image is *also*
// flat. A photo with a glare hotspot over otherwise-sharp text will slip
// through this whole-image heuristic; catching that needs per-region
// analysis, not worth it for a targeted fix — add if false negatives show up.
export function qualityVerdict(scores: QualityScores): QualityVerdict {
  if (scores.glareRatio > GLARE_RATIO_THRESHOLD && scores.sharpness < SHARPNESS_THRESHOLD) return 'glare';
  if (scores.darkRatio > DARK_RATIO_THRESHOLD) return 'dark';
  if (scores.sharpness < SHARPNESS_THRESHOLD) return 'blurry';
  return 'ok';
}
