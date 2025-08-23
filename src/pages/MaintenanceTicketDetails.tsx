import { useParams } from 'react-router-dom';
import { MaintenanceThread } from '@/components/maintenance/messaging/MaintenanceThread';

export default function MaintenanceTicketDetails() {
  const { ticketId } = useParams<{ ticketId: string }>();
  if (!ticketId) return <div>No ticket</div>;
  return (
    <div className="h-full">
      <h1 className="text-2xl font-bold mb-4">Ticket {ticketId}</h1>
      <div className="border rounded-md h-[70vh]">
        <MaintenanceThread ticketId={ticketId} />
      </div>
    </div>
  );
}
