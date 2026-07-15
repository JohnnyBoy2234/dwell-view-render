import { describe, expect, it } from 'vitest';
import { lowConfidenceFields, parseIdText, parseMrzText } from './idExtraction';

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

  it('finds surname/names when the label and value share a line', () => {
    const text = [
      'REPUBLIC OF SOUTH AFRICA',
      '800101 5009 087',
      'Surname: NKOSI',
      'Names: SARAH JANE'
    ].join('\n');
    const info = parseIdText(text);
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

describe('parseMrzText', () => {
  // ICAO 9303 published TD3 worked example (Anna Maria Eriksson).
  const mrz = [
    'VISUAL INSPECTION ZONE NOISE',
    'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<',
    'L898902C36UTO7408122F1204159ZE184226B<<<<<10'
  ].join('\n');

  it('parses a valid TD3 machine-readable zone', () => {
    const info = parseMrzText(mrz);
    expect(info?.document_type).toBe('passport');
    expect(info?.id_number).toBe('L898902C3');
    expect(info?.date_of_birth).toBe('1974-08-12');
    expect(info?.last_name).toBe('ERIKSSON');
    expect(info?.first_name).toBe('ANNA MARIA');
    expect(info?.id_expiry_date).toBe('2012-04-15');
  });

  it('rejects an MRZ line whose check digit was misread', () => {
    const corrupted = mrz.replace('L898902C36UTO', 'L898902C39UTO');
    expect(parseMrzText(corrupted)).toBeNull();
  });

  it('returns null for ordinary SA ID text', () => {
    expect(parseMrzText('some noise 8001015009087 more noise')).toBeNull();
  });
});

describe('lowConfidenceFields', () => {
  it('always flags OCR-extracted names, even at high OCR confidence', () => {
    const flagged = lowConfidenceFields({ first_name: 'ANNA', last_name: 'ERIKSSON', id_number: 'L898902C3' }, 95);
    expect(flagged).toEqual(expect.arrayContaining(['first_name', 'last_name']));
    expect(flagged).not.toContain('id_number');
  });

  it('flags every extracted field when overall OCR confidence is low', () => {
    const flagged = lowConfidenceFields({ id_number: 'L898902C3', date_of_birth: '1974-08-12' }, 40);
    expect(flagged.sort()).toEqual(['date_of_birth', 'id_number']);
  });

  it('trusts algorithmic fields when the provider gives no confidence signal at all', () => {
    const flagged = lowConfidenceFields(
      { first_name: 'ANNA', id_number: 'L898902C3', date_of_birth: '1974-08-12' },
      null
    );
    expect(flagged).toEqual(['first_name']);
  });
});
