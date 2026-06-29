// @ts-nocheck
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@mzanzihomes/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUpdateMaintenanceRequest } from '@/hooks/maintenance/useMaintenanceRequests';
import { Card, CardContent, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Button } from '@mzanzihomes/ui/components/button';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Textarea } from '@mzanzihomes/ui/components/textarea';
import { Label } from '@mzanzihomes/ui/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@mzanzihomes/ui/components/select';
import { ArrowLeft, Wrench, Calendar, User, Building } from 'lucide-react';
// Simple R icon for South African Rand
const RIcon = ({ className }: { className?: string }) => (
  <div className={`${className} flex items-center justify-center font-bold text-lg`}>
    R
  </div>
);
import { useState } from 'react';
import type { MaintenanceRequest, MaintenanceStatus } from '@mzanzihomes/common/types/maintenance';
import { MaintenanceThread } from '@/components/maintenance/messaging/MaintenanceThread';

const statusOptions: { value: MaintenanceStatus; label: string; description: string }[] = [
  { value: 'submitted', label: 'Submitted', description: 'Request has been submitted' },
  { value: 'in_progress', label: 'In Progress', description: 'Work is currently being done' },
  { value: 'completed', label: 'Completed', description: 'Work has been completed' },
  { value: 'cancelled', label: 'Cancelled', description: 'Request has been cancelled' },
];

