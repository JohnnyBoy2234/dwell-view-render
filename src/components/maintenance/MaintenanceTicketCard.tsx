import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMaintenanceTickets } from '@/hooks/useMaintenanceTickets';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format, formatDistance } from 'date-fns';
import { 
  Clock, 
  User, 
  Phone, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  MessageSquare,
  Images
} from 'lucide-react';
import { MaintenanceImageGallery } from './MaintenanceImageGallery';
import type { MaintenanceRequest } from '@/types/maintenance';

interface MaintenanceTicketCardProps {
  ticket: MaintenanceRequest;
  showActions?: boolean;
}

export function MaintenanceTicketCard({ ticket, showActions = true }: MaintenanceTicketCardProps) {
  const { assignVendor, completeTicket, approveWork, disputeWork } = useMaintenanceTickets();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const isLandlord = user?.id === ticket.landlord_id;
  const isTenant = user?.id === ticket.tenant_id;

  const getStatusIcon = (status: MaintenanceRequest['status']) => {
    switch (status) {
      case 'submitted':
        return <Clock className="h-4 w-4" />;
      case 'in_progress':
        return <User className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: MaintenanceRequest['status']) => {
    switch (status) {
      case 'submitted':
        return 'default';
      case 'in_progress':
        return 'secondary';
      case 'completed':
        return 'default';
      case 'cancelled':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'default';
      default:
        return 'default';
    }
  };

  const getSLAStatus = () => {
    // For demo purposes, using estimated_cost as SLA hours proxy
    if (!ticket.estimated_cost || !ticket.created_at) return null;
    
    const createdAt = new Date(ticket.created_at);
    const slaHours = ticket.priority === 'high' ? 8 : ticket.priority === 'medium' ? 48 : 120;
    const slaDeadline = new Date(createdAt.getTime() + (slaHours * 60 * 60 * 1000));
    const now = new Date();
    
    const isOverdue = now > slaDeadline;
    const timeLeft = formatDistance(slaDeadline, now, { addSuffix: true });
    
    return {
      isOverdue,
      timeLeft,
      deadline: slaDeadline
    };
  };

  const handleAssignVendor = async () => {
    // In a real app, this would open a vendor selection modal
    const vendorName = prompt('Enter vendor name:');
    const vendorContact = prompt('Enter vendor contact:');
    
    if (vendorName && vendorContact) {
      try {
        setLoading(true);
        await assignVendor(ticket.id, vendorName, vendorContact);
        toast.success('Vendor assigned successfully');
      } catch (error) {
        toast.error('Failed to assign vendor');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCompleteWork = async () => {
    const actualCost = prompt('Enter actual cost (optional):');
    const notes = prompt('Add completion notes (optional):');
    
    try {
      setLoading(true);
      await completeTicket(
        ticket.id,
        actualCost ? parseFloat(actualCost) : undefined,
        notes || undefined
      );
      toast.success('Work marked as completed');
    } catch (error) {
      toast.error('Failed to complete work');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setLoading(true);
      await approveWork(ticket.id);
      toast.success('Work approved');
    } catch (error) {
      toast.error('Failed to approve work');
    } finally {
      setLoading(false);
    }
  };

  const handleDispute = async () => {
    const reason = prompt('Enter reason for dispute:');
    if (reason) {
      try {
        setLoading(true);
        await disputeWork(ticket.id, reason);
        toast.success('Work disputed');
      } catch (error) {
        toast.error('Failed to dispute work');
      } finally {
        setLoading(false);
      }
    }
  };

  const slaStatus = getSLAStatus();

  return (
    <Card className="w-full transform transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)]">
      <CardHeader className="pb-3 bg-gray-50 rounded-t-lg">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-lg">{ticket.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              #{ticket.id.slice(0, 8)} • {format(new Date(ticket.created_at), 'MMM d, yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusColor(ticket.status)} className="flex items-center gap-1">
              {getStatusIcon(ticket.status)}
              {ticket.status.replace('_', ' ').toUpperCase()}
            </Badge>
            <Badge variant={getPriorityColor(ticket.priority)}>
              {ticket.priority.toUpperCase()}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 bg-white rounded-b-lg">
        <div>
          <p className="text-sm">{ticket.description}</p>
        </div>

        {ticket.category && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Category:</span>
            <Badge variant="outline">{ticket.category}</Badge>
          </div>
        )}

        {slaStatus && (
          <div className={`p-3 rounded-md border ${
            slaStatus.isOverdue 
              ? 'bg-red-50 border-red-200' 
              : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">
                SLA: {slaStatus.isOverdue ? 'Overdue' : 'Due'} {slaStatus.timeLeft}
              </span>
            </div>
          </div>
        )}

        {ticket.contractor_name && (
          <div className="bg-muted p-3 rounded-md">
            <div className="flex items-center gap-2 mb-1">
              <User className="h-4 w-4" />
              <span className="font-medium">Assigned Contractor</span>
            </div>
            <p className="text-sm">{ticket.contractor_name}</p>
            {ticket.contractor_contact && (
              <div className="flex items-center gap-1 mt-1">
                <Phone className="h-3 w-3" />
                <span className="text-xs text-muted-foreground">{ticket.contractor_contact}</span>
              </div>
            )}
          </div>
        )}

        {(ticket.estimated_cost || ticket.actual_cost) && (
          <div className="flex justify-between text-sm">
            {ticket.estimated_cost && (
              <div>
                <span className="font-medium">Estimated: </span>
                <span>R {ticket.estimated_cost.toLocaleString()}</span>
              </div>
            )}
            {ticket.actual_cost && (
              <div>
                <span className="font-medium">Actual: </span>
                <span>R {ticket.actual_cost.toLocaleString()}</span>
              </div>
            )}
          </div>
        )}

        {ticket.images && ticket.images.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Images className="h-4 w-4" />
              <span>{ticket.images.length} image(s) attached</span>
            </div>
            <MaintenanceImageGallery images={ticket.images} ticketTitle={ticket.title} />
          </div>
        )}

        {showActions && isLandlord && (
          <div className="flex justify-end gap-2 pt-4 border-t">
            {ticket.status === 'submitted' && (
              <Button 
                size="sm" 
                onClick={handleAssignVendor}
                disabled={loading}
              >
                Assign Vendor
              </Button>
            )}
            {ticket.status === 'completed' && (
              <>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleDispute}
                  disabled={loading}
                >
                  Dispute
                </Button>
                <Button 
                  size="sm"
                  onClick={handleApprove}
                  disabled={loading}
                >
                  Approve
                </Button>
              </>
            )}
          </div>
        )}

        {showActions && ticket.contractor_name && ticket.status === 'in_progress' && (
          <div className="flex justify-end pt-4 border-t">
            <Button 
              size="sm"
              onClick={handleCompleteWork}
              disabled={loading}
            >
              Mark Complete
            </Button>
          </div>
        )}

        <div className="flex justify-between items-center pt-2 border-t">
          <Button variant="ghost" size="sm" className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            Messages
          </Button>
          <span className="text-xs text-muted-foreground">
            Updated {formatDistance(new Date(ticket.updated_at), new Date(), { addSuffix: true })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}