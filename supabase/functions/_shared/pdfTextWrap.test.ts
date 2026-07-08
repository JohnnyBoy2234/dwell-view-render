import { assert, assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { PDFDocument, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";
import { wrapText } from "./pdfTextWrap.ts";

const doc = await PDFDocument.create();
const font = await doc.embedFont(StandardFonts.Helvetica);
const size = 10;
const maxWidth = 516; // the actual content width used in generate-lease-pdf (612 - 2*48)

// This is clause 1.6 verbatim from generate-lease-pdf/index.ts -- the kind of
// long sentence that was overflowing the page before wrapping existed.
const longClause =
  'The provisions of this Agreement shall be deemed severable, and the unenforceability of any one of the provisions shall not affect the enforceability of other provisions. In the event that a provision is found to be unenforceable, the parties shall substitute that provision with an enforceable provision that preserves the original intent and position of the parties.';

Deno.test('wrapText keeps every line within maxWidth', () => {
  const lines = wrapText(longClause, font, size, maxWidth);
  assert(lines.length > 1, 'a long clause should wrap into multiple lines');
  for (const line of lines) {
    const width = font.widthOfTextAtSize(line, size);
    assert(width <= maxWidth, `line "${line}" is ${width}pt wide, exceeds maxWidth ${maxWidth}`);
  }
});

Deno.test('wrapText preserves all words in order', () => {
  const lines = wrapText(longClause, font, size, maxWidth);
  const rejoined = lines.join(' ');
  assertEquals(rejoined.replace(/\s+/g, ' '), longClause.replace(/\s+/g, ' '));
});

Deno.test('wrapText returns a single empty line for empty input (spacer paragraphs)', () => {
  assertEquals(wrapText('', font, size, maxWidth), ['']);
});

Deno.test('wrapText hard-breaks a single word wider than maxWidth', () => {
  const longWord = 'a'.repeat(200);
  const lines = wrapText(longWord, font, size, maxWidth);
  assert(lines.length > 1);
  for (const line of lines) {
    assert(font.widthOfTextAtSize(line, size) <= maxWidth);
  }
  assertEquals(lines.join(''), longWord);
});

Deno.test('wrapText does not wrap short text that already fits', () => {
  assertEquals(wrapText('Bank:', font, size, maxWidth), ['Bank:']);
});
