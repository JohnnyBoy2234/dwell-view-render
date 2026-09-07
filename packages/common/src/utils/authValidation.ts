// Shared sign-in / sign-up input validation. Extracted from the per-app Auth
// pages (tenant / landlord / web) so the three copies can't drift and the
// rules are unit-testable in isolation.

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PASSWORD_CRITERIA = {
  minLength: 8,
  hasUppercase: /[A-Z]/,
  hasLowercase: /[a-z]/,
  hasNumber: /\d/,
  hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/,
};

export interface EmailValidationResult {
  isValid: boolean;
  error?: string;
}

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validateEmail = (email: string): EmailValidationResult => {
  if (!email) return { isValid: false, error: 'Email is required' };
  if (!EMAIL_REGEX.test(email)) return { isValid: false, error: 'Please enter a valid email address' };
  return { isValid: true };
};

export const validatePassword = (password: string): PasswordValidationResult => {
  const errors: string[] = [];
  if (password.length < PASSWORD_CRITERIA.minLength) errors.push(`At least ${PASSWORD_CRITERIA.minLength} characters`);
  if (!PASSWORD_CRITERIA.hasUppercase.test(password)) errors.push('At least one uppercase letter');
  if (!PASSWORD_CRITERIA.hasLowercase.test(password)) errors.push('At least one lowercase letter');
  if (!PASSWORD_CRITERIA.hasNumber.test(password)) errors.push('At least one number');
  if (!PASSWORD_CRITERIA.hasSpecialChar.test(password)) errors.push('At least one special character');
  return { isValid: errors.length === 0, errors };
};
