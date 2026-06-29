import { useTenantResponses } from '@/hooks/maintenance/useTenantResponses';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@mzanzihomes/ui/components/badge';

export function ResponsesList() {
  const { data, isLoading } = useTenantResponses();
  const navigate = useNavigate();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!data || data.length === 0) {
    return <div>No responses yet.</div>;
  }

  return (
    <div className="space-y-2">
      {data.map(ticket => (
        <div
          key={ticket.ticketId}
          className="p-4 border rounded cursor-pointer flex items-center justify-between hover:bg-muted"
          onClick={() => navigate(`/tenant-dashboard/maintenance/${ticket.ticketId}`)}
        >
          <div>
            <div className="font-medium">{ticket.ticketId}</div>
            <div className="text-sm text-muted-foreground">{ticket.lastMessageSnippet}</div>
          </div>
          {ticket.unreadCountForCurrentUser > 0 && (
            <Badge>{ticket.unreadCountForCurrentUser}</Badge>
          )}
        </div>
      ))}
    </div>
  );
}
