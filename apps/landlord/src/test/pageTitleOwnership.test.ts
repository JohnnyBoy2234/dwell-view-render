import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// EnhancedDashboardLayout renders the page title as the route's only <h1>.
// Pages mounted inside it must not render their own <h1>, or the title
// appears twice (app bar + body). ponytail: source scan, no DOM env needed.
const appRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '../..');
const repoRoot = resolve(appRoot, '../..');

const wrappedPages = [
  'src/pages/EnhancedLandlordDashboard.tsx',
  'src/pages/LandlordMaintenance.tsx',
  'src/pages/landlord/LandlordSupport.tsx',
].map((p) => resolve(appRoot, p));

const wrappedSharedComponents = [
  'packages/features/src/accounting/components/AccountingOverview.tsx',
  'packages/features/src/accounting/components/ExpenseSummaryReport.tsx',
  'packages/features/src/accounting/components/TransactionWizard.tsx',
  'packages/features/src/accounting/components/TransactionsList.tsx',
  'packages/features/src/billing/components/LandlordBillingPanel.tsx',
  'packages/features/src/condition-record/components/ConditionRecordsPage.tsx',
  'packages/features/src/pages/MaintenanceTicketDetails.tsx',
  'packages/features/src/support/components/SwiftRentSupport.tsx',
  'packages/ui/src/components/pages/SettingsPage.tsx',
  'packages/ui/src/components/profile/ProfilePage.tsx',
].map((p) => resolve(repoRoot, p));

describe('page title ownership', () => {
  it.each([...wrappedPages, ...wrappedSharedComponents])(
    'renders no <h1> of its own (the dashboard app bar owns it): %s',
    (file) => {
      expect(readFileSync(file, 'utf8')).not.toMatch(/<h1[\s>]/);
    },
  );
});
