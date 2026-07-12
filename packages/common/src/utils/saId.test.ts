import { describe, expect, it } from 'vitest';
import { isValidSaId, parseSaId } from './saId';

describe('saId', () => {
  it('accepts a valid ID and extracts date of birth', () => {
    expect(isValidSaId('8001015009087')).toBe(true);
    expect(parseSaId('8001015009087')).toEqual({ dateOfBirth: '1980-01-01', citizen: true });
  });

  it('rejects a wrong check digit', () => {
    expect(isValidSaId('8001015009088')).toBe(false);
    expect(parseSaId('8001015009088')).toBeNull();
  });

  it('rejects malformed input', () => {
    expect(isValidSaId('')).toBe(false);
    expect(isValidSaId('800101500908')).toBe(false); // 12 digits
    expect(isValidSaId('80010150090870')).toBe(false); // 14 digits
    expect(isValidSaId('80010b5009087')).toBe(false);
  });

  it('rejects an impossible birth date even when the checksum passes', () => {
    // brute-force a 13th digit is unnecessary: month 13 fails date validation
    // regardless of checksum, so any such ID must be invalid
    for (let check = 0; check <= 9; check++) {
      expect(isValidSaId(`801301500908${check}`)).toBe(false);
    }
  });
});
