import { ResponsesList } from '@/components/maintenance/messaging/ResponsesList';

export default function TenantMaintenanceResponses() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Maintenance Responses</h1>
      <ResponsesList />
    </div>
  );
}
