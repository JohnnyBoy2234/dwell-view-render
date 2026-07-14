import { ResponsesList } from '@mzanzihomes/features/maintenance';

export default function TenantMaintenanceResponses() {
  return (
    <div className="space-y-4">
      {/* Title lives in the dashboard app bar */}
      <ResponsesList />
    </div>
  );
}
