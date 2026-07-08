// pdf-lib has no built-in text wrapping -- page.drawText() draws one line at
// whatever width it needs, running off the page edge for anything longer
// than maxWidth. This greedily packs words into lines that fit, and
// hard-breaks any single word wider than maxWidth on its own (so a long URL
// or unbroken string doesn't produce an unbounded line).
export interface MeasurableFont {
  widthOfTextAtSize(text: string, size: number): number;
}

export function wrapText(
  text: string,
  font: MeasurableFont,
  size: number,
  maxWidth: number
): string[] {
  if (!text) return [''];

  const safeMaxWidth = Math.max(maxWidth, 1);
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return [''];

  const lines: string[] = [];
  let current = '';

  const hardBreak = (word: string): string => {
    let chunk = '';
    for (const ch of word) {
      const candidate = chunk + ch;
      if (chunk && font.widthOfTextAtSize(candidate, size) > safeMaxWidth) {
        lines.push(chunk);
        chunk = ch;
      } else {
        chunk = candidate;
      }
    }
    return chunk;
  };

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= safeMaxWidth) {
      current = candidate;
      continue;
    }
    if (current) {
      lines.push(current);
      current = '';
    }
    if (font.widthOfTextAtSize(word, size) > safeMaxWidth) {
      current = hardBreak(word);
    } else {
      current = word;
    }
  }
  if (current) lines.push(current);

  return lines.length > 0 ? lines : [''];
}
