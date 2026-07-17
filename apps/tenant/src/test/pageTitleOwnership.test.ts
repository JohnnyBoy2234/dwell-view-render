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
  'src/pages/tenant/TenantInventory.tsx',
  'src/pages/tenant/TenantLeaseDocuments.tsx',
  'src/pages/tenant/TenantMaintenance.tsx',
  'src/pages/tenant/TenantMaintenanceResponses.tsx',
  'src/pages/tenant/TenantPayments.tsx',
  'src/pages/tenant/TenantProofOfPayment.tsx',
  'src/pages/tenant/TenantPropertyViewings.tsx',
  'src/pages/tenant/TenantSupport.tsx',
].map((p) => resolve(appRoot, p));

const wrappedSharedComponents = [
  'packages/features/src/application/components/TenantApplicationsSection.tsx',
  'packages/features/src/condition-record/components/ConditionRecordsPage.tsx',
  'packages/features/src/lease/components/LeaseDashboard.tsx',
  'packages/features/src/pages/MaintenanceTicketDetails.tsx',
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
