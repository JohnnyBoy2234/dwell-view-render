// @ts-nocheck
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@mzanzihomes/supabase/client';
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';
import { useUpdateMaintenanceRequest } from '@mzanzihomes/features/maintenance';
import { Card, CardContent, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Button } from '@mzanzihomes/ui/components/button';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Label } from '@mzanzihomes/ui/components/label';
import { ArrowLeft, Calendar, Building, Wrench, CheckCircle2, Hash, FileText } from 'lucide-react';
import type { MaintenanceRequest, MaintenanceStatus } from '@mzanzihomes/common/types/maintenance';

const priorityColors = {
  low: 'bg-success-green text-white',
  medium: 'bg-earth-warm text-white',
  high: 'bg-destructive text-white',
  emergency: 'bg-red-600 text-white',
};

// Landlord speaks in "Busy" / "Completed"; the DB keeps its own status values.
const STATUS_LABEL: Record<MaintenanceStatus, string> = {
  submitted: 'New',
  in_progress: 'Busy',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const statusColors = {
  submitted: 'bg-blue-500 text-white',
  in_progress: 'bg-earth-warm text-white',
  completed: 'bg-success-green text-white',
  cancelled: 'bg-muted text-muted-foreground',
};

export default function MaintenanceTicketDetails() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const { user, isLandlord } = useAuth();
  const updateMaintenance = useUpdateMaintenanceRequest();

  const { data: ticket, isLoading, error } = useQuery({
    queryKey: ['maintenance-request', ticketId],
    queryFn: async () => {
      if (!ticketId || !user) throw new Error('No ticket ID or user');

      const { data: req, error: reqError } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('id', ticketId)
        .or(`landlord_id.eq.${user.id},tenant_id.eq.${user.id}`)
        .maybeSingle();

      if (reqError) throw reqError;
      if (!req) return null;

      let properties: { title?: string; location?: string } | undefined = undefined;
      if ((req as any).property_id) {
        const { data: prop } = await supabase
          .from('properties')
          .select('title, location')
          .eq('id', (req as any).property_id)
          .maybeSingle();
        if (prop) properties = prop as typeof properties;
      }

      return { ...(req as MaintenanceRequest), properties } as MaintenanceRequest & {
        properties: { title?: string; location?: string };
      };
    },
    enabled: !!ticketId && !!user,
  });

  const setStatus = (status: MaintenanceStatus) => {
    if (!ticket) return;
    updateMaintenance.mutate({ id: ticket.id, updates: { status } });
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-semibold mb-2">Request not found</h3>
            <p className="text-muted-foreground mb-4">
              This maintenance request doesn't exist or you don't have access to it.
            </p>
            <Button onClick={() => navigate(-1)} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Hash className="h-3 w-3" />
          <span className="font-mono">{ticket.id.slice(0, 8)}</span>
        </span>
        <span className="text-xs text-muted-foreground">Maintenance request</span>
      </div>

      {/* The request */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-xl mb-2 break-words">{ticket.title}</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={priorityColors[ticket.priority]}>{ticket.priority.toUpperCase()}</Badge>
                <Badge className={statusColors[ticket.status]}>{STATUS_LABEL[ticket.status]}</Badge>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {new Date(ticket.created_at).toLocaleDateString()}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <FileText className="h-3.5 w-3.5" /> Description
            </Label>
            <div className="mt-1.5 rounded-xl border bg-muted/30 p-3.5">
              <p className="text-sm leading-relaxed text-foreground/90 break-words whitespace-pre-wrap">
                {ticket.description?.trim() || 'No description provided.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Building className="h-4 w-4" />
              {ticket.properties?.title || 'Property'}
              {ticket.properties?.location ? ` · ${ticket.properties.location}` : ''}
            </span>
            {ticket.category && (
              <span className="capitalize text-muted-foreground">{ticket.category}</span>
            )}
          </div>

          {ticket.images && ticket.images.length > 0 && (
            <div>
              <Label className="text-sm font-medium">Photos</Label>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-3">
                {ticket.images.map((imageUrl, index) => (
                  <img
                    key={index}
                    src={imageUrl}
                    alt={`Maintenance issue ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border cursor-pointer"
                    onClick={() => window.open(imageUrl, '_blank')}
                    onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Landlord: mark busy or completed — nothing else */}
      {isLandlord && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Update status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button
              variant={ticket.status === 'in_progress' ? 'default' : 'outline'}
              disabled={updateMaintenance.isPending}
              onClick={() => setStatus('in_progress')}
            >
              <Wrench className="h-4 w-4 mr-1.5" /> Busy
            </Button>
            <Button
              variant={ticket.status === 'completed' ? 'default' : 'outline'}
              disabled={updateMaintenance.isPending}
              onClick={() => setStatus('completed')}
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" /> Completed
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