const priorityColors = {
  low: 'bg-success-green text-white',
  medium: 'bg-earth-warm text-white',
  high: 'bg-destructive text-white',
  emergency: 'bg-red-600 text-white',
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
  const [notes, setNotes] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [contractorName, setContractorName] = useState('');
  const [contractorContact, setContractorContact] = useState('');

  const { data: ticket, isLoading, error } = useQuery({
    queryKey: ['maintenance-request', ticketId],
    queryFn: async () => {
      if (!ticketId || !user) throw new Error('No ticket ID or user');

      // 1) Fetch the maintenance request row with access filter
      const { data: req, error: reqError } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('id', ticketId)
        .or(`landlord_id.eq.${user.id},tenant_id.eq.${user.id}`)
        .maybeSingle();

      if (reqError) throw reqError;
      if (!req) return null;

      // 2) Fetch property details separately (avoid join issues under RLS)
      let properties: { title?: string; location?: string; landlord_id?: string } | undefined = undefined;
      if ((req as any).property_id) {
        const { data: prop } = await supabase
          .from('properties')
          .select('title, location, landlord_id')
          .eq('id', (req as any).property_id)
          .maybeSingle();
        if (prop) properties = prop as typeof properties;
      }

      return { ...(req as MaintenanceRequest), properties } as MaintenanceRequest & { properties: { title?: string; location?: string; landlord_id?: string } };
    },
    enabled: !!ticketId && !!user,
  });

  const handleStatusChange = (newStatus: MaintenanceStatus) => {
    if (!ticket) return;
    
    updateMaintenance.mutate({
      id: ticket.id,
      updates: { status: newStatus }
    });
  };

  const handleUpdateDetails = () => {
    if (!ticket) return;
    
    const updates: Partial<MaintenanceRequest> = {};
    if (notes.trim()) updates.notes = notes;
    if (estimatedCost) updates.estimated_cost = parseFloat(estimatedCost);
    if (contractorName.trim()) updates.contractor_name = contractorName;
    if (contractorContact.trim()) updates.contractor_contact = contractorContact;
    
    updateMaintenance.mutate({
      id: ticket.id,
      updates
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    console.error('MaintenanceTicketDetails: fetch failed or empty', {
      ticketId,
      userId: user?.id,
      error
    });
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-semibold mb-2">Request not found</h3>
            <p className="text-muted-foreground mb-4">
              The maintenance request you're looking for doesn't exist or you don't have access to it.
            </p>
            {ticketId && (
              <p className="text-xs text-muted-foreground mb-4">Ticket ID: {ticketId}</p>
            )}
            <Button onClick={() => navigate(-1)} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Access is enforced by Supabase RLS. If we have a row, the user has access.

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Maintenance Request</h1>
          <p className="text-muted-foreground">#{ticket.id.slice(0, 8)}</p>
        </div>
      </div>

      {/* Main Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl mb-2">{ticket.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className={priorityColors[ticket.priority]}>
                      {ticket.priority.toUpperCase()}
                    </Badge>
                    <Badge className={statusColors[ticket.status]}>
                      {ticket.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {new Date(ticket.created_at).toLocaleDateString()}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  {ticket.description}
                </p>
              </div>

              {ticket.notes && (
                <div>
                  <Label className="text-sm font-medium">Notes</Label>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                    {ticket.notes}
                  </p>
                </div>
              )}

              {/* Images */}
              {ticket.images && ticket.images.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Attached Images</Label>
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-3">
                    {ticket.images.map((imageUrl, index) => (
                      <div
                        key={index}
                        className="relative group cursor-pointer"
                        onClick={() => window.open(imageUrl, '_blank')}
                      >
                        <img
                          src={imageUrl}
                          alt={`Maintenance issue ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border transition-transform group-hover:scale-105"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder.svg';
                            e.currentTarget.alt = 'Image failed to load';
                          }}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-colors flex items-center justify-center">
                          <span className="text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                            Click to view full size
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="flex flex-col h-[500px]">
            <CardHeader>
              <CardTitle>Messages</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <MaintenanceThread ticketId={ticket.id} />
            </CardContent>
          </Card>

          {/* Landlord Actions */}
          {isLandlord && (
            <Card>
              <CardHeader>
                <CardTitle>Manage Request</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={ticket.status}
                      onValueChange={handleStatusChange}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            <div>
                              <div className="font-medium">{status.label}</div>
                              <div className="text-xs text-muted-foreground">
                                {status.description}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Estimated Cost (ZAR)</Label>
                    <input
                      type="number"
                      placeholder="Enter amount"
                      value={estimatedCost}
                      onChange={(e) => setEstimatedCost(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Contractor Name</Label>
                    <input
                      type="text"
                      placeholder="Enter contractor name"
                      value={contractorName}
                      onChange={(e) => setContractorName(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Contractor Contact</Label>
                    <input
                      type="text"
                      placeholder="Enter contact info"
                      value={contractorContact}
                      onChange={(e) => setContractorContact(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Additional Notes</Label>
                  <Textarea
                    placeholder="Add notes about the work, schedule, etc."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button 
                  onClick={handleUpdateDetails}
                  disabled={updateMaintenance.isPending}
                  className="w-full"
                >
                  {updateMaintenance.isPending ? 'Updating...' : 'Update Details'}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Property Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Property</Label>
                <p className="text-sm font-medium">
                  {ticket.properties?.title || 'Property'}
                </p>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Location</Label>
                <p className="text-sm">
                  {ticket.properties?.location || 'N/A'}
                </p>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Category</Label>
                <p className="text-sm capitalize">{ticket.category}</p>
              </div>
            </CardContent>
          </Card>

          {/* Cost Information */}
          {(ticket.estimated_cost || ticket.actual_cost) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RIcon className="h-7 w-7" />
                  Cost Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {ticket.estimated_cost && (
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Estimated Cost</Label>
                    <p className="text-sm font-medium">
                      R{ticket.estimated_cost.toLocaleString()}
                    </p>
                  </div>
                )}
                {ticket.actual_cost && (
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Actual Cost</Label>
                    <p className="text-sm font-medium">
                      R{ticket.actual_cost.toLocaleString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Contractor Information */}
          {(ticket.contractor_name || ticket.contractor_contact) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Contractor
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {ticket.contractor_name && (
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Name</Label>
                    <p className="text-sm">{ticket.contractor_name}</p>
                  </div>
                )}
                {ticket.contractor_contact && (
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Contact</Label>
                    <p className="text-sm">{ticket.contractor_contact}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}