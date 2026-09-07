import { describe, it, expect } from 'vitest';
import { validateEmail, validatePassword, PASSWORD_CRITERIA } from './authValidation';

describe('validateEmail', () => {
  it('rejects an empty email with a required message', () => {
    expect(validateEmail('')).toEqual({ isValid: false, error: 'Email is required' });
  });

  it('rejects malformed addresses', () => {
    for (const bad of ['plainaddress', 'no@tld', '@no-local.com', 'spaces in@x.com', 'a@b', 'a@@b.com']) {
      const res = validateEmail(bad);
      expect(res.isValid).toBe(false);
      expect(res.error).toBe('Please enter a valid email address');
    }
  });

  it('accepts a well-formed address with no error field', () => {
    expect(validateEmail('user@example.com')).toEqual({ isValid: true });
  });
});

describe('validatePassword', () => {
  it('accepts a password meeting every criterion', () => {
    expect(validatePassword('Abcdef1!')).toEqual({ isValid: true, errors: [] });
  });

  it('flags a too-short password', () => {
    expect(validatePassword('Ab1!')).toMatchObject({ isValid: false });
    expect(validatePassword('Ab1!').errors).toContain(`At least ${PASSWORD_CRITERIA.minLength} characters`);
  });

  it('reports each missing character class independently', () => {
    expect(validatePassword('abcdefg1!').errors).toContain('At least one uppercase letter');
    expect(validatePassword('ABCDEFG1!').errors).toContain('At least one lowercase letter');
    expect(validatePassword('Abcdefg!').errors).toContain('At least one number');
    expect(validatePassword('Abcdefg1').errors).toContain('At least one special character');
  });

  it('accumulates every unmet requirement at once', () => {
    // "aaaa" -> short, no uppercase, no number, no special (lowercase satisfied)
    const { isValid, errors } = validatePassword('aaaa');
    expect(isValid).toBe(false);
    expect(errors).toEqual([
      `At least ${PASSWORD_CRITERIA.minLength} characters`,
      'At least one uppercase letter',
      'At least one number',
      'At least one special character',
    ]);
  });
});
