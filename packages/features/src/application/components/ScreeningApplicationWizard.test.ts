import { describe, it, expect } from 'vitest';
import { friendlySubmitError } from './ScreeningApplicationWizard';

describe('friendlySubmitError', () => {
  it('translates a raw RLS violation into a human explanation', () => {
    const msg = friendlySubmitError({
      message: 'new row violates row-level security policy for table "applications"',
    });
    expect(msg).toContain("don't have permission");
    expect(msg).not.toContain('row-level security');
  });

  it('translates a duplicate-application error', () => {
    const msg = friendlySubmitError({
      message: 'duplicate key value violates unique constraint "applications_tenant_property_idx"',
    });
    expect(msg).toBe("You've already applied for this property.");
  });

  it('passes through a custom trigger-raised message unchanged', () => {
    const msg = friendlySubmitError({
      message: 'Application not available - viewing must be confirmed and application sent by landlord',
    });
    expect(msg).toBe('Application not available - viewing must be confirmed and application sent by landlord');
  });

  it('falls back to a generic message when there is nothing to show', () => {
    expect(friendlySubmitError({})).toBe('Something went wrong submitting your application. Please try again.');
    expect(friendlySubmitError(null)).toBe('Something went wrong submitting your application. Please try again.');
  });
});
