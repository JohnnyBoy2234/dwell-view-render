import { describe, expect, it } from 'vitest';
import { parseIdText } from './idExtraction';

describe('parseIdText', () => {
  it('finds a spaced SA ID number and derives date of birth and citizenship', () => {
    const text = [
      'REPUBLIC OF SOUTH AFRICA',
      'IDENTITY NUMBER',
      '800101 5009 087',
      'Surname',
      'NKOSI',
      'Names',
      'SARAH JANE'
    ].join('\n');
    const info = parseIdText(text);
    expect(info?.id_number).toBe('8001015009087');
    expect(info?.date_of_birth).toBe('1980-01-01');
    expect(info?.nationality).toBe('South African');
    expect(info?.last_name).toBe('NKOSI');
    expect(info?.first_name).toBe('SARAH JANE');
  });

  it('ignores 13-digit sequences that fail the Luhn check', () => {
    expect(parseIdText('ID 1234567890123 nothing else')).toBeNull();
  });

  it('returns the ID fields without names when the labels are missing', () => {
    const info = parseIdText('some noise 8001015009087 more noise');
    expect(info?.id_number).toBe('8001015009087');
    expect(info?.first_name).toBeUndefined();
    expect(info?.last_name).toBeUndefined();
  });

  it('returns null when there is nothing usable', () => {
    expect(parseIdText('')).toBeNull();
    expect(parseIdText('just words, no numbers')).toBeNull();
  });
});
